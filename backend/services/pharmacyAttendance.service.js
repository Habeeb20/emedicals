import { Sale } from '../models/Pharmacy.js';
import { ChatRoom, Message } from '../models/Chat.js';

/**
 * True once a pharmacy has actually attended to this user, either by dispensing/selling
 * to them, or by a pharmacist replying in a chat. Used to gate pharmacy reviews.
 */
export async function hasBeenAttendedByPharmacy(userId, pharmacyId) {
  const sold = await Sale.exists({ pharmacy: pharmacyId, patient: userId, status: { $ne: 'refunded' } });
  if (sold) return true;

  const room = await ChatRoom.findOne({ type: 'pharmacy', pharmacy: pharmacyId, patient: userId }).select('_id').lean();
  if (!room) return false;
  return !!(await Message.exists({ room: room._id, sender: { $ne: userId } }));
}