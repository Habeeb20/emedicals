import { Drug, Batch, Sale } from '../models/Pharmacy.js';
import { handle } from '../utils/engagement.js';
import { dateRange } from '../utils/pharmacy.js';

// Net revenue of a sale = total minus anything refunded
const NET = { $subtract: ['$total', '$refundedTotal'] };

/** GET /pharmacy/me   (any pharmacy staff) */
export const getMe = handle(async (req, res) => {
  res.json({
    success: true,
    data: {
      pharmacy: { id: req.pharmacy._id, name: req.pharmacy.name },
      isManager: req.isManager,
      user: { id: req.user._id, name: req.user.fullName },
    },
  });
});

/** GET /pharmacy/dashboard */
export const getDashboard = handle(async (req, res) => {
    try {
        const pharmacy = req.pharmacy._id;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const now = new Date();
  const soon = new Date(now.getTime() + 90 * 864e5);

  const [today, lowStock, expiring, expired, rxToday] = await Promise.all([
    Sale.aggregate([
      { $match: { pharmacy, createdAt: { $gte: start }, status: { $ne: 'refunded' } } },
      { $group: { _id: null, revenue: { $sum: NET }, count: { $sum: 1 } } },
    ]),
    Drug.countDocuments({ pharmacy, isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }),
    Batch.countDocuments({ pharmacy, quantity: { $gt: 0 }, expiryDate: { $gt: now, $lte: soon } }),
    Batch.countDocuments({ pharmacy, quantity: { $gt: 0 }, expiryDate: { $lte: now } }),
    Sale.countDocuments({ pharmacy, type: 'prescription', createdAt: { $gte: start } }),
  ]);

  res.json({
    success: true,
    data: {
      todayRevenue: today[0]?.revenue || 0,
      todaySales: today[0]?.count || 0,
      prescriptionsToday: rxToday,
      lowStock, expiring, expired,
    },
  });
    } catch (error) {
        console.log(error)
    }
  
});

/** GET /pharmacy/reports/summary?from=&to=   (manager) */
export const getSummary = handle(async (req, res) => {
  const pharmacy = req.pharmacy._id;
  const { from, to } = dateRange(req.query);
  const match = { pharmacy, createdAt: { $gte: from, $lte: to }, status: { $ne: 'refunded' } };

  const [totals, byDay, byMethod, byType, lines] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: NET }, count: { $sum: 1 }, discounts: { $sum: '$discount' }, refunds: { $sum: '$refundedTotal' }, outstanding: { $sum: { $subtract: ['$total', '$amountPaid'] } } } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: NET }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', revenue: { $sum: NET }, count: { $sum: 1 } } }, { $sort: { revenue: -1 } }]),
    Sale.aggregate([{ $match: match }, { $group: { _id: '$type', revenue: { $sum: NET }, count: { $sum: 1 } } }]),
    // One row per batch used in a sale line, so cost can be matched to the exact batch cost price
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $unwind: '$items.batches' },
      {
        $group: {
          _id: '$items.drug',
          name: { $first: '$items.name' },
          qty: { $sum: '$items.batches.quantity' },
          revenue: { $sum: { $multiply: ['$items.batches.quantity', '$items.unitPrice'] } },
          cost: { $sum: { $multiply: ['$items.batches.quantity', '$items.batches.costPrice'] } },
        },
      },
    ]),
  ]);

  const grossRevenue = lines.reduce((s, l) => s + l.revenue, 0);
  const cost = lines.reduce((s, l) => s + l.cost, 0);
  const topDrugs = lines
    .map((l) => ({ ...l, margin: Math.round((l.revenue - l.cost) * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  res.json({
    success: true,
    data: {
      range: { from, to },
      totals: totals[0] || { revenue: 0, count: 0, discounts: 0, refunds: 0, outstanding: 0 },
      // Gross margin before discounts and refunds
      grossMargin: Math.round((grossRevenue - cost) * 100) / 100,
      byDay, byMethod, byType, topDrugs,
    },
  });
});

/** GET /pharmacy/reports/valuation   (manager) */
export const getValuation = handle(async (req, res) => {
  const now = new Date();
  const [v] = await Batch.aggregate([
    { $match: { pharmacy: req.pharmacy._id, quantity: { $gt: 0 } } },
    { $lookup: { from: 'drugs', localField: 'drug', foreignField: '_id', as: 'd' } },
    { $unwind: '$d' },
    {
      $group: {
        _id: null,
        units: { $sum: '$quantity' },
        costValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
        retailValue: { $sum: { $multiply: ['$quantity', '$d.sellingPrice'] } },
        expiredCostValue: { $sum: { $cond: [{ $lte: ['$expiryDate', now] }, { $multiply: ['$quantity', '$costPrice'] }, 0] } },
      },
    },
  ]);
  res.json({ success: true, data: v || { units: 0, costValue: 0, retailValue: 0, expiredCostValue: 0 } });
});

/** GET /pharmacy/reports/controlled?from=&to=   (manager) — controlled drug register */
export const getControlledRegister = handle(async (req, res) => {
  const { from, to } = dateRange(req.query);
  const sales = await Sale.find({
    pharmacy: req.pharmacy._id, createdAt: { $gte: from, $lte: to }, 'items.schedule': 'controlled',
  }).sort('-createdAt').limit(500)
    .populate('patient', 'fullName').populate('soldBy', 'fullName').populate('prescription', 'code').lean();

  const rows = sales.flatMap((s) =>
    s.items.filter((i) => i.schedule === 'controlled').map((i) => ({
      date: s.createdAt, receiptNo: s.receiptNo, drug: i.name, quantity: i.quantity,
      batches: i.batches.map((b) => b.batchNo).join(', '),
      patient: s.patient?.fullName, rxCode: s.prescription?.code, dispensedBy: s.soldBy?.fullName,
    }))
  );
  res.json({ success: true, data: rows });
});