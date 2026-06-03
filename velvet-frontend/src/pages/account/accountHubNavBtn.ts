/** Classi NavLink coerenti con `velvet-account-hub`. */
export function accountHubNavBtn(extraClass = "") {
  return ({ isActive }: { isActive: boolean }) =>
    "velvet-account-hub__btn" +
    (isActive ? " velvet-account-hub__btn--active" : "") +
    (extraClass ? ` ${extraClass}` : "");
}
