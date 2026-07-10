import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { INDIA_PHONE_REGEX } from "@ga-app/shared-types";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const phoneField = z.string().regex(INDIA_PHONE_REGEX, "Enter a valid 10-digit Indian mobile number");

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: phoneField,
  address: z.string().optional(),
});

const membershipSchema = z.object({
  isMember: z.boolean(),
  memberDiscountPercent: z.number().min(0).max(100).nullable().optional(),
});

export async function customerRoutes(fastify: FastifyInstance) {
  // Every customer is looked up by their mobile number - this is the primary
  // "does this customer already exist" check staff does when starting a
  // session. A partial phone number returns every customer whose number
  // starts with those digits (powers autocomplete as staff types); a full
  // number naturally narrows to at most one match, since phone is unique.
  fastify.get("/customers", { preHandler: authenticate }, async (request, reply) => {
    const { phone } = request.query as { phone?: string };
    if (phone) {
      const matches = await prisma.customer.findMany({
        where: { phone: { startsWith: phone } },
        orderBy: { name: "asc" },
        take: 10,
      });
      return reply.send(matches);
    }
    return prisma.customer.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  });

  fastify.post("/customers", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createCustomerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const existing = await prisma.customer.findUnique({ where: { phone: parsed.data.phone } });
    if (existing) return reply.code(409).send({ error: "A customer with this mobile number already exists", customer: existing });

    const customer = await prisma.customer.create({ data: parsed.data });
    return reply.code(201).send(customer);
  });

  fastify.put("/customers/:id/membership", { preHandler: [authenticate, requireRole("SUPER_ADMIN", "ADMIN")] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = membershipSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
    return reply.send(customer);
  });
}
