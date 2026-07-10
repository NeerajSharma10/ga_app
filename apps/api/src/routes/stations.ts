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
      where: { active: true, gameType: { active: true } },
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

  // Soft delete, same reasoning as GameType - a hard delete would break the
  // foreign key from any session that was ever logged on this station.
  fastify.delete("/stations/:id", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const station = await prisma.station.findUnique({ where: { id } });
    if (!station) return reply.code(404).send({ error: "Station not found" });
    if (station.status === "IN_USE") return reply.code(409).send({ error: "Station is currently in use" });

    await prisma.station.update({ where: { id }, data: { active: false } });
    return reply.code(204).send();
  });
}
