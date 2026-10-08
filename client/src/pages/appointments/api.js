// Wraps the app's axios instance (@/lib/api.js: baseURL, auth token, 401 handling all stay as-is).
// Call style: api('/path', { method, body, params }) -> the { status, data, meta } envelope.
import http, { getErrorMessage } from '@/lib/api.js';

export async function api(path, { method = 'GET', body, params } = {}) {
  const clean = {};
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  });
  try {
    const res = await http.request({ url: path, method, data: body, params: clean });
    return res.data;
  } catch (err) {
    throw Object.assign(new Error(getErrorMessage(err)), { status: err.response?.status });
  }
}
