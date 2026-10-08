import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import TextField from './TextField.jsx';

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      icon={Lock}
      type={visible ? 'text' : 'password'}
      maxLength={72}
      right={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-md p-2 text-gray-400 hover:text-navy-700"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
}
