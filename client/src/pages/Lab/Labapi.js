import api from '@/lib/api.js'; // your axios instance (baseURL ending in /api, auth header attached)

const d = (p) => p.then((r) => r.data);

export const labApi = {
  // patient
  listLabs: (params) => d(api.get('/labs', { params })),
  labTests: (labId, params) => d(api.get(`/labs/${labId}/tests`, { params })),
  placeOrder: (body) => d(api.post('/labs/orders', body)),
  myOrders: (params) => d(api.get('/labs/orders/mine', { params })),
  getOrder: (id) => d(api.get(`/labs/orders/${id}`)),
  cancelOrder: (id) => d(api.patch(`/labs/orders/${id}/cancel`)),
  // lab staff
  staffTests: () => d(api.get('/labs/staff/tests')),
  createTest: (body) => d(api.post('/labs/staff/tests', body)),
  updateTest: (id, body) => d(api.patch(`/labs/staff/tests/${id}`, body)),
  staffOrders: (params) => d(api.get('/labs/staff/orders', { params })),
  collect: (id) => d(api.patch(`/labs/staff/orders/${id}/collect`)),
  saveResults: (id, items) => d(api.patch(`/labs/staff/orders/${id}/results`, { items })),
  complete: (id) => d(api.patch(`/labs/staff/orders/${id}/complete`)),
  setPayment: (id, paymentStatus) => d(api.patch(`/labs/staff/orders/${id}/payment`, { paymentStatus })),
};

export const errMsg = (e) => e?.response?.data?.message || 'Something went wrong. Please try again.';
export const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
export const dateFmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-navy-900 outline-none focus:border-lab-500 focus:ring-2 focus:ring-lab-200';