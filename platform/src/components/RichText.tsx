/**
 * Randează text simplu cu titluri „## " și paragrafe separate prin linie goală.
 *
 * Deliberat NU folosim un parser de markdown care produce HTML brut: conținutul
 * vine din baza de date (editabil din admin), iar injectarea de HTML ar deschide
 * o cale de XSS. Aici totul rămâne text, escapat de React.
 */
export default function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-4" data-testid="rich-text">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="font-display pt-2 text-xl font-bold">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={i} className="font-display pt-2 text-2xl font-bold">
              {trimmed.slice(2)}
            </h2>
          );
        }
        // paragraf: păstrăm rândurile interne ca linii separate
        return (
          <p key={i} className="leading-relaxed text-ink/80">
            {trimmed.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
