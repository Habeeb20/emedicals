import { getIO, emitToUser } from '../socket/io.js'; // adjust the folder if your io.js lives elsewhere
import { notify } from './notify.service.js';

/*
 * Real time works in two steps:
 *   1. The server emits a small event ({ action, id }) after any change.
 *   2. Screens that listen for that event simply reload their data.
 *
 * Events:
 *   hospital:patient    a patient was registered or edited
 *   hospital:visit      queue / consultation changed
 *   hospital:bed        a bed or ward changed
 *   hospital:admission  admission, vitals, notes, transfer, discharge
 *   hospital:invoice    a charge or payment was added
 *   hospital:staff      a staff account changed
 *
 * Staff hear everything through the room `org:<hospitalId>` (your socket file joins it on connect).
 * A patient with an eMedicals account hears their own events through `user:<id>`.
 */
export const broadcast = (orgId, event, payload, alsoUserId) => {
  getIO()?.to(`org:${orgId}`).emit(event, payload);
  if (alsoUserId) emitToUser(alsoUserId, event, payload);
};

// Saved + emailed-if-you-want notification. Never lets a notification problem break the request.
export const tellUser = async (userId, title, body, data = {}) => {
  if (!userId) return;
  try {
    await notify([userId], { type: 'hospital:update', title, body, data, email: false });
  } catch (error) {
    console.error('Notification failed:', error.message);
  }
};

export const tellPatient = (patient, title, body, data) => tellUser(patient?.user, title, body, data);