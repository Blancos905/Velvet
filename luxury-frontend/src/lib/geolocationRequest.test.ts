import { afterEach, describe, expect, it, vi } from "vitest";
import { locateByNetwork } from "../api/locate";
import { checkGeolocationEnvironment, requestGeolocationCoords } from "./geolocationRequest";

vi.mock("../api/locate", () => ({
  locateByNetwork: vi.fn(),
}));

describe("checkGeolocationEnvironment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks insecure browser context without native bridge", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 Chrome/120",
      geolocation: { getCurrentPosition: vi.fn() },
    });
    vi.stubGlobal("window", { isSecureContext: false });
    const env = checkGeolocationEnvironment();
    expect(env.ok).toBe(false);
    if (!env.ok) {
      expect(env.message).toMatch(/connessione sicura/i);
    }
  });

  it("allows insecure context in SaloniLuxuryApp WebView", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 SaloniLuxuryApp/1.0",
      geolocation: { getCurrentPosition: vi.fn() },
    });
    vi.stubGlobal("window", {
      isSecureContext: false,
      __luxuryNativeGeolocationInstalled: false,
    });
    expect(checkGeolocationEnvironment().ok).toBe(true);
  });

  it("allows insecure context when Flutter geo bridge is installed", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 Chrome/120",
      geolocation: { getCurrentPosition: vi.fn() },
    });
    vi.stubGlobal("window", {
      isSecureContext: false,
      __luxuryNativeGeolocationInstalled: true,
    });
    expect(checkGeolocationEnvironment().ok).toBe(true);
  });
});

describe("requestGeolocationCoords", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(locateByNetwork).mockReset();
  });

  it("uses network location from a PC on insecure HTTP", async () => {
    const getCurrentPosition = vi.fn();
    vi.mocked(locateByNetwork).mockResolvedValue({ lat: 45.46, lng: 9.19 });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      geolocation: { getCurrentPosition },
    });
    vi.stubGlobal("window", { isSecureContext: false });

    await expect(requestGeolocationCoords()).resolves.toEqual({ lat: 45.46, lng: 9.19 });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("asks a desktop browser for network accuracy instead of GPS", async () => {
    vi.mocked(locateByNetwork).mockResolvedValue(null);
    const getCurrentPosition = vi.fn(
      (ok: PositionCallback, _err: PositionErrorCallback, opts?: PositionOptions) => {
        expect(opts?.enableHighAccuracy).toBe(false);
        ok({ coords: { latitude: 41.9, longitude: 12.5 } } as GeolocationPosition);
      },
    );
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
      geolocation: { getCurrentPosition },
    });
    vi.stubGlobal("window", { isSecureContext: true });

    await expect(requestGeolocationCoords()).resolves.toEqual({ lat: 41.9, lng: 12.5 });
    expect(locateByNetwork).not.toHaveBeenCalled();
  });

  it("starts the phone GPS request in the same turn as the tap", async () => {
    let started = false;
    const getCurrentPosition = vi.fn(
      (ok: PositionCallback, _err: PositionErrorCallback, opts?: PositionOptions) => {
        started = true;
        expect(opts?.enableHighAccuracy).toBe(true);
        ok({ coords: { latitude: 45.07, longitude: 7.68 } } as GeolocationPosition);
      },
    );
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      geolocation: { getCurrentPosition },
    });
    vi.stubGlobal("window", { isSecureContext: true });

    const pending = requestGeolocationCoords();
    expect(started).toBe(true);
    await expect(pending).resolves.toEqual({ lat: 45.07, lng: 7.68 });
  });

  it("does not fall back to the network address when the user denies permission", async () => {
    const getCurrentPosition = vi.fn((_ok: PositionCallback, err: PositionErrorCallback) => {
      err({ code: 1 } as GeolocationPositionError);
    });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      geolocation: { getCurrentPosition },
    });
    vi.stubGlobal("window", { isSecureContext: true });

    await expect(requestGeolocationCoords()).rejects.toBeTruthy();
    expect(locateByNetwork).not.toHaveBeenCalled();
  });
});
