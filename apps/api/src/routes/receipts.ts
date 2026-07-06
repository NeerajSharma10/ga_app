import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { buildReceiptPdf } from "../lib/receipt.js";

export async function receiptRoutes(fastify: FastifyInstance) {
  fastify.get("/sessions/:id/receipt.pdf", { preHandler: authenticate }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const session = await prisma.session.findUnique({
      where: { id },
      include: { station: { include: { gameType: true } }, customer: true, loggedByUser: true },
    });
    if (!session) return reply.code(404).send({ error: "Session not found" });
    if (!session.endTime) return reply.code(409).send({ error: "Session is not complete yet" });

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="receipt-${session.id}.pdf"`);

    const doc = buildReceiptPdf(session);
    return reply.send(doc);
  });
}
