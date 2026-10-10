import {
  Stethoscope, Baby, HeartPulse, Heart, Smile, Eye, Ear, Bone, Brain, Scissors, Droplets,
  ScanLine, Activity, Apple, Sparkles, MessageCircle,
} from 'lucide-react';

// Class names are written out in full so Tailwind can find them
const TINTS = {
  primary: 'bg-primary-50 text-primary-700',
  info: 'bg-info-light text-info-dark',
  lab: 'bg-lab-50 text-lab-700',
  pharmacy: 'bg-pharmacy-50 text-pharmacy-700',
  warning: 'bg-warning-light text-warning-dark',
  memorial: 'bg-memorial-100 text-memorial-700',
};

// Departments can be any text a hospital typed, so we recognise them by keyword. First match wins.
const RULES = [
  { match: /dent|tooth|teeth|orthodon/, label: 'Dentist', hint: 'Teeth, gums & braces', icon: Smile, tint: 'primary' },
  { match: /ophthal|optic|optom|\beyes?\b|vision/, label: 'Optician', hint: 'Eye tests, glasses & eye care', icon: Eye, tint: 'info' },
  { match: /cardio|heart/, label: 'Cardiology', hint: 'Heart & blood pressure', icon: HeartPulse, tint: 'primary' },
  { match: /p(a)?ediat|child|neonat/, label: 'Pediatrics', hint: 'Babies & children', icon: Baby, tint: 'warning' },
  { match: /gyn|obstet|matern|women|antenat/, label: 'Gynaecology', hint: "Women's health & pregnancy", icon: Heart, tint: 'lab' },
  { match: /derma|skin/, label: 'Dermatology', hint: 'Skin, hair & nails', icon: Sparkles, tint: 'pharmacy' },
  { match: /\bent\b|\bear\b|nose|throat|otolaryng/, label: 'ENT', hint: 'Ear, nose & throat', icon: Ear, tint: 'info' },
  { match: /ortho|bone|joint|spine/, label: 'Orthopaedics', hint: 'Bones & joints', icon: Bone, tint: 'memorial' },
  { match: /neuro|brain/, label: 'Neurology', hint: 'Brain & nerves', icon: Brain, tint: 'lab' },
  { match: /psych|mental|counsel/, label: 'Psychiatry', hint: 'Mental health & counselling', icon: MessageCircle, tint: 'lab' },
  { match: /surg/, label: 'Surgery', hint: 'Operations & procedures', icon: Scissors, tint: 'memorial' },
  { match: /\burol|kidney|nephro/, label: 'Urology', hint: 'Kidneys & urinary health', icon: Droplets, tint: 'info' },
  { match: /radio|x-?ray|imaging|scan|ultrasound/, label: 'Radiology', hint: 'Scans & imaging', icon: ScanLine, tint: 'memorial' },
  { match: /physio|rehab|therapy/, label: 'Physiotherapy', hint: 'Movement & recovery', icon: Activity, tint: 'pharmacy' },
  { match: /nutri|diet/, label: 'Nutrition', hint: 'Diet & healthy eating', icon: Apple, tint: 'pharmacy' },
  { match: /general|family|\bgp\b|primary|medicine|consult/, label: 'General practice', hint: 'Check-ups & everyday health', icon: Stethoscope, tint: 'primary' },
];

/** Friendly label, hint, icon and colour for any department name. Unknown names keep their own name. */
export const getDepartmentMeta = (name = '') => {
  const key = String(name).toLowerCase();
  const rule = RULES.find((r) => r.match.test(key));
  return rule
    ? { label: rule.label, hint: rule.hint, icon: rule.icon, tintClass: TINTS[rule.tint] }
    : { label: name, hint: '', icon: Stethoscope, tintClass: TINTS.primary };
};