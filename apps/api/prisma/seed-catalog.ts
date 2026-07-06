import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Business data only - game types, pricing, stations. No user accounts here;
// this is safe to run against production. Matches the current printed menu.
export async function seedCatalog() {
  const gameTypes: Array<{
    name: string;
    category: "CONSOLE" | "TABLE" | "BOARD" | "COIN";
    extraControllerPrice?: number;
    priceTiers?: Array<{ durationMinutes: number; price: number }>;
    coinPackages?: Array<{ quantity: number; price: number }>;
    stations: string[];
  }> = [
    {
      name: "PS5",
      category: "CONSOLE",
      extraControllerPrice: 49,
      priceTiers: [
        { durationMinutes: 30, price: 99 },
        { durationMinutes: 60, price: 149 },
      ],
      stations: ["PS5 - Unit 1"],
    },
    {
      name: "PS4",
      category: "CONSOLE",
      extraControllerPrice: 49,
      priceTiers: [
        { durationMinutes: 30, price: 79 },
        { durationMinutes: 60, price: 119 },
      ],
      stations: ["PS4 - Unit 1"],
    },
    {
      name: "PS3",
      category: "CONSOLE",
      extraControllerPrice: 39,
      priceTiers: [
        { durationMinutes: 30, price: 59 },
        { durationMinutes: 60, price: 89 },
      ],
      stations: ["PS3 - Unit 1", "PS3 - Unit 2"],
    },
    {
      name: "Pool",
      category: "TABLE",
      priceTiers: [
        { durationMinutes: 30, price: 99 },
        { durationMinutes: 60, price: 149 },
      ],
      stations: ["Pool Table 1"],
    },
    {
      name: "Foosball",
      category: "TABLE",
      priceTiers: [{ durationMinutes: 15, price: 59 }],
      stations: ["Foosball Table 1"],
    },
    {
      name: "Board Games",
      category: "BOARD",
      priceTiers: [{ durationMinutes: 30, price: 49 }],
      stations: ["Board Games Table"],
    },
    {
      name: "Coin Games",
      category: "COIN",
      coinPackages: [
        { quantity: 6, price: 49 },
        { quantity: 12, price: 89 },
        { quantity: 20, price: 149 },
      ],
      stations: ["Arcade Machine 1"],
    },
  ];

  for (const gt of gameTypes) {
    const gameType = await prisma.gameType.upsert({
      where: { name: gt.name },
      update: {},
      create: {
        name: gt.name,
        category: gt.category,
        extraControllerPrice: gt.extraControllerPrice,
        priceTiers: gt.priceTiers ? { create: gt.priceTiers } : undefined,
        coinPackages: gt.coinPackages ? { create: gt.coinPackages } : undefined,
      },
    });

    for (const label of gt.stations) {
      const existing = await prisma.station.findFirst({ where: { label } });
      if (!existing) {
        await prisma.station.create({ data: { label, gameTypeId: gameType.id } });
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCatalog()
    .then(() => console.log("Catalog seeded: game types, pricing, stations."))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
