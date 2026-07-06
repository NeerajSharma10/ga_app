import type { GameType, PriceTier, Customer, DiscountType } from "@prisma/client";

export interface PriceCalcResult {
  baseAmount: number;
  controllerAddon: number;
  manualDiscountAmount: number;
  membershipDiscountAmount: number;
  totalAmount: number;
}

// Exact-duration tiers win (e.g. PS3 30min=40, 60min=100). If the requested
// duration has no matching tier, prorate off the largest defined tier -
// e.g. no 30min tier defined, 60min=100 -> 30min = 100/60*30 = 50 ("half the value").
// Only call this for duration-priced games (i.e. gameType.priceTiers is non-empty) -
// coin games and other quantity-based types resolve their base amount differently.
export function calculateBaseAmount(gameType: GameType & { priceTiers: PriceTier[] }, durationMinutes: number): number {
  const exact = gameType.priceTiers.find((t) => t.durationMinutes === durationMinutes);
  if (exact) return Number(exact.price);

  if (gameType.priceTiers.length === 0) {
    throw new Error(`GameType "${gameType.name}" has no duration price tiers configured`);
  }

  const reference = gameType.priceTiers.reduce((largest, t) =>
    t.durationMinutes > largest.durationMinutes ? t : largest
  );

  return Number(reference.price) * (durationMinutes / reference.durationMinutes);
}

// Applies controller add-ons, manual discount, and membership discount on top
// of an already-resolved base amount. The caller resolves baseAmount first -
// via a duration tier, a coin package price, or a staff override - so this
// function never needs to know which pricing model a game type uses.
export function priceSession(input: {
  baseAmount: number;
  extraControllers?: number;
  extraControllerPrice?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  customer?: Pick<Customer, "isMember" | "memberDiscountPercent"> | null;
}): PriceCalcResult {
  const { baseAmount, extraControllers = 0, extraControllerPrice, discountType, discountValue, customer } = input;

  const controllerAddon = extraControllers * Number(extraControllerPrice ?? 0);
  const subtotal = baseAmount + controllerAddon;

  const manualDiscountAmount =
    discountType === "PERCENT"
      ? subtotal * ((discountValue ?? 0) / 100)
      : discountType === "AMOUNT"
        ? (discountValue ?? 0)
        : 0;

  const membershipDiscountAmount =
    customer?.isMember && customer.memberDiscountPercent
      ? subtotal * (Number(customer.memberDiscountPercent) / 100)
      : 0;

  const totalAmount = Math.max(0, subtotal - manualDiscountAmount - membershipDiscountAmount);

  return {
    baseAmount: round2(baseAmount),
    controllerAddon: round2(controllerAddon),
    manualDiscountAmount: round2(manualDiscountAmount),
    membershipDiscountAmount: round2(membershipDiscountAmount),
    totalAmount: round2(totalAmount),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
