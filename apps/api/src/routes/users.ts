import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { INDIA_PHONE_REGEX } from "@ga-app/shared-types";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const createUserSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(INDIA_PHONE_REGEX, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
});

const updateUserSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).optional(),
});

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/users", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async () => {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return users.map(({ passwordHash, ...rest }) => rest);
  });

  fastify.post("/users", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { password, ...data } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) return reply.code(409).send({ error: "A staff account with this mobile number already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { ...data, passwordHash } });
    const { passwordHash: _omit, ...safeUser } = user;
    return reply.code(201).send(safeUser);
  });

  fastify.put("/users/:id", { preHandler: [authenticate, requireRole("SUPER_ADMIN")] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    const { passwordHash: _omit, ...safeUser } = user;
    return reply.send(safeUser);
  });
}
