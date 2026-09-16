"use client";

/**
 * Bara de progres a încărcării.
 *
 * Un clip de cinci minute are sute de megaocteți: pe date mobile, încărcarea
 * ține minute bune. Fără niciun semn că se întâmplă ceva, omul crede că s-a
 * blocat și închide pagina — exact înainte să se termine.
 *
 * Arată câte fișiere, al câtelea e în lucru, procentul și cât s-a trimis din
 * cât. La final, cât timp serverul verifică fișierul, bara devine o dungă care
 * curge: procentul e 100, dar treaba nu s-a încheiat încă.
 */

export type UploadState = {
  /** al câtelea fișier, de la 1 */
  index: number;
  total: number;
  /** octeți trimiși din fișierul curent */
  sent: number;
  size: number;
  name: string;
};

function mb(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function UploadProgress({ state }: { state: UploadState }) {
  const pct = state.size > 0 ? Math.min(100, Math.round((state.sent / state.size) * 100)) : 0;
  const verifying = pct >= 100;

  return (
    <div className="mt-3" data-testid="upload-progress" aria-live="polite">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-medium text-ink/70">
          {state.total > 1 && (
            <span className="me-1.5 rounded bg-ink/10 px-1.5 py-0.5 font-bold text-ink/60">
              {state.index}/{state.total}
            </span>
          )}
          {state.name}
        </span>
        <span className="shrink-0 font-bold tabular-nums text-wing-orange">
          {verifying ? "…" : `${pct}%`}
        </span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Se încarcă ${state.name}`}
        data-testid="upload-bar"
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r from-wing-orange to-wing-red transition-[width] duration-200 ease-out ${
            verifying ? "upload-shimmer" : ""
          }`}
          style={{ width: `${verifying ? 100 : pct}%` }}
        />
      </div>

      <p className="mt-1 text-xs text-ink/45">
        {verifying ? "Se verifică fișierul…" : `${mb(state.sent)} din ${mb(state.size)}`}
      </p>
    </div>
  );
}
