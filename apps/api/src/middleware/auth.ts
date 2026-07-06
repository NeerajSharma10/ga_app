import type { FastifyRequest, FastifyReply } from "fastify";

export interface AuthUser {
  id: number;
  role: "ADMIN" | "SUPER_ADMIN";
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Unauthorized" });
  }
}
