/**
 * Logo-ul real al brandului (public/brand/logo.jpeg): porumbel cu aripa
 * in degrade albastru-galben-portocaliu-rosu, pe fundal ivory.
 * shape="round" pentru header/footer, "card" pentru hero si momente festive.
 */
export default function LogoMark({
  size = 36,
  shape = "round",
}: {
  size?: number;
  shape?: "round" | "card";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.jpeg"
      alt="No.1 & Best Pigeons"
      width={size}
      height={size}
      className={`shrink-0 object-cover ${
        shape === "round" ? "rounded-full" : "rounded-2xl shadow-lg"
      }`}
    />
  );
}
