import { CULORI, parseBlocuri, type Bloc, type Nod } from "@/lib/rich-marks";

/**
 * Randează textele lungi scrise din administrare: titluri „## ", liste „- ",
 * paragrafe, și în interiorul lor îngroșat, înclinat, linkuri și culori.
 *
 * Deliberat NU folosim un parser de markdown care produce HTML brut: conținutul
 * vine din baza de date (editabil din admin, propus și de crescători), iar
 * injectarea de HTML ar deschide o cale de XSS. Aici totul rămâne text, tăiat
 * în noduri de `lib/rich-marks.ts` și escapat de React.
 */
function randeaza(noduri: Nod[]): React.ReactNode {
  return noduri.map((n, i) => {
    switch (n.fel) {
      case "text":
        return <span key={i}>{n.text}</span>;
      case "bold":
        return <strong key={i} className="font-bold">{randeaza(n.copii)}</strong>;
      case "italic":
        return <em key={i}>{randeaza(n.copii)}</em>;
      case "culoare":
        return (
          <span key={i} className={`font-semibold ${CULORI[n.culoare]}`}>
            {randeaza(n.copii)}
          </span>
        );
      case "link":
        return (
          <a
            key={i}
            href={n.href}
            className="font-semibold text-wing-blue underline underline-offset-2 hover:text-wing-red"
            {...(n.href.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
          >
            {randeaza(n.copii)}
          </a>
        );
    }
  });
}

function randuriCuEnter(randuri: Nod[][]): React.ReactNode {
  return randuri.map((r, j) => (
    <span key={j}>
      {randeaza(r)}
      {j < randuri.length - 1 && <br />}
    </span>
  ));
}

export default function RichText({ text }: { text: string }) {
  const blocuri: Bloc[] = parseBlocuri(text);

  return (
    <div className="space-y-4" data-testid="rich-text">
      {blocuri.map((bloc, i) => {
        if (bloc.fel === "titlu") {
          return (
            <h2
              key={i}
              className={`font-display pt-2 font-bold ${bloc.marime === 1 ? "text-2xl" : "text-xl"}`}
            >
              {randeaza(bloc.copii)}
            </h2>
          );
        }
        if (bloc.fel === "lista") {
          return (
            <ul key={i} className="list-disc space-y-1 ps-5 leading-relaxed text-ink/80">
              {bloc.randuri.map((r, j) => (
                <li key={j}>{randeaza(r)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed text-ink/80">
            {randuriCuEnter(bloc.randuri)}
          </p>
        );
      })}
    </div>
  );
}
