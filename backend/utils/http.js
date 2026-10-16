// Small helpers so every controller answers in the same shape: { success, data } or { success, message }

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const fail = (res, error, fallback = 'Something went wrong') => {
  let status = error.status || 500;
  if (error.name === 'ValidationError' || error.name === 'CastError') status = 400;
  if (error.code === 11000) status = 409;
  if (status === 500) console.error(error);
  const message = status === 500 ? fallback : error.code === 11000 ? 'That record already exists' : error.message;
  return res.status(status).json({ success: false, message });
};

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "peanuts, penicillin" or ["peanuts"] -> ["peanuts", "penicillin"]
export const toList = (value) =>
  (Array.isArray(value) ? value : String(value || '').split(','))
    .map((v) => String(v).trim())
    .filter(Boolean);