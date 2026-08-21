import { notFound } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import RichText from "@/components/RichText";
import ContactForm from "@/components/ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = await getLocale();

  const [page, user] = await Promise.all([
    prisma.contentPage.findUnique({ where: { slug: "contact" } }),
    getCurrentUser(),
  ]);
  if (!page) notFound();

  const title = currentLocale === "en" ? page.titleEn : page.titleRo;
  const body = currentLocale === "en" ? page.bodyEn : page.bodyRo;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold" data-testid="content-title">
        {title}
      </h1>
      <div className="mb-8" data-testid="content-body">
        <RichText text={body} />
      </div>
      <ContactForm defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
    </div>
  );
}
