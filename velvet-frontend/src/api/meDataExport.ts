import { apiUrl } from "../config/env";

export async function downloadMeDataExport(accessToken: string): Promise<void> {
  const res = await fetch(apiUrl("/api/v1/me/data-export"), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Export dati non riuscito");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "saloni-velvet-data-export.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
