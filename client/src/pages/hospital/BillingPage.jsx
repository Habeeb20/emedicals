import { useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api.js';
import {
  useApi, useAction, useFields, useDebounced, Modal, Field, Tabs, StatusBadge, Spinner, Empty, ErrorNote,
  PatientPicker, btn, inputCls, money, fmtDate, fmtDateTime, balanceOf,
} from './hospitalShared.jsx';

const CATEGORIES = ['consultation', 'bed', 'drug', 'lab', 'procedure', 'other'];
const METHODS = ['cash', 'card', 'transfer', 'insurance'];

// The charge fields, shared by "New charge" and "Add charge to this invoice"
function ChargeFields({ bind }) {
  return (
    <>
      <Field label="What is the charge for?"><input className={inputCls} required placeholder="X-ray, dressing, drip…" {...bind('description')} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Type">
          <select className={inputCls} {...bind('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Quantity"><input className={inputCls} type="number" min="1" required {...bind('quantity')} /></Field>
        <Field label="Price each (₦)"><input className={inputCls} type="number" min="0" required {...bind('unitPrice')} /></Field>
      </div>
    </>
  );
}

const EMPTY_CHARGE = { description: '', category: 'other', quantity: 1, unitPrice: '' };

/* ---------------- Charge any patient ---------------- */
function NewChargeModal({ onClose }) {
  const [patient, setPatient] = useState(null);
  const [form, bind] = useFields(EMPTY_CHARGE);
  const [run, busy] = useAction();

  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => api.post(`/hospital/patients/${patient._id}/charges`, form), 'Charge added')) onClose();
  };

  return (
    <Modal title="New charge" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Patient"><PatientPicker value={patient} onChange={setPatient} /></Field>
        <ChargeFields bind={bind} />
        <p className="text-xs text-gray-500">The charge goes on the patient's open invoice, or starts a new one.</p>
        <button className={btn.primary} disabled={busy || !patient}>Add charge</button>
      </form>
    </Modal>
  );
}

/* ---------------- One invoice ---------------- */
function InvoiceModal({ id, onClose }) {
  const { data: invoice, loading, error } = useApi(`/hospital/invoices/${id}`, { live: ['hospital:invoice'] });
  const [panel, setPanel] = useState(null); // 'charge' | 'payment' | 'discount' | 'void'
  const [run, busy] = useAction();
  const [charge, bindCharge, setCharge] = useFields(EMPTY_CHARGE);
  const [payment, bindPayment, setPayment] = useFields({ amount: '', method: 'cash', reference: '' });
  const [discount, setDiscount] = useState('');
  const [reason, setReason] = useState('');

  const open = invoice && ['unpaid', 'partial'].includes(invoice.status);
  const balance = invoice ? balanceOf(invoice) : 0;

  const submit = (task, message, after) => async (event) => {
    event.preventDefault();
    if (await run(task, message)) { after?.(); setPanel(null); }
  };

  const choose = (name) => {
    setPanel(panel === name ? null : name);
    if (name === 'payment') setPayment((p) => ({ ...p, amount: balance }));
    if (name === 'discount') setDiscount(invoice.discount || '');
  };

  return (
    <Modal title={invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'} onClose={onClose} wide>
      {loading && <Spinner />}
      <ErrorNote message={error} />
      {invoice && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-navy-900">{invoice.patient.fullName}</p>
              <p className="text-sm text-gray-600">{invoice.patient.mrn} · {fmtDate(invoice.createdAt)}</p>
            </div>
            <StatusBadge value={invoice.status} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr><th className="py-2">Item</th><th>Qty</th><th className="text-right">Price</th><th className="text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <tr key={item._id}>
                    <td className="py-2">{item.description} <span className="text-xs text-gray-500">({item.category})</span></td>
                    <td>{item.quantity}</td>
                    <td className="text-right">{money(item.unitPrice)}</td>
                    <td className="text-right">{money(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{money(invoice.subtotal)}</dd></div>
            {invoice.discount > 0 && <div className="flex justify-between"><dt className="text-gray-600">Discount</dt><dd>−{money(invoice.discount)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{money(invoice.total)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Paid</dt><dd>{money(invoice.amountPaid)}</dd></div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-navy-900"><dt>Balance</dt><dd>{money(balance)}</dd></div>
          </dl>

          {invoice.payments.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-navy-900">Payments</h3>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {invoice.payments.map((p) => (
                  <li key={p._id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                    <span>{money(p.amount)} · {p.method}{p.reference ? ` · ${p.reference}` : ''}</span>
                    <span className="text-xs text-gray-500">{fmtDateTime(p.paidAt)}{p.receivedBy ? ` · ${p.receivedBy.fullName}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {open && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button className={btn.primary} onClick={() => choose('payment')}>Record payment</button>
                <button className={btn.ghost} onClick={() => choose('charge')}>Add charge</button>
                <button className={btn.ghost} onClick={() => choose('discount')}>Discount</button>
                {invoice.amountPaid === 0 && <button className={btn.ghost} onClick={() => choose('void')}>Void</button>}
              </div>

              {panel === 'payment' && (
                <form onSubmit={submit(() => api.post(`/hospital/invoices/${id}/payments`, payment), 'Payment recorded')} className="space-y-3 rounded-lg bg-gray-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Amount (₦)"><input className={inputCls} type="number" min="1" max={balance} required {...bindPayment('amount')} /></Field>
                    <Field label="Method"><select className={inputCls} {...bindPayment('method')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
                    <Field label="Reference"><input className={inputCls} placeholder="Optional" {...bindPayment('reference')} /></Field>
                  </div>
                  <button className={btn.primary} disabled={busy}>Save payment</button>
                </form>
              )}

              {panel === 'charge' && (
                <form onSubmit={submit(() => api.post(`/hospital/invoices/${id}/items`, charge), 'Charge added', () => setCharge(EMPTY_CHARGE))} className="space-y-3 rounded-lg bg-gray-50 p-4">
                  <ChargeFields bind={bindCharge} />
                  <button className={btn.primary} disabled={busy}>Add charge</button>
                </form>
              )}

              {panel === 'discount' && (
                <form onSubmit={submit(() => api.patch(`/hospital/invoices/${id}/discount`, { discount }), 'Discount applied')} className="space-y-3 rounded-lg bg-gray-50 p-4">
                  <Field label="Discount amount (₦)"><input className={inputCls} type="number" min="0" max={invoice.subtotal} required value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
                  <button className={btn.primary} disabled={busy}>Apply discount</button>
                </form>
              )}

              {panel === 'void' && (
                <form onSubmit={submit(() => api.post(`/hospital/invoices/${id}/void`, { reason }), 'Invoice voided')} className="space-y-3 rounded-lg bg-gray-50 p-4">
                  <Field label="Why is it being voided?"><input className={inputCls} required value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                  <button className={btn.danger} disabled={busy}>Void invoice</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- The page ---------------- */
export default function BillingPage() {
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const { data: invoices, loading, error } = useApi('/hospital/invoices', { params: { status, q: search }, live: ['hospital:invoice'] });
  const [openId, setOpenId] = useState(null);
  const [charging, setCharging] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[{ key: 'all', label: 'All' }, { key: 'unpaid', label: 'Unpaid' }, { key: 'partial', label: 'Part paid' }, { key: 'paid', label: 'Paid' }]}
        />
        <input className={`${inputCls} max-w-xs flex-1`} placeholder="Search invoice, name or MRN" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invoices" />
        <button className={`${btn.primary} ml-auto`} onClick={() => setCharging(true)}><Plus className="h-4 w-4" /> New charge</button>
      </div>

      <ErrorNote message={error} />
      {loading && <Spinner />}
      {!loading && invoices?.length === 0 && <Empty title="No invoices found" hint="Invoices appear automatically when a visit is completed or a patient is discharged." />}

      {invoices?.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500">
              <tr><th className="px-4 py-3">Invoice</th><th>Patient</th><th>Date</th><th className="text-right">Total</th><th className="text-right">Balance</th><th className="px-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv._id} onClick={() => setOpenId(inv._id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy-900">{inv.invoiceNumber}</td>
                  <td>{inv.patient?.fullName}<span className="block text-xs text-gray-500">{inv.patient?.mrn}</span></td>
                  <td>{fmtDate(inv.createdAt)}</td>
                  <td className="text-right">{money(inv.total)}</td>
                  <td className="text-right">{money(balanceOf(inv))}</td>
                  <td className="px-4"><StatusBadge value={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && <InvoiceModal id={openId} onClose={() => setOpenId(null)} />}
      {charging && <NewChargeModal onClose={() => setCharging(false)} />}
    </div>
  );
}