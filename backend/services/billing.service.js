

import Invoice from '../models/hospital/Invoice.js';
import { nextNumber } from '../models/hospital/Counter.js';
import { broadcast } from './hospitalRealtime.js';

/*
 * Puts charges on the patient's open invoice (unpaid or part-paid), or starts a new one.
 * Visits and discharges call this, so billing happens automatically.
 *   patient: the PatientRecord document (needs _id and user)
 *   items:   [{ description, category, quantity, unitPrice }]
 */
export const addCharge = async ({ organization, patient, items, userId }) => {
  let invoice = await Invoice.findOne({
    organization,
    patient: patient._id,
    status: { $in: ['unpaid', 'partial'] },
  }).sort({ createdAt: -1 });

  if (!invoice) {
    invoice = new Invoice({
      organization,
      patient: patient._id,
      invoiceNumber: await nextNumber(`invoice:${organization}`, 'INV'),
    });
  }

  items.forEach((item) => invoice.items.push({ ...item, addedBy: userId }));
  await invoice.save();

  broadcast(organization, 'hospital:invoice', { action: 'charged', id: invoice._id }, patient.user);
  return invoice;
};