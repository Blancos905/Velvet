import { DEFAULT_EUROPEAN_COUNTRY_CODE, EUROPEAN_PHONE_COUNTRIES } from "../data/europeanPhonePrefixes";

export type SalonBillingProfileFieldValues = {
  legalName: string;
  billingEmail: string;
  vatNumber: string;
  fiscalCode: string;
  subjectType: "" | "COMPANY" | "INDIVIDUAL";
  addressLine1: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  sdiCode: string;
  pecEmail: string;
};

type SalonBillingProfileFieldsProps = {
  values: SalonBillingProfileFieldValues;
  onChange: <K extends keyof SalonBillingProfileFieldValues>(key: K, value: SalonBillingProfileFieldValues[K]) => void;
  disabled?: boolean;
  /** Blocca solo i campi indirizzo (es. «stesso indirizzo della sede»). */
  disableAddressFields?: boolean;
  legendId?: string;
  variant?: "account" | "register";
};

export function SalonBillingProfileFields({
  values,
  onChange,
  disabled = false,
  disableAddressFields = false,
  variant = "account",
  legendId,
}: SalonBillingProfileFieldsProps) {
  const addressDisabled = disabled || disableAddressFields;
  const fieldClass = variant === "register" ? "velvet-plans-field" : "velvet-form-label";
  const inputClass = variant === "register" ? undefined : "velvet-soft-field";
  const selectClass = variant === "register" ? "velvet-eu-contact-select" : "velvet-soft-field";
  const rowClass = variant === "register" ? "velvet-plans-password-pair" : "velvet-profile-form__row";
  const fullClass = variant === "register" ? "velvet-plans-field velvet-plans-field--full" : fieldClass;

  return (
    <fieldset className="velvet-plans-fieldset velvet-plans-field--full velvet-salon-billing-fields" aria-labelledby={legendId}>
      {legendId ? (
        <legend id={legendId} className="velvet-plans-salon-types__legend">
          Dati di fatturazione
        </legend>
      ) : null}
      <p className={variant === "register" ? "velvet-salon-billing-fields__hint" : "velvet-text-muted"}>
        Per le fatture dell&apos;abbonamento Premium: indica almeno Partita IVA o codice fiscale, e codice SDI o PEC
        (Italia).
      </p>

      <label className={fullClass}>
        <span>Ragione sociale / intestazione fattura</span>
        <input
          className={inputClass}
          name="billingLegalName"
          value={values.legalName}
          onChange={(e) => onChange("legalName", e.target.value)}
          maxLength={200}
          required
          disabled={disabled}
        />
      </label>

      <label className={fullClass}>
        <span>Email fatturazione</span>
        <input
          className={inputClass}
          name="billingEmail"
          type="email"
          value={values.billingEmail}
          onChange={(e) => onChange("billingEmail", e.target.value)}
          maxLength={320}
          required
          disabled={disabled}
        />
      </label>

      <label className={variant === "register" ? "velvet-plans-field velvet-plans-field--full" : fieldClass}>
        <span>Tipo soggetto (opzionale)</span>
        <select
          className={selectClass}
          name="billingSubjectType"
          value={values.subjectType}
          onChange={(e) => onChange("subjectType", e.target.value as SalonBillingProfileFieldValues["subjectType"])}
          disabled={disabled}
        >
          <option value="">Non specificato</option>
          <option value="COMPANY">Società / ditta</option>
          <option value="INDIVIDUAL">Persona fisica / professionista</option>
        </select>
      </label>

      <div className={rowClass}>
        <label className={fieldClass}>
          <span>Partita IVA</span>
          <input
            className={inputClass}
            name="billingVatNumber"
            value={values.vatNumber}
            onChange={(e) => onChange("vatNumber", e.target.value)}
            maxLength={16}
            placeholder="12345678901"
            disabled={disabled}
          />
        </label>
        <label className={fieldClass}>
          <span>Codice fiscale</span>
          <input
            className={inputClass}
            name="billingFiscalCode"
            value={values.fiscalCode}
            onChange={(e) => onChange("fiscalCode", e.target.value)}
            maxLength={16}
            disabled={disabled}
          />
        </label>
      </div>

      <label className={fullClass}>
        <span>Indirizzo di fatturazione</span>
        <input
          className={inputClass}
          name="billingAddressLine1"
          value={values.addressLine1}
          onChange={(e) => onChange("addressLine1", e.target.value)}
          maxLength={200}
          required
          disabled={addressDisabled}
        />
      </label>

      <div className={rowClass}>
        <label className={fieldClass}>
          <span>CAP fatturazione</span>
          <input
            className={inputClass}
            name="billingPostalCode"
            value={values.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value)}
            maxLength={12}
            required
            disabled={addressDisabled}
          />
        </label>
        <label className={fieldClass}>
          <span>Città fatturazione</span>
          <input
            className={inputClass}
            name="billingCity"
            value={values.city}
            onChange={(e) => onChange("city", e.target.value)}
            maxLength={100}
            required
            disabled={addressDisabled}
          />
        </label>
      </div>

      <div className={rowClass}>
        <label className={fieldClass}>
          <span>Provincia fatturazione</span>
          <input
            className={inputClass}
            name="billingProvince"
            value={values.province}
            onChange={(e) => onChange("province", e.target.value.toUpperCase())}
            maxLength={5}
            placeholder="MI"
            required
            disabled={addressDisabled}
          />
        </label>
        <label className={fieldClass}>
          <span>Paese fatturazione</span>
          <select
            className={selectClass}
            name="billingCountry"
            value={values.country || DEFAULT_EUROPEAN_COUNTRY_CODE}
            onChange={(e) => onChange("country", e.target.value)}
            disabled={addressDisabled}
          >
            {EUROPEAN_PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={rowClass}>
        <label className={fieldClass}>
          <span>Codice destinatario SDI</span>
          <input
            className={inputClass}
            name="billingSdiCode"
            value={values.sdiCode}
            onChange={(e) => onChange("sdiCode", e.target.value.toUpperCase())}
            maxLength={7}
            placeholder="ABCDEFG"
            disabled={disabled}
          />
        </label>
        <label className={fieldClass}>
          <span>PEC</span>
          <input
            className={inputClass}
            name="billingPecEmail"
            type="email"
            value={values.pecEmail}
            onChange={(e) => onChange("pecEmail", e.target.value)}
            maxLength={320}
            disabled={disabled}
          />
        </label>
      </div>
    </fieldset>
  );
}
