import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tot in afara de api, fisiere statice si assets Next
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
