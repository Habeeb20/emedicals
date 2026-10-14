import SelectOther from './SelectOther';

export const DRUG_CATEGORIES = [
  'Analgesic / Pain relief',
  'Antibiotic',
  'Antimalarial',
  'Antifungal',
  'Antiviral',
  'Anthelmintic (worm treatment)',
  'Antihypertensive',
  'Antidiabetic',
  'Cardiovascular',
  'Antihistamine / Allergy',
  'Cough & cold',
  'Respiratory / Asthma',
  'Antacid / Gastrointestinal',
  'Anticonvulsant',
  'Antidepressant / Psychiatric',
  'Hormonal / Contraceptive',
  'Dermatological',
  'Ophthalmic (eye)',
  'Ear / Nose / Throat',
  'Vitamins & supplements',
  'Anaesthetic',
  'Antiseptic / Disinfectant',
  'Oral rehydration / Fluids',
  'Medical consumable',
];

export default function DrugCategorySelect({ value, onChange, className, required }) {
  return (
    <SelectOther
      value={value}
      onChange={onChange}
      options={DRUG_CATEGORIES}
      placeholder="Select category"
      otherPlaceholder="Type the category"
      className={className}
      required={required}
    />
  );
}