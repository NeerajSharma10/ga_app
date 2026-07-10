import type { FastifyInstance } from "fastify";
import type { GameType, PriceTier, Customer, DiscountType, Session } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { calculateBaseAmount, priceSession } from "../lib/pricing.js";
import type { AuthUser } from "../middleware/auth.js";

const startSessionSchema = z.object({
  stationId: z.number().int(),
  customerId: z.number().int(),
  durationMinutes: z.number().int().positive().optional(), // required unless the game is coin/package-based
  coinPackageId: z.number().int().optional(), // required for COIN category game types
  extraControllers: z.number().int().min(0).optional(),
  baseAmountOverride: z.number().nonnegative().optional(), // staff can override the auto-picked price
  discountType: z.enum(["PERCENT", "AMOUNT"]).optional(),
  discountValue: z.number().nonnegative().optional(),
  discountReason: z.string().optional(),
  notes: z.string().optional(),
});

// Used by both /pay (collect payment, keep the station occupied) and /end
// (payment already collected, or collect it now, then free the station).
const paymentInputSchema = z.object({
  paymentType: z.enum(["CASH", "ONLINE"]).optional(),
  durationMinutes: z.number().int().positive().optional(), // set if the session was extended
  totalAmountOverride: z.number().nonnegative().optional(),
});

type SessionWithPricingContext = Session & {
  station: { gameType: GameType & { priceTiers: PriceTier[] } };
  customer: Customer;
};

// Re-derives duration + total for a session that's being paid or ended.
// Duration-based sessions only get re-priced off a tier if the duration
// actually changed (an extension); otherwise this keeps the base amount
// resolved at start time, so a staff override made then isn't discarded.
function resolvePricing(
  session: SessionWithPricingContext,
  input: { durationMinutes?: number; totalAmountOverride?: number; discountType?: DiscountType | null; discountValue?: number | null }
) {
  const isCoin = session.station.gameType.category === "COIN";
  const durationExtended = !isCoin && input.durationMinutes !== undefined && input.durationMinutes !== session.durationMinutes;

  const finalDuration = isCoin ? null : (input.durationMinutes ?? session.durationMinutes ?? 0);
  const baseAmount = durationExtended
    ? calculateBaseAmount(session.station.gameType, finalDuration ?? 0)
    : Number(session.baseAmount);

  const priced = priceSession({
    baseAmount,
    extraControllers: session.extraControllers,
    extraControllerPrice: session.station.gameType.extraControllerPrice
      ? Number(session.station.gameType.extraControllerPrice)
      : null,
    discountType: session.discountType,
    discountValue: session.discountValue ? Number(session.discountValue) : undefined,
    customer: session.customer,
  });

  return { finalDuration, totalAmount: input.totalAmountOverride ?? priced.totalAmount };
}

export async function sessionRoutes(fastify: FastifyInstance) {
  fastify.get("/sessions", { preHandler: authenticate }, async (request) => {
    const { date, stationId, staffId, customerId, active } = request.query as {
      date?: string;
      stationId?: string;
      staffId?: string;
      customerId?: string;
      active?: string;
    };
    return prisma.session.findMany({
      where: {
        ...(stationId ? { stationId: Number(stationId) } : {}),
        ...(staffId ? { loggedByUserId: Number(staffId) } : {}),
        ...(customerId ? { customerId: Number(customerId) } : {}),
        ...(date ? { startTime: { gte: new Date(`${date}T00:00:00`), lt: new Date(`${date}T23:59:59`) } } : {}),
        ...(active === "true" ? { endTime: null } : {}),
      },
      include: {
        station: { include: { gameType: true } },
        customer: true,
        loggedByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { startTime: "desc" },
      take: 200,
    });
  });

  fastify.post("/sessions", { preHandler: authenticate }, async (request, reply) => {
    const parsed = startSessionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const data = parsed.data;
    const authUser = request.user as AuthUser;

    const station = await prisma.station.findUnique({
      where: { id: data.stationId },
      include: { gameType: { include: { priceTiers: true, coinPackages: true } } },
    });
    if (!station) return reply.code(404).send({ error: "Station not found" });
    if (station.status !== "AVAILABLE") return reply.code(409).send({ error: "Station is not available" });

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return reply.code(404).send({ error: "Customer not found" });

    // Resolve the base amount according to how this game type is priced -
    // a staff override always wins, then coin package (quantity-based games),
    // then duration price tiers. This must happen before any addon/discount
    // math so a game with no duration tiers (e.g. Coin Games) never crashes.
    let baseAmount: number;
    if (data.baseAmountOverride !== undefined) {
      baseAmount = data.baseAmountOverride;
    } else if (station.gameType.category === "COIN") {
      if (!data.coinPackageId) return reply.code(400).send({ error: "Pick a coin package for this game" });
      const pkg = station.gameType.coinPackages.find((p) => p.id === data.coinPackageId);
      if (!pkg) return reply.code(400).send({ error: "Invalid coin package for this game" });
      baseAmount = Number(pkg.price);
    } else {
      if (!data.durationMinutes) return reply.code(400).send({ error: "Duration is required for this game" });
      baseAmount = calculateBaseAmount(station.gameType, data.durationMinutes);
    }

    const priced = priceSession({
      baseAmount,
      extraControllers: data.extraControllers,
      extraControllerPrice: station.gameType.extraControllerPrice ? Number(station.gameType.extraControllerPrice) : null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      customer,
    });

    // Station update runs first so the session's nested `station.status` in
    // the response reflects IN_USE rather than a stale pre-update read.
    const [, session] = await prisma.$transaction([
      prisma.station.update({ where: { id: data.stationId }, data: { status: "IN_USE" } }),
      prisma.session.create({
        data: {
          stationId: data.stationId,
          customerId: data.customerId,
          loggedByUserId: authUser.id,
          durationMinutes: data.durationMinutes,
          extraControllers: data.extraControllers ?? 0,
          baseAmount: priced.baseAmount,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountReason: data.discountReason,
          notes: data.notes,
        },
        include: { station: { include: { gameType: true } }, customer: true },
      }),
    ]);

    return reply.code(201).send({ ...session, pricePreview: priced });
  });

  // Collects payment (e.g. a prepaid fixed-duration booking) WITHOUT ending
  // the session or freeing the station - the customer is still playing.
  fastify.put("/sessions/:id/pay", { preHandler: authenticate }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = paymentInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const data = parsed.data;
    if (!data.paymentType) return reply.code(400).send({ error: "Payment method is required" });

    const session = await prisma.session.findUnique({
      where: { id },
      include: { station: { include: { gameType: { include: { priceTiers: true } } } }, customer: true },
    });
    if (!session) return reply.code(404).send({ error: "Session not found" });
    if (session.endTime) return reply.code(409).send({ error: "Session already ended" });
    if (session.paymentStatus === "PAID") return reply.code(409).send({ error: "Session is already paid" });

    const { finalDuration, totalAmount } = resolvePricing(session, data);

    const updated = await prisma.session.update({
      where: { id },
      data: {
        durationMinutes: finalDuration,
        totalAmount,
        paymentType: data.paymentType,
        paymentStatus: "PAID",
      },
      include: { station: { include: { gameType: true } }, customer: true },
    });

    return reply.send(updated);
  });

  // Frees the station - the customer is actually leaving. If payment hasn't
  // been collected yet (the "pay when done" flow), it's collected here too.
  fastify.put("/sessions/:id/end", { preHandler: authenticate }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = paymentInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const data = parsed.data;

    const session = await prisma.session.findUnique({
      where: { id },
      include: { station: { include: { gameType: { include: { priceTiers: true } } } }, customer: true },
    });
    if (!session) return reply.code(404).send({ error: "Session not found" });
    if (session.endTime) return reply.code(409).send({ error: "Session already ended" });

    const alreadyPaid = session.paymentStatus === "PAID";
    if (!alreadyPaid && !data.paymentType) {
      return reply.code(400).send({ error: "Payment method is required" });
    }

    // Already paid upfront: don't re-price off a possibly-changed duration -
    // the amount was locked in when payment was collected.
    const { finalDuration, totalAmount } = alreadyPaid
      ? { finalDuration: session.durationMinutes, totalAmount: Number(session.totalAmount) }
      : resolvePricing(session, data);

    const [, updated] = await prisma.$transaction([
      prisma.station.update({ where: { id: session.stationId }, data: { status: "AVAILABLE" } }),
      prisma.session.update({
        where: { id },
        data: {
          endTime: new Date(),
          durationMinutes: finalDuration,
          totalAmount,
          paymentType: alreadyPaid ? session.paymentType : data.paymentType,
          paymentStatus: "PAID",
        },
        include: { station: { include: { gameType: true } }, customer: true },
      }),
    ]);

    return reply.send(updated);
  });
}
