const T = (category, name, code, sampleType, turnaroundHours, referenceRange) =>
  ({ category, name, code, sampleType, turnaroundHours, referenceRange });

export const TEST_PRESETS = [
  // Hematology
  T('hematology', 'Full Blood Count (FBC)', 'FBC', 'whole blood', 6, 'See individual parameters'),
  T('hematology', 'Haemoglobin (Hb)', 'HB', 'whole blood', 4, '12.0 - 17.5 g/dL'),
  T('hematology', 'Packed Cell Volume (PCV)', 'PCV', 'whole blood', 4, '36 - 50 %'),
  T('hematology', 'White Blood Cell Count', 'WBC', 'whole blood', 4, '4,000 - 11,000 /µL'),
  T('hematology', 'Platelet Count', 'PLT', 'whole blood', 4, '150 - 450 x10³/µL'),
  T('hematology', 'ESR', 'ESR', 'whole blood', 4, '0 - 20 mm/hr'),
  T('hematology', 'Reticulocyte Count', 'RETIC', 'whole blood', 6, '0.5 - 2.5 %'),
  T('hematology', 'Blood Group & Rhesus', 'BGRH', 'whole blood', 2, 'A, B, AB or O; Rh positive/negative'),
  T('hematology', 'Genotype (Hb Electrophoresis)', 'GENO', 'whole blood', 24, 'AA, AS, SS, AC, SC'),
  T('hematology', 'Malaria Parasite (MP)', 'MP', 'whole blood', 2, 'Negative'),
  T('hematology', 'Prothrombin Time (PT/INR)', 'PT', 'plasma', 6, '11 - 13.5 sec; INR 0.8 - 1.1'),
  T('hematology', 'D-Dimer', 'DDIM', 'plasma', 6, '< 0.5 µg/mL FEU'),
  // Chemistry
  T('chemistry', 'Fasting Blood Sugar (FBS)', 'FBS', 'serum', 4, '70 - 99 mg/dL'),
  T('chemistry', 'Random Blood Sugar (RBS)', 'RBS', 'serum', 2, '< 140 mg/dL'),
  T('chemistry', 'HbA1c', 'HBA1C', 'whole blood', 24, '< 5.7 %'),
  T('chemistry', 'Urea', 'UREA', 'serum', 6, '7 - 20 mg/dL'),
  T('chemistry', 'Creatinine', 'CREAT', 'serum', 6, '0.6 - 1.3 mg/dL'),
  T('chemistry', 'Uric Acid', 'UA', 'serum', 6, '3.5 - 7.2 mg/dL'),
  T('chemistry', 'Electrolytes, Urea & Creatinine (E/U/Cr)', 'EUCR', 'serum', 8, 'Na 135-145, K 3.5-5.0 mmol/L'),
  T('chemistry', 'Sodium', 'NA', 'serum', 6, '135 - 145 mmol/L'),
  T('chemistry', 'Potassium', 'K', 'serum', 6, '3.5 - 5.0 mmol/L'),
  T('chemistry', 'Chloride', 'CL', 'serum', 6, '98 - 107 mmol/L'),
  T('chemistry', 'Bicarbonate', 'HCO3', 'serum', 6, '22 - 29 mmol/L'),
  T('chemistry', 'Calcium', 'CA', 'serum', 6, '8.6 - 10.2 mg/dL'),
  T('chemistry', 'Liver Function Test (LFT)', 'LFT', 'serum', 12, 'See individual parameters'),
  T('chemistry', 'ALT (SGPT)', 'ALT', 'serum', 8, '7 - 56 U/L'),
  T('chemistry', 'AST (SGOT)', 'AST', 'serum', 8, '10 - 40 U/L'),
  T('chemistry', 'Alkaline Phosphatase (ALP)', 'ALP', 'serum', 8, '44 - 147 U/L'),
  T('chemistry', 'Total Bilirubin', 'TBIL', 'serum', 8, '0.1 - 1.2 mg/dL'),
  T('chemistry', 'Total Protein', 'TP', 'serum', 8, '6.0 - 8.3 g/dL'),
  T('chemistry', 'Albumin', 'ALB', 'serum', 8, '3.5 - 5.0 g/dL'),
  T('chemistry', 'Lipid Profile', 'LIPID', 'serum', 12, 'See individual parameters'),
  T('chemistry', 'Total Cholesterol', 'CHOL', 'serum', 8, '< 200 mg/dL'),
  T('chemistry', 'HDL Cholesterol', 'HDL', 'serum', 8, '> 40 mg/dL'),
  T('chemistry', 'LDL Cholesterol', 'LDL', 'serum', 8, '< 100 mg/dL'),
  T('chemistry', 'Triglycerides', 'TG', 'serum', 8, '< 150 mg/dL'),
  // Endocrinology & hormones
  T('endocrinology', 'Thyroid Stimulating Hormone (TSH)', 'TSH', 'serum', 24, '0.4 - 4.0 mIU/L'),
  T('endocrinology', 'Free T4', 'FT4', 'serum', 24, '0.8 - 1.8 ng/dL'),
  T('endocrinology', 'Free T3', 'FT3', 'serum', 24, '2.3 - 4.2 pg/mL'),
  T('endocrinology', 'Prolactin', 'PRL', 'serum', 24, 'Female < 25 ng/mL; Male < 15 ng/mL'),
  T('endocrinology', 'FSH', 'FSH', 'serum', 24, 'Varies by sex and cycle phase'),
  T('endocrinology', 'LH', 'LH', 'serum', 24, 'Varies by sex and cycle phase'),
  T('endocrinology', 'Estradiol (E2)', 'E2', 'serum', 24, 'Varies by cycle phase'),
  T('endocrinology', 'Progesterone', 'PROG', 'serum', 24, 'Varies by cycle phase'),
  T('endocrinology', 'Testosterone', 'TESTO', 'serum', 24, 'Male 300 - 1,000 ng/dL; Female 15 - 70 ng/dL'),
  T('endocrinology', 'Cortisol (morning)', 'CORT', 'serum', 24, '6 - 23 µg/dL'),
  T('endocrinology', 'Vitamin D (25-OH)', 'VITD', 'serum', 48, '30 - 100 ng/mL'),
  T('endocrinology', 'Vitamin B12', 'B12', 'serum', 48, '200 - 900 pg/mL'),
  T('endocrinology', 'Anti-Mullerian Hormone (AMH)', 'AMH', 'serum', 48, 'Varies by age'),
  // Reproductive & pregnancy
  T('reproductive', 'Pregnancy Test (Urine)', 'UPT', 'urine', 1, 'Negative'),
  T('reproductive', 'Beta-hCG (Quantitative)', 'BHCG', 'serum', 24, '< 5 mIU/mL (non-pregnant)'),
  T('reproductive', 'Semen Analysis', 'SFA', 'semen', 24, 'Volume ≥ 1.5 mL; count ≥ 15 million/mL'),
  T('reproductive', 'Prostate Specific Antigen (PSA)', 'PSA', 'serum', 24, '< 4.0 ng/mL'),
  // Microbiology
  T('microbiology', 'Urinalysis', 'UA-R', 'urine', 2, 'Within normal limits'),
  T('microbiology', 'Urine Microscopy, Culture & Sensitivity (MCS)', 'UMCS', 'urine', 72, 'No significant growth'),
  T('microbiology', 'Stool Microscopy', 'STM', 'stool', 6, 'No ova, cysts or parasites seen'),
  T('microbiology', 'Stool Culture & Sensitivity', 'STCS', 'stool', 72, 'No pathogens isolated'),
  T('microbiology', 'Blood Culture', 'BCULT', 'whole blood', 120, 'No growth'),
  T('microbiology', 'High Vaginal Swab (HVS) MCS', 'HVS', 'swab', 72, 'No significant growth'),
  T('microbiology', 'Endocervical Swab MCS', 'ECS', 'swab', 72, 'No significant growth'),
  T('microbiology', 'Throat Swab MCS', 'TSWAB', 'swab', 72, 'No pathogenic growth'),
  T('microbiology', 'Wound Swab MCS', 'WSWAB', 'swab', 72, 'No significant growth'),
  T('microbiology', 'Sputum AFB (TB smear)', 'AFB', 'sputum', 24, 'No AFB seen'),
  T('microbiology', 'GeneXpert MTB/RIF', 'GXP', 'sputum', 24, 'MTB not detected'),
  // Serology & infectious disease
  T('serology', 'HIV Screening (I & II)', 'HIV', 'serum', 4, 'Non-reactive'),
  T('serology', 'Hepatitis B Surface Antigen (HBsAg)', 'HBSAG', 'serum', 4, 'Non-reactive'),
  T('serology', 'Hepatitis C Antibody (HCV)', 'HCV', 'serum', 4, 'Non-reactive'),
  T('serology', 'Hepatitis A (IgM)', 'HAV', 'serum', 24, 'Non-reactive'),
  T('serology', 'VDRL / Syphilis', 'VDRL', 'serum', 4, 'Non-reactive'),
  T('serology', 'Widal Test (Typhoid)', 'WIDAL', 'serum', 4, 'Titre < 1:80'),
  T('serology', 'Typhoid IgG/IgM', 'TYPH', 'serum', 4, 'Negative'),
  T('serology', 'H. pylori (Antigen/Antibody)', 'HPYL', 'stool', 6, 'Negative'),
  T('serology', 'COVID-19 Antigen', 'COV-AG', 'swab', 1, 'Negative'),
  T('serology', 'Dengue NS1 / IgM', 'DENG', 'serum', 6, 'Negative'),
  // Immunology
  T('immunology', 'C-Reactive Protein (CRP)', 'CRP', 'serum', 6, '< 10 mg/L'),
  T('immunology', 'Rheumatoid Factor (RF)', 'RF', 'serum', 12, '< 14 IU/mL'),
  T('immunology', 'ASO Titre', 'ASO', 'serum', 12, '< 200 IU/mL'),
  T('immunology', 'Antinuclear Antibody (ANA)', 'ANA', 'serum', 48, 'Negative'),
  // Cardiac
  T('cardiac', 'Troponin I', 'TROP', 'serum', 4, '< 0.04 ng/mL'),
  T('cardiac', 'CK-MB', 'CKMB', 'serum', 6, '< 5 ng/mL'),
  // Other
  T('other', 'Stool Occult Blood', 'FOB', 'stool', 6, 'Negative'),
  T('other', 'Urine Microalbumin', 'UMA', 'urine', 24, '< 30 mg/g creatinine'),
];

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

export const CATEGORIES = uniq([
  ...TEST_PRESETS.map((t) => t.category),
  'toxicology', 'histopathology', 'cytology', 'genetics', 'allergy',
]).sort();

export const SAMPLE_TYPES = uniq([
  'whole blood', 'serum', 'plasma', 'urine', 'stool', 'sputum', 'swab', 'semen',
  'saliva', 'csf', 'tissue', 'pus', 'fluid aspirate', 'hair', 'nail',
]);

export const TURNAROUNDS = [1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 96, 120, 168];

export const PRICES = [
  500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 7500, 8000,
  10000, 12000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000,
];

export const RANGES = uniq(TEST_PRESETS.map((t) => t.referenceRange)).concat([
  'Negative', 'Positive / Negative', 'Non-reactive', 'Varies by age and sex', 'See report',
]);