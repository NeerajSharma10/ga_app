import type { GameTypeDTO, DiscountType } from "@ga-app/shared-types";

// Client-side mirror of the server's pricing rule, used only to show a live
// preview before submit. The server recalculates and is the source of truth.
// Only meaningful for duration-priced games (non-empty priceTiers) - coin
// games resolve their base amount from a chosen CoinPackage instead.
export function previewBaseAmount(gameType: GameTypeDTO, durationMinutes: number): number {
  const exact = gameType.priceTiers.find((t) => t.durationMinutes === durationMinutes);
  if (exact) return exact.price;

  if (gameType.priceTiers.length === 0) return 0;

  const reference = gameType.priceTiers.reduce((largest, t) => (t.durationMinutes > largest.durationMinutes ? t : largest));
  return round2(reference.price * (durationMinutes / reference.durationMinutes));
}

export interface PricePreview {
  baseAmount: number;
  controllerAddon: number;
  manualDiscountAmount: number;
  membershipDiscountAmount: number;
  totalAmount: number;
}

// baseAmount must already be resolved by the caller (from a duration tier,
// a coin package price, or a staff override) before calling this - it only
// applies controller add-ons and discounts on top.
export function previewSessionPrice(params: {
  baseAmount: number;
  gameType: GameTypeDTO;
  extraControllers: number;
  discountType?: DiscountType;
  discountValue?: number;
  memberDiscountPercent?: number | null;
  isMember?: boolean;
}): PricePreview {
  const { baseAmount } = params;
  const controllerAddon = params.extraControllers * (params.gameType.extraControllerPrice ?? 0);
  const subtotal = baseAmount + controllerAddon;

  const manualDiscountAmount =
    params.discountType === "PERCENT"
      ? subtotal * ((params.discountValue ?? 0) / 100)
      : params.discountType === "AMOUNT"
        ? (params.discountValue ?? 0)
        : 0;

  const membershipDiscountAmount =
    params.isMember && params.memberDiscountPercent ? subtotal * (params.memberDiscountPercent / 100) : 0;

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
