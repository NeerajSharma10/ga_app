// Interactive script for creating the real first Super Admin account in
// production. Run once after deploying: `npm run create-admin`.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { INDIA_PHONE_REGEX } from "@ga-app/shared-types";

const prisma = new PrismaClient();
const rl = createInterface({ input: stdin, output: stdout });

async function main() {
  console.log("Create the Super Admin (owner) account.\n");

  const name = await rl.question("Name: ");
  if (!name.trim()) throw new Error("Name is required");

  const phone = await rl.question("Mobile number (10 digits): ");
  if (!INDIA_PHONE_REGEX.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number");

  const password = await rl.question("Password (min 8 characters): ");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new Error(`A user with phone ${phone} already exists`);

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, phone, passwordHash, role: "SUPER_ADMIN" } });

  console.log(`\nDone. ${name} can now log in with phone ${phone}.`);
}

main()
  .catch((err) => {
    console.error("\nFailed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    prisma.$disconnect();
  });
