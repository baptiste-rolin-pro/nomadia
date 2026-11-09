/**
 * Schéma PostgreSQL (Drizzle ORM). Un seul chemin de migrations : `drizzle/` (drizzle-kit).
 * - Montants : entiers en unités mineures + code devise.
 * - Dates de séjour : type `date` (date civile) ; heures locales : texte AAAA-MM-JJTHH:mm + fuseau IANA.
 * - Instants techniques : timestamptz.
 * - Les statuts de devis, paiement, réservation fournisseur et documents sont modélisés séparément.
 */
import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ---------------------------------------------------------------------------
// Authentification (tables requises par Better Auth)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: ts("createdAt").notNull().defaultNow(),
  updatedAt: ts("updatedAt").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: ts("createdAt").notNull().defaultNow(),
    updatedAt: ts("updatedAt").notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: ts("accessTokenExpiresAt"),
    refreshTokenExpiresAt: ts("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: ts("createdAt").notNull().defaultNow(),
    updatedAt: ts("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("account_userId_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expiresAt").notNull(),
    createdAt: ts("createdAt").notNull().defaultNow(),
    updatedAt: ts("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Profil, préférences, voyageurs enregistrés, consentements
// ---------------------------------------------------------------------------

export const preferences = pgTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  homeAirport: text("home_airport"),
  currency: text("currency").notNull().default("EUR"),
  locale: text("locale").notNull().default("fr-FR"),
  marketingEmails: boolean("marketing_emails").notNull().default(false),
  marketingConsentAt: ts("marketing_consent_at"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const savedTravelers = pgTable(
  "saved_travelers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    birthDate: date("birth_date", { mode: "string" }),
    /** Horodatage du consentement explicite à l'enregistrement. */
    consentAt: ts("consent_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("saved_travelers_user_idx").on(t.userId)],
);

export const consents = pgTable("consents", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // marketing_emails | saved_travelers
  granted: boolean("granted").notNull(),
  source: text("source").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const dataRequests = pgTable("data_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // export | deletion | rectification
  status: text("status").notNull().default("received"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Voyages (planificateur) et favoris
// ---------------------------------------------------------------------------

export const trips = pgTable(
  "trips",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "cascade" }),
    /** Empreinte SHA-256 du cookie anonyme pour un brouillon non rattaché. */
    anonOwnerHash: text("anon_owner_hash"),
    title: text("title").notNull(),
    destinationSlug: text("destination_slug"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    adults: integer("adults").notNull().default(2),
    childrenAges: jsonb("children_ages").$type<number[]>().notNull().default([]),
    budgetTarget: integer("budget_target"),
    currency: text("currency").notNull().default("EUR"),
    notes: text("notes").notNull().default(""),
    transferMarginMinutes: integer("transfer_margin_minutes").notNull().default(90),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("trips_owner_idx").on(t.ownerUserId), index("trips_anon_idx").on(t.anonOwnerHash)],
);

export const tripItems = pgTable(
  "trip_items",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    vertical: text("vertical").notNull(), // flights | hotels | cars
    status: text("status").notNull().default("considered"), // considered | to_book | booking | confirmed
    offerRef: text("offer_ref").notNull(),
    title: text("title").notNull(),
    snapshot: jsonb("snapshot").$type<TripItemSnapshot>().notNull(),
    priceAmount: integer("price_amount").notNull(),
    payOnSiteAmount: integer("pay_on_site_amount").notNull().default(0),
    depositAmount: integer("deposit_amount").notNull().default(0),
    currency: text("currency").notNull().default("EUR"),
    /** valid | stale : une modification de dates invalide le devis et demande une nouvelle recherche. */
    quoteValidity: text("quote_validity").notNull().default("valid"),
    bookingId: text("booking_id"),
    position: integer("position").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("trip_items_trip_idx").on(t.tripId)],
);

export interface TripItemSnapshot {
  subtitle: string;
  segments: { label: string; start: { local: string; timeZone: string }; end: { local: string; timeZone: string }; kind: "flight" | "stay" | "car" }[];
  checkIn?: string;
  checkOut?: string;
  checkInFrom?: string;
  receptionNote?: string;
  agencyHours?: { pickup: string; dropoff: string };
  searchUrl: string;
  detailUrl: string;
  providerMode: string;
}

export const favorites = pgTable(
  "favorites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // destination | hotel
    ref: text("ref").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favorites_unique").on(t.userId, t.kind, t.ref)],
);

// ---------------------------------------------------------------------------
// Devis, réservations, tentatives, paiements
// ---------------------------------------------------------------------------

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  vertical: text("vertical").notNull(),
  providerId: text("provider_id").notNull(),
  providerMode: text("provider_mode").notNull(),
  offerRef: text("offer_ref").notNull(),
  /** active | expired | superseded | accepted */
  status: text("status").notNull().default("active"),
  totalAmount: integer("total_amount").notNull(),
  payNowAmount: integer("pay_now_amount").notNull(),
  payOnSiteAmount: integer("pay_on_site_amount").notNull(),
  depositAmount: integer("deposit_amount"),
  currency: text("currency").notNull(),
  /** Instantané de l'offre normalisée et des conditions présentées au client. */
  snapshot: jsonb("snapshot").notNull(),
  expiresAt: ts("expires_at").notNull(),
  previousQuoteId: text("previous_quote_id"),
  priceChangeAcceptedAt: ts("price_change_accepted_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    vertical: text("vertical").notNull(),
    providerId: text("provider_id").notNull(),
    mode: text("mode").notNull(),
    quoteId: text("quote_id").notNull(),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    guestTokenHash: text("guest_token_hash"),
    guestTokenExpiresAt: ts("guest_token_expires_at"),
    tripItemId: text("trip_item_id"),
    /** travelers | options | review | payment | processing | done */
    step: text("step").notNull().default("travelers"),
    contactEmail: text("contact_email"),
    travelers: jsonb("travelers").$type<unknown[]>().notNull().default([]),
    options: jsonb("options").$type<{ id: string; quantity: number }[]>().notNull().default([]),
    termsAcceptedAt: ts("terms_accepted_at"),
    /** Scénario de démonstration (mode DEMO uniquement). */
    scenario: text("scenario"),
    /** not_required | requires_payment | processing | requires_action | declined | paid | refund_requested | refunded */
    paymentStatus: text("payment_status").notNull().default("requires_payment"),
    /** not_started | pending | confirmed | ticketed | failed | unknown | cancel_requested | cancelled */
    providerStatus: text("provider_status").notNull().default("not_started"),
    providerReference: text("provider_reference"),
    /** none | available */
    documentStatus: text("document_status").notNull().default("none"),
    totalAmount: integer("total_amount").notNull(),
    payNowAmount: integer("pay_now_amount").notNull(),
    payOnSiteAmount: integer("pay_on_site_amount").notNull(),
    currency: text("currency").notNull(),
    cancellationFee: integer("cancellation_fee"),
    refundAmount: integer("refund_amount"),
    confirmationEmailSentAt: ts("confirmation_email_sent_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("bookings_owner_idx").on(t.ownerUserId)],
);

/** Tentative d'action externe (paiement, réservation, annulation) avec clé d'idempotence unique. */
export const bookingAttempts = pgTable(
  "booking_attempts",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // payment | provider_book | cancel
    idempotencyKey: text("idempotency_key").notNull(),
    /** started | succeeded | failed | unknown */
    status: text("status").notNull().default("started"),
    result: jsonb("result"),
    createdAt: ts("created_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
  },
  (t) => [uniqueIndex("booking_attempts_key").on(t.kind, t.idempotencyKey)],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    psp: text("psp").notNull(), // demo
    pspPaymentId: text("psp_payment_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    /** processing | requires_action | declined | succeeded | refund_requested | refunded */
    status: text("status").notNull(),
    refundAmount: integer("refund_amount"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_idem").on(t.idempotencyKey),
    uniqueIndex("payments_psp_id").on(t.pspPaymentId),
    /** Un seul paiement actif par réservation, quelle que soit la clé : seul un refus autorise une nouvelle tentative. */
    uniqueIndex("payments_active_booking").on(t.bookingId).where(sql`${t.status} <> 'declined'`),
  ],
);

/** Événements reçus (webhooks) : déduplication par identifiant d'événement. */
export const receivedEvents = pgTable(
  "received_events",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: ts("received_at").notNull().defaultNow(),
    processedAt: ts("processed_at"),
    outcome: text("outcome"),
  },
  (t) => [uniqueIndex("received_events_unique").on(t.source, t.eventId)],
);

/** File de tâches durable (réconciliation, émission, remboursement). */
export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    uniqueKey: text("unique_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"), // pending | done | failed
    runAfter: ts("run_after").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("jobs_unique_key").on(t.uniqueKey)],
);

export const incidents = pgTable("incidents", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // paid_booking_failed | provider_outcome_unknown
  status: text("status").notNull().default("open"), // open | compensation_pending | resolved
  detail: text("detail").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  resolvedAt: ts("resolved_at"),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // demo_summary
  title: text("title").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Système du fournisseur DEMO : simule la mémoire d'un fournisseur externe (idempotence, récupération). */
export const demoProviderRecords = pgTable(
  "demo_provider_records",
  {
    id: text("id").primaryKey(),
    vertical: text("vertical").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    reference: text("reference").notNull(),
    status: text("status").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("demo_provider_idem").on(t.idempotencyKey), uniqueIndex("demo_provider_ref").on(t.reference)],
);

// ---------------------------------------------------------------------------
// Journal, emails, mesure, contact
// ---------------------------------------------------------------------------

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorType: text("actor_type").notNull(), // user | guest | admin | system
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  /** Métadonnées sans données personnelles. */
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: text("id").primaryKey(),
    to: text("to_address").notNull(),
    subject: text("subject").notNull(),
    text: text("text").notNull(),
    template: text("template").notNull(),
    dedupeKey: text("dedupe_key"),
    /** captured (non envoyé, mode local) | sent | failed */
    status: text("status").notNull(),
    transport: text("transport").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("email_outbox_dedupe").on(t.dedupeKey)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    clientEventId: text("client_event_id").notNull(),
    name: text("name").notNull(),
    vertical: text("vertical"),
    props: jsonb("props").$type<Record<string, string | number | boolean>>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("analytics_client_event").on(t.clientEventId)],
);

export const contactMessages = pgTable("contact_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});
