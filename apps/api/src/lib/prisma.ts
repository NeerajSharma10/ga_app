import { PrismaClient, Prisma } from "@prisma/client";

// Prisma's Decimal (used for every money field: prices, discounts, controller
// fees) serializes to JSON as a *string* by default. Left unpatched, a client
// doing `"49" + 0` gets string concatenation ("490"), not addition - a silent
// pricing bug. Serialize Decimals as real numbers everywhere instead.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function (this: Prisma.Decimal) {
  return this.toNumber();
};

export const prisma = new PrismaClient();
