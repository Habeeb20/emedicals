import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { uploadImage } from './cloudinary';

/** Reusable: <ImageUpload value={url} onChange={(url|null) => ...} fallback="A" shape="circle" /> */
export default function ImageUpload({ value, onChange, fallback = '?', shape = 'circle', label = 'Change photo' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try { onChange(await uploadImage(file)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const round = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="flex items-center gap-5">
      <div className={`relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden bg-primary-100 text-3xl font-bold text-primary-700 ${round}`}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : fallback}
        {busy && <div className="absolute inset-0 grid place-items-center bg-navy-950/50 text-white"><Loader2 className="animate-spin" /></div>}
      </div>
      <div>
        <input ref={input} type="file" accept="image/*" onChange={pick} className="hidden" />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current.click()} className="btn-outline inline-flex items-center gap-2">
            <Camera size={16} />{label}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-light">
              <Trash2 size={16} />Remove
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">JPG or PNG, up to 5MB.</p>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}