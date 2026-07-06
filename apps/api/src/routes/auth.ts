import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "phone and password are required" });
    }
    const { phone, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.active) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = fastify.jwt.sign({ id: user.id, role: user.role }, { expiresIn: "12h" });

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  });
}
