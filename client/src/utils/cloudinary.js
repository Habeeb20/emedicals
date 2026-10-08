// Reads your Cloudinary details from env (Vite). If you use CRA/Next, swap import.meta.env for process.env.*
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; // must be an UNSIGNED upload preset

/** Uploads an image to Cloudinary and returns its secure URL (the string your API expects). */
export async function uploadImage(file, { maxMB = 5 } = {}) {
  if (!CLOUD || !PRESET) throw new Error('Cloudinary is not configured');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > maxMB * 1024 * 1024) throw new Error(`Image must be smaller than ${maxMB}MB`);

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}