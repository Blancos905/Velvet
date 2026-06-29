/** Classi NavLink coerenti con `luxury-account-hub`. */
export function accountHubNavBtn(extraClass = "") {
  return ({ isActive }: { isActive: boolean }) =>
    "luxury-account-hub__btn" +
    (isActive ? " luxury-account-hub__btn--active" : "") +
    (extraClass ? ` ${extraClass}` : "");
}
