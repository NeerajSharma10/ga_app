import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import "dotenv/config";
import { authRoutes } from "./routes/auth.js";
import { gameTypeRoutes } from "./routes/game-types.js";
import { stationRoutes } from "./routes/stations.js";
import { customerRoutes } from "./routes/customers.js";
import { sessionRoutes } from "./routes/sessions.js";
import { receiptRoutes } from "./routes/receipts.js";
import { reportRoutes } from "./routes/reports.js";
import { userRoutes } from "./routes/users.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });
await fastify.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret-change-me" });

await fastify.register(authRoutes);
await fastify.register(gameTypeRoutes);
await fastify.register(stationRoutes);
await fastify.register(customerRoutes);
await fastify.register(sessionRoutes);
await fastify.register(receiptRoutes);
await fastify.register(reportRoutes);
await fastify.register(userRoutes);

fastify.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
fastify.listen({ port, host: "0.0.0.0" }).catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
