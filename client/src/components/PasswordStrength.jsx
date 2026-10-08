import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES, getPasswordStrength } from '@/lib/password.js';

export default function PasswordStrength({ password }) {
  const { score, label, bar, text } = getPasswordStrength(password);

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5" aria-live="polite">
      <div className="flex items-center gap-1.5">
        {PASSWORD_RULES.map((rule, i) => (
          <span key={rule.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? bar : 'bg-gray-200'}`} />
        ))}
        <span className={`ml-2 w-12 text-right text-xs font-semibold ${text}`}>{label}</span>
      </div>
      <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className={`flex items-center gap-2 text-xs ${ok ? 'text-success-dark' : 'text-gray-500'}`}>
              {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
