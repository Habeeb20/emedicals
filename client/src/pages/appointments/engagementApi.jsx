// Talks to `${VITE_BACKEND_URL}/api/engagement` (likes, shares, views, reviews).
// Self-contained on purpose: it reads the same localStorage token your app already uses.

const base = () => `${import.meta.env.VITE_BACKEND_URL || ''}/api/engagement`;

export const hasToken = () => Boolean(localStorage.getItem('token'));

const request = async (path, { method = 'GET', body, params } = {}) => {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  const token = localStorage.getItem('token');
  const res = await fetch(`${base()}${path}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || 'Something went wrong');
    err.status = res.status;
    throw err;
  }
  return json;
};

/**
 * Likes, shares, views and reviews hang off the User document (for doctors) or the Organization document.
 * So a doctor's engagement target is the doctor's USER id. If your /providers endpoint returns the
 * DoctorProfile id in `id`, also send `userId`.
 */
export const targetFor = (provider) =>
  provider.kind === 'doctor'
    ? { type: 'user', id: provider.userId || provider.user?._id || provider.id }
    : { type: 'organization', id: provider.id };

const path = (t, action) => `/interactions/${t.type}/${t.id}/${action}`;

export const getStats = (t) => request(path(t, 'stats'));                                   // { likesCount, sharesCount, viewsCount, isLiked }
export const toggleLike = (t) => request(path(t, 'like'), { method: 'POST' });              // { liked, likesCount, loyalty }
export const recordShare = (t, channel) => request(path(t, 'share'), { method: 'POST', body: { channel } });   // { sharesCount, loyalty }
export const recordView = (t) => request(path(t, 'view'), { method: 'POST' });              // { counted }
export const getReviews = (t, { limit = 3 } = {}) => request(`/reviews/${t.type}/${t.id}`, { params: { limit } });   // { summary, reviews }