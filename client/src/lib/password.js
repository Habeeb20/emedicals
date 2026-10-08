// Password rules. Keep in sync with PASSWORD_RE in server/controllers/userController.js
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordValid = (password) =>
  password.length <= 72 && PASSWORD_RULES.every((rule) => rule.test(password));

// Class names are written out in full so Tailwind can find them
const LEVELS = [
  { label: '', bar: 'bg-gray-200', text: 'text-gray-400' },
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Fair', bar: 'bg-warning', text: 'text-warning-dark' },
  { label: 'Good', bar: 'bg-info', text: 'text-info-dark' },
  { label: 'Strong', bar: 'bg-success', text: 'text-success-dark' },
];

export const getPasswordStrength = (password) => {
  const score = password ? PASSWORD_RULES.filter((rule) => rule.test(password)).length : 0;
  return { score, ...LEVELS[score] };
};
