import { notFound } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RichText from "@/components/RichText";
import { pick } from "@/lib/locales";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = await getLocale();

  const page = await prisma.contentPage.findUnique({ where: { slug: "despre-noi" } });
  if (!page) notFound();

  const title = pick(currentLocale, page.titleRo, page.titleEn);
  const body = pick(currentLocale, page.bodyRo, page.bodyEn);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold" data-testid="content-title">
        {title}
      </h1>
      <div data-testid="content-body">
        <RichText text={body} />
      </div>
    </div>
  );
}
