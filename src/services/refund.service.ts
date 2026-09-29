import { prisma } from "../config/prisma";
import { AppError, notFound } from "../utils/errors";
import { evaluatePolicy } from "./policy.service";
import { analyzeRefund } from "./ai.service";
import { randomUUID } from "crypto";

function publicRefund(r: any) {
  return {
    id: r.publicId,
    status: r.status,
    decision: r.decision,
    amount: Number(r.amount),
    message: r.message,
    createdAt: r.createdAt,
    customer: r.customer && {
      id: r.customer.publicId,
      name: r.customer.name,
      email: r.customer.email,
    },
    order: r.order && {
      id: r.order.publicId,
      amount: Number(r.order.amount),
      orderDate: r.order.orderDate,
      items: r.order.items,
    },
    policy: r.evaluation && {
      eligible: r.evaluation.eligible,
      flags: r.evaluation.flags,
      rules: r.evaluation.rules,
    },
    ai: r.aiAnalysis && {
      classification: r.aiAnalysis.classification,
      recommendation: r.aiAnalysis.recommendation,
      summary: r.aiAnalysis.summary,
      customerResponse: r.aiAnalysis.customerResponse,
      flags: r.aiAnalysis.flags,
      model: r.aiAnalysis.model,
      latencyMs: r.aiAnalysis.latencyMs,
    },
    audit: r.auditLogs?.map((a: any) => ({
      event: a.event,
      actor: a.actor,
      metadata: a.metadata,
      createdAt: a.createdAt,
    })),
  };
}

export async function createRefund(
  customerPublicId: string,
  orderPublicId: string,
  message: string,
  idempotencyKey?: string,
) {
  const existing = idempotencyKey
    ? await prisma.refundRequest.findUnique({ where: { idempotencyKey } })
    : null;
  if (existing) return getRefund(existing.publicId);

  const customer = await prisma.customer.findUnique({
    where: { publicId: customerPublicId },
  });
  if (!customer) throw notFound("Customer not found");
  const order = await prisma.order.findUnique({
    where: { publicId: orderPublicId },
    include: { items: true },
  });
  if (!order || order.customerId !== customer.id)
    throw notFound("Order not found for customer");

  const refund = await prisma.refundRequest.create({
    data: {
      publicId: `REQ-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      idempotencyKey: idempotencyKey || undefined,
      customerId: customer.id,
      orderId: order.id,
      message,
      amount: order.amount,
      status: "PROCESSING",
    },
  });
  await prisma.auditLog.create({
    data: {
      refundRequestId: refund.id,
      event: "REQUEST_CREATED",
      actor: "customer",
      metadata: { requestMessageLength: message.length },
    },
  });

  const policy = evaluatePolicy(order, message);
  await prisma.policyEvaluation.create({
    data: {
      refundRequestId: refund.id,
      eligible: policy.eligible,
      flags: policy.flags,
      rules: policy.rules,
    },
  });
  await prisma.auditLog.create({
    data: {
      refundRequestId: refund.id,
      event: "POLICY_EVALUATED",
      actor: "system",
      metadata: policy,
    },
  });

  const ai = await analyzeRefund({
    customer: { name: customer.name },
    order: {
      publicId: order.publicId,
      amount: Number(order.amount),
      orderDate: order.orderDate.toISOString(),
      item: order.items[0]?.productName || "Unknown",
    },
    request: message,
    policy,
  });
  await prisma.aIAnalysis.create({
    data: {
      refundRequestId: refund.id,
      classification: ai.result.classification,
      recommendation: ai.result.recommendation,
      summary: ai.result.summary,
      customerResponse: ai.result.customerResponse,
      flags: ai.result.flags,
      model: ai.model,
      promptVersion: ai.promptVersion,
      latencyMs: ai.latencyMs,
    },
  });

  const finalDecision = policy.autoDecision;
  await prisma.$transaction(async (tx) => {
    const current = await tx.refundRequest.findUnique({
      where: { id: refund.id },
    });
    if (!current || current.status !== "PROCESSING")
      throw new AppError(
        409,
        "STATE_CONFLICT",
        "Refund is already being processed",
      );
    return tx.refundRequest.update({
      where: { id: refund.id },
      data: { status: finalDecision, decision: finalDecision },
      include: {
        customer: true,
        order: { include: { items: true } },
        evaluation: true,
        aiAnalysis: true,
        auditLogs: true,
      },
    });
  });
  await prisma.auditLog.create({
    data: {
      refundRequestId: refund.id,
      event: `DECISION_${finalDecision}`,
      actor: "system",
      metadata: { model: ai.model },
    },
  });

  return getRefund(refund.publicId);
}

export async function getRefund(publicId: string) {
  const refund = await prisma.refundRequest.findUnique({
    where: { publicId },
    include: {
      customer: true,
      order: { include: { items: true } },
      evaluation: true,
      aiAnalysis: true,
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!refund) throw notFound("Refund request not found");
  return publicRefund(refund);
}

export async function listRefunds(page = 1, limit = 20, status?: string) {
  const take = Math.min(Math.max(limit, 1), 100);
  const skip = (Math.max(page, 1) - 1) * take;
  const where = status ? { status: status as any } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.refundRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { customer: true, order: true },
    }),
    prisma.refundRequest.count({ where }),
  ]);
  return {
    data: rows.map(publicRefund),
    pagination: {
      page: Math.max(page, 1),
      limit: take,
      total,
      pages: Math.ceil(total / take),
    },
  };
}

export async function stats() {
  const groups = await prisma.refundRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const total = await prisma.refundRequest.count();
  return {
    total,
    byStatus: Object.fromEntries(groups.map((g) => [g.status, g._count._all])),
  };
}
