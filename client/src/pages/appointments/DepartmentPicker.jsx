import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { getDepartmentMeta } from './departments';

/**
 * Pick a medical department (Dentist, Optician, Cardiology...).
 *
 *  departments  array of department names from your API (any text works)
 *  value        selected name (string), or string[] when `multiple`
 *  onChange     called with the new value
 *  variant      "chips": one scrolling row, good for filters
 *               "grid" : big cards, good for booking / quick chat / hospital settings
 *  multiple     let the user pick several (for example the departments a hospital offers)
 *  counts       optional { "Dentistry": 4 } to show "4 doctors" on grid cards
 */
export default function DepartmentPicker({
  departments = [], value, onChange, variant = 'chips', multiple = false,
  allLabel = 'All departments', showSearch = false, counts = {}, className = '',
}) {
  const [query, setQuery] = useState('');

  const items = useMemo(
    () => [...new Set(departments)].filter(Boolean).map((name) => ({ name, ...getDepartmentMeta(name) })),
    [departments]
  );

  const isSelected = (name) => (multiple ? (value || []).includes(name) : value === name);

  const toggle = (name) => {
    if (multiple) {
      const next = new Set(value || []);
      if (next.has(name)) next.delete(name); else next.add(name);
      onChange([...next]);
    } else {
      onChange(value === name ? '' : name);   // clicking the selected one again clears it
    }
  };

  if (variant === 'chips') {
    return (
      <div
        role={multiple ? 'group' : 'radiogroup'} aria-label="Departments"
        className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {!multiple && (
          <Chip active={!value} onClick={() => onChange('')}>{allLabel}</Chip>
        )}
        {items.map(({ name, label, icon: Icon }) => (
          <Chip key={name} active={isSelected(name)} onClick={() => toggle(name)} title={name}>
            <Icon className="h-4 w-4" />
            {label}
          </Chip>
        ))}
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.name} ${i.label} ${i.hint}`.toLowerCase().includes(q)) : items;

  return (
    <div className={className}>
      {showSearch && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments, e.g. dentist, optician" aria-label="Search departments"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-navy-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      )}

      <div role={multiple ? 'group' : 'radiogroup'} aria-label="Departments" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map(({ name, label, hint, icon: Icon, tintClass }) => {
          const active = isSelected(name);
          return (
            <button
              key={name} type="button" onClick={() => toggle(name)} aria-pressed={active} title={name}
              className={`relative flex flex-col items-start gap-3 rounded-2xl border bg-white p-4 text-left transition hover:shadow-md ${
                active ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tintClass}`}><Icon className="h-6 w-6" /></span>
              <span>
                <span className="block font-semibold text-navy-900">{label}</span>
                {hint && <span className="block text-xs text-gray-500">{hint}</span>}
                {counts[name] != null && <span className="mt-1 block text-xs font-medium text-primary-700">{counts[name]} available</span>}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No department matches "{query}".</p>}
    </div>
  );
}

function Chip({ active, onClick, children, title }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active} title={title}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
        active ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 bg-white text-navy-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}