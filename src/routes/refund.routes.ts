import { Router } from "express";
import { z } from "zod";
import {
  createRefund,
  getRefund,
  listRefunds,
  stats,
} from "../services/refund.service";
import { refundLimiter } from "../middleware/security";
import { requireAdmin } from "../middleware/auth";

const router = Router();
const createSchema = z.object({
  customerId: z.string().min(3).max(50),
  orderId: z.string().min(3).max(50),
  message: z.string().trim().min(5).max(4000),
});

router.post("/", refundLimiter, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const result = await createRefund(
      body.customerId,
      body.orderId,
      body.message,
      req.header("Idempotency-Key") || undefined,
    );
    res
      .status(201)
      .json({ success: true, data: result, requestId: (req as any).requestId });
  } catch (e) {
    next(e);
  }
});
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1),
      limit = Number(req.query.limit || 20);
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    res.json({ success: true, ...(await listRefunds(page, limit, status)) });
  } catch (e) {
    next(e);
  }
});
router.get("/stats", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await stats() });
  } catch (e) {
    next(e);
  }
});
router.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await getRefund(String(req.params.id)) });
  } catch (e) {
    next(e);
  }
});
export default router;
