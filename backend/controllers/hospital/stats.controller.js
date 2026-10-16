import mongoose from 'mongoose';
import PatientRecord from '../../models/hospital/PatientRecord.js';
import Visit from '../../models/hospital/Visit.js';
import Admission from '../../models/hospital/Admission.js';
import Invoice from '../../models/hospital/Invoice.js';
import { Bed } from '../../models/hospital/Ward.js';
import { startOfToday, daysAgo, TIMEZONE } from '../../utils/dates.js';
import { ok, fail } from '../../utils/http.js';

const sumOf = (rows) => rows[0]?.total || 0;

// GET /hospital/stats: the numbers on the hospital overview
export const getStats = async (req, res) => {
  try {
    const org = new mongoose.Types.ObjectId(String(req.orgId));
    const today = startOfToday();
    const weekStart = daysAgo(6);

    const [patients, visitsToday, waiting, inConsultation, admitted, bedsTotal, bedsOccupied, revenue, outstanding, perDay] = await Promise.all([
      PatientRecord.countDocuments({ organization: org, isActive: true }),
      Visit.countDocuments({ organization: org, createdAt: { $gte: today }, status: { $ne: 'cancelled' } }),
      Visit.countDocuments({ organization: org, status: { $in: ['waiting', 'triaged'] } }),
      Visit.countDocuments({ organization: org, status: 'in_consultation' }),
      Admission.countDocuments({ organization: org, status: 'admitted' }),
      Bed.countDocuments({ organization: org, status: { $ne: 'maintenance' } }),
      Bed.countDocuments({ organization: org, status: 'occupied' }),
      Invoice.aggregate([
        { $match: { organization: org } },
        { $unwind: '$payments' },
        { $match: { 'payments.paidAt': { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { organization: org, status: { $in: ['unpaid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$total', '$amountPaid'] } } } },
      ]),
      Visit.aggregate([
        { $match: { organization: org, createdAt: { $gte: weekStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } }, count: { $sum: 1 } } },
      ]),
    ]);

    // Always return 7 days, even the quiet ones
    const counts = Object.fromEntries(perDay.map((row) => [row._id, row.count]));
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart.getTime() + i * 86400000 + 12 * 3600000); // midday avoids edge cases
      const key = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD
      return { date: key, visits: counts[key] || 0 };
    });

    return ok(res, {
      patients,
      visitsToday,
      waiting,
      inConsultation,
      admitted,
      beds: { total: bedsTotal, occupied: bedsOccupied },
      revenueToday: sumOf(revenue),
      outstanding: sumOf(outstanding),
      last7Days,
    });
  } catch (error) {
    return fail(res, error, 'Could not load the overview');
  }
};