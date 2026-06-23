/** Solo account cliente B2C: titolare e staff salone gestiscono l'agenda, non prenotano come clienti. */
export function canBookOnlineAsConsumer(isSalonTitolare: boolean, isSalonStaff: boolean): boolean {
  return !isSalonTitolare && !isSalonStaff;
}
