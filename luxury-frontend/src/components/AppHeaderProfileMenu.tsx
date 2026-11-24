import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useEffectiveSalonPlanTier } from "../hooks/useEffectiveSalonPlanTier";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import type { AppHeaderProfileMenuItem } from "../lib/appHeaderProfileMenuItems";
import { nativeAppProfileHubPath } from "../lib/nativeAccountHubPaths";

type Props = {
  items: AppHeaderProfileMenuItem[];
  ariaLabel?: string;
  headerLabel?: string;
};

export function AppHeaderProfileMenu({
  items,
  ariaLabel = "Menu profilo",
  headerLabel = "Il tuo account",
}: Props) {
  const location = useLocation();
  const { signOut, isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  const salonPlanTier = useEffectiveSalonPlanTier();
  const isNativeApp = isLuxuryNativeAppShell();
  const nativeProfileHubPath = nativeAppProfileHubPath({
    isSalonTitolare,
    isSalonStaff,
    isLuxurySuperAdmin,
    salonPlanTier,
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = profileDropdownRef.current;
    if (!el) return;
    if (!profileMenuOpen) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!isNativeApp || !profileMenuOpen) return;
    const syncDropdownPosition = () => {
      const trigger = profileTriggerRef.current;
      const dropdown = profileDropdownRef.current;
      if (!trigger || !dropdown) return;
      const rect = trigger.getBoundingClientRect();
      dropdown.style.position = "fixed";
      dropdown.style.top = `${Math.round(rect.bottom + 12)}px`;
      dropdown.style.right = `${Math.max(12, Math.round(window.innerWidth - rect.right))}px`;
      dropdown.style.left = "auto";
      dropdown.style.bottom = "auto";
    };
    syncDropdownPosition();
    const dropdown = profileDropdownRef.current;
    window.addEventListener("resize", syncDropdownPosition);
    window.addEventListener("scroll", syncDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", syncDropdownPosition);
      window.removeEventListener("scroll", syncDropdownPosition, true);
      if (dropdown) {
        dropdown.style.position = "";
        dropdown.style.top = "";
        dropdown.style.right = "";
        dropdown.style.left = "";
        dropdown.style.bottom = "";
      }
    };
  }, [isNativeApp, profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target as Node)) return;
      setProfileMenuOpen(false);
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDocumentPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  if (isNativeApp) {
    return (
      <Link
        to={nativeProfileHubPath}
        className="luxury-header-cta-pill luxury-header-profile-trigger luxury-header-profile-trigger--hub-link"
        aria-label={ariaLabel}
      >
        Profilo
      </Link>
    );
  }

  return (
    <div className="luxury-header-profile-menu" ref={profileMenuRef}>
      <button
        ref={profileTriggerRef}
        type="button"
        className={`luxury-header-cta-pill luxury-header-profile-trigger${profileMenuOpen ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={profileMenuOpen}
        aria-controls="luxury-header-profile-dropdown"
        onClick={() => setProfileMenuOpen((open) => !open)}
      >
        Profilo
        <span aria-hidden className="luxury-header-profile-caret">
          ▾
        </span>
      </button>
      <div
        ref={profileDropdownRef}
        id="luxury-header-profile-dropdown"
        className={`luxury-header-profile-dropdown${profileMenuOpen ? " is-open" : ""}`}
        role="menu"
        aria-label={ariaLabel}
        aria-hidden={!profileMenuOpen}
      >
        <p className="luxury-header-profile-dropdown__header" role="presentation">
          {headerLabel}
        </p>
        {items.map((item) =>
          item.logout ? (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="luxury-header-profile-item luxury-header-profile-item--button luxury-header-profile-item--logout"
              onClick={() => void signOut()}
            >
              {item.label}
            </button>
          ) : (
            <Link
              key={item.label}
              to={item.to ?? "/"}
              role="menuitem"
              className="luxury-header-profile-item"
              onClick={() => setProfileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
