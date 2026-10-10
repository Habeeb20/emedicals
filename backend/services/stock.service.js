import { Drug, Batch, StockMovement } from '../models/Pharmacy.js';
import { HttpError } from '../utils/engagement.js';

/**
 * Every stock change goes through moveStock(): it updates the drug's on-hand total
 * and writes a ledger row. Always call it inside a transaction (pass `session`).
 *
 * countsTowardStock = false is used for quarantine rows, which are recorded in the
 * ledger but do not change sellable on-hand stock.
 */
export async function moveStock({
  session, pharmacy, drug, batch, delta, type, reason, ref, by, unitCost, countsTowardStock = true,
}) {
  let balance;
  if (countsTowardStock) {
    const cond = { _id: drug, pharmacy };
    if (delta < 0) cond.stock = { $gte: -delta }; // never go negative
    const d = await Drug.findOneAndUpdate(cond, { $inc: { stock: delta } }, { new: true, session });
    if (!d) throw new HttpError(409, 'Stock level changed. Please try again.');
    balance = d.stock;
  } else {
    const d = await Drug.findOne({ _id: drug, pharmacy }).select('stock').session(session);
    balance = d?.stock ?? 0;
  }
  await StockMovement.create(
    [{ pharmacy, drug, batch, type, quantity: delta, balanceAfter: balance, unitCost, reason, ref, by }],
    { session }
  );
  return balance;
}

/**
 * First-expiry-first-out. Takes `qty` units from unexpired batches, soonest expiry first.
 * Returns the batches used so the sale can record exactly where stock came from.
 */
export async function allocateFEFO({ session, pharmacy, drug, qty }) {
  const batches = await Batch.find({
    pharmacy, drug, quantity: { $gt: 0 }, expiryDate: { $gt: new Date() },
  }).sort({ expiryDate: 1 }).session(session);

  let need = qty;
  const taken = [];
  for (const b of batches) {
    if (need <= 0) break;
    const take = Math.min(b.quantity, need);
    const res = await Batch.updateOne({ _id: b._id, quantity: { $gte: take } }, { $inc: { quantity: -take } }, { session });
    if (!res.modifiedCount) throw new HttpError(409, 'Stock changed while selling. Please try again.');
    taken.push({ batch: b._id, batchNo: b.batchNo, expiryDate: b.expiryDate, quantity: take, costPrice: b.costPrice });
    need -= take;
  }
  if (need > 0) throw new HttpError(409, `Not enough unexpired stock (short by ${need})`);
  return taken;
}