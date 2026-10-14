import { useCallback, useEffect, useState } from 'react';
import { Plus, Layers, Trash2 } from 'lucide-react';
import { memorialApi, errMsg } from '../memorialApi';
import { EmptyState, Field, Modal, Spinner, StatusBadge, btnGhost, btnPrimary, cx, inputCls, naira, toast } from '../ui';

const TYPES = ['single', 'double', 'family', 'vault'];

export default function PlotsTab() {
  const [plots, setPlots] = useState([]);
  const [sections, setSections] = useState([]);
  const [filter, setFilter] = useState({ status: '', section: '' });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // 'one' | 'bulk' | plot

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await memorialApi.plots(filter); setPlots(r.plots); setSections(r.sections); } catch (e) { toast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Remove plot ${p.plotNumber}?`)) return;
    try { await memorialApi.deletePlot(p._id); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select className={cx(inputCls, '!w-auto')} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">All statuses</option><option>available</option><option>reserved</option><option>occupied</option></select>
        <select className={cx(inputCls, '!w-auto')} value={filter.section} onChange={(e) => setFilter({ ...filter, section: e.target.value })}><option value="">All sections</option>{sections.map((s) => <option key={s}>{s}</option>)}</select>
        <div className="ml-auto flex gap-2"><button className={btnGhost} onClick={() => setDialog('bulk')}><Layers size={16} /> Add a range</button><button className={btnPrimary} onClick={() => setDialog('one')}><Plus size={16} /> Add plot</button></div>
      </div>

      {loading ? <Spinner className="mx-auto my-12" /> : plots.length === 0 ? <EmptyState title="No plots yet" hint="Add plots one by one, or create a whole row at once, for example A1 to A40." /> : (
        <div className="overflow-x-auto rounded-3xl border border-memorial-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-memorial-50 text-left text-xs text-memorial-500"><tr>{['Plot', 'Section', 'Type', 'Price', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-memorial-100">
              {plots.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3 font-medium text-navy-900">{p.plotNumber}</td>
                  <td className="px-4 py-3 text-memorial-600">{p.section || '–'}</td>
                  <td className="px-4 py-3 capitalize text-memorial-600">{p.type}</td>
                  <td className="px-4 py-3">{naira(p.price || 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} />{p.reservedBy?.name && <p className="mt-0.5 text-xs text-memorial-500">{p.reservedBy.name}</p>}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDialog(p)} className="mr-3 text-primary-700 hover:underline">Edit</button>
                    {p.status === 'available' && <button onClick={() => remove(p)} className="text-memorial-400 hover:text-danger" aria-label="Remove"><Trash2 size={15} className="inline" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && <PlotDialog mode={dialog} sections={sections} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(); }} />}
    </div>
  );
}

function PlotDialog({ mode, sections, onClose, onSaved }) {
  const editing = typeof mode === 'object' ? mode : null;
  const bulk = mode === 'bulk';
  const [f, setF] = useState({ section: editing?.section || '', plotNumber: editing?.plotNumber || '', prefix: '', from: 1, to: 20, type: editing?.type || 'single', price: editing?.price || '', status: editing?.status || '' });
  const [busy, setBusy] = useState(false);
  const s = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }), className: inputCls });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (bulk) { const r = await memorialApi.bulkPlots(f); toast(`${r.created} plots added${r.skipped ? `, ${r.skipped} already existed` : ''}`); }
      else if (editing) await memorialApi.updatePlot(editing._id, { section: f.section, plotNumber: f.plotNumber, type: f.type, price: Number(f.price) || 0, status: f.status });
      else await memorialApi.createPlot(f);
      onSaved();
    } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={bulk ? 'Add a range of plots' : editing ? `Edit plot ${editing.plotNumber}` : 'Add a plot'}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Section" className="sm:col-span-2"><input list="sections" {...s('section')} placeholder="Block A, Garden, Veterans" /><datalist id="sections">{sections.map((x) => <option key={x} value={x} />)}</datalist></Field>
        {bulk ? (<>
          <Field label="Prefix"><input {...s('prefix')} placeholder="A" /></Field><span />
          <Field label="From number"><input type="number" min="0" {...s('from')} /></Field><Field label="To number"><input type="number" min="0" {...s('to')} /></Field>
        </>) : <Field label="Plot number"><input required {...s('plotNumber')} /></Field>}
        <Field label="Type"><select {...s('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Price (₦)"><input type="number" min="0" {...s('price')} /></Field>
        {editing && <Field label="Status" hint={editing.booking ? 'Linked to a booking: manage it from Bookings.' : undefined}><select {...s('status')} disabled={!!editing.booking}><option>available</option><option>reserved</option><option>occupied</option></select></Field>}
        <div className="flex gap-2 sm:col-span-2"><button className={btnPrimary} disabled={busy}>{busy ? 'Saving' : 'Save'}</button><button type="button" className={btnGhost} onClick={onClose}>Cancel</button></div>
      </form>
    </Modal>
  );
}
