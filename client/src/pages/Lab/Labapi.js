import api from '@/lib/api.js'; // your axios instance (baseURL ending in /api, auth header attached)

const d = (p) => p.then((r) => r.data);

export const labApi = {
  // patient
  listLabs: (params) => d(api.get('/labs', { params })),
  labTests: (labId, params) => {
  if (!labId || labId === 'undefined') {
    console.error('labTests called with a bad id:', labId, new Error().stack);
    return Promise.reject({ response: { data: { message: 'No lab selected.' } } });
  }
  return d(api.get(`/labs/${labId}/tests`, { params }));
},

  placeOrder: (body) => d(api.post('/labs/orders', body)),
  myOrders: (params) => d(api.get('/labs/orders/mine', { params })),
  getOrder: (id) => d(api.get(`/labs/orders/${id}`)),
  cancelOrder: (id) => d(api.put(`/labs/orders/${id}/cancel`)),
  // lab staff
  staffTests: () => d(api.get('/labs/staff/tests')),
  createTest: (body) => d(api.post('/labs/staff/tests', body)),
  updateTest: (id, body) => d(api.put(`/labs/staff/tests/${id}`, body)),
  staffOrders: (params) => d(api.get('/labs/staff/orders', { params })),
  collect: (id) => d(api.put(`/labs/staff/orders/${id}/collect`)),
  saveResults: (id, items) => d(api.put(`/labs/staff/orders/${id}/results`, { items })),
  complete: (id) => d(api.put(`/labs/staff/orders/${id}/complete`)),
  getLab: (id) => api.get(`/labs/${id}`).then((r) => r.data),
  recordView: (id) => api.post(`/labs/${id}/view`).then((r) => r.data),
  toggleLike: (id) => api.post(`/labs/${id}/like`).then((r) => r.data),
  shareLab: (id, channel) => api.post(`/labs/${id}/share`, { channel }).then((r) => r.data),
  listReviews: (id, params) => api.get(`/labs/${id}/reviews`, { params }).then((r) => r.data),
  saveReview: (id, body) => api.post(`/labs/${id}/reviews`, body).then((r) => r.data),
  deleteMyReview: (id) => api.delete(`/labs/${id}/reviews/mine`).then((r) => r.data),
  setPayment: (id, paymentStatus) => d(api.put(`/labs/staff/orders/${id}/payment`, { paymentStatus })),
  listLabs: (params) => api.get('/labs', { params }).then((r) => r.data),
    // doctor
  searchPatients: (q) => d(api.get('/labs/doctor/patients', { params: { q } })),
  createDoctorOrder: (body) => d(api.post('/labs/doctor/orders', body)),
  doctorOrders: (params) => d(api.get('/labs/doctor/orders', { params })),
  doctorOrder: (id) => d(api.get(`/labs/doctor/orders/${id}`)),
  cancelDoctorOrder: (id) => d(api.put(`/labs/doctor/orders/${id}/cancel`)),
  payOrder: (id) => d(api.post(`/labs/doctor/orders/${id}/pay`)),
  verifyPayment: (reference) => d(api.get(`/labs/doctor/payments/${reference}/verify`)),

};

export const errMsg = (e) => e?.response?.data?.message || 'Something went wrong. Please try again.';
export const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
export const dateFmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-navy-900 outline-none focus:border-lab-500 focus:ring-2 focus:ring-lab-200';