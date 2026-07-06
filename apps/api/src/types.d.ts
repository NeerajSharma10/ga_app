import "@fastify/jwt";
import type { AuthUser } from "./middleware/auth.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}
