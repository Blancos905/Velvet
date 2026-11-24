import type { LegalDocumentSection } from "../pages/legal/LegalDocumentLayout";

/** Licenza d’uso gratuita per i clienti. Non è il piano Premium e non cede il codice sorgente. */
export const FREE_USE_LICENSE_DOCUMENT: {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalDocumentSection[];
} = {
  title: "Licenza gratuita",
  subtitle: "Uso gratuito del sito e dell’app Saloni Luxury per chi cerca un salone e prenota.",
  updatedAt: "10 novembre 2026",
  sections: [
    {
      heading: "1. A chi è riservata",
      paragraphs: [
        "La licenza gratuita copre l’uso di Saloni Luxury come cliente: consultare il sito, cercare un salone, creare un account cliente, prenotare, gestire le proprie prenotazioni e usare l’app ufficiale su Android e iPhone.",
        "Per il cliente non è previsto un canone. Scaricare l’app e usare queste funzioni non richiede un abbonamento.",
      ],
    },
    {
      heading: "2. Cosa include",
      paragraphs: [
        "Ricerca dei saloni, schede pubbliche, area account cliente e prenotazioni online, nei limiti delle funzioni pubblicate sul sito.",
        "La chat con un salone e le altre funzioni riservate al piano Premium del salone sono disponibili solo se quel salone ha Premium attivo. Per il cliente restano comunque senza costo.",
      ],
    },
    {
      heading: "3. Cosa non include",
      paragraphs: [
        "Questa pagina non è una licenza sul codice sorgente e non autorizza a copiare, rivendere o ridistribuire la piattaforma.",
        "Non è il piano del titolare. Il salone partner usa il piano Premium, con la prova indicata nella pagina Piani e le condizioni dei Termini di servizio. La licenza gratuita non sostituisce quell’abbonamento.",
      ],
    },
    {
      heading: "4. Condizioni",
      paragraphs: [
        "L’uso resta soggetto ai Termini di servizio e all’informativa privacy clienti. La licenza è personale, non trasferibile e vale per un uso lecito del servizio.",
        "Saloni Luxury può aggiornare queste condizioni. Se l’uso per i clienti smette di essere gratuito, la modifica è pubblicata su questa pagina prima che abbia effetto.",
      ],
    },
  ],
};
