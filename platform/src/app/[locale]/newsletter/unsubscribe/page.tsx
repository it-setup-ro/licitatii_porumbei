import { setRequestLocale } from "next-intl/server";
import UnsubscribeBox from "@/components/UnsubscribeBox";

export const dynamic = "force-dynamic";

/**
 * Dezabonarea, cu confirmare.
 *
 * Nu stergem abonarea la simpla deschidere a paginii: clientii de e-mail si
 * scanerele de securitate deschid singure linkurile din mesaje, si ar
 * dezabona oameni care n-au cerut nimic. De aceea e un buton.
 */
export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <UnsubscribeBox token={token ?? ""} />
    </div>
  );
}
