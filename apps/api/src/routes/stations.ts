import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const stationSchema = z.object({
  label: z.string().min(1),
  gameTypeId: z.number().int(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE"]).optional(),
});

export async function stationRoutes(fastify: FastifyInstance) {
  fastify.get("/stations", { preHandler: authenticate }, async () => {
    return prisma.station.findMany({
      include: { gameType: { include: { priceTiers: true, coinPackages: true } } },
      orderBy: { label: "asc" },
    });
  });

  fastify.post("/stations", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const parsed = stationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const station = await prisma.station.create({
      data: parsed.data,
      include: { gameType: { include: { priceTiers: true, coinPackages: true } } },
    });
    return reply.code(201).send(station);
  });

  fastify.put("/stations/:id", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = stationSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const station = await prisma.station.update({
      where: { id },
      data: parsed.data,
      include: { gameType: { include: { priceTiers: true, coinPackages: true } } },
    });
    return reply.send(station);
  });
}
