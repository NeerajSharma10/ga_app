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

  // One row per completed session in a date range - "which customer played
  // which game for how much" - downloadable as a spreadsheet. Accepts either
  // a single `date`, or a `from`/`to` range (both inclusive, by calendar day).
  fastify.get("/reports/sessions.csv", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const { date, from, to } = request.query as { date?: string; from?: string; to?: string };
    const startDay = from ?? date ?? new Date().toISOString().slice(0, 10);
    const endDay = to ?? date ?? startDay;
    const rangeStart = new Date(`${startDay}T00:00:00`);
    const rangeEnd = new Date(`${endDay}T23:59:59.999`);

    const sessions = await prisma.session.findMany({
      where: { startTime: { gte: rangeStart, lte: rangeEnd } },
      include: {
        station: { include: { gameType: true } },
        customer: true,
        loggedByUser: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const header = [
      "Date",
      "Time",
      "Customer Name",
      "Customer Phone",
      "Game",
      "Station",
      "Duration (min)",
      "Amount (INR)",
      "Payment Method",
      "Payment Status",
      "Staff",
    ];

    const rows = sessions.map((s) => [
      s.startTime.toISOString().slice(0, 10),
      s.startTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      s.customer.name,
      s.customer.phone,
      s.station.gameType.name,
      s.station.label,
      s.durationMinutes ?? "",
      Number(s.totalAmount ?? s.baseAmount),
      s.paymentType ?? "",
      s.paymentStatus,
      s.loggedByUser.name,
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

    const filenameSuffix = startDay === endDay ? startDay : `${startDay}_to_${endDay}`;
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="sessions-${filenameSuffix}.csv"`);
    return reply.send(csv);
  });
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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
