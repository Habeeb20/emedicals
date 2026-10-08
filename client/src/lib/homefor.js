// src/lib/homeFor.js
// Single source of truth for where each role lands after login.
export const homeFor = (user) =>
  user?.role === 'super_admin' ? '/dashboard/super-admin' : '/dashboard';