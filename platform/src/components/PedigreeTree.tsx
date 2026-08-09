import { getTranslations } from "next-intl/server";

type Ancestor = {
  ring?: string;
  name?: string;
  note?: string;
  sire?: Ancestor;
  dam?: Ancestor;
};

function Cell({ a, depth }: { a: Ancestor | undefined; depth: number }) {
  if (!a) return <div className="rounded-lg border border-dashed border-ink/15 p-2 text-xs text-ink/30">—</div>;
  return (
    <div
      className={`rounded-lg border p-2 ${
        depth === 0 ? "border-wing-blue bg-wing-blue/5" : "border-ink/15 bg-white"
      }`}
    >
      {a.name && <p className="text-sm font-semibold">{a.name}</p>}
      {a.ring && <p className="text-xs text-ink/60">{a.ring}</p>}
      {a.note && <p className="mt-0.5 text-xs italic text-ink/50">{a.note}</p>}
    </div>
  );
}

export default async function PedigreeTree({ pedigreeJson }: { pedigreeJson: string }) {
  const t = await getTranslations("pigeon");
  let tree: { sire?: Ancestor; dam?: Ancestor };
  try {
    tree = JSON.parse(pedigreeJson);
  } catch {
    return null;
  }

  return (
    <div data-testid="pedigree">
      <h2 className="font-display mb-3 text-xl font-bold">
        {t("pedigree")}{" "}
        <span className="text-sm font-normal text-ink/50">
          ({t("pedigreeGenerations", { count: 3 })})
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {/* Generatia 1 */}
        <div className="space-y-3">
          <Cell a={tree.sire} depth={0} />
          <Cell a={tree.dam} depth={0} />
        </div>
        {/* Generatia 2 */}
        <div className="space-y-3">
          <div className="grid gap-2">
            <Cell a={tree.sire?.sire} depth={1} />
            <Cell a={tree.sire?.dam} depth={1} />
          </div>
          <div className="grid gap-2">
            <Cell a={tree.dam?.sire} depth={1} />
            <Cell a={tree.dam?.dam} depth={1} />
          </div>
        </div>
      </div>
    </div>
  );
}
