// Local development only - creates fake staff logins with a known password.
// Never run this against production; use `npm run create-admin` there instead.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCatalog } from "./seed-catalog.js";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { phone: "9999999999" },
    update: {},
    create: { name: "Owner", phone: "9999999999", passwordHash, role: "SUPER_ADMIN" },
  });

  await prisma.user.upsert({
    where: { phone: "8888888888" },
    update: {},
    create: { name: "Floor Staff", phone: "8888888888", passwordHash, role: "ADMIN" },
  });

  await seedCatalog();

  console.log("Dev seed complete. Login with phone 9999999999 / 8888888888, password: admin123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
