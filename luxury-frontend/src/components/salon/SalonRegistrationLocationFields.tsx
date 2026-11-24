import {
  DEFAULT_EUROPEAN_COUNTRY_CODE,
  EUROPEAN_PHONE_COUNTRIES,
} from "../../data/europeanPhonePrefixes";
import { SALON_BUSINESS_TYPE_OPTIONS } from "../../data/salonBusinessTypes";
import { SALON_CLIENT_GENDER_OPTIONS } from "../../data/salonClientGenders";

export type SalonRegistrationLocationDraft = {
  name: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  businessTypes: string[];
  clientGenders: string[];
};

export type SalonRegistrationAudience = {
  businessTypeLegend: string;
  clientGenderLegend: string;
  businessTypes: readonly string[];
  clientGenders: readonly string[];
  onToggleBusinessType: (id: string) => void;
  onToggleClientGender: (id: string) => void;
};

type Props = {
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  addressLabel: string;
  capLabel: string;
  cityLabel: string;
  provinceLabel: string;
  countryLabel: string;
  provincePlaceholder: string;
  value: SalonRegistrationLocationDraft;
  disabled?: boolean;
  /** Presente dopo «Conferma sedi»: tipologia e pubblico di questa sede. */
  audience?: SalonRegistrationAudience;
  onChange: (patch: Partial<SalonRegistrationLocationDraft>) => void;
};

export function SalonRegistrationLocationFields({
  title,
  nameLabel,
  namePlaceholder,
  addressLabel,
  capLabel,
  cityLabel,
  provinceLabel,
  countryLabel,
  provincePlaceholder,
  value,
  disabled,
  audience,
  onChange,
}: Props) {
  return (
    <fieldset className="luxury-salon-register-location">
      <legend className="luxury-salon-register-location__legend">{title}</legend>
      <label className="luxury-plans-field luxury-plans-field--full">
        <span>{nameLabel}</span>
        <input
          autoComplete="off"
          required
          maxLength={200}
          value={value.name}
          onChange={(ev) => onChange({ name: ev.target.value })}
          disabled={disabled}
          placeholder={namePlaceholder}
        />
      </label>
      {audience ? (
        <>
          <AudienceFieldset
            legend={audience.businessTypeLegend}
            options={SALON_BUSINESS_TYPE_OPTIONS}
            selected={audience.businessTypes}
            disabled={disabled}
            onToggle={audience.onToggleBusinessType}
          />
          <AudienceFieldset
            legend={audience.clientGenderLegend}
            options={SALON_CLIENT_GENDER_OPTIONS}
            selected={audience.clientGenders}
            disabled={disabled}
            onToggle={audience.onToggleClientGender}
          />
        </>
      ) : null}
      <label className="luxury-plans-field luxury-plans-field--full">
        <span>{addressLabel}</span>
        <input
          autoComplete="street-address"
          required
          maxLength={200}
          value={value.addressLine1}
          onChange={(ev) => onChange({ addressLine1: ev.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="luxury-plans-field">
        <span>{capLabel}</span>
        <input
          autoComplete="postal-code"
          required
          maxLength={12}
          value={value.postalCode}
          onChange={(ev) => onChange({ postalCode: ev.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="luxury-plans-field">
        <span>{cityLabel}</span>
        <input
          autoComplete="address-level2"
          required
          maxLength={100}
          value={value.city}
          onChange={(ev) => onChange({ city: ev.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="luxury-plans-field">
        <span>{provinceLabel}</span>
        <input
          autoComplete="address-level1"
          required
          maxLength={5}
          value={value.province}
          onChange={(ev) => onChange({ province: ev.target.value })}
          disabled={disabled}
          placeholder={provincePlaceholder}
        />
      </label>
      <label className="luxury-plans-field">
        <span>{countryLabel}</span>
        <select
          className="luxury-eu-contact-select"
          value={value.country || DEFAULT_EUROPEAN_COUNTRY_CODE}
          onChange={(ev) => onChange({ country: ev.target.value })}
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
    </fieldset>
  );
}

function AudienceFieldset({
  legend,
  options,
  selected,
  disabled,
  onToggle,
}: {
  legend: string;
  options: readonly { id: string; label: string }[];
  selected: readonly string[];
  disabled?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="luxury-plans-fieldset luxury-plans-salon-types">
      <legend className="luxury-plans-salon-types__legend">{legend}</legend>
      <div className="luxury-plans-salon-types__chips">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`luxury-plans-salon-type-chip${isSelected ? " luxury-plans-salon-type-chip--selected" : ""}`}
            >
              <input
                type="checkbox"
                className="luxury-plans-salon-type-chip__check"
                checked={isSelected}
                disabled={disabled}
                onChange={() => onToggle(opt.id)}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
