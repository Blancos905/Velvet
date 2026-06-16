/// CSS piano Free titolare — solo app mobile.
/// `_ff`: override globali app Free; `_fp`: dettagli hub account.
const String _ff = 'html.velvet-native-app-free';
const String _fp = 'html.velvet-native-app-free.velvet-native-app-free-profile';

const String velvetAppFreeThemeCss =
    '''
$_ff .velvet-account-hub--velvet-plans {
  --hub-plans-orange: #38bdf8;
  --hub-plans-orange-hot: #0ea5e9;
  --hub-plans-edge: rgba(96, 165, 250, 0.72);
  --hub-plans-edge-soft: rgba(186, 230, 253, 0.38);
  --hub-plans-btn-ink: #0a1628;
  --hub-plans-btn-ink-strong: #020617;
  --hub-plans-btn-fill: linear-gradient(180deg, #e0f2fe 0%, #bae6fd 18%, #7dd3fc 52%, #38bdf8 100%);
  --hub-plans-btn-fill-hover: linear-gradient(180deg, #f0f9ff 0%, #bae6fd 20%, #7dd3fc 58%, #0ea5e9 100%);
  --hub-plans-btn-fill-active: linear-gradient(165deg, #f0f9ff 0%, #7dd3fc 34%, #0ea5e9 100%);
  --hub-plans-btn-rim: rgba(2, 6, 23, 0.88);
  --hub-plans-btn-shadow: #0c4a6e;
}

$_ff .velvet-account-hub--velvet-plans::before {
  background:
    radial-gradient(ellipse 130% 90% at 50% -18%, rgba(186, 230, 253, 0.22), transparent 52%),
    radial-gradient(ellipse 95% 70% at 100% 35%, rgba(56, 189, 248, 0.28), transparent 48%),
    radial-gradient(ellipse 85% 65% at 0% 75%, rgba(30, 58, 95, 0.42), transparent 50%),
    radial-gradient(ellipse 70% 50% at 50% 100%, rgba(15, 23, 42, 0.55), transparent 55%),
    linear-gradient(180deg, #1e40af 0%, #1e3a5f 22%, #0f2744 48%, #0c1929 78%, #0a1628 100%) !important;
}

$_ff .velvet-account-hub--velvet-plans .velvet-account-hub__btn,
$_ff #velvet-app-free-owner-nav-scroll .velvet-account-hub__btn {
  color: #0a1628 !important;
  -webkit-text-fill-color: #0a1628 !important;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255, 255, 255, 0.42) 0%, transparent 58%),
    linear-gradient(180deg, #e0f2fe 0%, #bae6fd 18%, #7dd3fc 52%, #38bdf8 100%) !important;
  border: 2px solid rgba(2, 6, 23, 0.88) !important;
}

$_ff .velvet-brand-saloni,
$_ff .velvet-account-hub__masthead .velvet-brand-saloni {
  color: #0284c7 !important;
  -webkit-text-fill-color: #0284c7 !important;
}

$_ff .velvet-account-hub--native-hub .velvet-account-hub__body:empty {
  display: none !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
}

$_fp .velvet-account-hub--velvet-plans {
  --hub-plans-orange: #38bdf8;
  --hub-plans-orange-hot: #0ea5e9;
  --hub-plans-edge: rgba(96, 165, 250, 0.72);
  --hub-plans-edge-soft: rgba(186, 230, 253, 0.38);
  --hub-plans-btn-ink: #0a1628;
  --hub-plans-btn-ink-strong: #020617;
  --hub-plans-btn-fill: linear-gradient(180deg, #e0f2fe 0%, #bae6fd 18%, #7dd3fc 52%, #38bdf8 100%);
  --hub-plans-btn-fill-hover: linear-gradient(180deg, #f0f9ff 0%, #bae6fd 20%, #7dd3fc 58%, #0ea5e9 100%);
  --hub-plans-btn-fill-active: linear-gradient(165deg, #f0f9ff 0%, #7dd3fc 34%, #0ea5e9 100%);
  --hub-plans-btn-rim: rgba(2, 6, 23, 0.88);
  --hub-plans-btn-shadow: #0c4a6e;
}

$_fp .velvet-account-hub--velvet-plans::before {
  background:
    radial-gradient(ellipse 130% 90% at 50% -18%, rgba(186, 230, 253, 0.22), transparent 52%),
    radial-gradient(ellipse 95% 70% at 100% 35%, rgba(56, 189, 248, 0.28), transparent 48%),
    radial-gradient(ellipse 85% 65% at 0% 75%, rgba(30, 58, 95, 0.42), transparent 50%),
    radial-gradient(ellipse 70% 50% at 50% 100%, rgba(15, 23, 42, 0.55), transparent 55%),
    linear-gradient(180deg, #1e40af 0%, #1e3a5f 22%, #0f2744 48%, #0c1929 78%, #0a1628 100%) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__masthead {
  background: linear-gradient(
    145deg,
    rgba(186, 230, 253, 0.42) 0%,
    rgba(56, 189, 248, 0.28) 52%,
    rgba(14, 165, 233, 0.22) 100%
  ) !important;
  box-shadow:
    0 0 0 1px rgba(2, 6, 23, 0.55) inset,
    0 28px 80px rgba(0, 0, 0, 0.55),
    0 0 60px rgba(56, 189, 248, 0.14) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__masthead::before {
  background: radial-gradient(ellipse 75% 48% at 12% 20%, rgba(56, 189, 248, 0.22), transparent 55%) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__masthead-inner {
  box-shadow:
    inset 5px 0 0 var(--hub-plans-orange-hot),
    0 0 0 1px #000 inset,
    0 6px 0 #000,
    0 28px 60px rgba(0, 0, 0, 0.72),
    0 0 44px rgba(56, 189, 248, 0.2) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__plan {
  border-color: var(--hub-plans-edge) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__welcome {
  border-top-color: rgba(56, 189, 248, 0.28) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__reg {
  color: rgba(186, 230, 253, 0.95) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__greeting {
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.85),
    0 0 28px rgba(56, 189, 248, 0.35) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__salon-name {
  color: rgba(186, 230, 253, 0.95) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__nav {
  box-shadow:
    0 0 0 1px #000 inset,
    0 5px 0 #000,
    0 24px 52px rgba(0, 0, 0, 0.65),
    0 0 36px rgba(56, 189, 248, 0.1) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__nav::before {
  background:
    radial-gradient(ellipse 70% 50% at 8% 0%, rgba(56, 189, 248, 0.16), transparent 62%),
    radial-gradient(ellipse 60% 45% at 92% 8%, rgba(186, 230, 253, 0.1), transparent 58%) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__nav-label {
  color: rgba(186, 230, 253, 0.82) !important;
  border-top-color: rgba(56, 189, 248, 0.22) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__nav-scroll {
  border-color: rgba(56, 189, 248, 0.28) !important;
  scrollbar-color: rgba(186, 230, 253, 0.55) rgba(0, 0, 0, 0.55) !important;
}

@media (hover: hover) and (pointer: fine) {
  $_fp .velvet-account-hub--velvet-plans .velvet-account-hub__nav-scroll:hover {
    border-color: rgba(186, 230, 253, 0.45) !important;
    background: linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 0, 0, 0.55) 100%) !important;
  }
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.48) inset,
    0 4px 0 var(--hub-plans-btn-shadow),
    0 14px 28px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(186, 230, 253, 0.24) !important;
}

@media (hover: hover) and (pointer: fine) {
  $_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn:hover {
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.6) inset,
      0 7px 0 var(--hub-plans-btn-shadow),
      0 20px 40px rgba(14, 116, 144, 0.38),
      0 0 36px rgba(56, 189, 248, 0.22) !important;
  }
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__nav-scroll .velvet-account-hub__btn:focus-visible {
  box-shadow:
    0 0 0 2px var(--hub-plans-btn-ink-strong),
    0 0 0 4px #e0f2fe,
    0 4px 0 var(--hub-plans-btn-shadow),
    0 18px 36px rgba(56, 189, 248, 0.28) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--active {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.72) inset,
    0 5px 0 #0369a1,
    0 0 0 2px rgba(186, 230, 253, 0.65),
    0 18px 42px rgba(14, 116, 144, 0.42),
    0 0 48px rgba(56, 189, 248, 0.28) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--sky,
$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--salon-statistiche,
$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--ghost,
$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--admin {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.48) inset,
    0 4px 0 var(--hub-plans-btn-shadow),
    0 14px 28px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(186, 230, 253, 0.24) !important;
}

@media (hover: hover) and (pointer: fine) {
  $_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--sky:hover,
  $_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--salon-statistiche:hover,
  $_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--ghost:hover,
  $_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--admin:hover {
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.6) inset,
      0 7px 0 var(--hub-plans-btn-shadow),
      0 20px 40px rgba(14, 116, 144, 0.38),
      0 0 36px rgba(56, 189, 248, 0.22) !important;
  }
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--sky.velvet-account-hub__btn--active,
$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--salon-statistiche.velvet-account-hub__btn--active,
$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--ghost.velvet-account-hub__btn--active,
$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__btn--admin.velvet-account-hub__btn--active {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.72) inset,
    0 5px 0 #0369a1,
    0 0 0 2px rgba(186, 230, 253, 0.65),
    0 18px 42px rgba(14, 116, 144, 0.42),
    0 0 48px rgba(56, 189, 248, 0.28) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__notif-pill {
  color: var(--hub-plans-btn-ink-strong);
  background: linear-gradient(145deg, #f0f9ff 0%, #bae6fd 48%, #7dd3fc 100%) !important;
}

$_fp .velvet-account-hub--velvet-plans .velvet-account-hub__body {
  box-shadow:
    0 0 0 1px #000 inset,
    0 5px 0 #000,
    0 24px 52px rgba(0, 0, 0, 0.65),
    0 0 36px rgba(56, 189, 248, 0.1) !important;
}

$_fp .velvet-account-salone-free-intro--hero {
  background: rgba(2, 6, 23, 0.22) !important;
  border-color: rgba(96, 165, 250, 0.18) !important;
  box-shadow: 0 16px 40px rgba(2, 6, 23, 0.35) !important;
}

$_fp .velvet-account-salone-free-intro--hero::before {
  background: linear-gradient(180deg, #7dd3fc, rgba(14, 165, 233, 0.65)) !important;
}

html.velvet-native-app-free a.velvet-app-free-nav-dupe-hidden,
html.velvet-native-app-free .velvet-app-free-nav-source-hidden {
  display: none !important;
}

html.velvet-native-app-free #velvet-app-free-owner-nav-scroll {
  display: grid !important;
  visibility: visible !important;
}

html.velvet-native-app-free #velvet-app-free-owner-nav-scroll .velvet-account-hub__btn {
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  color: #0a1628 !important;
  -webkit-text-fill-color: #0a1628 !important;
  font-size: 1rem !important;
  font-weight: 800 !important;
  min-height: 2.75rem !important;
}

html.velvet-native-app-free a.velvet-app-free-hidden-nav {
  display: none !important;
}

$_fp .velvet-native-account-overlay__panel {
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.03) 0%, transparent 36%),
    linear-gradient(168deg, #050505 0%, #020202 48%, #000000 100%) !important;
  border-color: rgba(96, 165, 250, 0.32) !important;
}

$_fp .velvet-native-account-overlay__bar {
  border-bottom-color: rgba(96, 165, 250, 0.22) !important;
}

$_fp .velvet-native-account-overlay__back,
$_fp .velvet-native-account-overlay__title {
  color: #7dd3fc !important;
}

$_fp .velvet-native-account-overlay__close {
  color: #f0f9ff !important;
  border-color: rgba(125, 211, 252, 0.35) !important;
  background: rgba(15, 23, 42, 0.75) !important;
}

$_fp .velvet-site-header {
  border-bottom-color: rgba(96, 165, 250, 0.32) !important;
  box-shadow: 0 10px 36px rgba(8, 20, 38, 0.45) !important;
}

$_fp .velvet-header-main {
  background: linear-gradient(
    180deg,
    #1a3352 0%,
    #132f52 48%,
    #0c1929 100%
  ) !important;
}

$_fp .velvet-brand-logo {
  filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.38)) !important;
}

$_fp .velvet-brand-text {
  border-color: rgba(96, 165, 250, 0.28) !important;
}

$_fp .velvet-brand-saloni {
  color: #0284c7 !important;
}

$_fp .velvet-header-profile-trigger {
  border-color: rgba(96, 165, 250, 0.48) !important;
  color: #7dd3fc !important;
  animation: none !important;
  box-shadow:
    0 3px 0 rgba(0, 0, 0, 0.45),
    0 6px 18px rgba(8, 20, 38, 0.35),
    inset 0 1px 0 rgba(186, 230, 253, 0.14) !important;
}

$_fp .velvet-header-profile-trigger:hover,
$_fp .velvet-header-profile-trigger.is-open {
  color: #bae6fd !important;
  border-color: rgba(186, 230, 253, 0.72) !important;
  box-shadow:
    0 5px 0 rgba(0, 0, 0, 0.48),
    0 18px 40px rgba(8, 20, 38, 0.42),
    0 0 36px rgba(56, 189, 248, 0.22),
    inset 0 1px 0 rgba(186, 230, 253, 0.2) !important;
}

$_fp .velvet-header-profile-trigger:focus-visible {
  outline-color: rgba(125, 211, 252, 0.95) !important;
}

$_fp .velvet-header-profile-trigger:hover .velvet-header-profile-caret,
$_fp .velvet-header-profile-trigger.is-open .velvet-header-profile-caret {
  color: #bae6fd !important;
}

$_fp .velvet-surface-card,
$_fp .velvet-salon-services-form-card,
$_fp .velvet-owner-dash__tile {
  border-color: rgba(96, 165, 250, 0.28) !important;
}

$_fp a:focus-visible,
$_fp button:focus-visible {
  outline-color: #38bdf8 !important;
}

html.velvet-native-app-free.velvet-native-app-free-servizi .velvet-salon-services-photo-panel,
html.velvet-native-app-free.velvet-native-app-free-servizi .velvet-brand-service-photo-row,
html.velvet-native-app-free.velvet-native-app-free-servizi .velvet-salon-services-list__crop-controls,
html.velvet-native-app-free.velvet-native-app-free-servizi input.velvet-salon-services-hidden-file {
  display: none !important;
  pointer-events: none !important;
}

html.velvet-native-app-free .velvet-free-upgrade-card,
html.velvet-native-app-free .velvet-salon-free-page__promo {
  display: none !important;
}
''';
