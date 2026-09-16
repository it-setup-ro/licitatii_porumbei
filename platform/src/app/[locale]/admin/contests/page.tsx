import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";
import { distanceToInput } from "@/lib/distance";

export const dynamic = "force-dynamic";

/** input[type=datetime-local] cere formatul YYYY-MM-DDTHH:mm, fără fus orar. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FIELDS: FieldDef[] = [
  {
    key: "slug",
    label: "Identificator URL (slug)",
    type: "text",
    required: true,
    slugify: true,
    hint: "Apare în adresă: /contests/nordhausen-2026. Se curăță singur în timp ce scrii — majusculele și diacriticele se potrivesc automat.",
  },
  {
    key: "status",
    label: "Stare",
    type: "select",
    required: true,
    hint: "„În curând” până la lansare, „În desfășurare” cât zboară, „Încheiat” după sosiri.",
    options: [
      { value: "UPCOMING", label: "În curând" },
      { value: "ACTIVE", label: "În desfășurare" },
      { value: "FINISHED", label: "Încheiat" },
    ],
  },
  {
    key: "titleRo",
    label: "Titlu (RO)",
    type: "text",
    required: true,
    hint: "Ex.: Concurs Național. Pe bandă apare deasupra destinației, scris mai mic.",
  },
  { key: "titleEn", label: "Titlu (EN)", type: "text", required: true },
  {
    key: "startsAt",
    label: "Începe la",
    type: "datetime",
    required: true,
    hint: "De la data asta concursul e considerat pornit.",
  },
  {
    key: "endsAt",
    label: "Se încheie la",
    type: "datetime",
    required: true,
    hint: "Banda de pe prima pagină dispare singură după data asta.",
  },
  { key: "descRo", label: "Descriere (RO)", type: "textarea", rows: 4 },
  { key: "descEn", label: "Descriere (EN)", type: "textarea", rows: 4 },
  { key: "rulesRo", label: "Regulament (RO)", type: "textarea", rows: 8 },
  { key: "rulesEn", label: "Regulament (EN)", type: "textarea", rows: 8 },
  {
    // selector de fisiere, ca la produse si articole: se alege o poza de pe
    // calculator sau de pe telefon, nu se scrie o adresa de mana
    key: "coverUrl",
    label: "Imagine copertă",
    type: "image",
    full: true,
    hint: "Se alege de pe calculator sau de pe telefon. Apare lată, sus în pagina concursului și pe cardul din lista de concursuri — o poză pe lat (ex. 1600×600) arată cel mai bine.",
  },
  {
    key: "destination",
    label: "Destinația (scrisă mare pe bandă)",
    type: "text",
    hint: "Ex.: Nordhausen. Cuvântul auriu, cel mai mare de pe bandă.",
  },
  {
    key: "distance",
    label: "Distanța (km)",
    type: "text",
    hint: "Un număr (1000) sau un interval (170-240), când crescătorii pleacă din locuri diferite.",
  },
  {
    key: "countryCode",
    label: "Țara destinație (cod: DE, RO, HU…)",
    type: "text",
    hint: "Două litere. Se transformă singur în numele țării: DE → Germania.",
  },
  { key: "boardingAt", label: "Îmbarcare — data și ora", type: "datetime" },
  { key: "boardingPlace", label: "Îmbarcare — locul", type: "text", hint: "Ex.: România" },
  { key: "releaseAt", label: "Lansare — data și ora", type: "datetime" },
  {
    key: "weatherUrl",
    label: "Link meteo pe traseu",
    type: "text",
    hint: "Ex.: https://www.windy.com/. Fără el, rubrica „Meteo pe traseu” nu apare pe bandă.",
  },
  {
    key: "sloganRo",
    label: "Slogan bandă (RO)",
    type: "text",
    hint: "Rândul mic de sub distanță. Ex.: Un concurs. O comunitate. Aceeași pasiune.",
  },
  { key: "sloganEn", label: "Slogan bandă (EN)", type: "text" },
  {
    key: "published",
    label: "Publicat",
    type: "boolean",
    hint: "Cât e oprit, concursul se vede doar de aici. Pornit, apare pe site.",
  },
  {
    key: "featured",
    label: "Banda pe prima pagină",
    type: "boolean",
    full: true,
    hint: "Prima pagină arată o singură bandă. Pornește-l aici ca să fie acesta — se stinge singur de pe celelalte concursuri. Dacă nu alegi niciunul, se afișează cel aflat în desfășurare.",
  },
];


export default async function AdminContestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const contests = await prisma.contest.findMany({
    include: { _count: { select: { auctions: true } } },
    orderBy: { startsAt: "desc" },
  });
  const editing = sp.new ? null : contests.find((c) => c.id === sp.id);

  // Care concurs ajunge pe prima pagina — aceeasi regula ca in pagina publica.
  // Se arata in lista, ca sa nu mai fie nevoie sa deschizi site-ul ca sa afli.
  const acum = new Date();
  const publice = contests.filter((c) => c.published);
  const pePrimaPagina =
    publice.find((c) => c.featured && c.endsAt >= acum) ??
    publice
      .filter((c) => c.startsAt <= acum && c.endsAt >= acum)
      .sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime())[0] ??
    publice
      .filter((c) => c.startsAt > acum)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  const now = new Date();
  const initial = editing
    ? {
        id: editing.id,
        slug: editing.slug,
        status: editing.status,
        titleRo: editing.titleRo,
        titleEn: editing.titleEn,
        startsAt: toLocalInput(editing.startsAt),
        endsAt: toLocalInput(editing.endsAt),
        descRo: editing.descRo ?? "",
        descEn: editing.descEn ?? "",
        rulesRo: editing.rulesRo ?? "",
        rulesEn: editing.rulesEn ?? "",
        coverUrl: editing.coverUrl ?? "",
        featured: editing.featured,
        destination: editing.destination ?? "",
        distance: distanceToInput(editing.distanceKm, editing.distanceMaxKm),
        countryCode: editing.countryCode ?? "",
        boardingAt: editing.boardingAt ? toLocalInput(editing.boardingAt) : "",
        boardingPlace: editing.boardingPlace ?? "",
        releaseAt: editing.releaseAt ? toLocalInput(editing.releaseAt) : "",
        sloganRo: editing.sloganRo ?? "",
        sloganEn: editing.sloganEn ?? "",
        published: editing.published,
      }
    : {
        slug: "",
        status: "UPCOMING",
        titleRo: "",
        titleEn: "",
        startsAt: toLocalInput(now),
        endsAt: toLocalInput(new Date(now.getTime() + 30 * 86_400_000)),
        descRo: "",
        descEn: "",
        rulesRo: "",
        rulesEn: "",
        coverUrl: "",
        featured: false,
        destination: "",
        distance: "",
        countryCode: "",
        boardingAt: "",
        boardingPlace: "",
        releaseAt: "",
        sloganRo: "",
        sloganEn: "",
        published: false,
      };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Concursuri</h1>
        <a
          href="?new=1"
          data-testid="contest-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Concurs nou
        </a>
      </div>

      <div className="mb-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
        <table className="w-full min-w-[36rem] text-sm" data-testid="admin-contests-table">
          <tbody>
            {contests.map((c) => (
              <tr key={c.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 font-semibold">{c.titleRo}</td>
                <td className="px-4 py-2.5 text-ink/60">{c.status}</td>
                <td className="px-4 py-2.5 text-ink/60">{c._count.auctions} loturi</td>
                <td className="px-4 py-2.5">
                  {!c.published ? (
                    <span className="rounded bg-ink/10 px-2 py-0.5 text-xs font-bold">ciornă</span>
                  ) : pePrimaPagina?.id === c.id ? (
                    <span
                      className="rounded bg-wing-orange/15 px-2 py-0.5 text-xs font-bold text-wing-orange"
                      data-testid="contest-on-home"
                    >
                      ● pe prima pagină
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-end">
                  {c.published && (
                    <a
                      href={`/${locale}/contests/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="-my-1 me-1 inline-block rounded-lg px-3 py-2 font-semibold text-ink/60 hover:bg-ink/5"
                      data-testid="contest-view"
                    >
                      Vezi pe site ↗
                    </a>
                  )}
                  <a
                    href={`?id=${c.id}`}
                    className="-my-1 inline-block rounded-lg px-3 py-2 font-semibold text-wing-blue hover:bg-wing-blue/10 hover:underline"
                    data-testid="contest-edit"
                  >
                    Editează
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecordEditor
        key={editing?.id ?? "new"}
        endpoint="/api/admin/contests"
        title={editing ? `Editează: ${editing.titleRo}` : "Concurs nou"}
        initial={initial}
        fields={FIELDS}
        help={
          <>
            <p>
              <strong>Unde se vede.</strong> Cât timp „Publicat” e oprit, concursul se vede doar
              aici — poți completa pe îndelete. Pornit, apare imediat în{" "}
              <em>Curse &amp; Rezultate</em> → <em>Concursurile noastre</em> și are pagina lui.
            </p>
            <p className="mt-2">
              <strong>Prima pagină arată un singur concurs.</strong> Ca să fie acesta, pornește
              „Banda pe prima pagină”, jos de tot — se stinge singură de pe celelalte. Dacă nu
              alegi niciunul, se afișează cel aflat în desfășurare. În lista de sus vezi oricând
              care e pe prima pagină acum.
            </p>
            <p className="mt-2">
              <strong>Banda</strong> se compune din destinație, distanță, țară, îmbarcare, lansare,
              link meteo și slogan; rubricile necompletate pur și simplu nu apar. <strong>Poza de
              copertă</strong> se alege de pe calculator sau de pe telefon și apare sus în pagina
              concursului și pe card — banda nu o folosește, acolo desenul e fix.
            </p>
          </>
        }
      />
    </div>
  );
}
