import { describe, expect, it } from "vitest";
import {
  currentSurface,
  panelHandoffUrl,
  isEmailVerificationLinkPage,
  isPublicSalonRegistrationPath,
  publicSurfaceDeniesPanelPath,
  surfaceForPath,
  surfaceOrigin,
  surfaceRedirectUrl,
  type SurfaceLocation,
} from "./luxurySurfaces";

function loc(partial: Partial<SurfaceLocation> & Pick<SurfaceLocation, "hostname" | "port" | "pathname">): SurfaceLocation {
  return {
    protocol: "http:",
    search: "",
    hash: "",
    ...partial,
  };
}

describe("surfaceForPath", () => {
  it("tiene clienti, staff e ricerca sulla superficie pubblica", () => {
    expect(surfaceForPath("/")).toBe("public");
    expect(surfaceForPath("/search")).toBe("public");
    expect(surfaceForPath("/s/atelier")).toBe("public");
    expect(surfaceForPath("/account")).toBe("public");
    expect(surfaceForPath("/account/chat")).toBe("public");
    expect(surfaceForPath("/account/billing/checkout")).toBe("public");
  });

  it("assegna il pannello titolare e il super admin", () => {
    expect(surfaceForPath("/salone")).toBe("salon");
    expect(surfaceForPath("/account/staff")).toBe("salon");
    expect(surfaceForPath("/account/staff/agenda")).toBe("salon");
    expect(surfaceForPath("/salone/servizi")).toBe("salon");
    expect(surfaceForPath("/account/salone/clienti")).toBe("salon");
    expect(surfaceForPath("/admin")).toBe("admin");
    expect(surfaceForPath("/admin/dashboard")).toBe("admin");
    expect(surfaceForPath("/admin/register")).toBe("admin");
  });
});

describe("ruoli sulla home di ricerca", () => {
  it("cliente e ospite non entrano nel pannello", () => {
    expect(publicSurfaceDeniesPanelPath("/salone", null)).toBe(true);
    expect(publicSurfaceDeniesPanelPath("/account/staff", { admin: false, owner: false, staff: false })).toBe(true);
    expect(publicSurfaceDeniesPanelPath("/admin/dashboard", null)).toBe(true);
    expect(publicSurfaceDeniesPanelPath("/", null)).toBe(false);
    expect(publicSurfaceDeniesPanelPath("/search", { admin: false, owner: false, staff: false })).toBe(false);
    expect(publicSurfaceDeniesPanelPath("/piani", null)).toBe(false);
    expect(publicSurfaceDeniesPanelPath("/salone", { admin: false, owner: true, staff: false })).toBe(false);
    expect(publicSurfaceDeniesPanelPath("/account/staff", { admin: false, owner: false, staff: true })).toBe(false);
  });
});

describe("registrazione salone sul sito clienti", () => {
  it("lascia aperte le pagine di registrazione e chiude sul pannello", () => {
    expect(isPublicSalonRegistrationPath("/piani")).toBe(true);
    expect(isPublicSalonRegistrationPath("/registrazione/premium/checkout")).toBe(true);
    expect(isPublicSalonRegistrationPath("/registrazione/premium/success")).toBe(true);
    expect(isPublicSalonRegistrationPath("/conferma-email")).toBe(true);
    expect(isPublicSalonRegistrationPath("/account/billing/checkout")).toBe(true);
    expect(isPublicSalonRegistrationPath("/account/billing/success")).toBe(true);
    expect(isPublicSalonRegistrationPath("/")).toBe(false);
    expect(isPublicSalonRegistrationPath("/salone")).toBe(false);
    expect(isPublicSalonRegistrationPath("/account")).toBe(false);
  });
});

describe("link di conferma email", () => {
  it("blocca la navigazione solo sulla pagina aperta dal link", () => {
    expect(isEmailVerificationLinkPage("/conferma-email", "?token=abc")).toBe(true);
    expect(isEmailVerificationLinkPage("/conferma-email", "token=abc")).toBe(true);
    expect(isEmailVerificationLinkPage("/conferma-email/", "?token=abc")).toBe(true);
    expect(isEmailVerificationLinkPage("/conferma-email", "")).toBe(false);
    expect(isEmailVerificationLinkPage("/conferma-email", "?email=a@b.it")).toBe(false);
    expect(isEmailVerificationLinkPage("/conferma-email", "?token=   ")).toBe(false);
    expect(isEmailVerificationLinkPage("/piani", "?token=abc")).toBe(false);
  });
});

describe("origini locali", () => {
  const publicHome = loc({ hostname: "127.0.0.1", port: "8080", pathname: "/" });

  it("riconosce la superficie dalla porta", () => {
    expect(currentSurface(publicHome)).toBe("public");
    expect(currentSurface(loc({ hostname: "127.0.0.1", port: "8083", pathname: "/salone" }))).toBe("salon");
    expect(currentSurface(loc({ hostname: "127.0.0.1", port: "8084", pathname: "/admin" }))).toBe("admin");
  });

  it("dalla home non entra nel pannello: offre il link e non reindirizza", () => {
    const salonPath = loc({ hostname: "127.0.0.1", port: "8080", pathname: "/salone", search: "?x=1" });
    expect(surfaceRedirectUrl(salonPath)).toBeNull();
    expect(panelHandoffUrl(salonPath)).toBe("http://127.0.0.1:8083/salone?x=1");
    expect(panelHandoffUrl(loc({ hostname: "127.0.0.1", port: "8080", pathname: "/account/staff" }))).toBe(
      "http://127.0.0.1:8083/account/staff",
    );
    expect(panelHandoffUrl(loc({ hostname: "127.0.0.1", port: "8080", pathname: "/admin/dashboard" }))).toBe(
      "http://127.0.0.1:8084/admin/dashboard",
    );
    expect(surfaceRedirectUrl(publicHome)).toBeNull();
    expect(panelHandoffUrl(publicHome)).toBeNull();
    expect(surfaceRedirectUrl(loc({ hostname: "127.0.0.1", port: "8083", pathname: "/" }))).toBeNull();
    expect(surfaceRedirectUrl(loc({ hostname: "127.0.0.1", port: "8084", pathname: "/search" }))).toBeNull();
  });
});

describe("origini di produzione", () => {
  it("usa i sottodomini e riporta la home su www", () => {
    const onWww = loc({
      protocol: "https:",
      hostname: "www.saloniluxury.it",
      port: "",
      pathname: "/salone/clienti",
    });
    expect(currentSurface(onWww)).toBe("public");
    expect(surfaceOrigin("salon", onWww)).toBe("https://salone.saloniluxury.it");
    expect(surfaceOrigin("admin", onWww)).toBe("https://admin.saloniluxury.it");
    expect(surfaceRedirectUrl(onWww)).toBeNull();
    expect(panelHandoffUrl(onWww)).toBe("https://salone.saloniluxury.it/salone/clienti");

    const onSalon = loc({
      protocol: "https:",
      hostname: "salone.saloniluxury.it",
      port: "",
      pathname: "/search",
    });
    expect(currentSurface(onSalon)).toBe("salon");
    expect(surfaceRedirectUrl(onSalon)).toBeNull();
    expect(
      surfaceRedirectUrl(
        loc({ protocol: "https:", hostname: "salone.saloniluxury.it", port: "", pathname: "/salone" }),
      ),
    ).toBeNull();
  });
});
