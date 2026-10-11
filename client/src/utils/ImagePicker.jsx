import { useRef, useState } from 'react';

import { uploadImage } from './cloudinary';
import { ErrorNote, Skeleton } from '../pages/appointments/ui';
export const MAX_IMAGES = 8;

/**
 * Multi-image picker.
 * value:         array of Cloudinary URLs
 * onChange:      (urls) => void
 * onBusyChange:  (isUploading) => void   (use it to disable the Save button)
 */
export default function ImagePicker({ value = [], onChange, onBusyChange, max = MAX_IMAGES }) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  // Always points at the latest list, so uploads that finish later never overwrite newer edits
  const latest = useRef(value);
  latest.current = value;

  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError('');

    const room = max - latest.current.length;
    if (room <= 0) return setError(`You can add at most ${max} images`);
    const batch = files.slice(0, room);
    if (files.length > room) setError(`Only the first ${room} image(s) were added (max ${max})`);

    setUploading((n) => n + batch.length);
    onBusyChange?.(true);

    const results = await Promise.allSettled(batch.map((f) => uploadImage(f)));
    const urls = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) setError(`${failed.length} image(s) failed: ${failed[0].reason?.message || 'Upload failed'}`);

    const merged = [...new Set([...latest.current, ...urls])].slice(0, max);
    onChange(merged);

    setUploading((n) => {
      const next = Math.max(0, n - batch.length);
      if (next === 0) onBusyChange?.(false);
      return next;
    });
  };

  const remove = (url) => onChange(latest.current.filter((u) => u !== url));
  const makeCover = (url) => onChange([url, ...latest.current.filter((u) => u !== url)]);

  return (
    <div className="space-y-2">
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-xl ring-1 ring-gray-200">
            <img src={url} alt={`Drug ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-pharmacy-600 px-1.5 text-[10px] font-medium text-white">Cover</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              {i !== 0 ? <button type="button" onClick={() => makeCover(url)}>Make cover</button> : <span />}
              <button type="button" onClick={() => remove(url)}>Remove</button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => <Skeleton key={`sk${i}`} className="h-24 w-24 rounded-xl" />)}
        {value.length + uploading < max && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
            <span className="text-xl leading-none">+</span>
            Add photos
            <input type="file" accept="image/*" multiple onChange={pick} className="hidden" />
          </label>
        )}
      </div>
      <p className="text-xs text-gray-500">Up to {max} images, 5MB each. The first one is the cover.</p>
    </div>
  );
}