"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ContactForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const t = useTranslations("contactPage");
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    subject: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) setSent(true);
    else setError(true);
  };

  if (sent) {
    return (
      <p
        className="rounded-2xl border border-green-300 bg-green-50 p-5 font-medium text-green-800"
        data-testid="contact-sent"
      >
        ✓ {t("sent")}
      </p>
    );
  }

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 outline-none focus:border-wing-blue";

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6"
      data-testid="contact-form"
    >
      <h2 className="font-display text-xl font-bold">{t("formTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">{t("name")}</span>
          <input
            required
            minLength={2}
            data-testid="contact-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={input}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("email")}</span>
          <input
            required
            type="email"
            data-testid="contact-email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={input}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">{t("subject")}</span>
        <input
          required
          minLength={3}
          data-testid="contact-subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          className={input}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t("message")}</span>
        <textarea
          required
          minLength={10}
          rows={5}
          data-testid="contact-message"
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className={input}
        />
      </label>
      {error && (
        <p className="rounded-lg bg-wing-red/10 px-3 py-2 text-sm text-wing-red" data-testid="contact-error">
          {t("error")}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        data-testid="contact-submit"
        className="rounded-xl bg-ink px-8 py-3 font-bold text-ivory hover:bg-wing-orange disabled:opacity-50"
      >
        {t("send")}
      </button>
    </form>
  );
}
