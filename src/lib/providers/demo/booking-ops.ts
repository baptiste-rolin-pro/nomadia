import "server-only";
/**
 * Opérations de réservation du fournisseur DEMO. Elles simulent un système externe :
 * - mémoire propre (table demo_provider_records) avec idempotence par clé ;
 * - délai dépassé simulé : la réservation est créée chez le « fournisseur » mais la réponse est perdue ;
 * - émission différée des billets (dossier créé ≠ billet émis) ;
 * - annulation avec frais selon les conditions de l'offre.
 * Aucune transaction réelle n'est effectuée.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { demoProviderRecords } from "@/lib/db/schema";
import { nowMs } from "@/lib/clock";
import { localToUtc } from "@/lib/dates";
import { money, multiply, ratio, sum, zero, type Money } from "@/lib/money";
import { opaqueId, prefixedId } from "@/lib/security";
import { computeTotals } from "@/lib/booking/pricing";
import { rentalDays } from "@/lib/providers/demo/cars";
import { ProviderError, type Bookable, type BookingOps, type BookRequest, type OpContext, type ProviderBookingResult, type ProviderInfo } from "@/lib/providers/types";

export const TICKETING_DELAY_MS = 4000;

interface RecordPayload {
  bookable: Bookable;
  total: Money;
  scenario: string | null;
}

function reference(): string {
  return `DEMO-${opaqueId(6).replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}`;
}

/** Applique la hausse de prix du scénario « prix modifié » (renvoyée par le fournisseur, pas par le navigateur). */
function applyScenarioPrice(bookable: Bookable, scenario: string | null | undefined): Bookable {
  if (scenario !== "prix-modifie") return bookable;
  const base = bookable.price.lines.filter((l) => l.kind === "base");
  const increase = ratio(sum(base.map((l) => l.amount), bookable.price.total.currency), 7, 100);
  const payable = base[0]?.payable ?? "now";
  const lines = [...bookable.price.lines, { label: "Ajustement tarifaire du fournisseur (scénario de démonstration)", amount: increase, kind: "fee" as const, payable }];
  const total = sum(lines.map((l) => l.amount));
  return {
    ...bookable,
    price: {
      ...bookable.price,
      lines,
      total,
      payNow: payable === "now" ? sum([bookable.price.payNow, increase]) : bookable.price.payNow,
      payOnSite: payable === "on_site" ? sum([bookable.price.payOnSite, increase]) : bookable.price.payOnSite,
    },
  };
}

export function createDemoBookingOps(info: ProviderInfo, rebuild: (offerRef: string) => Bookable): BookingOps {
  async function findByKey(key: string) {
    const database = await db();
    const rows = await database.select().from(demoProviderRecords).where(eq(demoProviderRecords.idempotencyKey, key)).limit(1);
    return rows[0] ?? null;
  }

  async function findByRef(ref: string) {
    const database = await db();
    const rows = await database.select().from(demoProviderRecords).where(eq(demoProviderRecords.reference, ref)).limit(1);
    return rows[0] ?? null;
  }

  /** Côté « fournisseur » : l'émission du billet intervient quelques secondes après la création du dossier. */
  async function progress(record: NonNullable<Awaited<ReturnType<typeof findByKey>>>) {
    if (record.status === "confirmed" && record.vertical === "flights" && nowMs() - record.createdAt.getTime() >= TICKETING_DELAY_MS) {
      const database = await db();
      await database.update(demoProviderRecords).set({ status: "ticketed", updatedAt: new Date(nowMs()) }).where(eq(demoProviderRecords.id, record.id));
      return { ...record, status: "ticketed" };
    }
    return record;
  }

  function toResult(record: { status: string; reference: string }): ProviderBookingResult {
    const messages: Record<string, string> = {
      confirmed: "Réservation confirmée par le fournisseur (démonstration).",
      ticketed: "Billets émis par la compagnie (démonstration — aucun billet réel).",
      failed: "Le fournisseur a refusé la réservation (démonstration).",
      cancelled: "Réservation annulée chez le fournisseur (démonstration).",
    };
    return { status: record.status as ProviderBookingResult["status"], providerReference: record.reference, message: messages[record.status] ?? record.status };
  }

  return {
    info,
    async reprice(offerRef: string, ctx: OpContext): Promise<Bookable> {
      const fresh = rebuild(offerRef);
      return applyScenarioPrice(fresh, ctx.scenario);
    },

    async book(req: BookRequest): Promise<ProviderBookingResult> {
      const existing = await findByKey(req.idempotencyKey);
      if (existing) return toResult(await progress(existing));
      const bookable = applyScenarioPrice(rebuild(req.offerRef), req.scenario);
      if (!bookable.bookable) throw new ProviderError("INVALID_REQUEST", bookable.blockingReasons.join(" "));
      // Le fournisseur recalcule le total : un écart avec le montant attendu est refusé.
      const totals = computeTotals(bookable, req.options);
      if (totals.total.amount !== req.expectedTotal.amount || totals.total.currency !== req.expectedTotal.currency) {
        throw new ProviderError("INVALID_REQUEST", "Le montant attendu ne correspond pas au tarif du fournisseur.");
      }
      const database = await db();
      const status = req.scenario === "reservation-echouee" ? "failed" : "confirmed";
      const record = {
        id: prefixedId("dpr"),
        vertical: bookable.vertical,
        idempotencyKey: req.idempotencyKey,
        reference: reference(),
        status,
        payload: { bookable, total: totals.total, scenario: req.scenario } satisfies RecordPayload,
        createdAt: new Date(nowMs()),
        updatedAt: new Date(nowMs()),
      };
      await database.insert(demoProviderRecords).values(record).onConflictDoNothing();
      const stored = await findByKey(req.idempotencyKey);
      if (req.scenario === "resultat-incertain") {
        // Le dossier existe chez le fournisseur, mais la réponse n'arrive pas : état inconnu côté Nomadia.
        throw new ProviderError("TIMEOUT", "Le fournisseur n'a pas répondu dans le délai imparti.", false);
      }
      return toResult(stored ?? record);
    },

    async retrieve(lookup): Promise<ProviderBookingResult> {
      const record = (lookup.providerReference && (await findByRef(lookup.providerReference))) || (await findByKey(lookup.idempotencyKey));
      if (!record) return { status: "failed", providerReference: null, message: "Aucune réservation correspondante chez le fournisseur." };
      return toResult(await progress(record));
    },

    async cancellationQuote(providerReference: string) {
      const record = await findByRef(providerReference);
      if (!record || record.status === "cancelled" || record.status === "failed") {
        return { allowed: false, fee: zero(), refund: zero(), message: "Aucune réservation active à annuler." };
      }
      const payload = record.payload as RecordPayload;
      const total = money(payload.total.amount, payload.total.currency);
      const paidNow = payload.bookable.price.payNow;
      let fee: Money;
      let message: string;
      if (payload.scenario === "annulation-frais") {
        fee = ratio(total, 30, 100);
        message = "Annulation possible avec frais de 30 % appliqués par le fournisseur (scénario de démonstration).";
      } else if (payload.bookable.vertical === "flights") {
        const refundFee = payload.bookable.cancellation.feeAfter;
        const passengers = payload.bookable.travelers.kind === "passengers" ? payload.bookable.travelers.adults + payload.bookable.travelers.children : 1;
        if (!payload.bookable.cancellation.refundable) {
          fee = total;
          message = "Billet non remboursable : aucun remboursement du tarif (démonstration).";
        } else {
          fee = refundFee ? multiply(refundFee, passengers) : zero();
          message = "Remboursement selon les conditions du tarif, frais par passager déduits.";
        }
      } else if (payload.bookable.vertical === "hotels") {
        const deadline = payload.bookable.cancellation.freeUntil;
        const before = deadline ? nowMs() < localToUtc(deadline.local, deadline.timeZone).instantMs : false;
        if (!payload.bookable.cancellation.refundable) {
          fee = total;
          message = "Tarif non remboursable : le montant reste dû.";
        } else if (before) {
          fee = zero(total.currency);
          message = "Annulation gratuite : l'échéance n'est pas dépassée.";
        } else {
          fee = payload.bookable.cancellation.feeAfter ?? total;
          message = "Échéance d'annulation gratuite dépassée : des frais s'appliquent.";
        }
      } else {
        const pickup = localToUtc(payload.bookable.start.local, payload.bookable.start.timeZone).instantMs;
        if (pickup - nowMs() > 48 * 3600_000) {
          fee = zero(total.currency);
          message = "Annulation sans frais (plus de 48 h avant la prise en charge).";
        } else {
          const days = rentalDays(payload.bookable.start, payload.bookable.end);
          fee = payload.bookable.price.lines[0] ? ratio(payload.bookable.price.lines[0].amount, 1, days) : zero();
          message = "Moins de 48 h avant la prise en charge : une journée de location est retenue (règle de démonstration).";
        }
      }
      if (fee.amount > total.amount) fee = total;
      // Seul ce qui a été payé maintenant peut être remboursé par la plateforme.
      const refundable = Math.max(0, paidNow.amount - Math.min(fee.amount, paidNow.amount));
      return { allowed: true, fee, refund: money(refundable, total.currency), message };
    },

    async cancel(providerReference: string, idempotencyKey: string) {
      const record = await findByRef(providerReference);
      if (!record) throw new ProviderError("OFFER_NOT_FOUND", "Réservation introuvable chez le fournisseur.");
      const quote = await this.cancellationQuote(providerReference, {});
      if (record.status !== "cancelled") {
        const database = await db();
        await database
          .update(demoProviderRecords)
          .set({ status: "cancelled", updatedAt: new Date(nowMs()), payload: { ...(record.payload as RecordPayload), cancelKey: idempotencyKey } })
          .where(eq(demoProviderRecords.id, record.id));
      }
      return { status: "cancelled" as const, fee: quote.fee, refund: quote.refund };
    },
  };
}
