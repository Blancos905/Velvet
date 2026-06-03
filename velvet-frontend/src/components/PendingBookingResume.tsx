import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../api/client";
import type { CreatedAppointmentResponse } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { notifySalonCatalogClientsChanged } from "../lib/salonCatalogClientsSync";

const STORAGE_KEY = "velvet_pending_booking";

export type PendingBookingPayload = {
  organizationSlug: string;
  serviceId: string;
  operatorId: string;
  start: string;
};

export function savePendingBooking(p: PendingBookingPayload) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function hasPendingBooking(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function PendingBookingResume() {
  const { isAuthenticated, isLoading, accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || isLoading || !accessToken || ran.current) return;
    if (isSalonTitolare || isSalonStaff) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    ran.current = true;
    let payload: PendingBookingPayload;
    try {
      payload = JSON.parse(raw) as PendingBookingPayload;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      ran.current = false;
      return;
    }
    (async () => {
      try {
        const res = await apiJson<CreatedAppointmentResponse>("/api/v1/me/appointments", {
          method: "POST",
          accessToken,
          body: JSON.stringify({
            organizationSlug: payload.organizationSlug,
            serviceId: payload.serviceId,
            operatorId: payload.operatorId,
            start: payload.start,
          }),
        });
        sessionStorage.removeItem(STORAGE_KEY);
        await qc.invalidateQueries({ queryKey: ["me", "appointments"] });
        await qc.invalidateQueries({ queryKey: ["me", "notifications"] });
        await qc.invalidateQueries({ queryKey: ["me", "salon-clients"] });
        void qc.invalidateQueries({ queryKey: ["catalog", "clients"] });
        notifySalonCatalogClientsChanged();
        navigate(`/prenotazione/gestisci?token=${encodeURIComponent(res.manageToken)}`, { replace: true });
      } catch (e) {
        sessionStorage.removeItem(STORAGE_KEY);
        ran.current = false;
        window.alert(e instanceof Error ? e.message : "Prenotazione non riuscita.");
      }
    })();
  }, [isAuthenticated, isLoading, accessToken, isSalonTitolare, isSalonStaff, qc, navigate]);

  return null;
}
