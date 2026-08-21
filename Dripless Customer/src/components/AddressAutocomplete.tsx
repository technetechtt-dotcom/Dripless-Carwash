import React, { useEffect, useState } from 'react';
import { geoApi } from '@shared/api';

export type AddressSuggestion = {
  id: string;
  label: string;
  lat: number | null;
  lng: number | null;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address…',
  className,
  inputClassName,
  disabled
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void geoApi
        .autocomplete(value.trim())
        .then((rows) => {
          setSuggestions(rows);
          setOpen(rows.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className={className || 'relative'}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(suggestions.length > 0)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-eco-50 dark:text-slate-200 dark:hover:bg-slate-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(suggestion);
                  onChange(suggestion.label);
                  setOpen(false);
                  setSuggestions([]);
                }}>
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
