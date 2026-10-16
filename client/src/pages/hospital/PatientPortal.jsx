import { useApi, StatusBadge, Spinner, Empty, ErrorNote, money, fmtDate, fmtDateTime, balanceOf } from './hospitalShared.jsx';

// Both pages are for patients. They only show records linked to the patient's own account,
// and they update live when a hospital finishes a visit, discharges them, or bills them.

/* ---------------- Medical records ---------------- */
export function MedicalRecordsPage() {
  const { data, loading, error } = useApi('/hospital/my-records', { live: ['hospital:visit', 'hospital:admission'] });

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;

  const { visits, admissions } = data;
  if (!visits.length && !admissions.length) {
    return <Empty title="No records yet" hint="When a hospital registers you using your account email, your visits and admissions appear here." />;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Hospital stays</h2>
        {admissions.length === 0 && <p className="text-sm text-gray-500">None</p>}
        <ul className="space-y-3">
          {admissions.map((a) => (
            <li key={a._id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-navy-900">{a.organization?.name}</p>
                <StatusBadge value={a.status} />
              </div>
              <p className="text-sm text-gray-600">
                {a.ward?.name} · {fmtDate(a.admittedAt)}{a.dischargedAt ? ` to ${fmtDate(a.dischargedAt)}` : ''}{a.doctor ? ` · Dr ${a.doctor.fullName}` : ''}
              </p>
              <p className="mt-2 text-sm"><span className="font-medium">Reason:</span> {a.reason}</p>
              {a.dischargeSummary && <p className="mt-1 whitespace-pre-wrap text-sm text-navy-800"><span className="font-medium">Summary:</span> {a.dischargeSummary}</p>}
              {a.dischargeInstructions && <p className="mt-1 whitespace-pre-wrap text-sm text-navy-800"><span className="font-medium">At home:</span> {a.dischargeInstructions}</p>}
              {a.followUpDate && <p className="mt-1 text-sm text-gray-600">Follow-up: {fmtDate(a.followUpDate)}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Visits</h2>
        {visits.length === 0 && <p className="text-sm text-gray-500">None</p>}
        <ul className="space-y-3">
          {visits.map((v) => (
            <li key={v._id} className="card p-4">
              <p className="font-semibold text-navy-900">{v.diagnosis || v.complaint}</p>
              <p className="text-sm text-gray-600">{v.organization?.name} · {fmtDateTime(v.completedAt)}{v.doctor ? ` · Dr ${v.doctor.fullName}` : ''}</p>
              {v.treatmentPlan && <p className="mt-2 whitespace-pre-wrap text-sm text-navy-800"><span className="font-medium">Treatment:</span> {v.treatmentPlan}</p>}
              {v.followUpDate && <p className="mt-1 text-sm text-gray-600">Follow-up: {fmtDate(v.followUpDate)}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- My bills ---------------- */
export function MyBillsPage() {
  const { data: invoices, loading, error } = useApi('/hospital/my-invoices', { live: ['hospital:invoice'] });

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  if (!invoices.length) return <Empty title="No bills" hint="Charges from your hospital visits and stays will show up here." />;

  return (
    <ul className="space-y-3">
      {invoices.map((inv) => (
        <li key={inv._id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-navy-900">{inv.invoiceNumber} · {inv.organization?.name}</p>
              <p className="text-sm text-gray-600">{fmtDate(inv.createdAt)}</p>
            </div>
            <StatusBadge value={inv.status} />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-primary-700">See the charges</summary>
            <ul className="mt-2 divide-y divide-gray-100 text-sm">
              {inv.items.map((item) => (
                <li key={item._id} className="flex justify-between py-1.5">
                  <span>{item.description} × {item.quantity}</span>
                  <span>{money(item.quantity * item.unitPrice)}</span>
                </li>
              ))}
            </ul>
          </details>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div><dt className="inline text-gray-600">Total </dt><dd className="inline font-semibold">{money(inv.total)}</dd></div>
            <div><dt className="inline text-gray-600">Paid </dt><dd className="inline font-semibold">{money(inv.amountPaid)}</dd></div>
            <div><dt className="inline text-gray-600">Balance </dt><dd className="inline font-semibold text-navy-900">{money(balanceOf(inv))}</dd></div>
          </dl>
        </li>
      ))}
    </ul>
  );
}