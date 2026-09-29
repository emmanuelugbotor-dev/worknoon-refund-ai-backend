import { Router } from "express";
import { prisma } from "../config/prisma";
import { notFound } from "../utils/errors";

const router = Router();

router.get("/:id", async (req, res, next) => {
  try {
    const c = await prisma.customer.findUnique({
      where: {
        publicId: String(req.params.id),
      },
      include: {
        orders: {
          include: {
            items: true,
          },
          orderBy: {
            orderDate: "desc",
          },
        },
      },
    });

    if (!c) {
      throw notFound("Customer not found");
    }

    res.json({
      success: true,
      data: {
        id: c.publicId,
        name: c.name,
        email: c.email,

        orders: c.orders.map((o) => ({
          id: o.publicId,
          amount: Number(o.amount),
          orderDate: o.orderDate,
          items: o.items,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
