// Adapter: keeps the (path, { method, body, params }) -> { status, data, meta } call style
// used by the appointment pages, but sends requests through the app's existing axios instance.
import http, { getErrorMessage } from '@/lib/api.js';

export async function api(path, { method = 'GET', body, params } = {}) {
  const clean = {};
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  });
  try {
    const res = await http.request({ url: path, method, data: body, params: clean });
    return res.data; // the { status, data, meta } envelope
  } catch (err) {
    throw Object.assign(new Error(getErrorMessage(err)), { status: err.response?.status });
  }
}