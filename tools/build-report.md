# Career data build report

Built 2026-10-07 from OEWS May 2025 and O*NET db_31_0_excel.zip.

OEWS (May 2025): 825 detailed occupations with annual wages
Employment Projections: 831 occupations

## Calibration against hand-tuned careers
Each trait is rescaled with a straight-line fit from O*NET's measure to the hand-tuned values. r is how well they agree (1 = perfectly).

| Trait | Pairs | r | Scale |
|---|---|---|---|
| c | 40 | 0.82 | y = -0.14 + 1.08x |
| tr | 43 | – | rule by job family |
| s | 40 | 0.66 | y = -0.30 + 1.19x |
| cu | 40 | 0.50 | y = 0.23 + 0.75x |
| l | 40 | 0.61 | y = 0.06 + 0.72x |
| au | 40 | 0.16 | y = 0.10 + 0.61x |
| v | 40 | 0.24 | y = 0.43 + 0.50x |
| p | 40 | 0.37 | y = 0.32 + 0.56x |
| da | 40 | 0.74 | y = -0.55 + 1.34x |
| th | 40 | 0.73 | y = -0.02 + 1.21x |
| rp | 43 | – | rule by job family |
| h | 40 | -0.20 | y = 0.27 + 0.50x |
| o | 43 | 0.59 | y = 0.10 + 1.37x |
| w | 40 | 0.55 | y = -0.48 + 1.42x |
| pr | 40 | 0.47 | y = 0.14 + 0.72x |
| en | 42 | 0.36 | y = -0.23 + 0.63x |
| pu | 42 | 0.83 | y = 0.11 + 0.91x |

## Result
- 756 careers written to careers-bls.js
- 43 of them fold into hand-tuned careers (same SOC code)
- 23 have thin O*NET data, so much of their fingerprint is estimated from similar jobs (marked est)
- 69 occupations skipped ("All Other" catch-all groups, or incomplete wages)

<details><summary>Skipped occupations</summary>

- 11-9039 Education Administrators, All Other
- 11-9179 Personal Service Managers, All Other
- 11-9199 Managers, All Other
- 13-1199 Business Operations Specialists, All Other
- 13-2099 Financial Specialists, All Other
- 15-1299 Computer Occupations, All Other
- 15-2099 Mathematical Science Occupations, All Other
- 17-2199 Engineers, All Other
- 17-3019 Drafters, All Other
- 17-3029 Engineering Technologists and Technicians, Except Drafters, All Other
- 19-1029 Biological Scientists, All Other
- 19-1099 Life Scientists, All Other
- 19-2099 Physical Scientists, All Other
- 19-3039 Psychologists, All Other
- 19-3099 Social Scientists and Related Workers, All Other
- 19-4099 Life, Physical, and Social Science Technicians, All Other
- 21-1019 Counselors, All Other
- 21-1029 Social Workers, All Other
- 21-1099 Community and Social Service Specialists, All Other
- 21-2099 Religious Workers, All Other
- 23-2099 Legal Support Workers, All Other
- 25-1069 Social Sciences Teachers, Postsecondary, All Other
- 25-1199 Postsecondary Teachers, All Other
- 25-2059 Special Education Teachers, All Other
- 25-3099 Teachers and Instructors, All Other
- 25-9099 Educational Instruction and Library Workers, All Other
- 27-1019 Artists and Related Workers, All Other
- 27-1029 Designers, All Other
- 27-3099 Media and Communication Workers, All Other
- 27-4099 Media and Communication Equipment Workers, All Other
- 29-1029 Dentists, All Other Specialists
- 29-1129 Therapists, All Other
- 29-1229 Physicians, All Other
- 29-1249 Surgeons, All Other
- 29-1299 Healthcare Diagnosing or Treating Practitioners, All Other
- 29-2099 Health Technologists and Technicians, All Other
- 29-9099 Healthcare Practitioners and Technical Workers, All Other
- 31-9099 Healthcare Support Workers, All Other
- 33-1099 First-Line Supervisors of Protective Service Workers, All Other
- 33-9099 Protective Service Workers, All Other
- 35-2019 Cooks, All Other
- 35-9099 Food Preparation and Serving Related Workers, All Other
- 37-2019 Building Cleaning Workers, All Other
- 37-3019 Grounds Maintenance Workers, All Other
- 39-3019 Gambling Service Workers, All Other
- 39-3099 Entertainment Attendants and Related Workers, All Other
- 39-9099 Personal Care and Service Workers, All Other
- 41-9099 Sales and Related Workers, All Other
- 43-2099 Communications Equipment Operators, All Other
- 43-3099 Financial Clerks, All Other
- 43-4199 Information and Record Clerks, All Other
- 43-9199 Office and Administrative Support Workers, All Other
- 45-2099 Agricultural Workers, All Other
- 45-4029 Logging Workers, All Other
- 47-3019 Helpers, Construction Trades, All Other
- 47-5049 Underground Mining Machine Operators, All Other
- 47-5099 Extraction Workers, All Other
- 49-9069 Precision Instrument and Equipment Repairers, All Other
- 49-9099 Installation, Maintenance, and Repair Workers, All Other
- 51-3099 Food Processing Workers, All Other
- 51-4199 Metal Workers and Plastic Workers, All Other
- 51-6099 Textile, Apparel, and Furnishings Workers, All Other
- 51-7099 Woodworkers, All Other
- 51-8099 Plant and System Operators, All Other
- 51-9199 Production Workers, All Other
- 53-3099 Motor Vehicle Operators, All Other
- 53-4099 Rail Transportation Workers, All Other
- 53-6099 Transportation Workers, All Other
- 53-7199 Material Moving Workers, All Other
</details>

## Highest median pay (spot check)
- Pediatric Surgeons: median $559k, code ISR, edu 3
- Cardiologists: median $496k, code IRS, edu 3
- Radiologists: median $421k, code IRC, edu 3
- Anesthesiologists: median $391k, code ISR, edu 3
- Orthopedic Surgeons, Except Pediatric: median $359k, code IRS, edu 3
- Oral and Maxillofacial Surgeons: median $352k, code IRS, edu 3
- Emergency Medicine Physicians: median $336k, code ISC, edu 3
- Dermatologists: median $329k, code IRS, edu 3
- Physicians, Pathologists: median $312k, code IRC, edu 3
- Prosthodontists: median $311k, code RIS, edu 3
- Ophthalmologists, Except Pediatric: median $300k, code ISR, edu 3
- Obstetricians and Gynecologists: median $293k, code ISR, edu 3
- Orthodontists: median $289k, code IRC, edu 3
- Psychiatrists: median $282k, code ISC, edu 3
- General Internal Medicine Physicians: median $257k, code ISR, edu 3
