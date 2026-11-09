import type { Money } from "@/lib/money";
import type { CivilDate, LocalDateTime } from "@/lib/dates";

export type ProviderMode = "demo" | "sandbox" | "live";
export type Vertical = "flights" | "hotels" | "cars";
export type Capability = "search" | "reprice" | "book" | "retrieve" | "cancel" | "modify" | "ancillaries" | "redirect";

export const VERTICAL_LABELS: Record<Vertical, string> = {
  flights: "Vols",
  hotels: "Hôtels",
  cars: "Voitures",
};

export interface ProviderInfo {
  id: string;
  name: string;
  vertical: Vertical;
  mode: ProviderMode;
  capabilities: Capability[];
  /** Les accès nécessaires sont-ils présents dans la configuration serveur ? */
  configured: boolean;
  /** Interlocuteur responsable de la prestation, affiché dans le tunnel. */
  sellerOfRecord: string;
  note: string;
}

export type ProviderErrorCode =
  | "NOT_CONFIGURED"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "INVALID_REQUEST"
  | "OFFER_NOT_FOUND"
  | "OFFER_EXPIRED"
  | "CAPABILITY_UNSUPPORTED"
  | "SALES_NOT_APPROVED";

export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface ZonedTime {
  local: LocalDateTime;
  timeZone: string;
}

export type Payable = "now" | "on_site";

export interface PriceLine {
  label: string;
  amount: Money;
  kind: "base" | "tax" | "fee" | "option";
  payable: Payable;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  /** Total de la prestation (payé maintenant + payable sur place). Le dépôt de garantie n'est jamais inclus. */
  total: Money;
  payNow: Money;
  payOnSite: Money;
  /** Dépôt de garantie : empreinte/blocage, pas un encaissement. */
  deposit: Money | null;
  taxes: "included" | "excluded" | "unknown";
  notes: string[];
}

export interface CancellationPolicy {
  refundable: boolean;
  freeUntil: ZonedTime | null;
  feeAfter: Money | null;
  summary: string;
}

/** Qui encaisse : la plateforme, le fournisseur, l'établissement ou l'agence. */
export type PaymentCollector = "platform" | "provider" | "property" | "agency";

export interface AncillaryDef {
  id: string;
  label: string;
  description: string;
  unitPrice: Money;
  per: "booking" | "passenger" | "day" | "room_night";
  payable: Payable;
  maxQuantity: number;
  /** Disponibilité confirmée par le fournisseur ou simple demande. */
  guaranteed: boolean;
}

export interface SelectedOption {
  id: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Vols
// ---------------------------------------------------------------------------

export type Cabin = "economy" | "premium_economy" | "business" | "first";

export const CABIN_LABELS: Record<Cabin, string> = {
  economy: "Économique",
  premium_economy: "Premium économique",
  business: "Affaires",
  first: "Première",
};

export interface Carrier {
  code: string;
  name: string;
  fictional: boolean;
}

export interface AirportRef {
  code: string;
  name: string;
  city: string;
  timeZone: string;
  terminal?: string;
}

export interface FlightSegment {
  marketingCarrier: Carrier;
  operatingCarrier: Carrier;
  flightNumber: string;
  origin: AirportRef;
  destination: AirportRef;
  departure: ZonedTime;
  arrival: ZonedTime;
  durationMinutes: number;
}

export interface Layover {
  airport: AirportRef;
  minutes: number;
  overnight: boolean;
  /** Correspondance non protégée sur billets séparés : récupération des bagages et nouvel enregistrement. */
  selfTransfer: boolean;
}

export interface FlightSlice {
  segments: FlightSegment[];
  durationMinutes: number;
  stops: number;
  layovers: Layover[];
  /** Nombre de jours entre départ et arrivée en heures locales (« +1 »). */
  dayShift: number;
}

export type ConditionLevel = "no" | "with_fee" | "free";

export interface FareFamily {
  code: string;
  name: string;
  cabin: Cabin;
  personalItem: boolean;
  cabinBags: number;
  checkedBags: number;
  checkedBagKg: number | null;
  change: ConditionLevel;
  changeFee: Money | null;
  refund: ConditionLevel;
  refundFee: Money | null;
  seatSelection: "included" | "paid" | "unavailable";
  conditionsKnown: boolean;
}

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightOffer {
  id: string;
  providerId: string;
  mode: ProviderMode;
  slices: FlightSlice[];
  fare: FareFamily;
  validatingCarrier: Carrier;
  passengers: PassengerCounts;
  price: PriceBreakdown;
  perPassenger: { type: "adult" | "child" | "infant"; count: number; unit: Money }[];
  /** Billets séparés : la correspondance n'est pas protégée. */
  separateTickets: boolean;
  expiresAt: string;
  paymentCollector: PaymentCollector;
}

// ---------------------------------------------------------------------------
// Hôtels
// ---------------------------------------------------------------------------

export type Board = "room_only" | "breakfast" | "half_board";

export const BOARD_LABELS: Record<Board, string> = {
  room_only: "Sans repas",
  breakfast: "Petit-déjeuner inclus",
  half_board: "Demi-pension",
};

export interface HotelProperty {
  id: string;
  name: string;
  fictional: boolean;
  category: number | null;
  categoryNote: string;
  city: string;
  destinationSlug: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  timeZone: string;
  description: string;
  amenities: string[];
  checkInFrom: string;
  checkInUntil: string | null;
  checkOutUntil: string;
  receptionNote: string;
}

export interface RoomType {
  id: string;
  name: string;
  beds: string;
  sizeM2: number;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  amenities: string[];
}

export interface RoomOccupancy {
  adults: number;
  childrenAges: number[];
}

export interface HotelRateOffer {
  id: string;
  providerId: string;
  mode: ProviderMode;
  hotelId: string;
  room: RoomType;
  rateName: string;
  board: Board;
  cancellation: CancellationPolicy;
  paymentCollector: PaymentCollector;
  checkIn: CivilDate;
  checkOut: CivilDate;
  nights: number;
  rooms: RoomOccupancy[];
  nightly: { date: CivilDate; amount: Money }[];
  averagePerNight: Money;
  price: PriceBreakdown;
  expiresAt: string;
}

export interface HotelSearchResult {
  hotel: HotelProperty;
  cheapest: HotelRateOffer;
  rateCount: number;
  freeCancellationAvailable: boolean;
  boards: Board[];
}

// ---------------------------------------------------------------------------
// Voitures
// ---------------------------------------------------------------------------

export interface RentalSupplier {
  id: string;
  name: string;
  fictional: boolean;
}

export interface RentalAgency {
  id: string;
  supplierId: string;
  name: string;
  placeId: string;
  address: string;
  access: "terminal" | "shuttle" | "city";
  accessNote: string;
  opens: string;
  closes: string;
  timeZone: string;
}

export const ENERGY_LABELS: Record<string, string> = { petrol: "Essence", diesel: "Diesel", hybrid: "Hybride", electric: "Électrique" };

export interface CarOffer {
  id: string;
  providerId: string;
  mode: ProviderMode;
  supplier: RentalSupplier;
  pickupAgency: RentalAgency;
  returnAgency: RentalAgency;
  pickup: ZonedTime;
  dropoff: ZonedTime;
  rentalDays: number;
  category: string;
  acriss: string;
  exampleModel: string;
  modelGuaranteed: boolean;
  transmission: "manual" | "automatic";
  seats: number;
  doors: number;
  bagsLarge: number;
  bagsSmall: number;
  energy: "petrol" | "diesel" | "hybrid" | "electric";
  airConditioning: boolean;
  mileage: { unlimited: boolean; kmPerDay: number | null; extraKmFee: Money | null };
  fuelPolicy: string;
  deposit: Money;
  excess: Money;
  coverages: string[];
  driverAge: number;
  youngDriverFeePerDay: Money | null;
  oneWayFee: Money | null;
  licenceRequirement: string;
  cardRequirement: string;
  paymentCollector: PaymentCollector;
  price: PriceBreakdown;
  extras: AncillaryDef[];
  bookable: boolean;
  blockingReasons: string[];
  suggestedPickup: ZonedTime | null;
  suggestedDropoff: ZonedTime | null;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Offre normalisée pour le tunnel de réservation (commune aux verticales)
// ---------------------------------------------------------------------------

export type TravelerRequirement =
  | { kind: "passengers"; adults: number; children: number; infants: number; travelStart: CivilDate; travelEnd: CivilDate }
  | { kind: "guests"; rooms: number; travelStart: CivilDate; travelEnd: CivilDate }
  | { kind: "driver"; declaredAge: number; travelStart: CivilDate; travelEnd: CivilDate };

export interface Bookable {
  vertical: Vertical;
  offerRef: string;
  providerId: string;
  providerName: string;
  mode: ProviderMode;
  title: string;
  subtitle: string;
  start: ZonedTime;
  end: ZonedTime;
  summaryLines: string[];
  travelers: TravelerRequirement;
  price: PriceBreakdown;
  cancellation: CancellationPolicy;
  conditions: string[];
  paymentCollector: PaymentCollector;
  sellerOfRecord: string;
  ancillaries: AncillaryDef[];
  /** URL de recherche permettant de relancer les mêmes critères. */
  searchUrl: string;
  bookable: boolean;
  blockingReasons: string[];
  /** Pour un vol : le fournisseur distingue-t-il dossier créé et billet émis ? */
  ticketingSeparate: boolean;
}

export interface TravelerInput {
  type: "adult" | "child" | "infant" | "guest" | "driver";
  firstName: string;
  lastName: string;
  birthDate: string | null;
}

export type ProviderBookingStatus = "pending" | "confirmed" | "ticketed" | "failed" | "unknown" | "cancelled";

export interface ProviderBookingResult {
  status: ProviderBookingStatus;
  providerReference: string | null;
  message: string;
}

export interface BookRequest {
  bookingId: string;
  offerRef: string;
  expectedTotal: Money;
  travelers: TravelerInput[];
  options: SelectedOption[];
  idempotencyKey: string;
  scenario: string | null;
}

export interface CancellationQuote {
  allowed: boolean;
  fee: Money;
  refund: Money;
  message: string;
}

export interface BookingOps {
  info: ProviderInfo;
  /** Actualise l'offre (prix et disponibilité) à partir de sa référence. Le prix revient du fournisseur. */
  reprice(offerRef: string, ctx: OpContext): Promise<Bookable>;
  book(req: BookRequest, ctx: OpContext): Promise<ProviderBookingResult>;
  /** Récupère l'état réel côté fournisseur (réconciliation après incertitude). */
  retrieve(lookup: { providerReference: string | null; idempotencyKey: string }, ctx: OpContext): Promise<ProviderBookingResult>;
  cancellationQuote(providerReference: string, ctx: OpContext): Promise<CancellationQuote>;
  cancel(providerReference: string, idempotencyKey: string, ctx: OpContext): Promise<{ status: "cancelled" | "failed"; fee: { amount: number; currency: string }; refund: { amount: number; currency: string } }>;
}

export interface OpContext {
  scenario?: string | null;
  signal?: AbortSignal;
}
