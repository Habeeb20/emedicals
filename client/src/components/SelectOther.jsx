import { useState } from 'react';

const base =
  'h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-navy-900 focus:border-pharmacy-500 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/30';

const OTHER = '__other__';

/**
 * Dropdown with an "Other…" choice that reveals a text box.
 * value is always a string; onChange receives the final string value.
 */
export default function SelectOther({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  otherLabel = 'Other…',
  otherPlaceholder = 'Type it here',
  className = base,
  required = false,
  allowOther = true,
}) {
  const [custom, setCustom] = useState(false);
  const current = value == null ? '' : String(value);
  const list = options.map(String);
  const showCustom = allowOther && (custom || (current !== '' && !list.includes(current)));

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === OTHER) {
      setCustom(true);
      onChange('');
    } else {
      setCustom(false);
      onChange(v);
    }
  };

  return (
    <div className="space-y-2">
      <select
        className={className}
        value={showCustom ? OTHER : current}
        onChange={handleSelect}
        required={required && !showCustom}
      >
        <option value="">{placeholder}</option>
        {list.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        {allowOther && <option value={OTHER}>{otherLabel}</option>}
      </select>
      {showCustom && (
        <input
          className={className}
          value={current}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          required={required}
          autoFocus
        />
      )}
    </div>
  );
}