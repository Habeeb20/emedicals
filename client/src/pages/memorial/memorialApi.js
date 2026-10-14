// ADJUST this one import to wherever your shared axios instance lives (baseURL should end at /api).
import api from '@/lib/api';

const get = (url, params) => api.get(url, { params }).then((r) => r.data);
const post = (url, body) => api.post(url, body).then((r) => r.data);
const patch = (url, body) => api.patch(url, body).then((r) => r.data);
const del = (url) => api.delete(url).then((r) => r.data);

export const errMsg = (e, fallback = 'Something went wrong. Please try again.') =>
  e?.response?.data?.message || e?.message || fallback;

export const memorialApi = {
  // public
  listOrgs: (params) => get('/memorial/orgs', params),
  getOrg: (id) => get(`/memorial/orgs/${id}`),
  getPlots: (id, params) => get(`/memorial/orgs/${id}/plots`, params),
  view: (id) => post(`/memorial/orgs/${id}/view`),
  like: (id) => post(`/memorial/orgs/${id}/like`),
  share: (id, channel) => post(`/memorial/orgs/${id}/share`, { channel }),
  reviews: (id, params) => get(`/memorial/orgs/${id}/reviews`, params),
  saveReview: (id, body) => post(`/memorial/orgs/${id}/reviews`, body),
  deleteReview: (id) => del(`/memorial/reviews/${id}`),

  // client bookings
  book: (body) => post('/memorial/bookings', body),
  myBookings: (params) => get('/memorial/bookings', params),
  booking: (id) => get(`/memorial/bookings/${id}`),
  cancelBooking: (id, reason) => post(`/memorial/bookings/${id}/cancel`, { reason }),

  // officers
  overview: () => get('/memorial/manage/overview'),
  settings: () => get('/memorial/manage/settings'),
  saveSettings: (body) => patch('/memorial/manage/settings', body),
  bookings: (params) => get('/memorial/manage/bookings', params),
  managedBooking: (id) => get(`/memorial/manage/bookings/${id}`),
  setStatus: (id, body) => patch(`/memorial/manage/bookings/${id}/status`, body),
  addLedger: (id, body) => post(`/memorial/manage/bookings/${id}/ledger`, body),
  ledger: (params) => get('/memorial/manage/ledger', params),
  ledgerCsvUrl: '/memorial/manage/ledger/export',
  records: (params) => get('/memorial/manage/records', params),
  createRecord: (body) => post('/memorial/manage/records', body),
  updateRecord: (id, body) => patch(`/memorial/manage/records/${id}`, body),
  plots: (params) => get('/memorial/manage/plots', params),
  createPlot: (body) => post('/memorial/manage/plots', body),
  bulkPlots: (body) => post('/memorial/manage/plots/bulk', body),
  updatePlot: (id, body) => patch(`/memorial/manage/plots/${id}`, body),
  deletePlot: (id) => del(`/memorial/manage/plots/${id}`),
  orgReviews: (params) => get('/memorial/manage/reviews', params),
  replyReview: (id, text) => post(`/memorial/manage/reviews/${id}/reply`, { text }),
  downloadLedger: (params) =>
    api.get('/memorial/manage/ledger/export', { params, responseType: 'blob' }).then((r) => r.data),
};
