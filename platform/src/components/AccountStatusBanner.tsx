import { getTranslations } from "next-intl/server";

/**
 * Bandă îngustă sub antet, pentru contul care încă nu poate licita.
 *
 * Fără ea, omul care și-a făcut cont apasă „Licitează" și abia atunci află că
 * trebuie să aștepte. Așa știe de la prima pagină ce se întâmplă.
 */
export default async function AccountStatusBanner({ status }: { status: string }) {
  const t = await getTranslations("account");
  const rejected = status === "REJECTED";

  return (
    <div
      className={`border-b px-4 py-2.5 text-center text-sm ${
        rejected
          ? "border-wing-red/20 bg-wing-red/5 text-wing-red"
          : "border-wing-blue/20 bg-wing-blue/5 text-ink"
      }`}
      data-testid="account-status-banner"
    >
      {rejected ? t("rejectedBanner") : t("pendingBanner")}
    </div>
  );
}
