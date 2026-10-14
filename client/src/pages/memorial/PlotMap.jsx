import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cx, naira } from './ui';

const TYPE_LETTER = { single: 'S', double: 'D', family: 'F', vault: 'V' };
const TYPE_LABEL = { single: 'Single', double: 'Double', family: 'Family', vault: 'Vault' };

// The signature view of a cemetery: every plot as a tile, grouped by section.
export default function PlotMap({ plots = [], sections = [], selectedId, onSelect }) {
  const [section, setSection] = useState('');
  const [type, setType] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const visible = useMemo(
    () => plots.filter((p) => (!section || p.section === section) && (!type || p.type === type) && (!onlyOpen || p.status === 'available')),
    [plots, section, type, onlyOpen]
  );
  const grouped = useMemo(() => {
    const g = new Map();
    visible.forEach((p) => g.set(p.section || 'General', [...(g.get(p.section || 'General') || []), p]));
    return [...g.entries()];
  }, [visible]);
  const selected = plots.find((p) => p._id === selectedId);

  const tile = (p) => {
    const open = p.status === 'available';
    const isSel = p._id === selectedId;
    return (
      <button
        key={p._id}
        disabled={!open}
        onClick={() => onSelect(isSel ? null : p)}
        aria-pressed={isSel}
        title={`Plot ${p.plotNumber}, ${TYPE_LABEL[p.type]}${p.price ? `, ${naira(p.price)}` : ''}, ${p.status}`}
        className={cx(
          'relative grid h-12 w-14 place-items-center rounded-t-2xl rounded-b-md border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
          isSel && 'border-primary-700 bg-primary-600 text-white',
          !isSel && open && 'border-primary-300 bg-white text-navy-800 hover:border-primary-600 hover:bg-primary-50',
          !isSel && p.status === 'reserved' && 'cursor-not-allowed border-warning/40 bg-warning-light text-warning-dark',
          !isSel && p.status === 'occupied' && 'cursor-not-allowed border-memorial-200 bg-memorial-200 text-memorial-500'
        )}
      >
        {isSel ? <Check size={16} /> : p.plotNumber}
        <span className="absolute -bottom-1.5 right-0.5 rounded bg-white px-0.5 text-[10px] leading-none text-memorial-500">{TYPE_LETTER[p.type]}</span>
      </button>
    );
  };

  const sel = 'rounded-xl border border-memorial-200 bg-white px-3 py-2 text-sm text-memorial-700 focus:border-primary-500 focus:outline-none';
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={section} onChange={(e) => setSection(e.target.value)} className={sel} aria-label="Section">
          <option value="">All sections</option>
          {sections.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel} aria-label="Plot type">
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-memorial-600">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="accent-primary-600" /> Open plots only
        </label>
      </div>

      <div className="mb-5 flex flex-wrap gap-4 text-xs text-memorial-600">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-t-md border border-primary-300 bg-white" /> Open</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-t-md border border-warning/40 bg-warning-light" /> Reserved</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-t-md bg-memorial-200" /> Taken</span>
        <span className="inline-flex items-center gap-1.5">S single, D double, F family, V vault</span>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-2xl bg-memorial-50 py-10 text-center text-sm text-memorial-500">No plots match these filters.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([name, list]) => (
            <div key={name}>
              <h4 className="mb-3 font-serif text-base text-navy-900">{name} <span className="font-sans text-xs text-memorial-500">({list.filter((p) => p.status === 'available').length} open)</span></h4>
              <div className="flex flex-wrap gap-x-2.5 gap-y-3">{list.map(tile)}</div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-900">
          <span>Plot {selected.plotNumber}{selected.section ? `, ${selected.section}` : ''}, {TYPE_LABEL[selected.type].toLowerCase()}</span>
          <strong className="font-serif text-lg">{naira(selected.price || 0)}</strong>
        </div>
      )}
    </div>
  );
}
