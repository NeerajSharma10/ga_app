import type { FastifyRequest, FastifyReply } from "fastify";
import type { AuthUser } from "./auth.js";

export function requireRole(...roles: Array<"ADMIN" | "SUPER_ADMIN">) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser;
    if (!user || !roles.includes(user.role)) {
      reply.code(403).send({ error: "Forbidden" });
    }
  };
}
