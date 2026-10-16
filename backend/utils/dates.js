// Nigeria is on WAT (UTC+1, no daylight saving). "Today" must start at midnight in Lagos, not on the server clock.
export const TIMEZONE = 'Africa/Lagos';
const OFFSET_MS = 60 * 60 * 1000;

export const startOfToday = () => {
  const shifted = new Date(Date.now() + OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - OFFSET_MS);
};

export const daysAgo = (n) => new Date(startOfToday().getTime() - n * 24 * 60 * 60 * 1000);