import { setRequestLocale } from "next-intl/server";
import EndingUnsubscribeBox from "@/components/EndingUnsubscribeBox";

export const dynamic = "force-dynamic";

/** Pagina din linkul „Nu mai vrei aceste avize?". */
export default async function EndingUnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ u?: string; t?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { u, t } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EndingUnsubscribeBox userId={u ?? ""} token={t ?? ""} />
    </div>
  );
}
