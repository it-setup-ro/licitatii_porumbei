"use client";

import { createElement, useEffect, useRef } from "react";
import { useLocale } from "next-intl";

/**
 * Bifa „Nu sunt robot" (ALTCHA), verificată de serverul nostru.
 *
 * Widgetul e un element web; se încarcă doar în browser. Când verificarea
 * reușește, trimite formularului textul de dovadă, pe care serverul îl verifică
 * la crearea contului.
 */
export default function CaptchaField({
  onChange,
  error,
}: {
  onChange: (payload: string) => void;
  error?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const onChangeRef = useRef(onChange);
  const locale = useLocale();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await import("altcha");
      if (locale === "ro") {
        try {
          await import("altcha/i18n/ro");
        } catch {
          // fără traducere rămâne în engleză — nu blochează înregistrarea
        }
      }
      if (cancelled) return;
    })();

    const el = ref.current;
    const onVerified = (ev: Event) => {
      const payload = (ev as CustomEvent<{ payload?: string }>).detail?.payload;
      if (payload) onChangeRef.current(payload);
    };
    const onState = (ev: Event) => {
      const detail = (ev as CustomEvent<{ state?: string; payload?: string }>).detail;
      if (detail?.state === "verified" && detail.payload) onChangeRef.current(detail.payload);
      else if (detail?.state && detail.state !== "verified") onChangeRef.current("");
    };
    el?.addEventListener("verified", onVerified);
    el?.addEventListener("statechange", onState);
    return () => {
      cancelled = true;
      el?.removeEventListener("verified", onVerified);
      el?.removeEventListener("statechange", onState);
    };
  }, [locale]);

  return (
    <div data-testid="reg-captcha">
      {createElement("altcha-widget", {
        ref,
        challenge: "/api/captcha",
        language: locale === "en" ? "en" : "ro",
        type: "checkbox",
        name: "altcha",
        configuration: JSON.stringify({ hideFooter: true, hideLogo: true }),
      })}
      {error && (
        <p className="mt-1 text-sm text-wing-red" data-testid="reg-captcha-error">
          {error}
        </p>
      )}
    </div>
  );
}
