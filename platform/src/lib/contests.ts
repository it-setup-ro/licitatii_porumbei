import { prisma } from "./db";

/**
 * Starea concursurilor se întreține singură, din ceasul de 15 secunde.
 *
 * Daniel: „după concurs nu ar mai trebui să fie pe bandă. Eventual să se
 * depublice singur. Că dacă sunt multe concursuri devine dificil să mergi la
 * fiecare să-l oprești. Și totuși concursul trebuie să fie anunțat din timp, să
 * știe lumea să se înscrie."
 *
 * De aceea: concursul **rămâne publicat** (pagina lui, cu regulament și
 * rezultate, e de arhivă și linkul trimis pe WhatsApp trebuie să meargă mai
 * departe), dar trece singur pe „Încheiat" — iar banda de pe prima pagină ia
 * doar concursurile care nu s-au încheiat. Nimeni nu mai umblă pe la fiecare.
 */
export async function actualizeazaStarileConcursurilor(): Promise<{
  pornite: number;
  incheiate: number;
}> {
  const acum = new Date();
  const [pornite, incheiate] = await Promise.all([
    prisma.contest.updateMany({
      where: { status: "UPCOMING", startsAt: { lte: acum }, endsAt: { gt: acum } },
      data: { status: "ACTIVE" },
    }),
    prisma.contest.updateMany({
      where: { status: { in: ["UPCOMING", "ACTIVE"] }, endsAt: { lte: acum } },
      data: { status: "FINISHED" },
    }),
  ]);
  return { pornite: pornite.count, incheiate: incheiate.count };
}
