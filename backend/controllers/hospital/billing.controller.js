import Invoice from '../../models/hospital/Invoice.js';
import PatientRecord from '../../models/hospital/PatientRecord.js';
import { addCharge } from '../../services/billing.service.js';
import { broadcast, tellPatient } from '../../services/hospitalRealtime.js';
import { ok, fail, HttpError, escapeRegex } from '../../utils/http.js';

const CATEGORIES = ['consultation', 'bed', 'drug', 'lab', 'procedure', 'other'];
const METHODS = ['cash', 'card', 'transfer', 'insurance'];

const findInvoice = async (req) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, organization: req.orgId });
  if (!invoice) throw new HttpError(404, 'Invoice not found');
  return invoice;
};

const patientOf = (invoice) => PatientRecord.findById(invoice.patient).select('user fullName');

const announce = async (invoice, action) => {
  const patient = await patientOf(invoice);
  broadcast(invoice.organization, 'hospital:invoice', { action, id: invoice._id }, patient?.user);
  return patient;
};

// Checks one charge line from the request body
const cleanItem = (body) => {
  const description = String(body.description || '').trim();
  const quantity = Number(body.quantity || 1);
  const unitPrice = Number(body.unitPrice);
  const category = CATEGORIES.includes(body.category) ? body.category : 'other';

  if (!description) throw new HttpError(400, 'Describe the charge');
  if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, 'Quantity must be a whole number, 1 or more');
  if (Number.isNaN(unitPrice) || unitPrice < 0) throw new HttpError(400, 'Price must be a positive number');

  return { description, category, quantity, unitPrice };
};

// GET /hospital/invoices?status=&q=
export const listInvoices = async (req, res) => {
  try {
    const filter = { organization: req.orgId };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const q = String(req.query.q || '').trim();
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i');
      const patients = await PatientRecord.find({ organization: req.orgId, $or: [{ fullName: pattern }, { mrn: pattern }] }).select('_id').lean();
      filter.$or = [{ invoiceNumber: pattern }, { patient: { $in: patients.map((p) => p._id) } }];
    }

    const invoices = await Invoice.find(filter)
      .populate('patient', 'fullName mrn')
      .select('-items -payments')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return ok(res, invoices);
  } catch (error) {
    return fail(res, error, 'Could not load invoices');
  }
};

// GET /hospital/invoices/:id
export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, organization: req.orgId })
      .populate('patient', 'fullName mrn phone')
      .populate('payments.receivedBy', 'fullName')
      .lean();
    if (!invoice) throw new HttpError(404, 'Invoice not found');
    return ok(res, invoice);
  } catch (error) {
    return fail(res, error, 'Could not load the invoice');
  }
};

// POST /hospital/patients/:id/charges: add a charge to the patient's open invoice (or start a new one)
export const chargePatient = async (req, res) => {
  try {
    const patient = await PatientRecord.findOne({ _id: req.params.id, organization: req.orgId });
    if (!patient) throw new HttpError(404, 'Patient not found');

    const invoice = await addCharge({ organization: req.orgId, patient, items: [cleanItem(req.body)], userId: req.user._id });
    return ok(res, invoice, 201);
  } catch (error) {
    return fail(res, error, 'Could not add the charge');
  }
};

// POST /hospital/invoices/:id/items
export const addItem = async (req, res) => {
  try {
    const invoice = await findInvoice(req);
    if (invoice.status === 'paid' || invoice.status === 'void') throw new HttpError(409, 'This invoice is closed. Add the charge to a new one.');

    invoice.items.push({ ...cleanItem(req.body), addedBy: req.user._id });
    await invoice.save();
    await announce(invoice, 'item-added');
    return ok(res, invoice);
  } catch (error) {
    return fail(res, error, 'Could not add the charge');
  }
};

// POST /hospital/invoices/:id/payments  { amount, method, reference }
export const recordPayment = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const method = METHODS.includes(req.body.method) ? req.body.method : 'cash';
    if (!(amount > 0)) throw new HttpError(400, 'Enter an amount above zero');

    const invoice = await findInvoice(req);
    if (invoice.status === 'void') throw new HttpError(409, 'This invoice was voided');

    const balance = invoice.total - invoice.amountPaid;
    if (amount > balance) throw new HttpError(400, `The balance is only ${balance}`);

    invoice.payments.push({ amount, method, reference: req.body.reference, receivedBy: req.user._id });
    await invoice.save();

    const patient = await announce(invoice, 'payment');
    await tellPatient(patient, 'Payment received', `We received ${amount} on invoice ${invoice.invoiceNumber}.`, { invoiceId: invoice._id });
    return ok(res, invoice);
  } catch (error) {
    return fail(res, error, 'Could not record the payment');
  }
};

// PATCH /hospital/invoices/:id/discount  { discount }
export const setDiscount = async (req, res) => {
  try {
    const discount = Number(req.body.discount);
    if (Number.isNaN(discount) || discount < 0) throw new HttpError(400, 'Discount must be a positive number');

    const invoice = await findInvoice(req);
    if (invoice.status === 'void') throw new HttpError(409, 'This invoice was voided');
    if (discount > invoice.subtotal) throw new HttpError(400, 'Discount cannot be more than the invoice total');

    invoice.discount = discount;
    await invoice.save();
    await announce(invoice, 'discount');
    return ok(res, invoice);
  } catch (error) {
    return fail(res, error, 'Could not apply the discount');
  }
};

// POST /hospital/invoices/:id/void  { reason }
export const voidInvoice = async (req, res) => {
  try {
    const invoice = await findInvoice(req);
    if (invoice.amountPaid > 0) throw new HttpError(409, 'An invoice with payments cannot be voided');
    if (invoice.status === 'void') throw new HttpError(409, 'Already voided');

    invoice.status = 'void';
    invoice.voidReason = String(req.body.reason || '').trim();
    await invoice.save();
    await announce(invoice, 'void');
    return ok(res, invoice);
  } catch (error) {
    return fail(res, error, 'Could not void the invoice');
  }
};