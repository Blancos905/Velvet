import { apiJson } from "./client";
import type { SalonRegistrationLocationPayload } from "./registerConsumer";

export async function saveSalonRegistrationLocations(
  accessToken: string,
  body: {
    primaryLocation: SalonRegistrationLocationPayload;
    additionalLocations: SalonRegistrationLocationPayload[];
    salonBusinessTypes: string[];
    salonClientGenders: string[];
  },
): Promise<void> {
  await apiJson("/api/v1/me/salon/registration-locations", {
    method: "POST",
    accessToken,
    body: JSON.stringify(body),
  });
}
