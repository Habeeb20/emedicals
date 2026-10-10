/**
 * eMedicals colour palette: the single source of truth.
 *
 * - Tailwind reads this file (see tailwind.config.js), so every class like
 *   `bg-primary-600` or `text-lab-700` comes from here.
 * - Tailwind's default palette is switched off, so a colour that isn't in this
 *   file simply doesn't exist. Change the brand here and the whole app follows.
 * - Plain JS (charts, inline styles) can import the same values:
 *     import { colors } from '@/theme/colors';
 *
 * Plain hex only (no imports) so it works in both Node (Tailwind) and the browser.
 */

// Brand: teal. Hospital + doctors, buttons, links, active states.
const primary = {
  DEFAULT: '#0d9488',
  50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf',
  500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e',
};

// Deep navy: headings, sidebar, dark surfaces.
const navy = {
  DEFAULT: '#0f172a',
  50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
  500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617',
};

// Neutral grays: page background (gray-50), borders, muted text.
const gray = {
  DEFAULT: '#6b7280',
  50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af',
  500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712',
};

// Module accents: each module gets its own colour so users always know where they are.
const lab = {                       // Laboratory: violet
  DEFAULT: '#7c3aed',
  50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
  500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
};

const pharmacy = {                  // Pharmacy: emerald
  DEFAULT: '#059669',
  50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
  500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
};

const memorial = {                  // Mortuary + cemetery: muted stone, calm and respectful
  DEFAULT: '#57534e',
  50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e',
  500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917', 950: '#0c0a09',
};

// Status colours. Danger is for critical alerts and errors only, never decoration.
const success = { DEFAULT: '#059669', light: '#d1fae5', dark: '#047857' };
const warning = { DEFAULT: '#d97706', light: '#fef3c7', dark: '#b45309' };
const danger = { DEFAULT: '#dc2626', light: '#fee2e2', dark: '#b91c1c' };
const info = { DEFAULT: '#0284c7', light: '#e0f2fe', dark: '#0369a1' };

export const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  white: '#ffffff',
  black: '#000000',
  primary, navy, gray, lab, pharmacy, memorial,
  success, warning, danger, info,
};

// Which colour family each module uses (handy for JS logic, charts, badges)
export const moduleColors = {
  hospital: 'primary',
  doctors: 'primary',
  lab: 'lab',
  pharmacy: 'pharmacy',
  mortuary: 'memorial',
  cemetery: 'memorial',
};

export default colors;






























































