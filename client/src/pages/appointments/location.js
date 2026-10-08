// Public Nigerian location API, used for state / LGA dropdowns.
const LOC = 'https://nigeria.jamiuadewaleyusuf.com/api/v1';
const cache = {};

async function get(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(LOC + path);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.message || 'Location lookup failed');
  return (cache[path] = json.data);
}
export const fetchStates = () => get('/states');
export const fetchLgas = (stateSlug) => get(`/states/${encodeURIComponent(stateSlug)}/lgas`);
