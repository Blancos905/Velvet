import { useEffect, useState } from "react";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useOptionalAdminAuth } from "../auth/AdminAuthProvider";
import {
  AD_POPUP_DEMO_PLACEHOLDERS,
  AD_POPUP_DEMO_SHOW_ON_ACCOUNT_ENTER,
  AD_POPUP_SHOW_DELAY_MS,
  pickAdPopupForZone,
  pickRandomAdPopupForZone,
  type AdPopupCampaign,
} from "../data/adPopups";
import {
  consumeAdPopupPending,
  hasSeenAdPopup,
  isAdPopupDebugForceEnabled,
  markAdPopupSeen,
  resolvePostLoginAdZone,
} from "../lib/adPopupGate";
import { AdPopupModal } from "./AdPopupModal";

/**
 * Host popup pubblicitari post-login nell’area account.
 * In demo: marchio random a ogni ingresso in /account.
 */
export function AdPopupHost() {
  const { isAuthenticated, isLuxurySuperAdmin, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const adminAuth = useOptionalAdminAuth();
  const [campaign, setCampaign] = useState<AdPopupCampaign | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isLuxurySuperAdmin || adminAuth?.isAdminSession) return;

    const zone = resolvePostLoginAdZone({
      isLuxurySuperAdmin,
      isSalonTitolare,
      isSalonStaff,
    });
    if (!zone) return;

    const force = isAdPopupDebugForceEnabled();
    const demoEnter =
      AD_POPUP_DEMO_PLACEHOLDERS && AD_POPUP_DEMO_SHOW_ON_ACCOUNT_ENTER;
    const pending = force || demoEnter || consumeAdPopupPending();
    if (!pending) return;

    const picked =
      force || demoEnter ? pickRandomAdPopupForZone(zone) : pickAdPopupForZone(zone);
    if (!picked) return;

    const frequency = picked.frequency ?? "once_per_session";
    if (!force && !demoEnter && hasSeenAdPopup(picked.id, frequency)) return;

    const t = window.setTimeout(() => {
      setCampaign(picked);
      if (!demoEnter) {
        markAdPopupSeen(picked.id, frequency);
      }
    }, force || demoEnter ? 350 : AD_POPUP_SHOW_DELAY_MS);

    return () => window.clearTimeout(t);
  }, [
    isAuthenticated,
    isLuxurySuperAdmin,
    isSalonTitolare,
    isSalonStaff,
    adminAuth?.isAdminSession,
  ]);

  if (!campaign) return null;

  return <AdPopupModal campaign={campaign} onClose={() => setCampaign(null)} />;
}
