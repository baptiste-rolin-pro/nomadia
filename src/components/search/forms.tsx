"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
import { addDays, nightsBetween, isCivilDate, type CivilDate } from "@/lib/dates";
import { MAX_BOOKING_HORIZON_DAYS, carSearchToQuery, dateWindowIssues, flightSearchToQuery, hotelSearchToQuery } from "@/lib/search/query";
import { DateInput, SubmitButton, focusFirstError, issuesToMap, loadValidation } from "@/components/search/fields";
import { CABIN_LABELS, type Cabin, type RoomOccupancy } from "@/lib/providers/types";
import { PlaceCombobox, type PlaceValue } from "@/components/search/place-combobox";
import { FlightTravelersPicker, RoomsPicker, type FlightTravelers } from "@/components/search/travelers";
import { describedBy } from "@/components/ui/field";

// ---------------------------------------------------------------------------

export interface FlightFormInitial {
  origin: PlaceValue | null;
  destination: PlaceValue | null;
  tripType: "roundtrip" | "oneway";
  departDate: string;
  returnDate: string;
  travelers: FlightTravelers;
  cabin: Cabin;
}

export function FlightSearchForm({ today, initial, extraQuery, compact = false }: { today: CivilDate; initial?: Partial<FlightFormInitial>; extraQuery?: Record<string, string>; compact?: boolean }) {
  const router = useRouter();
  const [origin, setOrigin] = useState<PlaceValue | null>(initial?.origin ?? { id: "city:PAR", label: "Paris, France — tous les aéroports" });
  const [destination, setDestination] = useState<PlaceValue | null>(initial?.destination ?? null);
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">(initial?.tripType ?? "roundtrip");
  const [departDate, setDepartDate] = useState(initial?.departDate ?? addDays(today, 30));
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? addDays(today, 34));
  const [travelers, setTravelers] = useState<FlightTravelers>(initial?.travelers ?? { adults: 2, childrenAges: [], infants: 0 });
  const [cabin, setCabin] = useState<Cabin>(initial?.cabin ?? "economy");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const max = addDays(today, MAX_BOOKING_HORIZON_DAYS);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { parseFlightSearch } = await loadValidation();
    const params = new URLSearchParams({
      o: origin?.id ?? "",
      d: destination?.id ?? "",
      type: tripType === "oneway" ? "as" : "ar",
      dep: departDate,
      adt: String(travelers.adults),
      cab: cabin,
    });
    if (tripType === "roundtrip") params.set("ret", returnDate);
    if (travelers.childrenAges.length) params.set("chd", travelers.childrenAges.join(","));
    if (travelers.infants) params.set("inf", String(travelers.infants));
    const { params: parsed, issues } = parseFlightSearch(params);
    const all = [...issues];
    if (!origin) all.unshift({ field: "origin", message: "Choisissez un lieu de départ dans la liste." });
    if (!destination) all.unshift({ field: "destination", message: "Choisissez une destination dans la liste." });
    if (parsed) {
      const dates = [{ field: "departDate", date: parsed.departDate }];
      if (parsed.returnDate && tripType === "roundtrip") dates.push({ field: "returnDate", date: parsed.returnDate });
      all.push(...dateWindowIssues(dates, today));
    }
    const map = issuesToMap(all);
    setErrors(map);
    if (Object.keys(map).length || !parsed) return focusFirstError(form);
    const q = flightSearchToQuery(parsed);
    for (const [k, v] of Object.entries(extraQuery ?? {})) q.set(k, v);
    router.push(`/vols?${q.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Recherche de vols" className="space-y-4">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Type de trajet</legend>
        {(["roundtrip", "oneway"] as const).map((t) => (
          <label key={t} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="radio" name="tripType" value={t} checked={tripType === t} onChange={() => setTripType(t)} className="size-4 accent-[var(--color-forest)]" />
            {t === "roundtrip" ? "Aller-retour" : "Aller simple"}
          </label>
        ))}
      </fieldset>
      <div className={`grid gap-4 ${compact ? "md:grid-cols-2 xl:grid-cols-[1fr_auto_1fr]" : "md:grid-cols-[1fr_auto_1fr]"} items-end`}>
        <PlaceCombobox id="fl-origin" label="Départ" value={origin} onChange={setOrigin} error={errors.origin} />
        <button
          type="button"
          className="mb-1 hidden size-10 items-center justify-center self-end rounded-full border border-line bg-white md:inline-flex"
          aria-label="Inverser départ et destination"
          onClick={() => {
            setOrigin(destination);
            setDestination(origin);
          }}
        >
          <ArrowLeftRight aria-hidden className="size-4" />
        </button>
        <PlaceCombobox id="fl-destination" label="Destination" value={destination} onChange={setDestination} error={errors.destination} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DateInput id="fl-dep" label="Aller" value={departDate} onChange={setDepartDate} min={today} max={max} error={errors.departDate} />
        {tripType === "roundtrip" ? (
          <DateInput id="fl-ret" label="Retour" value={returnDate} onChange={setReturnDate} min={isCivilDate(departDate) ? departDate : today} max={max} error={errors.returnDate} />
        ) : (
          <div className="hidden lg:block" />
        )}
        <FlightTravelersPicker value={travelers} onChange={setTravelers} error={errors.adults ?? errors.infants ?? errors.childrenAges} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fl-cabin" className="text-sm font-semibold">
            Cabine
          </label>
          <select id="fl-cabin" className="field-input" value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)}>
            {(Object.keys(CABIN_LABELS) as Cabin[]).map((c) => (
              <option key={c} value={c}>
                {CABIN_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">Une recherche ne réserve rien : les prix sont actualisés avant tout engagement.</p>
        <SubmitButton label="Rechercher des vols" />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function HotelSearchForm({ today, initial, extraQuery }: { today: CivilDate; initial?: { destination?: PlaceValue | null; checkIn?: string; checkOut?: string; rooms?: RoomOccupancy[] }; extraQuery?: Record<string, string> }) {
  const router = useRouter();
  const [destination, setDestination] = useState<PlaceValue | null>(initial?.destination ?? null);
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? addDays(today, 30));
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? addDays(today, 34));
  const [rooms, setRooms] = useState<RoomOccupancy[]>(initial?.rooms ?? [{ adults: 2, childrenAges: [] }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const max = addDays(today, MAX_BOOKING_HORIZON_DAYS);
  const nights = isCivilDate(checkIn) && isCivilDate(checkOut) ? nightsBetween(checkIn, checkOut) : 0;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { parseHotelSearch } = await loadValidation();
    const params = new URLSearchParams({ dest: destination?.id ?? "", arr: checkIn, dep: checkOut, ch: rooms.map((r) => (r.childrenAges.length ? `${r.adults}-${r.childrenAges.join(".")}` : String(r.adults))).join("|") });
    const { params: parsed, issues } = parseHotelSearch(params);
    const all = [...issues];
    if (!destination) all.unshift({ field: "destination", message: "Choisissez une destination dans la liste." });
    if (parsed) all.push(...dateWindowIssues([{ field: "checkIn", date: parsed.checkIn }], today));
    const map = issuesToMap(all);
    setErrors(map);
    if (Object.keys(map).length || !parsed) return focusFirstError(form);
    const q = hotelSearchToQuery(parsed);
    for (const [k, v] of Object.entries(extraQuery ?? {})) q.set(k, v);
    router.push(`/hotels?${q.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Recherche d'hôtels" className="space-y-4">
      <div className="grid items-end gap-4 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <PlaceCombobox id="ht-dest" label="Destination" value={destination} onChange={setDestination} kinds={["city"]} error={errors.destination} placeholder="Ville" />
        <DateInput id="ht-in" label="Arrivée" value={checkIn} onChange={setCheckIn} min={today} max={max} error={errors.checkIn} />
        <DateInput id="ht-out" label="Départ" value={checkOut} onChange={setCheckOut} min={isCivilDate(checkIn) ? addDays(checkIn, 1) : today} max={max} error={errors.checkOut} hint={nights > 0 ? `${nights} nuit${nights > 1 ? "s" : ""}` : undefined} />
        <RoomsPicker value={rooms} onChange={setRooms} error={errors.rooms} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">Prix affichés pour la totalité du séjour ; le détail par nuit figure dans chaque offre.</p>
        <SubmitButton label="Rechercher un hébergement" />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

const RESIDENCES: [string, string][] = [
  ["FR", "France"],
  ["BE", "Belgique"],
  ["CH", "Suisse"],
  ["LU", "Luxembourg"],
  ["CA", "Canada"],
  ["DE", "Allemagne"],
  ["ES", "Espagne"],
  ["IT", "Italie"],
  ["GB", "Royaume-Uni"],
];

export function CarSearchForm({
  today,
  initial,
  extraQuery,
}: {
  today: CivilDate;
  initial?: { pickup?: PlaceValue | null; dropoff?: PlaceValue | null; pickupDate?: string; pickupTime?: string; dropoffDate?: string; dropoffTime?: string; driverAge?: number; residence?: string };
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const [pickup, setPickup] = useState<PlaceValue | null>(initial?.pickup ?? null);
  const [differentReturn, setDifferentReturn] = useState(!!initial?.dropoff && initial.dropoff.id !== initial.pickup?.id);
  const [dropoff, setDropoff] = useState<PlaceValue | null>(initial?.dropoff ?? null);
  const [pickupDate, setPickupDate] = useState(initial?.pickupDate ?? addDays(today, 30));
  const [pickupTime, setPickupTime] = useState(initial?.pickupTime ?? "10:00");
  const [dropoffDate, setDropoffDate] = useState(initial?.dropoffDate ?? addDays(today, 34));
  const [dropoffTime, setDropoffTime] = useState(initial?.dropoffTime ?? "10:00");
  const [driverAge, setDriverAge] = useState(String(initial?.driverAge ?? 30));
  const [residence, setResidence] = useState(initial?.residence ?? "FR");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const max = addDays(today, MAX_BOOKING_HORIZON_DAYS);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { parseCarSearch } = await loadValidation();
    const params = new URLSearchParams({ pu: pickup?.id ?? "", pud: pickupDate, put: pickupTime, dod: dropoffDate, dot: dropoffTime, age: driverAge, res: residence });
    if (differentReturn && dropoff) params.set("do", dropoff.id);
    const { params: parsed, issues } = parseCarSearch(params);
    const all = [...issues];
    if (!pickup) all.unshift({ field: "pickupPlace", message: "Choisissez un lieu de prise en charge dans la liste." });
    if (differentReturn && !dropoff) all.unshift({ field: "dropoffPlace", message: "Choisissez le lieu de restitution." });
    if (parsed) all.push(...dateWindowIssues([{ field: "pickupDate", date: parsed.pickupDate }], today));
    const map = issuesToMap(all);
    setErrors(map);
    if (Object.keys(map).length || !parsed) return focusFirstError(form);
    const q = carSearchToQuery(parsed);
    for (const [k, v] of Object.entries(extraQuery ?? {})) q.set(k, v);
    router.push(`/voitures?${q.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Recherche de voitures" className="space-y-4">
      <div className="grid items-end gap-4 md:grid-cols-2">
        <PlaceCombobox id="car-pu" label="Lieu de prise en charge" value={pickup} onChange={setPickup} error={errors.pickupPlace} />
        {differentReturn ? <PlaceCombobox id="car-do" label="Lieu de restitution" value={dropoff} onChange={setDropoff} error={errors.dropoffPlace} /> : <div className="hidden md:block" />}
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={differentReturn} onChange={(e) => setDifferentReturn(e.target.checked)} className="size-4 accent-[var(--color-forest)]" />
        Restituer le véhicule dans un autre lieu
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DateInput id="car-pud" label="Date de prise en charge" value={pickupDate} onChange={setPickupDate} min={today} max={max} error={errors.pickupDate} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="car-put" className="text-sm font-semibold">
            Heure de prise en charge
          </label>
          <input id="car-put" type="time" className="field-input" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} aria-invalid={errors.pickupTime ? true : undefined} required />
          <p className="text-xs text-ink-soft">Heure locale de l&apos;agence</p>
        </div>
        <DateInput id="car-dod" label="Date de restitution" value={dropoffDate} onChange={setDropoffDate} min={isCivilDate(pickupDate) ? pickupDate : today} max={max} error={errors.dropoffDate} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="car-dot" className="text-sm font-semibold">
            Heure de restitution
          </label>
          <input id="car-dot" type="time" className="field-input" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="car-age" className="text-sm font-semibold">
            Âge du conducteur principal
          </label>
          <input id="car-age" type="number" inputMode="numeric" min={18} max={99} className="field-input" value={driverAge} onChange={(e) => setDriverAge(e.target.value)} aria-invalid={errors.driverAge ? true : undefined} aria-describedby={describedBy("car-age", true, errors.driverAge)} />
          <p id="car-age-hint" className="text-xs text-ink-soft">
            Âge au jour de la prise en charge ; il conditionne les frais et catégories.
          </p>
          {errors.driverAge ? (
            <p id="car-age-error" className="text-sm font-medium text-danger">
              {errors.driverAge}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="car-res" className="text-sm font-semibold">
            Pays de résidence
          </label>
          <select id="car-res" className="field-input" value={residence} onChange={(e) => setResidence(e.target.value)}>
            {RESIDENCES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">Aucune option ni assurance n&apos;est ajoutée sans votre choix.</p>
        <SubmitButton label="Rechercher une voiture" />
      </div>
    </form>
  );
}
