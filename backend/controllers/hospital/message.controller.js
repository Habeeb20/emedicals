import mongoose from 'mongoose';
import HospitalMessage from '../../models/hospital/hospitalMessage.js';
import PatientRecord from '../../models/hospital/PatientRecord.js';
import { broadcast, tellUser } from '../../services/hospitalRealtime.js';
import { ok, fail, HttpError } from '../../utils/http.js';

const PAGE = 100; // newest messages shown in a conversation

const cleanText = (value) => {
  const text = String(value || '').trim();
  if (!text) throw new HttpError(400, 'Write a message first');
  if (text.length > 2000) throw new HttpError(400, 'Messages can be up to 2000 characters');
  return text;
};

// Latest PAGE messages, oldest first, so the chat reads top to bottom
const loadMessages = async (patientId) => {
  const messages = await HospitalMessage.find({ patient: patientId })
    .populate('senderUser', 'fullName')
    .sort({ createdAt: -1 })
    .limit(PAGE)
    .lean();
  return messages.reverse();
};

const announce = (record, from) =>
  broadcast(record.organization._id ?? record.organization, 'hospital:message', { patientId: record._id, from }, record.user);

/* ------------------------------------------------------------------ */
/* Patient side                                                        */
/* ------------------------------------------------------------------ */

// A patient may only talk to hospitals where they have a record
const myRecord = async (req) => {
  const record = await PatientRecord.findOne({ _id: req.params.recordId, user: req.user._id }).populate('organization', 'name');
  if (!record) throw new HttpError(404, 'You are not registered at that hospital');
  return record;
};

// GET /hospital/messages/mine: one row per hospital, with the last message and unread count
export const listMyThreads = async (req, res) => {
  try {
    const records = (await PatientRecord.find({ user: req.user._id }).populate('organization', 'name').lean()).filter((r) => r.organization);
    const ids = records.map((r) => r._id);

    const [lastMessages, unread] = await Promise.all([
      HospitalMessage.aggregate([
        { $match: { patient: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$patient', last: { $first: '$$ROOT' } } },
      ]),
      HospitalMessage.aggregate([
        { $match: { patient: { $in: ids }, sender: 'staff', readByPatient: false } },
        { $group: { _id: '$patient', count: { $sum: 1 } } },
      ]),
    ]);

    const lastOf = Object.fromEntries(lastMessages.map((row) => [String(row._id), row.last]));
    const unreadOf = Object.fromEntries(unread.map((row) => [String(row._id), row.count]));

    const threads = records
      .map((r) => ({
        recordId: r._id,
        hospital: { _id: r.organization._id, name: r.organization.name },
        last: lastOf[String(r._id)] ? { text: lastOf[String(r._id)].text, sender: lastOf[String(r._id)].sender, at: lastOf[String(r._id)].createdAt } : null,
        unread: unreadOf[String(r._id)] || 0,
      }))
      .sort((a, b) => new Date(b.last?.at || 0) - new Date(a.last?.at || 0));

    return ok(res, threads);
  } catch (error) {
    return fail(res, error, 'Could not load your messages');
  }
};

// GET /hospital/messages/mine/:recordId: open a conversation (marks the hospital's messages as read)
export const getMyThread = async (req, res) => {
  try {
    const record = await myRecord(req);
    await HospitalMessage.updateMany({ patient: record._id, sender: 'staff', readByPatient: false }, { readByPatient: true });
    return ok(res, { hospital: { _id: record.organization._id, name: record.organization.name }, messages: await loadMessages(record._id) });
  } catch (error) {
    return fail(res, error, 'Could not load the conversation');
  }
};

// POST /hospital/messages/mine/:recordId  { text }
export const sendFromPatient = async (req, res) => {
  try {
    const text = cleanText(req.body.text);
    const record = await myRecord(req);

    const message = await HospitalMessage.create({
      organization: record.organization._id,
      patient: record._id,
      sender: 'patient',
      senderUser: req.user._id,
      text,
      readByPatient: true,
    });

    announce(record, 'patient');
    return ok(res, message, 201);
  } catch (error) {
    return fail(res, error, 'Could not send your message');
  }
};

/* ------------------------------------------------------------------ */
/* Hospital staff side                                                 */
/* ------------------------------------------------------------------ */

const patientOfHospital = async (req) => {
  const record = await PatientRecord.findOne({ _id: req.params.patientId, organization: req.orgId });
  if (!record) throw new HttpError(404, 'Patient not found');
  return record;
};

// GET /hospital/messages/inbox: every conversation at this hospital, newest first
export const getInbox = async (req, res) => {
  try {
    const org = new mongoose.Types.ObjectId(String(req.orgId));

    const rows = await HospitalMessage.aggregate([
      { $match: { organization: org } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$patient',
          last: { $first: '$$ROOT' },
          unread: { $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'patient'] }, { $eq: ['$readByStaff', false] }] }, 1, 0] } },
        },
      },
      { $sort: { 'last.createdAt': -1 } },
      { $limit: 100 },
    ]);

    const patients = await PatientRecord.find({ _id: { $in: rows.map((r) => r._id) } }).select('fullName mrn').lean();
    const patientOf = Object.fromEntries(patients.map((p) => [String(p._id), p]));

    const threads = rows
      .filter((row) => patientOf[String(row._id)])
      .map((row) => ({
        patient: patientOf[String(row._id)],
        last: { text: row.last.text, sender: row.last.sender, at: row.last.createdAt },
        unread: row.unread,
      }));

    return ok(res, threads);
  } catch (error) {
    return fail(res, error, 'Could not load the inbox');
  }
};

// GET /hospital/messages/inbox/:patientId (marks the patient's messages as read)
export const getStaffThread = async (req, res) => {
  try {
    const record = await patientOfHospital(req);
    await HospitalMessage.updateMany({ patient: record._id, sender: 'patient', readByStaff: false }, { readByStaff: true });
    announce(record, 'read'); // other staff screens clear their unread badge
    return ok(res, {
      patient: { _id: record._id, fullName: record.fullName, mrn: record.mrn, hasAccount: !!record.user },
      messages: await loadMessages(record._id),
    });
  } catch (error) {
    return fail(res, error, 'Could not load the conversation');
  }
};

// POST /hospital/messages/inbox/:patientId  { text }
export const replyToPatient = async (req, res) => {
  try {
    const text = cleanText(req.body.text);
    const record = await patientOfHospital(req);
    if (!record.user) throw new HttpError(409, 'This patient has no eMedicals account yet, so they cannot receive messages');

    const message = await HospitalMessage.create({
      organization: req.orgId,
      patient: record._id,
      sender: 'staff',
      senderUser: req.user._id,
      text,
      readByStaff: true,
    });

    announce(record, 'staff');
    await tellUser(record.user, 'New message from your hospital', text.slice(0, 100), { patientRecordId: record._id });
    return ok(res, message, 201);
  } catch (error) {
    return fail(res, error, 'Could not send the message');
  }
};