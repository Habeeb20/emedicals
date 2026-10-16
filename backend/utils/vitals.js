import { HttpError } from './http.js';

const NUMBER_FIELDS = ['temperature', 'pulse', 'respiratoryRate', 'oxygenSaturation', 'weight', 'height'];

// Turns a request body into a clean vitals reading. Throws a 400 if a number is not a number.
export const pickVitals = (body, userId) => {
  const reading = {};

  if (body.bloodPressure !== undefined && String(body.bloodPressure).trim() !== '') {
    reading.bloodPressure = String(body.bloodPressure).trim();
  }

  NUMBER_FIELDS.forEach((field) => {
    if (body[field] === undefined || body[field] === '' || body[field] === null) return;
    const value = Number(body[field]);
    if (Number.isNaN(value) || value < 0) throw new HttpError(400, `${field} must be a positive number`);
    reading[field] = value;
  });

  if (Object.keys(reading).length === 0) throw new HttpError(400, 'Enter at least one reading');

  return { ...reading, recordedBy: userId, recordedAt: new Date() };
};