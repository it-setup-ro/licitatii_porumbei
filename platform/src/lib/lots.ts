/**
 * Licitațiile pe crescători și loturi: regulile, separate de baza de date.
 *
 * O licitație de crescător are până la 5 loturi; un lot, până la 20 de
 * porumbei, care pornesc și se închid împreună. Porumbeii se licitează tot
 * unul câte unul, cu motorul de licitare existent — lotul decide doar CÂND.
 *
 * Regulile stau aici ca să poată fi verificate direct în teste: sunt exact
 * genul care, greșit, pornește jumătate de lot sau lasă un preț să se schimbe
 * sub ochii ofertanților.
 */

export type LotStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "CLOSED";

/** „1.04": numărul lotului, punct, poziția porumbelului pe două cifre. */
export function lotLabel(lotNumber: number, position: number): string {
  return `${lotNumber}.${String(position).padStart(2, "0")}`;
}

// ─── Pornirea unui lot ──────────────────────────────────────────────────────

export type PigeonForStart = {
  position: number;
  ringNumber: string | null;
  birthYear: number | null;
  sex: string | null;
  imageCount: number;
  startPriceCents: number | null;
};

export type MissingField = "ringNumber" | "birthYear" | "sex" | "photo" | "startPrice";

/** Ce îi lipsește unui porumbel ca să poată intra în licitație. */
export function missingForStart(p: PigeonForStart): MissingField[] {
  const missing: MissingField[] = [];
  if (!p.ringNumber || p.ringNumber.trim().length < 3) missing.push("ringNumber");
  if (!p.birthYear) missing.push("birthYear");
  if (!p.sex || !["M", "F", "U"].includes(p.sex)) missing.push("sex");
  if (p.imageCount < 1) missing.push("photo");
  if (!p.startPriceCents || p.startPriceCents <= 0) missing.push("startPrice");
  return missing;
}

export type StartProblem =
  | { code: "NOT_DRAFT"; status: string }
  | { code: "EMPTY" }
  | { code: "TOO_MANY"; max: number; count: number }
  | { code: "END_BEFORE_START" }
  | { code: "ENDS_IN_PAST" }
  | { code: "INCOMPLETE"; pigeons: { position: number; missing: MissingField[] }[] };

/**
 * Tot ce oprește pornirea unui lot. O listă goală înseamnă „se poate porni".
 *
 * Întoarce toate problemele deodată, nu doar prima: administratorul trebuie
 * să le vadă pe toate și să le repare dintr-o singură trecere.
 */
export function checkLotStart(input: {
  status: string;
  startsAt: Date;
  endsAt: Date;
  now: Date;
  maxPigeons: number;
  pigeons: PigeonForStart[];
}): StartProblem[] {
  const problems: StartProblem[] = [];

  if (input.status !== "DRAFT") problems.push({ code: "NOT_DRAFT", status: input.status });
  if (input.pigeons.length === 0) problems.push({ code: "EMPTY" });
  if (input.pigeons.length > input.maxPigeons) {
    problems.push({ code: "TOO_MANY", max: input.maxPigeons, count: input.pigeons.length });
  }
  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    problems.push({ code: "END_BEFORE_START" });
  }
  if (input.endsAt.getTime() <= input.now.getTime()) problems.push({ code: "ENDS_IN_PAST" });

  const incomplete = input.pigeons
    .map((p) => ({ position: p.position, missing: missingForStart(p) }))
    .filter((p) => p.missing.length > 0)
    .sort((a, b) => a.position - b.position);
  if (incomplete.length > 0) problems.push({ code: "INCOMPLETE", pigeons: incomplete });

  return problems;
}

/** La „Start lot": pornește acum, sau așteaptă ora de început. */
export function statusAtStart(startsAt: Date, now: Date): "LIVE" | "SCHEDULED" {
  return startsAt.getTime() <= now.getTime() ? "LIVE" : "SCHEDULED";
}

// ─── După pornire ───────────────────────────────────────────────────────────

/**
 * „O dată licitația începută, rămâne începută."
 *
 * Un lot programat al cărui moment de start a trecut e deja pornit, chiar dacă
 * trecerea automată la LIVE nu a rulat încă — altfel ar exista câteva secunde
 * în care prețul se mai poate schimba pe o licitație care curge.
 */
export function lotIsLocked(status: string, startsAt: Date, now: Date): boolean {
  if (status === "LIVE" || status === "CLOSED") return true;
  return status === "SCHEDULED" && startsAt.getTime() <= now.getTime();
}

/** Ce nu se mai poate schimba la un porumbel după pornirea lotului. */
export const LOCKED_AFTER_START = [
  "ringNumber",
  "birthYear",
  "sex",
  "startPriceCents",
  "reservePriceCents",
] as const;

// ─── Licitația crescătorului ────────────────────────────────────────────────

type LotTimes = { status: string; startsAt: Date; endsAt: Date };

/**
 * Perioada licitației crescătorului, luată din loturi: începe cu primul lot
 * pornit sau programat, se termină cu ultimul. Loturile în ciornă nu contează —
 * încă nu există pentru cumpărători.
 */
export function salePeriod(lots: LotTimes[]): { startsAt: Date; endsAt: Date } | null {
  const visible = lots.filter((l) => l.status !== "DRAFT");
  if (visible.length === 0) return null;
  return {
    startsAt: new Date(Math.min(...visible.map((l) => l.startsAt.getTime()))),
    endsAt: new Date(Math.max(...visible.map((l) => l.endsAt.getTime()))),
  };
}

export type SaleStatus = "DRAFT" | "UPCOMING" | "LIVE" | "CLOSED";

/** Starea licitației crescătorului, din starea loturilor ei. */
export function saleStatus(lots: { status: string }[]): SaleStatus {
  if (lots.some((l) => l.status === "LIVE")) return "LIVE";
  if (lots.some((l) => l.status === "SCHEDULED")) return "UPCOMING";
  if (lots.some((l) => l.status === "CLOSED")) return "CLOSED";
  return "DRAFT";
}

/** Comisionul reținut crescătorului, rotunjit la cent. */
export function commissionCents(amountCents: number, percent: number): number {
  return Math.round((amountCents * percent) / 100);
}

// ─── Avizul „se încheie în 30 de minute" ────────────────────────────────────

export type EndingLot = {
  lotId: string;
  lotNumber: number;
  saleSlug: string;
  saleTitle: string;
  breederName: string;
  endsAt: Date;
  pigeons: {
    auctionId: string;
    position: number;
    name: string;
    priceCents: number;
    leaderId: string | null;
    bidderIds: string[];
  }[];
};

export type MyPigeon = {
  auctionId: string;
  label: string;
  name: string;
  priceCents: number;
  leading: boolean;
};

export type EndingNotice =
  | { userId: string; kind: "BIDDER"; lots: EndingLot[]; mine: MyPigeon[] }
  | { userId: string; kind: "GENERAL"; lots: EndingLot[] };

/**
 * Cine primește ce, pentru loturile care se apropie de final în aceeași trecere.
 *
 * - Cine a licitat în oricare dintre loturi primește un singur e-mail, cu
 *   porumbeii LUI și dacă e pe primul loc — nu și pe cel general.
 * - Cine a ales avizele, fără să fi licitat, primește un singur e-mail general.
 *
 * Un singur e-mail pe om, oricâte loturi s-ar închide: cu 15 crescători și câte
 * 5 loturi, altfel același om ar primi zeci de mesaje în aceeași seară.
 */
export function buildEndingNotices(lots: EndingLot[], optedInUserIds: string[]): EndingNotice[] {
  if (lots.length === 0) return [];

  const ordered = [...lots].sort(
    (a, b) => a.endsAt.getTime() - b.endsAt.getTime() || a.lotNumber - b.lotNumber
  );

  const mineByUser = new Map<string, MyPigeon[]>();
  for (const lot of ordered) {
    const pigeons = [...lot.pigeons].sort((a, b) => a.position - b.position);
    for (const p of pigeons) {
      for (const bidderId of new Set(p.bidderIds)) {
        const list = mineByUser.get(bidderId) ?? [];
        list.push({
          auctionId: p.auctionId,
          label: lotLabel(lot.lotNumber, p.position),
          name: p.name,
          priceCents: p.priceCents,
          leading: p.leaderId === bidderId,
        });
        mineByUser.set(bidderId, list);
      }
    }
  }

  const notices: EndingNotice[] = [];
  for (const [userId, mine] of [...mineByUser.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    notices.push({ userId, kind: "BIDDER", lots: ordered, mine });
  }
  for (const userId of [...new Set(optedInUserIds)].sort()) {
    if (!mineByUser.has(userId)) notices.push({ userId, kind: "GENERAL", lots: ordered });
  }
  return notices;
}
