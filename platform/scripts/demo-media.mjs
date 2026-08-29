/**
 * Pune pozele și pedigree-urile demonstrative pe loturile din datele demo,
 * FĂRĂ să șteargă nimic altceva din bază.
 *
 * De ce nu prin `db:seed`: seed-ul golește toate tabelele. Pe un server pe care
 * se testează, asta înseamnă pierderea datelor reale. Scriptul ăsta atinge doar
 * cele șapte loturi demo, identificate după seria inelului, și doar:
 *   - pozele care sunt încă schițele vechi (/pigeons/pN.svg)
 *   - câmpul pedigreeUrl
 * Orice poză urcată de un utilizator (/api/files/...) rămâne neatinsă.
 *
 * Rulare:  node scripts/demo-media.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Schițele SVG cu care a pornit proiectul — doar astea se înlocuiesc. */
const PLACEHOLDER = /^\/pigeons\/p\d+b?\.svg$/i;

const LOTURI = [
  {
    ring: "RO 2023 445566",
    foto: [{ url: "/pigeons/voiajor-vanat-bara.jpg", title: "Profil" }],
    pedigree: "/pigeons/pedigree-fulger-albastru.svg",
  },
  {
    ring: "RO 2022 118822",
    foto: [{ url: "/pigeons/voiajor-vanat-pestrit.jpg", title: "Profil" }],
    pedigree: "/pigeons/pedigree-regina-nordului.svg",
  },
  {
    ring: "RO 2024 990011",
    foto: [{ url: "/pigeons/voiajor-deschis.jpg", title: "Profil" }],
    pedigree: "/pigeons/pedigree-vant-de-vest.svg",
  },
  {
    ring: "RO 2021 337788",
    foto: [{ url: "/pigeons/voiajor-robust.jpg", title: "Profil" }],
    pedigree: "/pigeons/pedigree-as-de-fond.svg",
  },
  {
    ring: "RO 2024 220044",
    foto: [{ url: "/pigeons/voiajor-alb-bara.jpg", title: "Profil" }],
    pedigree: "/pigeons/pedigree-perla.svg",
  },
  {
    ring: "RO 2024 550077",
    foto: [{ url: "/pigeons/voiajor-alb-sa.jpg", title: "Profil" }],
    pedigree: "/pigeons/pedigree-sageata-alba.svg",
  },
  {
    ring: "RO 2023 660088",
    foto: [{ url: "/pigeons/voiajor-grizzle.jpg", title: "Profil" }],
    pedigree: "/pigeons/pedigree-perla-nordului.svg",
  },
];

async function main() {
  let atinse = 0;
  let sarite = 0;

  for (const lot of LOTURI) {
    const pigeon = await prisma.pigeon.findFirst({
      where: { ringNumber: lot.ring },
      include: { media: { orderBy: { sortIdx: "asc" } } },
    });

    if (!pigeon) {
      console.log(`—  ${lot.ring}: lotul nu există în bază, sar peste`);
      sarite++;
      continue;
    }

    // pedigree-ul se pune întotdeauna (câmp simplu, nu distruge nimic)
    await prisma.pigeon.update({
      where: { id: pigeon.id },
      data: { pedigreeUrl: lot.pedigree },
    });

    // pozele: înlocuim doar schițele vechi, nu și ce a urcat cineva
    const vechi = pigeon.media.filter((m) => PLACEHOLDER.test(m.url));
    const urcate = pigeon.media.filter((m) => !PLACEHOLDER.test(m.url));

    if (urcate.length > 0) {
      console.log(
        `✓  ${pigeon.name}: pedigree pus; pozele NU s-au schimbat (are ${urcate.length} fișier(e) urcat(e))`
      );
      atinse++;
      continue;
    }

    if (vechi.length > 0) {
      await prisma.mediaAsset.deleteMany({ where: { id: { in: vechi.map((m) => m.id) } } });
    }
    await prisma.mediaAsset.createMany({
      data: lot.foto.map((f, i) => ({
        pigeonId: pigeon.id,
        type: "IMAGE",
        url: f.url,
        title: f.title,
        sortIdx: i,
      })),
    });

    console.log(`✓  ${pigeon.name}: ${lot.foto.length} poză(e) + pedigree`);
    atinse++;
  }

  console.log(`\nGata: ${atinse} loturi actualizate, ${sarite} negăsite.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
