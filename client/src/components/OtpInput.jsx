import { useEffect, useRef } from 'react';

/**
 * Six separate boxes. Supports typing, backspace, arrow keys, paste, and mobile autofill.
 * `digits` is an array like ['1', '2', '', '', '', ''].
 */
export default function OtpInput({ digits, onChange, onComplete, disabled = false, shake = false, length = 6 }) {
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const focusBox = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const update = (next) => {
    onChange(next);
    if (next.every(Boolean)) onComplete?.(next.join(''));
  };

  const fillFrom = (start, text) => {
    const next = [...digits];
    text.slice(0, length - start).split('').forEach((ch, k) => { next[start + k] = ch; });
    update(next);
    focusBox(Math.min(start + text.length, length - 1));
  };

  const handleChange = (i, e) => {
    const typed = e.target.value.replace(/\D/g, '');
    if (!typed) return;
    // Mobile autofill can drop the whole code into one box
    if (typed.length > 1) { fillFrom(i, typed); return; }
    const next = [...digits];
    next[i] = typed;
    update(next);
    if (i < length - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = '';
        onChange(next);
      } else if (i > 0) {
        next[i - 1] = '';
        onChange(next);
        focusBox(i - 1);
      }
    } else if (e.key === 'ArrowLeft') focusBox(i - 1);
    else if (e.key === 'ArrowRight') focusBox(i + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (text) fillFrom(0, text);
  };

  return (
    <div className={`flex justify-between gap-2 sm:gap-3 ${shake ? 'animate-shake' : ''}`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          className={`h-14 w-full min-w-0 rounded-xl border bg-white text-center text-2xl font-semibold text-navy-900 transition focus:outline-none focus:ring-2 disabled:opacity-60 sm:h-16 ${
            shake
              ? 'border-danger focus:ring-danger/20'
              : digits[i]
                ? 'border-primary-500 bg-primary-50 focus:ring-primary-500/20'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
          }`}
        />
      ))}
    </div>
  );
}
