"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import PasswordField from "@/components/PasswordField";

/** Schimbarea parolei din cont. Se cere și parola veche. */
export default function ChangePasswordForm() {
  const t = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError(t("passwordsDiffer"));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setDone(true);
      setOpen(false); // altfel confirmarea nu se vede niciodata
      setCurrent("");
      setNext("");
      setConfirm("");
      return;
    }
    setError(
      data.error === "WRONG_PASSWORD"
        ? t("wrongCurrentPassword")
        : data.error === "SAME_PASSWORD"
          ? t("samePassword")
          : data.error === "WEAK_PASSWORD"
            ? (data.message ?? t("passwordHint"))
            : t("resetFailed")
    );
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6" data-testid="change-password">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{t("changeTitle")}</h2>
        {!open && (
          <button
            onClick={() => {
              setOpen(true);
              setDone(false);
            }}
            data-testid="change-password-open"
            className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm font-semibold hover:border-wing-blue hover:text-wing-blue"
          >
            {t("changeButton")}
          </button>
        )}
      </div>

      {done && !open && (
        <p className="mt-3 text-sm font-semibold text-green-700" data-testid="change-password-done">
          ✓ {t("changeDone")}
        </p>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <PasswordField
            label={t("currentPassword")}
            value={current}
            onChange={setCurrent}
            testid="cp-current"
          />
          <PasswordField
            label={t("newPassword")}
            value={next}
            onChange={setNext}
            testid="cp-new"
            autoComplete="new-password"
            hint={t("passwordHint")}
          />
          <PasswordField
            label={t("confirmPassword")}
            value={confirm}
            onChange={setConfirm}
            testid="cp-confirm"
            autoComplete="new-password"
          />
          {error && (
            <p
              className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red"
              data-testid="cp-error"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              data-testid="cp-submit"
              className="rounded-xl bg-ink px-6 py-2.5 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
            >
              {busy ? "…" : t("changeButton")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-xl border border-ink/20 px-6 py-2.5 font-semibold hover:border-ink/40"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
