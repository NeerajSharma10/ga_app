import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const gameTypeSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["CONSOLE", "TABLE", "BOARD", "COIN"]),
  extraControllerPrice: z.number().nonnegative().nullable().optional(),
  priceTiers: z.array(z.object({ durationMinutes: z.number().int().positive(), price: z.number().nonnegative() })).optional(),
  coinPackages: z.array(z.object({ quantity: z.number().int().positive(), price: z.number().nonnegative() })).optional(),
});

export async function gameTypeRoutes(fastify: FastifyInstance) {
  fastify.get("/game-types", { preHandler: authenticate }, async () => {
    return prisma.gameType.findMany({
      where: { active: true },
      include: { priceTiers: true, coinPackages: true },
      orderBy: { name: "asc" },
    });
  });

  fastify.post("/game-types", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const parsed = gameTypeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { priceTiers = [], coinPackages = [], ...data } = parsed.data;

    const gameType = await prisma.gameType.create({
      data: {
        ...data,
        priceTiers: { create: priceTiers },
        coinPackages: { create: coinPackages },
      },
      include: { priceTiers: true, coinPackages: true },
    });
    return reply.code(201).send(gameType);
  });

  fastify.put("/game-types/:id", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = gameTypeSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { priceTiers, coinPackages, ...data } = parsed.data;

    const gameType = await prisma.gameType.update({
      where: { id },
      data: {
        ...data,
        ...(priceTiers ? { priceTiers: { deleteMany: {}, create: priceTiers } } : {}),
        ...(coinPackages ? { coinPackages: { deleteMany: {}, create: coinPackages } } : {}),
      },
      include: { priceTiers: true, coinPackages: true },
    });
    return reply.send(gameType);
  });
}
