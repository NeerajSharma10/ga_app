// Types shared between apps/api and apps/mobile so both sides agree on shapes.

// India-only: mobile numbers are 10 digits, starting 6-9 (no country code stored).
export const INDIA_PHONE_REGEX = /^[6-9]\d{9}$/;

export function isValidIndianPhone(phone: string): boolean {
  return INDIA_PHONE_REGEX.test(phone);
}

export type Role = "ADMIN" | "SUPER_ADMIN";
export type GameCategory = "CONSOLE" | "TABLE" | "BOARD" | "COIN";
export type StationStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE";
export type PaymentType = "CASH" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID";
export type DiscountType = "PERCENT" | "AMOUNT";

export interface UserDTO {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  role: Role;
  active: boolean;
}

export interface PriceTierDTO {
  id: number;
  durationMinutes: number;
  price: number;
}

export interface CoinPackageDTO {
  id: number;
  quantity: number;
  price: number;
}

export interface GameTypeDTO {
  id: number;
  name: string;
  category: GameCategory;
  extraControllerPrice: number | null;
  active: boolean;
  priceTiers: PriceTierDTO[];
  coinPackages: CoinPackageDTO[];
}

export interface StationDTO {
  id: number;
  label: string;
  gameTypeId: number;
  gameType?: GameTypeDTO;
  status: StationStatus;
}

export interface CustomerDTO {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
  isMember: boolean;
  memberDiscountPercent: number | null;
}

export interface SessionDTO {
  id: number;
  stationId: number;
  station?: StationDTO;
  customerId: number;
  customer?: CustomerDTO;
  loggedByUserId: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  extraControllers: number;
  baseAmount: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountReason: string | null;
  totalAmount: number | null;
  paymentType: PaymentType | null;
  paymentStatus: PaymentStatus;
  notes: string | null;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserDTO;
}

export interface StartSessionRequest {
  stationId: number;
  customerId: number;
  durationMinutes?: number; // required unless the game is coin/package-based
  coinPackageId?: number; // required for COIN category game types
  extraControllers?: number;
  baseAmountOverride?: number; // staff can override the auto-picked price
  discountType?: DiscountType;
  discountValue?: number;
  discountReason?: string;
  notes?: string;
}

// Shared by PUT /sessions/:id/pay (collects payment, station stays occupied)
// and PUT /sessions/:id/end (frees the station; also collects payment if it
// wasn't already taken via /pay).
export interface PaymentInputRequest {
  paymentType?: PaymentType; // required unless the session was already paid via /pay
  durationMinutes?: number; // if extended, updated final duration
  totalAmountOverride?: number; // staff-confirmed final amount
}

export interface RevenueReportRow {
  date: string;
  gameTypeName: string;
  staffName: string;
  sessionCount: number;
  totalRevenue: number;
}
