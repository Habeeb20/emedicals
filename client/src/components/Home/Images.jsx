// Swap any photo by changing the id or pasting your own URL.
const u = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const images = {
  hero: u('photo-1576091160399-112ba8d25d1d', 1400),
  doctor: u('photo-1559839734-2b71ea197ec2'),
  lab: u('photo-1579154204601-01588f351e67'),
  pharmacy: u('photo-1585435557343-3b092031a831'),
  hospital: u('photo-1538108149393-fbbd81895907'),
};