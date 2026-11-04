# Career data build report

Built from OEWS May 2025 and O*NET db_31_0_excel.zip.

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
- override 17-2031 Bioengineers and Biomedical Engineers: {"pay":[79,109,152],"edu":2,"ease":"Medium","titles":"Biomedical Engineer, Process Engineer, Research Engineer"}
- override 17-2111 Health and Safety Engineers, Except Mining Safety Engineers and Inspectors: {"pay":[80,115,157],"edu":2,"ease":"Medium","step":"Typical entry: bachelor's degree. A PE license (FE exam, experience, then PE exam) and the CSP certification are common for moving up."}
- override 17-2131 Materials Engineers: {"pay":[80,113,159],"edu":2,"ease":"Medium","d":{"th":0.45},"trv":"Some","wlb":"Mixed"}
- override 17-3013 Mechanical Drafters: {"pay":[53,72,96],"edu":1,"ease":"Easy","wlb":"Mixed"}
- override 17-3027 Mechanical Engineering Technologists and Technicians: {"pay":[54,75,97],"edu":1,"ease":"Easy","wlb":"Mixed"}
- override 19-1031 Conservation Scientists: {"pay":[53,73,101],"edu":2,"ease":"Medium","step":"Typical entry: bachelor's degree. Federal soil conservationist jobs require at least 30 semester hours in natural resource or agriculture courses, 12 of them in soils or plant science."}
- override 19-2042 Geoscientists, Except Hydrologists and Geographers: {"pay":[67,102,170],"edu":2,"ease":"Medium","d":{"tr":0.3},"trv":"Regular","wlb":"Demanding","step":"Typical entry: bachelor's degree. About 38 states license Professional Geologists (ASBOG exams), which is needed to sign public reports."}
- override 19-5012 Occupational Health and Safety Technicians: {"pay":[49,62,90],"edu":0,"ease":"Easy","titles":"Construction Safety Consultant, Industrial Hygiene Technician, Safety Specialist, Safety Technician"}
- override 21-2021 Directors, Religious Activities and Education: {"pay":[39,52,86],"edu":2,"ease":"Medium","d":{"h":0.6},"trv":"Some","wlb":"Demanding"}
- override 23-2093 Title Examiners, Abstractors, and Searchers: {"pay":[43,59,83],"edu":0,"ease":"Easy","step":"Typical entry: high school diploma or equivalent; then moderate-term on-the-job training. Some states require a title license, so check your state."}
- override 25-2051 Special Education Teachers, Preschool: {"pay":[49,65,111],"edu":2,"ease":"Medium","d":{"tr":0.2},"trv":"Some","wlb":"Mixed"}
- override 25-3031 Substitute Teachers, Short-Term: {"pay":[31,42,60],"edu":1,"ease":"Medium"}
- override 27-1021 Commercial and Industrial Designers: {"pay":[60,84,124],"edu":2,"ease":"Medium","sub":{"machines":0.74,"tech":0.42,"art":0.6,"factory":0.3}}
- override 27-1022 Fashion Designers: {"pay":[46,81,127],"edu":2,"ease":"Medium","step":"Typical entry: bachelor's degree. A portfolio is required, and most jobs are in New York and California."}
- override 27-1023 Floral Designers: {"pay":[31,37,48],"edu":0,"ease":"Easy","sub":{"art":0.7}}
- override 27-3011 Broadcast Announcers and Radio Disc Jockeys: {"pay":[32,47,107],"edu":2,"ease":"Hard"}
- override 27-3023 News Analysts, Reporters, and Journalists: {"pay":[41,62,121],"edu":2,"ease":"Medium","wlb":"Demanding"}
- override 27-3042 Technical Writers: {"pay":[64,90,130],"edu":2,"ease":"Medium","titles":"Technical Writer, Documentation Specialist, Engineering Writer, Information Developer"}
- override 27-4012 Broadcast Technicians: {"pay":[36,60,104],"edu":1,"ease":"Medium"}
- override 27-4031 Camera Operators, Television, Video, and Film: {"pay":[45,75,121],"edu":2,"ease":"Medium","d":{"tr":0.5,"h":0.7},"trv":"Regular","wlb":"Demanding"}
- override 29-1022 Oral and Maxillofacial Surgeons: {"pay":[205,352,526],"edu":3,"ease":"Hard"}
- override 29-1291 Acupuncturists: {"pay":[40,55,102],"edu":3,"ease":"Hard"}
- override 29-2036 Medical Dosimetrists: {"pay":[122,147,176],"edu":3,"ease":"Hard"}
- override 33-1011 First-Line Supervisors of Correctional Officers: {"pay":[56,78,116],"edu":0,"ease":"Medium"}
- override 33-1012 First-Line Supervisors of Police and Detectives: {"pay":[73,106,149],"edu":0,"ease":"Hard"}
- override 33-1021 First-Line Supervisors of Firefighting and Prevention Workers: {"pay":[63,94,130],"edu":1,"ease":"Hard"}
- override 33-1091 First-Line Supervisors of Security Workers: {"pay":[41,56,82],"edu":0,"ease":"Medium"}
- override 33-3021 Detectives and Criminal Investigators: {"pay":[62,94,141],"edu":0,"ease":"Hard"}
- override 33-9021 Private Detectives and Investigators: {"pay":[39,51,86],"edu":0,"ease":"Medium"}
- override 37-3012 Pesticide Handlers, Sprayers, and Applicators, Vegetation: {"pay":[37,46,56],"edu":0,"ease":"Easy","step":"Typical entry: high school diploma or equivalent; then moderate-term on-the-job training. Most states require a pesticide applicator license (a core exam plus a category exam)."}
- override 39-1013 First-Line Supervisors of Gambling Services Workers: {"pay":[46,64,80],"edu":0,"ease":"Easy","step":"Typical entry: high school diploma or equivalent; less than 5 years of experience in a related job. A state or tribal gaming license is required, and most supervisors first work 1–3 years as dealers."}
- override 39-1014 First-Line Supervisors of Entertainment and Recreation Workers, Except Gambling Services: {"pay":[37,49,71],"edu":0,"ease":"Medium"}
- override 39-4021 Funeral Attendants: {"pay":[29,36,46],"edu":0,"ease":"Easy","titles":"Funeral Assistant, Funeral Attendant, Funeral Home Assistant, Transfer Care Specialist"}
- override 39-4031 Morticians, Undertakers, and Funeral Arrangers: {"pay":[38,55,80],"edu":1,"ease":"Medium","step":"Typical entry: associate's degree; then long-term on-the-job training. Funeral directors need a state license: usually age 21, an accredited mortuary science program, a board exam, and a 1–3 year internship."}
- override 41-2012 Gambling Change Persons and Booth Cashiers: {"pay":[27,36,51],"edu":0,"ease":"Easy","step":"Typical entry: no formal educational credential; then short-term on-the-job training. A state or tribal gaming license, a background check, and usually a drug test are required."}
- override 43-4011 Brokerage Clerks: {"pay":[54,66,91],"edu":0,"ease":"Easy","titles":"Registered Sales Assistant, Sales Assistant, Trading Assistant, Brokerage Clerk"}
- override 45-2041 Graders and Sorters, Agricultural Products: {"pay":[32,36,41],"edu":0,"ease":"Easy","sk":["handson","safety"],"d":{"v":0.3},"trv":"Some","wlb":"Mixed"}
- override 45-2093 Farmworkers, Farm, Ranch, and Aquacultural Animals: {"pay":[29,37,50],"edu":0,"ease":"Easy","sk":["handson","safety","training"]}
- override 49-9063 Musical Instrument Repairers and Tuners: {"pay":[34,46,65],"edu":1,"ease":"Easy"}
- override 51-2011 Aircraft Structure, Surfaces, Rigging, and Systems Assemblers: {"pay":[53,65,95],"edu":0,"ease":"Easy","sk":["handson","training","teaching"]}
- override 51-2031 Engine and Other Machine Assemblers: {"pay":[42,54,76],"edu":0,"ease":"Easy","sk":["handson"]}
- override 51-3093 Food Cooking Machine Operators and Tenders: {"pay":[34,42,51],"edu":0,"ease":"Easy","d":{"au":0.4},"trv":"Some","wlb":"Mixed"}
- override 51-4122 Welding, Soldering, and Brazing Machine Setters, Operators, and Tenders: {"pay":[39,48,62],"edu":0,"ease":"Easy","titles":"Robotic Welding Operator, Spot Welder, Welding Machine Operator, Machine Operator"}
- override 51-4193 Plating Machine Setters, Operators, and Tenders, Metal and Plastic: {"pay":[36,44,55],"edu":0,"ease":"Easy","sk":["handson","safety","training","operations"]}
- override 51-5113 Print Binding and Finishing Workers: {"pay":[35,42,54],"edu":0,"ease":"Easy","sub":{"factory":0.7}}
- override 51-6064 Textile Winding, Twisting, and Drawing Out Machine Setters, Operators, and Tenders: {"pay":[34,39,46],"edu":0,"ease":"Easy","d":{"v":0.3},"trv":"Some","wlb":"Mixed"}
- override 51-8013 Power Plant Operators: {"pay":[71,102,126],"edu":0,"ease":"Medium"}
- override 51-8093 Petroleum Pump System Operators, Refinery Operators, and Gaugers: {"pay":[67,97,111],"edu":0,"ease":"Medium"}
- override 51-9021 Crushing, Grinding, and Polishing Machine Setters, Operators, and Tenders: {"pay":[38,49,65],"edu":0,"ease":"Easy","step":"Typical entry: high school diploma or equivalent; then moderate-term on-the-job training. Quarry and mine jobs require federal MSHA new-miner training (24 hours, 8 of them before starting)."}
- override 51-9071 Jewelers and Precious Stone and Metal Workers: {"pay":[38,53,79],"edu":0,"ease":"Easy","sk":["handson","design","customer","sales"],"d":{"th":0.85},"trv":"Some","wlb":"Demanding"}
- override 51-9081 Dental Laboratory Technicians: {"pay":[39,50,70],"edu":0,"ease":"Easy","sk":["handson","healthcare","training","pm","teaching","customer"]}
- override 51-9141 Semiconductor Processing Technicians: {"pay":[42,51,74],"edu":0,"ease":"Easy","d":{"h":0.7},"trv":"Some","wlb":"Demanding"}
- override 51-9195 Molders, Shapers, and Casters, Except Metal and Plastic: {"pay":[38,46,57],"edu":0,"ease":"Easy","sk":["handson","safety","training"],"sub":{"factory":0.7}}
- override 53-2012 Commercial Pilots: {"pay":[72,123,229],"edu":1,"ease":"Hard"}
- override 53-2021 Air Traffic Controllers: {"pay":[91,148,203],"edu":1,"ease":"Hard","d":{"h":0.75},"trv":"Some","wlb":"Demanding","step":"Typical entry: associate's degree; then long-term on-the-job training. Applicants must be U.S. citizens, apply before age 31, pass the ATSA aptitude test, a medical exam and a security check, and finish the FAA Academy; controllers must retire at 56."}
- override 53-3054 Taxi Drivers: {"pay":[36,42,68],"edu":0,"ease":"Easy","titles":"Taxi Driver, Cab Driver, Rideshare Driver, Uber or Lyft Driver"}
- override 53-4011 Locomotive Engineers: {"pay":[68,81,101],"edu":0,"ease":"Medium","step":"Typical entry: high school diploma or equivalent; less than 5 years of experience in a related job; then moderate-term on-the-job training. Most start as railroad conductors."}
- override 53-5011 Sailors and Marine Oilers: {"pay":[38,52,76],"edu":0,"ease":"Medium"}
- override 53-5021 Captains, Mates, and Pilots of Water Vessels: {"pay":[56,92,149],"edu":1,"ease":"Hard"}
- override 53-6032 Aircraft Service Attendants: {"pay":[35,40,52],"edu":0,"ease":"Easy","d":{"cu":0.3,"pr":0.2},"trv":"Some","wlb":"Demanding"}
- override 53-6051 Transportation Inspectors: {"pay":[50,92,124],"edu":0,"ease":"Medium","titles":"Aviation Safety Inspector, Marine Cargo Surveyor, Petroleum Inspector, Railroad Safety Inspector","d":{"tr":0.5},"trv":"Regular","wlb":"Demanding","step":"Typical entry: high school diploma or equivalent; then moderate-term on-the-job training. Most inspectors first spend years in the industry they inspect; FAA aviation safety inspectors, for example, need pilot or mechanic certificates and long experience."}
- override 53-6061 Passenger Attendants: {"pay":[30,38,44],"edu":0,"ease":"Easy","d":{"pr":0.3},"trv":"Some","wlb":"Mixed"}
- override 53-7011 Conveyor Operators and Tenders: {"pay":[37,42,54],"edu":0,"ease":"Easy","d":{"pr":0.1},"trv":"Some","wlb":"Demanding"}
- override 53-7021 Crane and Tower Operators: {"pay":[48,68,93],"edu":0,"ease":"Medium"}

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
- Orthopedic Surgeons, Except Pediatric: median $359k, code IRS, edu 3
- Anesthesiologists: median $391k, code ISR, edu 3
- Dermatologists: median $329k, code IRS, edu 3
- Emergency Medicine Physicians: median $336k, code ISC, edu 3
- Ophthalmologists, Except Pediatric: median $300k, code ISR, edu 3
- Oral and Maxillofacial Surgeons: median $352k, code IRS, edu 3
- Physicians, Pathologists: median $312k, code IRC, edu 3
- Obstetricians and Gynecologists: median $293k, code ISR, edu 3
- Psychiatrists: median $282k, code ISC, edu 3
- General Internal Medicine Physicians: median $257k, code ISR, edu 3
- Prosthodontists: median $311k, code RIS, edu 3
- Neurologists: median $249k, code ISR, edu 3
