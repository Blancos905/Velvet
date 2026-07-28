import { ClientAccountHeroHeader } from "./ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "./InfoPrivacyAccountHeroHeader";

export function ClientBookingsHeroHeader({
  listCount,
  upcoming,
}: {
  listCount?: number;
  upcoming: boolean;
}) {
  const countLabel =
    listCount == null
      ? "Caricamento elenco…"
      : listCount === 0
        ? upcoming
          ? "Nessuna visita in programma"
          : "Nessuna prenotazione passata"
        : `${listCount} ${listCount === 1 ? "prenotazione" : "prenotazioni"} ${upcoming ? "in arrivo" : "passate"}`;

  return (
    <ClientAccountHeroHeader
      headlinePre="Le mie "
      headlineAccent="prenotazioni"
      badgeSecondary="Le tue visite"
      kickerLabel="Agenda personale"
      kickerChip="In arrivo e storico"
      subtitle={
        <>
          Consulta le visite <strong>in programma</strong>, apri il dettaglio e gestisci orario o disdetta entro i{" "}
          <em>limiti del salone</em>.
        </>
      }
      metaItems={[
        { icon: INFO_PRIVACY_HERO_ICONS.calendar, label: countLabel },
        { icon: INFO_PRIVACY_HERO_ICONS.clock, label: upcoming ? "Prossime visite" : "Archivio completate" },
      ]}
    />
  );
}
