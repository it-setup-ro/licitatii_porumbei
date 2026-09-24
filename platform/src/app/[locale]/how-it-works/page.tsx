import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("how");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display mb-10 text-3xl font-bold">{t("title")}</h1>
      <div className="grid gap-10 md:grid-cols-2">
        <StepList title={t("buyTitle")} steps={[t("buy1"), t("buy2"), t("buy3")]} />
        <StepList title={t("sellTitle")} steps={[t("sell1"), t("sell2"), t("sell3")]} />
      </div>
    </div>
  );
}

function StepList({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div>
      <h2 className="font-display mb-4 text-xl font-bold">{title}</h2>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="wing-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm leading-relaxed text-ink/80">{s}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
