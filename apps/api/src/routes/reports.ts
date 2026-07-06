import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.get("/reports/revenue", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const rangeStart = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rangeEnd = to ? new Date(to) : new Date();

    const sessions = await prisma.session.findMany({
      where: {
        paymentStatus: "PAID",
        startTime: { gte: rangeStart, lte: rangeEnd },
      },
      include: { station: { include: { gameType: true } }, loggedByUser: true },
    });

    const byDay = new Map<string, { sessionCount: number; totalRevenue: number }>();
    const byGameType = new Map<string, { sessionCount: number; totalRevenue: number }>();
    const byStaff = new Map<string, { sessionCount: number; totalRevenue: number }>();

    let totalRevenue = 0;

    for (const s of sessions) {
      const amount = Number(s.totalAmount ?? 0);
      totalRevenue += amount;

      const day = s.startTime.toISOString().slice(0, 10);
      bump(byDay, day, amount);
      bump(byGameType, s.station.gameType.name, amount);
      bump(byStaff, s.loggedByUser.name, amount);
    }

    return {
      range: { from: rangeStart.toISOString(), to: rangeEnd.toISOString() },
      totalRevenue: round2(totalRevenue),
      sessionCount: sessions.length,
      byDay: toRows(byDay),
      byGameType: toRows(byGameType),
      byStaff: toRows(byStaff),
    };
  });
}

function bump(map: Map<string, { sessionCount: number; totalRevenue: number }>, key: string, amount: number) {
  const entry = map.get(key) ?? { sessionCount: 0, totalRevenue: 0 };
  entry.sessionCount += 1;
  entry.totalRevenue += amount;
  map.set(key, entry);
}

function toRows(map: Map<string, { sessionCount: number; totalRevenue: number }>) {
  return [...map.entries()]
    .map(([key, v]) => ({ key, sessionCount: v.sessionCount, totalRevenue: round2(v.totalRevenue) }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
