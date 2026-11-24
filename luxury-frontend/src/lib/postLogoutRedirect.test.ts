import { describe, expect, it } from "vitest";
import { postLogoutDestination } from "./postLogoutRedirect";
import type { SurfaceLocation } from "./luxurySurfaces";

function loc(partial: Partial<SurfaceLocation> & Pick<SurfaceLocation, "hostname" | "port" | "pathname">): SurfaceLocation {
  return {
    protocol: "http:",
    search: "",
    hash: "",
    ...partial,
  };
}

describe("postLogoutDestination", () => {
  it("dalla home di ricerca resta sulla home, anche se il ruolo è del pannello", () => {
    const home = loc({ hostname: "127.0.0.1", port: "8080", pathname: "/" });
    expect(postLogoutDestination("salon", home)).toBe("http://127.0.0.1:8080/");
    expect(postLogoutDestination("staff", home)).toBe("http://127.0.0.1:8080/");
    expect(postLogoutDestination(null, home)).toBe("http://127.0.0.1:8080/");
  });

  it("dal pannello torna al login di quel pannello", () => {
    expect(postLogoutDestination("salon", loc({ hostname: "127.0.0.1", port: "8083", pathname: "/salone" }))).toBe(
      "http://127.0.0.1:8083/account?account=salon",
    );
    expect(postLogoutDestination("staff", loc({ hostname: "127.0.0.1", port: "8083", pathname: "/account/staff" }))).toBe(
      "http://127.0.0.1:8083/account?account=staff",
    );
    expect(
      postLogoutDestination("admin", loc({ protocol: "https:", hostname: "admin.saloniluxury.it", port: "", pathname: "/admin/dashboard" })),
    ).toBe("https://admin.saloniluxury.it/account?account=admin");
  });
});
