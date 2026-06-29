import {
  DEFAULT_EUROPEAN_COUNTRY_CODE,
  EUROPEAN_PHONE_COUNTRIES,
  europeanCountryByCode,
  europeanCountryByDialCode,
} from "../data/europeanPhonePrefixes";
import { normalizeEuropeanLocalPhone } from "../lib/europeanPhone";

type Props = {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  dialCode: string;
  onDialCodeChange: (dialCode: string) => void;
  phoneLocal: string;
  onPhoneLocalChange: (local: string) => void;
  disabled?: boolean;
  /** Se false, mostra solo il telefono con prefisso (es. registrazione salone con paese in sede). */
  showCountryField?: boolean;
  countrySelectId?: string;
  prefixSelectId?: string;
  phoneInputId?: string;
};

export function VelvetEuropeanContactFields({
  countryCode,
  onCountryCodeChange,
  dialCode,
  onDialCodeChange,
  phoneLocal,
  onPhoneLocalChange,
  disabled = false,
  showCountryField = true,
  countrySelectId,
  prefixSelectId,
  phoneInputId,
}: Props) {
  const onCountryChange = (nextCode: string) => {
    onCountryCodeChange(nextCode);
    const country = europeanCountryByCode(nextCode);
    if (country) onDialCodeChange(country.dialCode);
  };

  const onPrefixChange = (nextDial: string) => {
    onDialCodeChange(nextDial);
    const country = europeanCountryByDialCode(nextDial);
    if (country) onCountryCodeChange(country.code);
  };

  return (
    <>
      {showCountryField ? (
        <label className="luxury-plans-field luxury-plans-field--full">
          <span>Nazione</span>
          <select
            id={countrySelectId}
            name="country"
            className="luxury-eu-contact-select"
            value={countryCode || DEFAULT_EUROPEAN_COUNTRY_CODE}
            onChange={(ev) => onCountryChange(ev.target.value)}
            disabled={disabled}
            autoComplete="country"
          >
            {EUROPEAN_PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="luxury-plans-field luxury-plans-field--full luxury-eu-phone-field">
        <span>Telefono</span>
        <div className="luxury-eu-phone-row">
          <select
            id={prefixSelectId}
            name="phonePrefix"
            className="luxury-eu-contact-select luxury-eu-phone-row__prefix"
            value={dialCode}
            onChange={(ev) => onPrefixChange(ev.target.value)}
            disabled={disabled}
            aria-label="Prefisso internazionale"
          >
            {EUROPEAN_PHONE_COUNTRIES.map((c) => (
              <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                {c.dialCode} {c.code}
              </option>
            ))}
          </select>
          <input
            id={phoneInputId}
            name="phoneLocal"
            type="tel"
            className="luxury-eu-phone-row__number"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={20}
            value={phoneLocal}
            onChange={(ev) => onPhoneLocalChange(normalizeEuropeanLocalPhone(ev.target.value))}
            disabled={disabled}
            placeholder="Numero"
          />
        </div>
      </div>
    </>
  );
}
