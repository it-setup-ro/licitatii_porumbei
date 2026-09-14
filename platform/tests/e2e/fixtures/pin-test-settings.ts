import { PrismaClient } from "@prisma/client";

/**
 * Setările cu care au fost scrise testele existente.
 *
 * Platforma a trecut pe prelungire 10 / 10 fără limită, aprobarea conturilor
 * noi și oprirea fluxului prin care crescătorii își puneau singuri porumbeii.
 * Testele mai vechi scurtează o licitație la un minut și așteaptă închiderea,
 * își fac conturi și licitează imediat, sau listează porumbei din „Vinde":
 * cu noile valori, fiecare dintre ele ar aștepta sau ar fi refuzat.
 *
 * Testele licitațiilor pe loturi își pun singure valorile de care au nevoie.
 */
const PINS: Record<string, unknown> = {
  snipeWindowMinutes: 2,
  extensionMinutes: 2,
  maxExtensions: 50,
  accountApprovalRequired: false,
  breederSelfServiceEnabled: true,
};

const prisma = new PrismaClient();

async function main() {
  for (const [key, value] of Object.entries(PINS)) {
    const json = JSON.stringify(value);
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value: json },
      create: { key, value: json },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
