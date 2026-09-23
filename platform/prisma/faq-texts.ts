/**
 * Întrebările de pornire de la Ajutor.
 *
 * Sunt scrise ca să existe ceva folositor din prima zi; clientul le rescrie din
 * Administrare → Ajutor (întrebări). Textele descriu regulile reale ale
 * platformei: licitare cu plafon, plată în afara site-ului, predare după plată.
 */

export type FaqSeed = {
  category: "ACCOUNT" | "BIDDING" | "PAYMENT" | "SHIPPING" | "OTHER";
  sortIdx: number;
  questionRo: string;
  questionEn: string;
  answerRo: string;
  answerEn: string;
};

export const FAQ_SEED: FaqSeed[] = [
  {
    category: "ACCOUNT",
    sortIdx: 0,
    questionRo: "Cum îmi fac cont?",
    questionEn: "How do I create an account?",
    answerRo:
      "Apeși „Înregistrare”, completezi datele și accepți termenii. Poți intra apoi cu adresa de e-mail sau cu numele de utilizator. Dacă administratorul verifică manual conturile, primești un e-mail când contul tău e aprobat.",
    answerEn:
      "Press “Register”, fill in your details and accept the terms. You can then sign in with your e-mail address or your username. If the administrator checks accounts manually, you get an e-mail once yours is approved.",
  },
  {
    category: "ACCOUNT",
    sortIdx: 1,
    questionRo: "Vreau să vând porumbei. Ce trebuie să fac?",
    questionEn: "I want to sell pigeons. What do I need to do?",
    answerRo:
      "Scrie-ne prin formularul de contact sau folosește cardul „Vreau să organizez o licitație” de pe prima pagină. Îți răspundem și stabilim împreună cum se face licitația.",
    answerEn:
      "Write to us through the contact form, or use the “I want to organise an auction” card on the home page. We reply and agree together how the auction will run.",
  },
  {
    category: "BIDDING",
    sortIdx: 0,
    questionRo: "Cum funcționează licitarea cu plafon?",
    questionEn: "How does maximum-bid (proxy) bidding work?",
    answerRo:
      "Scrii cât ești dispus să dai cel mult — suma aceea rămâne secretă. Platforma licitează în locul tău, cu cât mai puțin posibil, doar cât să treacă peste ceilalți. Dacă cineva pune un plafon mai mare decât al tău, primești anunț că ai fost depășit.",
    answerEn:
      "You enter the most you are willing to pay — that amount stays secret. The platform bids for you, as little as possible, just enough to stay ahead. If someone sets a higher maximum than yours, you are notified that you have been outbid.",
  },
  {
    category: "BIDDING",
    sortIdx: 1,
    questionRo: "De ce prețul nu a sărit direct la suma pe care am scris-o?",
    questionEn: "Why did the price not jump straight to the amount I entered?",
    answerRo:
      "Pentru că plătești o singură treaptă peste cât a fost dispus să dea celălalt, nu cât ai scris tu. Suma ta rămâne plafonul până la care platforma poate urca pentru tine.",
    answerEn:
      "Because you pay one step above what the other bidder was willing to pay, not the amount you entered. Your amount stays the ceiling up to which the platform can bid for you.",
  },
  {
    category: "BIDDING",
    sortIdx: 2,
    questionRo: "Ce se întâmplă dacă cineva licitează în ultimele secunde?",
    questionEn: "What happens if someone bids in the last seconds?",
    answerRo:
      "Licitația se prelungește automat cu câteva minute, ca să aibă toată lumea timp să răspundă. Se poate prelungi de mai multe ori, până nu mai licitează nimeni.",
    answerEn:
      "The auction is automatically extended by a few minutes, so everyone has time to respond. It can be extended several times, until nobody bids any more.",
  },
  {
    category: "PAYMENT",
    sortIdx: 0,
    questionRo: "Cum plătesc porumbelul câștigat?",
    questionEn: "How do I pay for the pigeon I won?",
    answerRo:
      "Plata se face în afara site-ului. După închiderea licitației primești pe e-mail și în contul tău datele de plată: firma, contul bancar și ce trebuie trecut la explicație. Poți plăti prin transfer bancar sau, dacă v-ați înțeles așa, cash la ridicare.",
    answerEn:
      "Payment is made outside the website. When the auction closes, you receive the payment details by e-mail and in your account: the company, the bank account and what to write as the reference. You can pay by bank transfer or, if agreed, in cash on collection.",
  },
  {
    category: "PAYMENT",
    sortIdx: 1,
    questionRo: "Când se consideră plata făcută?",
    questionEn: "When is the payment considered complete?",
    answerRo:
      "Când banii ajung în cont, administratorul marchează comanda ca plătită și vezi asta în contul tău, la Cumpărături.",
    answerEn:
      "When the money arrives, the administrator marks the order as paid and you can see it in your account, under Purchases.",
  },
  {
    category: "SHIPPING",
    sortIdx: 0,
    questionRo: "Când primesc porumbelul?",
    questionEn: "When do I get the pigeon?",
    answerRo:
      "Porumbeii se predau după plată. Te înțelegi cu organizatorul dacă îl ridici personal sau ți-l trimite prin transportator; în contul tău vezi când a fost predat și cui.",
    answerEn:
      "Pigeons are handed over after payment. You agree with the organiser whether you collect it yourself or it is sent with a carrier; your account shows when it was handed over and to whom.",
  },
  {
    category: "SHIPPING",
    sortIdx: 1,
    questionRo: "Cine plătește transportul?",
    questionEn: "Who pays for shipping?",
    answerRo:
      "De regulă cumpărătorul, dacă nu scrie altfel la porumbelul respectiv. Costul depinde de transportator și de distanță.",
    answerEn:
      "Usually the buyer, unless stated otherwise for that pigeon. The cost depends on the carrier and the distance.",
  },
  {
    category: "OTHER",
    sortIdx: 0,
    questionRo: "Pot scrie un articol despre porumbeii mei?",
    questionEn: "Can I write an article about my pigeons?",
    answerRo:
      "Da. Dacă ești crescător aprobat, trimite-l din pagina „Propune un articol”. Îl citim, îl aranjăm dacă e nevoie și îl publicăm cu numele tău.",
    answerEn:
      "Yes. If you are an approved breeder, send it from the “Propose an article” page. We read it, tidy it up if needed and publish it under your name.",
  },
];
