/** Allineati a {@code it.velvet.studio.domain.SalonClientGender} (backend). */
export const SALON_CLIENT_GENDER_OPTIONS = [
  { id: "MALE", label: "Maschile" },
  { id: "FEMALE", label: "Femminile" },
] as const;

export type SalonClientGenderId = (typeof SALON_CLIENT_GENDER_OPTIONS)[number]["id"];
