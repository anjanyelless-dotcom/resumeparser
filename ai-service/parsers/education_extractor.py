"""
Advanced education extractor for resume parsing.
Extracts structured education information with degree normalization and GPA analysis.
"""

import re
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)


class EducationExtractor:
    """
    Advanced education extractor with comprehensive parsing capabilities.
    Extracts structured education history with degree normalization and GPA analysis.
    """
    
    # Degree patterns for recognition
    DEGREE_PATTERNS = [
        'Bachelor', 'Master', 'PhD', 'Doctorate', 'Associate',
        'B.Sc', 'M.Sc', 'B.Tech', 'M.Tech', 'MBA', 'B.E', 'B.E.', 'B.A', 'M.A',
        'B.S', 'M.S', 'B.Com', 'M.Com', 'BBA', 'BCA', 'MCA',
        "Bachelor of Science",
        "Bachelor of Arts",
        "Bachelor of Business Administration",
        "Bachelor of Fine Arts",
        "Bachelor of Engineering",
        "Bachelor of Technology",
        "Bachelor of Architecture",
        "Bachelor of Education",
        "Bachelor of Laws",
        "Bachelor of Music",
        "Bachelor of Nursing",
        "Bachelor of Social Work",
        "Bachelor of Public Health",
        "Bachelor of Computer Science",
        "Bachelor of Information Technology",
        "Bachelor of Commerce",
        "Bachelor of Philosophy",
        "Bachelor of Economics",
        "Bachelor of Psychology",
        "Bachelor of Criminal Justice",
        "Bachelor of Journalism",
        "Bachelor of Communication",
        "Bachelor of Health Administration",
        "Bachelor of Human Services",
        "Bachelor of Liberal Arts",
        "Bachelor of Political Science",
        "Bachelor of Interdisciplinary Studies",
        "Bachelor of Science in Nursing",
        "Bachelor of Science in Education",
        "Bachelor of Science in Business",
        "Bachelor of Applied Science",
        "Bachelor of General Studies",
        "BS",
        "B.S",
        "B.S.",
        "BA",
        "B.A",
        "B.A.",
        "BBA",
        "B.B.A",
        "B.B.A.",
        "BFA",
        "B.F.A",
        "B.F.A.",
        "BE",
        "B.E",
        "B.E.",
        "BEd",
        "B.Ed",
        "B.Ed.",
        "BN",
        "B.N",
        "BSN",
        "B.S.N",
        "BSW",
        "B.S.W",
        "BArch",
        "B.Arch",
        "B.Arch.",
        "LLB",
        "LL.B",
        "LL.B.",
        "BAS",
        "B.A.S",
        "BGS",
        "B.G.S",
        "Master of Science",
        "Master of Arts",
        "Master of Business Administration",
        "Master of Fine Arts",
        "Master of Engineering",
        "Master of Technology",
        "Master of Architecture",
        "Master of Education",
        "Master of Laws",
        "Master of Music",
        "Master of Nursing",
        "Master of Social Work",
        "Master of Public Health",
        "Master of Public Administration",
        "Master of Computer Science",
        "Master of Information Technology",
        "Master of Commerce",
        "Master of Philosophy",
        "Master of Economics",
        "Master of Science in Nursing",
        "Master of Science in Education",
        "Master of Health Administration",
        "Master of Urban Planning",
        "Master of Landscape Architecture",
        "Master of Interior Architecture",
        "Master of Library Science",
        "Master of Information Science",
        "Master of Data Science",
        "Master of Cybersecurity",
        "Master of Divinity",
        "Master of Theology",
        "Master of Religious Education",
        "Master of Accountancy",
        "Master of Finance",
        "Master of Taxation",
        "Master of Human Resources",
        "Master of International Business",
        "Master of Supply Chain Management",
        "Master of Healthcare Administration",
        "Master of Applied Mathematics",
        "Master of Applied Statistics",
        "MS",
        "M.S",
        "M.S.",
        "MA",
        "M.A",
        "M.A.",
        "MBA",
        "M.B.A",
        "M.B.A.",
        "MFA",
        "M.F.A",
        "M.F.A.",
        "MEd",
        "M.Ed",
        "M.Ed.",
        "MSN",
        "M.S.N",
        "MSW",
        "M.S.W",
        "MArch",
        "M.Arch",
        "MPH",
        "M.P.H",
        "MPA",
        "M.P.A",
        "LLM",
        "LL.M",
        "LL.M.",
        "MHA",
        "M.H.A",
        "MLS",
        "M.L.S",
        "MIS",
        "M.I.S",
        "MDiv",
        "M.Div",
        "MAcc",
        "M.Acc",
        "MFin",
        "MHR",
        "MSCS",
        "MSEE",
        "MSME",
        "MSCE",
        "Doctor of Philosophy",
        "Doctor of Medicine",
        "Doctor of Education",
        "Doctor of Business Administration",
        "Doctor of Laws",
        "Doctor of Nursing Practice",
        "Doctor of Public Health",
        "Doctor of Pharmacy",
        "Doctor of Dental Surgery",
        "Doctor of Veterinary Medicine",
        "Doctor of Jurisprudence",
        "Doctor of Dental Medicine",
        "Doctor of Optometry",
        "Doctor of Podiatric Medicine",
        "Doctor of Chiropractic",
        "Doctor of Osteopathic Medicine",
        "Doctor of Psychology",
        "Doctor of Physical Therapy",
        "Doctor of Occupational Therapy",
        "Doctor of Social Work",
        "Doctor of Science",
        "Doctor of Engineering",
        "Doctor of Liberal Arts",
        "Doctor of Ministry",
        "PhD",
        "Ph.D",
        "Ph.D.",
        "MD",
        "M.D",
        "M.D.",
        "EdD",
        "Ed.D",
        "Ed.D.",
        "DBA",
        "D.B.A",
        "JD",
        "J.D",
        "J.D.",
        "DNP",
        "DrPH",
        "PharmD",
        "Pharm.D",
        "DDS",
        "D.D.S",
        "DMD",
        "D.M.D",
        "DVM",
        "D.V.M",
        "OD",
        "O.D",
        "DPM",
        "D.P.M",
        "DC",
        "D.C",
        "DO",
        "D.O",
        "PsyD",
        "Psy.D",
        "DPT",
        "D.P.T",
        "OTD",
        "DSW",
        "DSc",
        "D.Sc",
        "DEng",
        "DMin",
        "D.Min",
        "SJD",
        "S.J.D",
        "Associate of Arts",
        "Associate of Science",
        "Associate of Applied Science",
        "Associate of Business",
        "Associate of Applied Business",
        "Associate of Occupational Studies",
        "Associate of Engineering Technology",
        "AA",
        "A.A",
        "AS",
        "A.S",
        "AAS",
        "A.A.S",
        "AAB",
        "AOS",
        "AET",
        "High School Diploma",
        "GED",
        "General Educational Development",
        "HiSET",
        "TASC",

        # ── United Kingdom & Ireland ───────────────────────────────────────────
        "Bachelor of Science with Honours",
        "Bachelor of Arts with Honours",
        "Bachelor of Engineering with Honours",
        "Bachelor of Laws with Honours",
        "BSc (Hons)",
        "BA (Hons)",
        "BSc(Hons)",
        "BA(Hons)",
        "B.Sc (Hons)",
        "B.A (Hons)",
        "BSc Hons",
        "BA Hons",
        "BSc",
        "B.Sc",
        "B.Sc.",
        "BEng (Hons)",
        "LLB (Hons)",
        "Master of Engineering",
        "Master of Research",
        "Master of Philosophy",
        "Master of Laws",
        "Master of Business Administration",
        "Master of Science",
        "Master of Arts",
        "Master of Education",
        "MEng",
        "M.Eng",
        "MRes",
        "M.Res",
        "MPhil",
        "M.Phil",
        "M.Phil.",
        "DPhil",
        "D.Phil",
        "D.Phil.",
        "LLB",
        "LLM",
        "BEng",
        "B.Eng",
        "B.Eng.",
        "MEng (Hons)",
        "Postgraduate Certificate",
        "Postgraduate Diploma",
        "PGCert",
        "PGDip",
        "PG Cert",
        "PG Dip",
        "Graduate Certificate",
        "Graduate Diploma",
        "GradCert",
        "GradDip",
        "Foundation Degree",
        "Higher National Certificate",
        "Higher National Diploma",
        "HNC",
        "HND",
        "A-Levels",
        "A Levels",
        "Advanced Levels",
        "AS-Levels",
        "GCSE",
        "General Certificate of Secondary Education",
        "International Baccalaureate",
        "IB Diploma",
        "IB",
        "Integrated Master's",
        "Integrated Masters",
        "Ordinary Degree",
        "Ordinary National Diploma",
        "OND",
        "Ordinary National Certificate",
        "ONC",
        "National Certificate",
        "National Diploma",
        "Extended Project Qualification",
        "EPQ",
        "Scottish Highers",
        "Scottish Advanced Highers",
        "Higher",
        "Advanced Higher",
        "National 5",
        "Standard Grade",
        "Scottish Qualifications Certificate",
        "SQC",
        "Leaving Certificate",
        "Junior Certificate",
        "BTEC",
        "BTEC National Diploma",
        "BTEC Higher National Diploma",
        "BTEC Higher National Certificate",
        "BTEC Level 3",
        "BTEC Level 4",
        "BTEC Level 5",
        "T-Level",
        "Welsh Baccalaureate",
        "Access to Higher Education Diploma",
        "Access to HE Diploma",
        "Chartered Institute of Management Accountants",
        "CIMA",
        "Institute of Chartered Accountants in England and Wales",
        "ACA",
        "ICAEW",
        "Association of Chartered Certified Accountants",
        "ACCA",
        "Chartered Institute of Personnel and Development",
        "CIPD",
        "Chartered Management Institute",
        "CMI",

        # ── India ──────────────────────────────────────────────────────────────
        "Bachelor of Technology",
        "Bachelor of Engineering",
        "Bachelor of Computer Applications",
        "Bachelor of Science",
        "Bachelor of Commerce",
        "Bachelor of Arts",
        "Bachelor of Business Administration",
        "Bachelor of Architecture",
        "Bachelor of Pharmacy",
        "Bachelor of Education",
        "Bachelor of Laws",
        "Bachelor of Dental Surgery",
        "Bachelor of Physiotherapy",
        "Bachelor of Hotel Management",
        "Bachelor of Design",
        "Bachelor of Fine Arts",
        "Bachelor of Mass Communication",
        "Bachelor of Social Work",
        "Bachelor of Library Science",
        "Bachelor of Occupational Therapy",
        "Bachelor of Naturopathy and Yogic Sciences",
        "Bachelor of Veterinary Science",
        "Bachelor of Ayurvedic Medicine and Surgery",
        "Bachelor of Homeopathic Medicine and Surgery",
        "Bachelor of Unani Medicine and Surgery",
        "Bachelor of Science in Agriculture",
        "Bachelor of Fishery Science",
        "Bachelor of Statistics",
        "Bachelor of Journalism and Mass Communication",
        "Bachelor of Business Management",
        "Bachelor of Commerce Honours",
        "B.Tech",
        "BTech",
        "B Tech",
        "B.E",
        "BE",
        "B.E.",
        "BCA",
        "B.C.A",
        "B.Sc",
        "BSc",
        "B.Com",
        "BCom",
        "B.A",
        "BA",
        "BBA",
        "B.B.A",
        "B.Arch",
        "BArch",
        "B.Pharm",
        "BPharm",
        "B.Ed",
        "BEd",
        "LLB",
        "LL.B",
        "BDS",
        "B.D.S",
        "MBBS",
        "M.B.B.S",
        "BPT",
        "B.P.T",
        "BHM",
        "B.H.M",
        "B.Des",
        "BDes",
        "BFA",
        "B.F.A",
        "BMC",
        "BSW",
        "B.L.I.Sc",
        "BOT",
        "B.O.T",
        "BNYS",
        "BVSc",
        "B.V.Sc",
        "BAMS",
        "BHMS",
        "BUMS",
        "B.Sc Agriculture",
        "B.F.Sc",
        "B.Stat",
        "BJMC",
        "B.J.M.C",
        "BBM",
        "B.Com (Hons)",
        "Master of Technology",
        "Master of Engineering",
        "Master of Computer Applications",
        "Master of Science",
        "Master of Commerce",
        "Master of Arts",
        "Master of Business Administration",
        "Master of Architecture",
        "Master of Pharmacy",
        "Master of Education",
        "Master of Laws",
        "Master of Design",
        "Master of Fine Arts",
        "Master of Social Work",
        "Master of Library Science",
        "Master of Public Health",
        "Master of Hospital Administration",
        "Master of Health Administration",
        "Master of Journalism",
        "Master of Mass Communication",
        "Master of Business Management",
        "Master of Science in Agriculture",
        "Master of Veterinary Science",
        "Master of Statistics",
        "Master of Occupational Therapy",
        "Master of Physiotherapy",
        "Master of Ayurvedic Medicine",
        "M.Tech",
        "MTech",
        "M Tech",
        "M.E",
        "ME",
        "M.E.",
        "MCA",
        "M.C.A",
        "M.Sc",
        "MSc",
        "M.Com",
        "MCom",
        "M.A",
        "MA",
        "MBA",
        "M.B.A",
        "M.Arch",
        "MArch",
        "M.Pharm",
        "MPharm",
        "M.Ed",
        "MEd",
        "LLM",
        "LL.M",
        "M.Des",
        "MDes",
        "MFA",
        "MSW",
        "M.L.I.Sc",
        "MPH",
        "MHA",
        "MJMC",
        "M.J.M.C",
        "M.V.Sc",
        "MVSc",
        "M.Sc Agriculture",
        "M.Stat",
        "MOT",
        "MPT",
        "M.P.T",
        "PhD",
        "Ph.D",
        "Ph.D.",
        "Doctor of Philosophy",
        "Doctor of Medicine",
        "Doctor of Science",
        "D.Sc",
        "D.Litt",
        "Doctor of Literature",
        "SSC",
        "HSC",
        "S.S.C",
        "H.S.C",
        "Secondary School Certificate",
        "Higher Secondary Certificate",
        "10th Standard",
        "12th Standard",
        "Matriculation",
        "Intermediate",
        "Diploma in Engineering",
        "Diploma in Technology",
        "Polytechnic Diploma",
        "ITI",
        "Industrial Training Institute",
        "Chartered Accountant",
        "CA",
        "Company Secretary",
        "CS",
        "Cost and Management Accountant",
        "CMA",
        "ICWA",
        "CBSE",
        "ICSE",
        "ISC",
        "Central Board of Secondary Education",
        "Indian Certificate of Secondary Education",
        "Indian School Certificate",
        "National Eligibility Test",
        "NET",
        "Joint Entrance Examination",
        "JEE",
        "Common Admission Test",
        "CAT",
        "Executive MBA",
        "EMBA",
        "Fellow Programme in Management",
        "FPM",
        "Post Graduate Programme in Management",
        "PGPM",
        "Post Graduate Diploma in Management",
        "PGDM",
        "Post Graduate Programme",
        "PGP",
        "Bachelor of Vocation",
        "B.Voc",
        "Master of Vocation",
        "M.Voc",

        # ── Canada ─────────────────────────────────────────────────────────────
        "Bachelor of Applied Science",
        "Bachelor of Applied Arts",
        "Bachelor of Health Sciences",
        "Bachelor of Kinesiology",
        "Bachelor of Commerce",
        "Bachelor of Environmental Studies",
        "Bachelor of Social Work",
        "Bachelor of Nursing",
        "Bachelor of Education",
        "Bachelor of Laws",
        "Bachelor of Arts and Science",
        "Bachelor of Management",
        "Bachelor of Information Sciences",
        "Bachelor of Urban Planning",
        "BASc",
        "B.A.Sc",
        "BAA",
        "BHSc",
        "BKin",
        "BCom",
        "B.Com",
        "BEnvS",
        "BMgmt",
        "BIS",
        "Master of Applied Science",
        "Master of Health Sciences",
        "Master of Engineering",
        "Master of Kinesiology",
        "Master of Environmental Studies",
        "Master of Urban Planning",
        "Master of Information Sciences",
        "Master of Management",
        "MASc",
        "M.A.Sc",
        "MEng",
        "MHSc",
        "MKin",
        "MEnvS",
        "MMgmt",
        "College Diploma",
        "Advanced Diploma",
        "Ontario Secondary School Diploma",
        "OSSD",
        "British Columbia Graduation Program",
        "BCGP",
        "Alberta High School Diploma",
        "Quebec High School Diploma",
        "Diplôme d'études collégiales",
        "DEC",
        "Attestation d'études collégiales",
        "AEC",
        "Diplôme d'études professionnelles",
        "DEP",
        "Attestation de spécialisation professionnelle",
        "ASP",

        # ── Australia & New Zealand ────────────────────────────────────────────
        "Bachelor of Business",
        "Bachelor of Nursing",
        "Bachelor of Applied Science",
        "Bachelor of Psychological Science",
        "Bachelor of Laws",
        "Bachelor of Information Systems",
        "Bachelor of Information Technology",
        "Bachelor of Education",
        "Bachelor of Social Work",
        "Bachelor of Health Science",
        "Bachelor of Commerce",
        "Bachelor of Engineering (Honours)",
        "Bachelor of Science (Honours)",
        "Bachelor of Design",
        "Bachelor of Communication",
        "Bachelor of Medical Science",
        "Bachelor of Pharmacy",
        "Bachelor of Physiotherapy",
        "BBus",
        "B.Bus",
        "BNurs",
        "B.Nurs",
        "BPsychSc",
        "BInfoSys",
        "BIT",
        "BEd",
        "BSocWork",
        "BHSc",
        "BCom",
        "B.Com",
        "BDes",
        "BComm",
        "BMedSc",
        "BPharm",
        "BPhysio",
        "BE (Hons)",
        "BSc (Hons)",
        "Master of Business",
        "Master of Information Systems",
        "Master of Nursing",
        "Master of Education",
        "Master of Social Work",
        "Master of Health Science",
        "Master of Engineering",
        "Master of Commerce",
        "Master of Design",
        "Master of Communication",
        "Master of Pharmacy",
        "Master of Physiotherapy",
        "Master of Teaching",
        "MBus",
        "MInfoSys",
        "MNurs",
        "MEd",
        "MSocWork",
        "MHSc",
        "MEng",
        "MCom",
        "MDes",
        "MComm",
        "MPharm",
        "MPhysio",
        "MTeach",
        "Doctor of Philosophy",
        "Higher School Certificate",
        "HSC",
        "Victorian Certificate of Education",
        "VCE",
        "NCEA",
        "National Certificate of Educational Achievement",
        "TAFE Diploma",
        "TAFE Certificate",
        "Certificate III",
        "Certificate IV",
        "Certificate I",
        "Certificate II",
        "Western Australian Certificate of Education",
        "WACE",
        "South Australian Certificate of Education",
        "SACE",
        "Queensland Certificate of Education",
        "QCE",
        "Northern Territory Certificate of Education",
        "NTCE",
        "ACT Year 12 Certificate",
        "Australian Tertiary Admission Rank",
        "ATAR",
        "Graduate Diploma",
        "Graduate Certificate",
        "Vocational Graduate Certificate",
        "Vocational Graduate Diploma",
        "Australian Qualifications Framework",
        "AQF",
        "Doctor of Medicine",
        "MBBS",
        "M.B.B.S",
        "Bachelor of Medicine Bachelor of Surgery",
        "Bachelor of Dental Surgery",
        "BDSc",

        # ── Germany ────────────────────────────────────────────────────────────
        "Diplom",
        "Diplom-Ingenieur",
        "Dipl.-Ing",
        "Dipl.-Ing.",
        "Diplom-Kaufmann",
        "Dipl.-Kfm",
        "Diplom-Informatiker",
        "Dipl.-Inf",
        "Diplom-Wirtschaftsingenieur",
        "Dipl.-Wirtsch.-Ing.",
        "Diplom-Betriebswirt",
        "Dipl.-Betriebswirt",
        "Diplom-Volkswirt",
        "Dipl.-Vw.",
        "Diplom-Psychologe",
        "Dipl.-Psych.",
        "Diplom-Pädagoge",
        "Dipl.-Päd.",
        "Diplom-Soziologe",
        "Diplom-Physiker",
        "Dipl.-Phys.",
        "Diplom-Mathematiker",
        "Dipl.-Math.",
        "Diplom-Chemiker",
        "Dipl.-Chem.",
        "Diplom-Biologe",
        "Diplom-Geograph",
        "Magister",
        "Magister Artium",
        "Staatsexamen",
        "Erstes Staatsexamen",
        "Zweites Staatsexamen",
        "Abitur",
        "Fachabitur",
        "Fachhochschulreife",
        "Allgemeine Hochschulreife",
        "Bachelor of Science",
        "Bachelor of Arts",
        "Bachelor of Engineering",
        "Bachelor of Laws",
        "Bachelor of Education",
        "Master of Science",
        "Master of Arts",
        "Master of Engineering",
        "Master of Laws",
        "Master of Education",
        "Doktor",
        "Dr.",
        "Dr. rer. nat.",
        "Dr. Ing.",
        "Dr.-Ing.",
        "Dr. phil.",
        "Dr. oec.",
        "Dr. rer. pol.",
        "Dr. rer. soc.",
        "Dr. med.",
        "Dr. med. dent.",
        "Dr. jur.",
        "Dr. iur.",
        "Dr. theol.",
        "Habilitation",
        "Ausbildung",
        "Berufsausbildung",
        "Fachinformatiker",
        "Kaufmann",
        "Kauffrau",
        "Industriemechaniker",
        "Elektroniker",
        "Mechatroniker",
        "Bankkaufmann",
        "Versicherungskaufmann",

        # ── France ─────────────────────────────────────────────────────────────
        "Licence",
        "Licence Professionnelle",
        "Licence Pro",
        "Master",
        "Master Professionnel",
        "Master Recherche",
        "Grande École Diploma",
        "Diplôme d'Ingénieur",
        "Diplome d'Ingenieur",
        "Ingénieur Diplômé",
        "Ingenieur Diplome",
        "Doctorat",
        "Baccalauréat",
        "Baccalaureat",
        "Bac",
        "Bac Pro",
        "Baccalauréat Professionnel",
        "Baccalauréat Technologique",
        "BTS",
        "Brevet de Technicien Supérieur",
        "DUT",
        "Diplôme Universitaire de Technologie",
        "Diplome Universitaire de Technologie",
        "BUT",
        "Bachelor Universitaire de Technologie",
        "DEUG",
        "DESS",
        "DEA",
        "Classes Préparatoires",
        "CPGE",
        "Classe Préparatoire aux Grandes Écoles",
        "DEUST",
        "DU",
        "Diplôme Universitaire",
        "Certificat de Qualification Professionnelle",
        "CQP",
        "Titre Professionnel",
        "DNB",
        "Diplôme National du Brevet",
        "Brevet des Collèges",
        "CAP",
        "Certificat d'Aptitude Professionnelle",
        "BEP",
        "Brevet d'Études Professionnelles",
        "Mastère Spécialisé",
        "MS",
        "MBA",

        # ── Italy ──────────────────────────────────────────────────────────────
        "Laurea",
        "Laurea Triennale",
        "Laurea Magistrale",
        "Laurea Specialistica",
        "Diploma di Laurea",
        "Dottorato di Ricerca",
        "Dottorato",
        "Diploma",
        "Maturità",
        "Esame di Stato",
        "Laurea a Ciclo Unico",
        "Diploma di Specializzazione",
        "Master di Primo Livello",
        "Master di Secondo Livello",
        "Licenza Media",
        "Diploma di Scuola Superiore",
        "Diploma Professionale",
        "ITS",
        "Istruzione Tecnica Superiore",
        "Abilitazione",

        # ── Spain & Latin America ──────────────────────────────────────────────
        "Licenciatura",
        "Licenciado",
        "Licenciada",
        "Ingeniería",
        "Ingeniero",
        "Ingenieria",
        "Grado",
        "Grado en",
        "Máster",
        "Master Universitario",
        "Maestría",
        "Maestria",
        "Doctorado",
        "Doctor",
        "Bachillerato",
        "Bachiller",
        "Técnico Superior",
        "Tecnico Superior",
        "Diplomatura",
        "Diplomado",
        "Especialización",
        "Especializacion",
        "Título de",
        "Titulo de",
        "Técnico",
        "Tecnico",
        "Posgrado",
        "Postgrado",
        "Certificado Profesional",
        "Título Profesional",
        "Titulo Profesional",
        "Formación Profesional",
        "Formacion Profesional",
        "FP",
        "ESO",
        "Educación Secundaria Obligatoria",
        "Educacion Secundaria Obligatoria",
        "Prueba de Acceso a la Universidad",
        "PAU",
        "Selectividad",
        "EBAU",
        "Evaluación del Bachillerato para el Acceso a la Universidad",
        "Preparatoria",
        "Bachillerato Internacional",
        "Técnico Universitario",
        "Diplomado Universitario",
        "Candidato a Doctor",
        "Residencia",
        "Especialista",
        "Graduado en",

        # ── Netherlands ────────────────────────────────────────────────────────
        "Bachelor of Science",
        "Bachelor of Arts",
        "Master of Science",
        "Master of Arts",
        "Ingenieur",
        "Ing.",
        "Ir.",
        "Drs.",
        "Doctorandus",
        "Doctor",
        "Doctoraat",
        "HBO Bachelor",
        "HBO Master",
        "WO Bachelor",
        "WO Master",
        "MBO",
        "VWO",
        "HAVO",
        "VMBO",
        "MAVO",
        "Associate Degree",
        "Bachelor of Engineering",
        "Master of Engineering",
        "Post HBO",
        "Professional Doctorate in Engineering",
        "PDEng",

        # ── Scandinavia ────────────────────────────────────────────────────────
        "Kandidat",
        "Kandidatexamen",
        "Civilingenjör",
        "Civilingenjor",
        "Civilekonomexamen",
        "Magisterexamen",
        "Masterexamen",
        "Doktorsexamen",
        "Licentiatexamen",
        "Högskoleexamen",
        "Hogskoleexamen",
        "Yrkesexamen",
        "Gymnasieexamen",
        "Studentexamen",
        "Fil.kand.",
        "Fil.mag.",
        "Fil.dr.",
        "Tekn.kand.",
        "Tekn.dr.",
        "Profesjonsstudium",
        "Bachelorgrad",
        "Mastergrad",
        "Doktorgrad",
        "Sivilingeniør",
        "Siviloykonom",
        "Candidatus",
        "Cand.scient.",
        "Cand.mag.",
        "Cand.polit.",
        "Cand.phil.",
        "Cand.jur.",
        "Cand.med.",
        "Cand.psych.",
        "Cand.merc.",
        "Cand.oecon.",
        "Studentereksamen",
        "Folkeskoleeksamen",
        "HF",
        "HTX",
        "STX",
        "EUX",
        "EUD",
        "Erhvervsuddannelse",

        # ── Russia & Eastern Europe ────────────────────────────────────────────
        "Kandidat Nauk",
        "Doktor Nauk",
        "Specialist Degree",
        "Specialist",
        "Bakalavr",
        "Magistr",
        "Aspirantura",
        "Diploma of Higher Education",
        "Maturita",
        "Matura",
        "Abiturient",
        "Inzhener",
        "Diplomirovanny Spetsialist",
        "Kandidat Tekhnicheskikh Nauk",
        "Kandidat Fiziko-Matematicheskikh Nauk",
        "候補科学博士",
        "Diploma of Engineer",
        "Licentiate",
        "Habilitovaný doktor",
        "doc.",
        "DrSc.",
        "CSc.",
        "Inžinier",
        "Ing.",
        "Ing. arch.",
        "Bc.",
        "Mgr.",
        "Mgr. art.",
        "JUDr.",
        "PhDr.",
        "RNDr.",
        "PharmDr.",
        "MUDr.",
        "MVDr.",
        "ThDr.",
        "Licencjat",
        "Inżynier",
        "Magister",
        "Doktor",
        "Doktor habilitowany",
        "Profesor",

        # ── Middle East ────────────────────────────────────────────────────────
        "Bachelor of Science",
        "Bachelor of Arts",
        "Bachelor of Engineering",
        "Bachelor of Medicine",
        "Bachelor of Laws",
        "Bachelor of Business Administration",
        "Bachelor of Education",
        "Bachelor of Pharmacy",
        "Master of Science",
        "Master of Arts",
        "Master of Business Administration",
        "Master of Engineering",
        "Master of Laws",
        "Master of Education",
        "Doctor of Philosophy",
        "Doctor of Medicine",
        "Thanawiya Amma",
        "Tawjihi",
        "Bagrut",
        "Tawjihi",
        "General Secondary Certificate",
        "High School Certificate",
        "Diploma of Technology",
        "Higher Diploma",
        "Advanced Diploma",
        "Bachelor of Computer Science",
        "Bachelor of Information Technology",
        "Master of Computer Science",
        "Master of Information Technology",
        "Bachelor of Islamic Studies",
        "Master of Islamic Studies",
        "Doctor of Islamic Studies",
        "Ijaza",
        "Shahada",

        # ── China & East Asia ──────────────────────────────────────────────────
        "Bachelor of Engineering",
        "Bachelor of Science",
        "Bachelor of Arts",
        "Bachelor of Management",
        "Bachelor of Economics",
        "Bachelor of Law",
        "Bachelor of Education",
        "Bachelor of Medicine",
        "Master of Engineering",
        "Master of Science",
        "Master of Arts",
        "Master of Management",
        "Master of Economics",
        "Master of Law",
        "Master of Education",
        "Master of Medicine",
        "Master of Business Administration",
        "Doctor of Engineering",
        "Doctor of Philosophy",
        "Doctor of Science",
        "Doctor of Medicine",
        "Doctor of Education",
        "Doctor of Management",
        "Doctor of Economics",
        "Gaokao",
        "Senior High School Diploma",
        "Junior College Diploma",
        "Associate Degree",
        "Xueshi",
        "Shuoshi",
        "Boshi",
        "Zhuanke",
        "Benke",
        "Yanjiusheng",
        "Boshi Yanjiusheng",
        "Gaokao",
        "Zhongkao",
        "High School Certificate",
        "Vocational High School Certificate",

        # ── Japan & Korea ──────────────────────────────────────────────────────
        "Gakushi",
        "Shushi",
        "Hakushi",
        "Bachelor's Degree",
        "Master's Degree",
        "Doctoral Degree",
        "Senmon Gakko",
        "Junior College",
        "Vocational College Diploma",
        "Suneung",
        "Korea Scholastic Ability Test",
        "Daegak",
        "Daehak",
        "Daehakwon",
        "Sokseok",
        "Baksa",
        "Tankidaehak",
        "College of Technology",
        "Kosen",
        "Senmon Shushi",
        "Senmon Hakushi",
        "Kyoiku Gakushi",
        "Igaku Hakushi",
        "Hogaku Hakushi",
        "Keizai Gakushi",
        "Bunkagaku Hakushi",
        "Rikagaku Hakushi",
        "Kogaku Hakushi",
        "Shakaigaku Hakushi",
        "Nogaku Gakushi",
        "Yakugaku Hakushi",
        "CSAT",
        "College Scholastic Ability Test",
        "Saenghwalgigineung",

        # ── Southeast Asia ─────────────────────────────────────────────────────
        "Bachelor of Science",
        "Bachelor of Arts",
        "Bachelor of Engineering",
        "Bachelor of Business Administration",
        "Bachelor of Education",
        "Bachelor of Laws",
        "Bachelor of Medicine",
        "Bachelor of Nursing",
        "Bachelor of Commerce",
        "Bachelor of Architecture",
        "Bachelor of Information Technology",
        "Master of Science",
        "Master of Business Administration",
        "Master of Engineering",
        "Master of Arts",
        "Master of Education",
        "Master of Laws",
        "Doctor of Philosophy",
        "Doctor of Medicine",
        "Sijil Pelajaran Malaysia",
        "SPM",
        "Sijil Tinggi Persekolahan Malaysia",
        "STPM",
        "Diploma Lepasan Ijazah",
        "Sarjana Muda",
        "Sarjana",
        "Doktor Falsafah",
        "Diploma",
        "Diploma Lepasan SPM",
        "Diploma Siswazah",
        "Ijazah Sarjana Muda",
        "Ijazah Sarjana",
        "Senior School Certificate",
        "Ujian Nasional",
        "Sekolah Menengah Atas",
        "SMA",
        "Diploma III",
        "S1",
        "S2",
        "S3",
        "Sarjana",
        "Magister",
        "Doktor",
        "Philippine Education Certificate",
        "High School Diploma",
        "Bachelor of Elementary Education",
        "Bachelor of Secondary Education",
        "Bachelor of Science in Nursing",
        "Bachelor of Fine Arts",
        "Master of Arts in Education",
        "Master of Public Administration",
        "Licentiate in Philosophy",
        "Matrikkulasyon",
        "Senior Secondary Education",
        "O-Level",
        "A-Level",
        "Ordinary Level",
        "Advanced Level",
        "Ordinary National Certificate",
        "Higher School Certificate Vietnam",
        "Bachelor of Technology Vietnam",
        "Ky Su",
        "Cu Nhan",
        "Thac Si",
        "Tien Si",

        # ── Africa ─────────────────────────────────────────────────────────────
        "Bachelor of Science",
        "Bachelor of Arts",
        "Bachelor of Commerce",
        "Bachelor of Laws",
        "Bachelor of Education",
        "Bachelor of Engineering",
        "Bachelor of Nursing",
        "Bachelor of Agriculture",
        "Bachelor of Social Work",
        "Bachelor of Public Administration",
        "Bachelor of Computer Science",
        "Bachelor of Information Technology",
        "Bachelor of Business Administration",
        "Bachelor of Health Sciences",
        "Bachelor of Architecture",
        "Bachelor of Pharmacy",
        "Bachelor of Medicine",
        "Master of Science",
        "Master of Arts",
        "Master of Business Administration",
        "Master of Education",
        "Master of Engineering",
        "Master of Laws",
        "Master of Public Health",
        "Master of Public Administration",
        "Doctor of Philosophy",
        "Doctor of Medicine",
        "National Senior Certificate",
        "NSC",
        "Matric",
        "Matriculation Certificate",
        "West African Senior School Certificate",
        "WASSCE",
        "West African Examinations Council",
        "WAEC",
        "Kenya Certificate of Secondary Education",
        "KCSE",
        "Kenya Certificate of Primary Education",
        "KCPE",
        "Higher National Diploma",
        "HND",
        "Ordinary National Diploma",
        "OND",
        "National Diploma",
        "ND",
        "National Certificate",
        "NC",
        "Technical and Vocational Certificate",
        "Baccalauréat Africain",
        "Zimbabwe General Certificate of Education",
        "ZGCE",
        "Zimbabwe School Examinations Council",
        "ZIMSEC",
        "East African Certificate of Education",
        "Uganda Certificate of Education",
        "UCE",
        "Uganda Advanced Certificate of Education",
        "UACE",
        "Tanzanian Certificate of Secondary Education",
        "CSEE",
        "Advanced Certificate of Secondary Education",
        "ACSE",
        "Malawi Certificate of Education",
        "Zambia School Certificate",
        "Lesotho General Certificate of Secondary Education",
        "Botswana General Certificate of Secondary Education",
        "BGCSE",
        "Diploma in Technology",
        "Diploma in Business Studies",

        # ── Professional & Vocational ──────────────────────────────────────────
        "Chartered Financial Analyst",
        "CFA",
        "Certified Public Accountant",
        "CPA",
        "Certified Management Accountant",
        "CMA",
        "Project Management Professional",
        "PMP",
        "Certified Information Systems Security Professional",
        "CISSP",
        "Certified Information Systems Auditor",
        "CISA",
        "Certified Scrum Master",
        "CSM",
        "Six Sigma Black Belt",
        "SSBB",
        "Six Sigma Green Belt",
        "SSGB",
        "Six Sigma Yellow Belt",
        "AWS Certified",
        "AWS Certified Solutions Architect",
        "AWS Certified Developer",
        "AWS Certified SysOps Administrator",
        "Google Cloud Certified",
        "Google Cloud Professional",
        "Microsoft Certified",
        "Microsoft Certified Professional",
        "MCP",
        "Microsoft Certified Systems Engineer",
        "MCSE",
        "Microsoft Certified Technology Specialist",
        "MCTS",
        "Cisco Certified Network Associate",
        "CCNA",
        "Cisco Certified Network Professional",
        "CCNP",
        "Cisco Certified Internetwork Expert",
        "CCIE",
        "Certified Ethical Hacker",
        "CEH",
        "CompTIA A+",
        "CompTIA Network+",
        "CompTIA Security+",
        "CompTIA Cloud+",
        "Certified Cloud Security Professional",
        "CCSP",
        "PMI Agile Certified Practitioner",
        "PMI-ACP",
        "PRINCE2",
        "ITIL",
        "Certified Financial Planner",
        "CFP",
        "Chartered Financial Consultant",
        "ChFC",
        "Certified Investment Management Analyst",
        "CIMA",
        "Chartered Life Underwriter",
        "CLU",
        "FINRA Series 7",
        "FINRA Series 63",
        "FINRA Series 65",
        "Certified Human Resources Professional",
        "CHRP",
        "Professional in Human Resources",
        "PHR",
        "Senior Professional in Human Resources",
        "SPHR",
        "Society for Human Resource Management Certified Professional",
        "SHRM-CP",
        "Society for Human Resource Management Senior Certified Professional",
        "SHRM-SCP",
        "Certified Nurse Practitioner",
        "CNP",
        "Certified Registered Nurse Anesthetist",
        "CRNA",
        "Certified Nurse Midwife",
        "CNM",
        "Licensed Practical Nurse",
        "LPN",
        "Licensed Vocational Nurse",
        "LVN",
        "Registered Nurse",
        "RN",
        "Certified Medical Assistant",
        "CMA",
        "Certified Coding Specialist",
        "CCS",
        "Certified Health Education Specialist",
        "CHES",
        "Registered Dietitian",
        "RD",
        "Certified Diabetes Educator",
        "CDE",
        "Certified Professional Coder",
        "CPC",
        "Certified Billing and Coding Specialist",
        "CBCS",
        "National Vocational Qualification",
        "NVQ",
        "Scottish Vocational Qualification",
        "SVQ",
        "City and Guilds",
        "BTEC",
        "BTEC National Diploma",
        "BTEC Higher National Diploma",
        "BTEC Higher National Certificate",
        "Lean Six Sigma",
        "Certified Supply Chain Professional",
        "CSCP",
        "Certified in Production and Inventory Management",
        "CPIM",
        "Certified Logistics Professional",
        "CLP",
        "Certified Professional in Supply Management",
        "CPSM",
        "Salesforce Certified",
        "Salesforce Administrator",
        "Salesforce Developer",
        "Oracle Certified",
        "Red Hat Certified",
        "RHCE",
        "RHCSA",
        "VMware Certified Professional",
        "VCP",
        "Certified Data Professional",
        "CDP",
        "Google Analytics Certification",
        "HubSpot Certification",
        "Adobe Certified Expert",
        "ACE",
        "Certified Interior Designer",
        "CID",
        "LEED Accredited Professional",
        "LEED AP",
        "Licensed Architect",
        "PE",
        "Professional Engineer",
        "Registered Engineer",
        "Chartered Engineer",
        "CEng",
        "Chartered Architect",
        "RIBA",
        "Chartered Surveyor",
        "RICS",
        "Fellow of the Royal Institution of Chartered Surveyors",
        "FRICS",
        "Solicitor",
        "Barrister",
        "Notary Public",

        # ── Generic / Cross-Regional ───────────────────────────────────────────
        "Bachelor's Degree",
        "Bachelors Degree",
        "Bachelor Degree",
        "Master's Degree",
        "Masters Degree",
        "Master Degree",
        "Doctoral Degree",
        "Doctorate",
        "Undergraduate Degree",
        "Postgraduate Degree",
        "Honours Degree",
        "Honors Degree",
        "Double Degree",
        "Joint Degree",
        "Dual Degree",
        "Foundation Degree",
        "Extended Degree",
        "Integrated Master's",
        "Integrated Masters",
        "Professional Doctorate",
        "Executive MBA",
        "EMBA",
        "Global MBA",
        "Online MBA",
        "Part-time MBA",
        "Diploma",
        "Advanced Diploma",
        "Higher Diploma",
        "Postgraduate Diploma",
        "Postgraduate Certificate",
        "Professional Certificate",
        "Certificate of Completion",
        "Certificate Program",
        "Vocational Certificate",
        "Technical Diploma",
        "Associate Degree",
        "Foundation Certificate",
        "Short Course Certificate",
        "Licentiate Degree",
        "Specialist Degree",
        "First Class Honours",
        "Second Class Honours",
        "Third Class Honours",
        "Pass Degree",
        "Distinction",
        "Merit",
        "Cum Laude",
        "Magna Cum Laude",
        "Summa Cum Laude",
        "With Distinction",
        "With Honours",
        "International Baccalaureate",
        "IB",
        "IB Diploma",
        "Cambridge International AS",
        "Cambridge International A Level",
        "Cambridge IGCSE",
        "IGCSE",
        "Cambridge O Level",
        "Pearson BTEC",
        "Pearson Edexcel",
        "AQA",
        "OCR",
        "Qualification in Credit Framework",
        "QCF",
        "Regulated Qualifications Framework",
        "RQF",
        "National Qualifications Framework",
        "NQF",
        "European Qualifications Framework",
        "EQF",
        "Bologna Framework",
        "European Credit Transfer System",
        "ECTS",
        ]
        
        # Degree level hierarchy for determining highest degree
    DEGREE_HIERARCHY = {
        'PhD': 8, 'Doctorate': 8, 'Doctor': 8,
        'Master': 7, 'M.Sc': 7, 'M.S': 7, 'M.Tech': 7, 'M.A': 7, 'M.Com': 7, 'MBA': 7, 'MCA': 7,
        'Bachelor': 6, 'B.Sc': 6, 'B.S': 6, 'B.Tech': 6, 'B.A': 6, 'B.Com': 6, 'BBA': 6, 'BCA': 6, 'B.E': 6,
        'Associate': 5,
        'Diploma': 4, 'Certificate': 3,
        'High School': 2, 'GED': 1,
        'Postdoctoral':                         10,
        'Postdoc':                              10,
        'Post-doctoral':                        10,
        'Post-Doctoral Fellow':                 10,
        'Postdoctoral Research':                10,
        'Habilitation':                         10,   # Germany / Austria / Switzerland
        'Habilitovaný doktor':                  10,   # Czech / Slovak
        'Docent':                               10,   # Scandinavia / Eastern Europe
        'Doktor habilitowany':                  10,   # Poland
        'DrSc':                                 10,   # Czech / Slovak higher doctorate
        'DrSc.':                                10,
        'Doctor of Science':                    10,   # UK higher doctorate
        'Doctor of Letters':                    10,
        'Doctor of Laws (Higher)':              10,
        'Higher Doctorate':                     10,
        'DSc':                                  10,
        'D.Sc':                                 10,
        'D.Sc.':                                10,
        'DLitt':                                10,
        'D.Litt':                               10,
        'D.Litt.':                              10,
        'LLD':                                  10,   # Doctor of Laws (higher)
        'LL.D':                                 10,
        'LL.D.':                                10,
        'DD':                                   10,   # Doctor of Divinity (higher)
        'D.D.':                                 10,
        'Professor':                            10,   # Academic rank
        'Full Professor':                       10,
        'Adjunct Professor':                    10,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 9 — DOCTORAL
        # ─────────────────────────────────────────────────────────────────────────

        # ── Generic ───────────────────────────────────────────────────────────
        'PhD':                                  9,
        'Ph.D':                                 9,
        'Ph.D.':                                9,
        'Doctor of Philosophy':                 9,
        'Doctoral Degree':                      9,
        'Doctorate':                            9,
        'Professional Doctorate':               9,

        # ── Medicine & Health ────────────────────────────────────────────────
        'Doctor of Medicine':                   9,
        'MD':                                   9,
        'M.D':                                  9,
        'M.D.':                                 9,
        'MBBS':                                 9,
        'M.B.B.S':                              9,
        'MBChB':                                9,
        'M.B.Ch.B':                             9,
        'MBBCh':                                9,
        'BMed':                                 9,
        'Doctor of Veterinary Medicine':        9,
        'DVM':                                  9,
        'D.V.M':                                9,
        'BVSc':                                 9,   # UK / Australia vet degree (entry-level doctorate)
        'B.V.Sc':                               9,
        'Doctor of Dental Surgery':             9,
        'DDS':                                  9,
        'D.D.S':                                9,
        'Doctor of Dental Medicine':            9,
        'DMD':                                  9,
        'D.M.D':                                9,
        'BDS':                                  9,   # UK / India dental (entry-level doctorate)
        'B.D.S':                                9,
        'Doctor of Optometry':                  9,
        'OD':                                   9,
        'O.D':                                  9,
        'Doctor of Podiatric Medicine':         9,
        'DPM':                                  9,
        'D.P.M':                                9,
        'Doctor of Chiropractic':               9,
        'DC':                                   9,
        'D.C':                                  9,
        'Doctor of Osteopathic Medicine':       9,
        'DO':                                   9,
        'D.O':                                  9,
        'Doctor of Pharmacy':                   9,
        'PharmD':                               9,
        'Pharm.D':                              9,
        'Pharm.D.':                             9,
        'Doctor of Nursing Practice':           9,
        'DNP':                                  9,
        'Doctor of Public Health':              9,
        'DrPH':                                 9,
        'Dr.P.H':                               9,
        'Doctor of Physical Therapy':           9,
        'DPT':                                  9,
        'D.P.T':                                9,
        'Doctor of Occupational Therapy':       9,
        'OTD':                                  9,
        'Doctor of Audiology':                  9,
        'AuD':                                  9,
        'Au.D':                                 9,
        'Doctor of Nursing Science':            9,
        'DNSc':                                 9,
        'Doctor of Clinical Psychology':        9,
        'DClinPsy':                             9,

        # ── Law ──────────────────────────────────────────────────────────────
        'Doctor of Jurisprudence':              9,
        'JD':                                   9,
        'J.D':                                  9,
        'J.D.':                                 9,
        'Doctor of Laws':                       9,
        'SJD':                                  9,
        'S.J.D':                                9,
        'Legum Doctor':                         9,
        'LLD':                                  9,   # lower-doctorate variant
        'Doctor of Juridical Science':          9,
        'Doctor iuris':                         9,
        'Dr. iur.':                             9,
        'Dr. jur.':                             9,

        # ── Education & Social ───────────────────────────────────────────────
        'Doctor of Education':                  9,
        'EdD':                                  9,
        'Ed.D':                                 9,
        'Ed.D.':                                9,
        'Doctor of Business Administration':    9,
        'DBA':                                  9,
        'D.B.A':                                9,
        'Doctor of Social Work':                9,
        'DSW':                                  9,
        'Doctor of Ministry':                   9,
        'DMin':                                 9,
        'D.Min':                                9,
        'Doctor of Psychology':                 9,
        'PsyD':                                 9,
        'Psy.D':                                9,
        'Psy.D.':                               9,
        'Doctor of Management':                 9,
        'DM':                                   9,
        'Doctor of Liberal Arts':               9,
        'DLA':                                  9,
        'Doctor of Musical Arts':               9,
        'DMA':                                  9,
        'D.M.A':                                9,
        'Doctor of Engineering':                9,
        'DEng':                                 9,
        'D.Eng':                                9,
        'EngD':                                 9,   # UK Engineering Doctorate
        'Doctor of Fine Arts':                  9,
        'DFA':                                  9,
        'Doctor of Architecture':               9,
        'DArch':                                9,

        # ── Germany / Austria / Switzerland ──────────────────────────────────
        'Dr. rer. nat.':                        9,
        'Dr.-Ing.':                             9,
        'Dr. Ing.':                             9,
        'Dr. phil.':                            9,
        'Dr. oec.':                             9,
        'Dr. rer. pol.':                        9,
        'Dr. rer. soc.':                        9,
        'Dr. med.':                             9,
        'Dr. med. dent.':                       9,
        'Dr. theol.':                           9,
        'Dr. paed.':                            9,
        'Dr. rer. agr.':                        9,
        'Dr. sc.':                              9,

        # ── France ───────────────────────────────────────────────────────────
        'Doctorat':                             9,
        'Doctorat de Recherche':                9,
        'Doctorat d\'Etat':                     9,

        # ── Italy ─────────────────────────────────────────────────────────────
        'Dottorato di Ricerca':                 9,
        'Dottorato':                            9,

        # ── Spain / Latin America ─────────────────────────────────────────────
        'Doctorado':                            9,
        'Doctor':                               9,

        # ── Netherlands ──────────────────────────────────────────────────────
        'Doctoraat':                            9,
        'Doctor':                               9,

        # ── Scandinavia ───────────────────────────────────────────────────────
        'Doktorsexamen':                        9,
        'Fil.dr.':                              9,
        'Tekn.dr.':                             9,
        'Doktorgrad':                           9,   # Norway
        'Doktorgradseksamen':                   9,
        'Doktoraat':                            9,   # Netherlands/Belgium

        # ── Russia / Eastern Europe ───────────────────────────────────────────
        'Doktor Nauk':                          9,
        'Doctor Nauk':                          9,
        'Doktor Khimicheskikh Nauk':            9,
        'Doktor Tekhnicheskikh Nauk':           9,
        'Doktor Fiziko-Matematicheskikh Nauk':  9,
        'Doktor Ekonomicheskikh Nauk':          9,
        'Doktor Meditsinskikh Nauk':            9,
        'JUDr.':                                9,   # Czech / Slovak (law doctorate)
        'PhDr.':                                9,   # Czech / Slovak (humanities)
        'RNDr.':                                9,   # Czech / Slovak (natural sci)
        'PharmDr.':                             9,   # Czech / Slovak (pharmacy)
        'MUDr.':                                9,   # Czech / Slovak (medicine)
        'MVDr.':                                9,   # Czech / Slovak (vet)
        'ThDr.':                                9,   # Czech / Slovak (theology)

        # ── China ─────────────────────────────────────────────────────────────
        'Boshi':                                9,
        'Boshi Yanjiusheng':                    9,
        'Doctor of Engineering China':          9,

        # ── Japan ─────────────────────────────────────────────────────────────
        'Hakushi':                              9,
        'Igaku Hakushi':                        9,
        'Hogaku Hakushi':                       9,
        'Rikagaku Hakushi':                     9,
        'Kogaku Hakushi':                       9,
        'Yakugaku Hakushi':                     9,
        'Bunkagaku Hakushi':                    9,
        'Shakaigaku Hakushi':                   9,

        # ── Korea ─────────────────────────────────────────────────────────────
        'Baksa':                                9,

        # ── India ─────────────────────────────────────────────────────────────
        'D.Litt':                               9,
        'D.Lit':                                9,
        'Doctor of Literature':                 9,
        'FPM':                                  9,   # Fellow Programme in Management (IIM)

        # ── Australia ─────────────────────────────────────────────────────────
        'Doctor of Philosophy (Australia)':     9,
        'Professional Doctorate (Australia)':   9,
        'Doctor of Business Leadership':        9,
        'DBL':                                  9,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 8 — LICENTIATE / SPECIALIST / INTEGRATED MASTER-DOCTORATE
        # ─────────────────────────────────────────────────────────────────────────

        # Licentiate (Scandinavia, Brazil, Belgium — between Master and PhD)
        'Licentiate':                           8,
        'Licentiatexamen':                      8,   # Sweden
        'Licentiat':                            8,
        'Licentiaatin tutkinto':                8,   # Finland
        'Licentiaat':                           8,   # Belgium
        'Licentiate in Philosophy':             8,
        'Licentiate in Theology':               8,
        'STL':                                  8,   # Licentiate in Sacred Theology

        # Specialist Degree (Russia / Eastern Europe — between Master and PhD)
        'Specialist Degree':                    8,
        'Specialist':                           8,
        'Diplomirovanny Spetsialist':           8,
        'Inzhener':                             8,   # Russian engineer diploma
        'Inżynier':                             8,   # Polish engineer diploma

        # Kandidat Nauk (Russia — first-level doctorate, ~PhD)
        'Kandidat Nauk':                        8,
        'Kandidat Tekhnicheskikh Nauk':         8,
        'Kandidat Fiziko-Matematicheskikh Nauk':8,
        'Kandidat Ekonomicheskikh Nauk':        8,
        'Kandidat Meditsinskikh Nauk':          8,
        'CSc.':                                 8,   # Czech Candidate of Science

        # Integrated / Long-Cycle programmes (confer both Bachelor+Master)
        'Integrated Master\'s':                 8,
        'Integrated Masters':                   8,
        'MEng (Integrated)':                    8,
        'MPhys':                                8,
        'MMath':                                8,
        'MChem':                                8,
        'MBiol':                                8,
        'MGeol':                                8,
        'MComp':                                8,
        'MOptom':                               8,   # Master of Optometry (UK)
        'Laurea Magistrale a Ciclo Unico':      8,   # Italy 5/6-year
        'Laurea a Ciclo Unico':                 8,
        'Staatsexamen':                         8,   # Germany (law, medicine, teaching)
        'Erstes Staatsexamen':                  8,
        'Zweites Staatsexamen':                 8,
        'Diplom (FH)':                          8,   # Germany Fachhochschule diploma
        'Diplom':                               8,
        'Diplom-Ingenieur':                     8,
        'Dipl.-Ing':                            8,
        'Dipl.-Ing.':                           8,
        'Diplom-Kaufmann':                      8,
        'Dipl.-Kfm':                            8,
        'Diplom-Informatiker':                  8,
        'Dipl.-Inf':                            8,
        'Diplom-Wirtschaftsingenieur':          8,
        'Dipl.-Wirtsch.-Ing.':                  8,
        'Diplom-Betriebswirt':                  8,
        'Dipl.-Betriebswirt':                   8,
        'Diplom-Volkswirt':                     8,
        'Dipl.-Vw.':                            8,
        'Diplom-Psychologe':                    8,
        'Dipl.-Psych.':                         8,
        'Diplom-Pädagoge':                      8,
        'Dipl.-Päd.':                           8,
        'Diplom-Soziologe':                     8,
        'Diplom-Physiker':                      8,
        'Dipl.-Phys.':                          8,
        'Diplom-Mathematiker':                  8,
        'Dipl.-Math.':                          8,
        'Diplom-Chemiker':                      8,
        'Dipl.-Chem.':                          8,
        'Diplom-Biologe':                       8,
        'Diplom-Geograph':                      8,
        'Magister Artium':                      8,   # Germany old master's equivalent
        'Magister':                             8,
        'Civilingenjör':                        8,   # Sweden civil engineer (~Master)
        'Civilingenjor':                        8,
        'Sivilingenjør':                        8,   # Norway
        'Civilekonomexamen':                    8,   # Sweden civil economist
        'Candidatus':                           8,   # old Nordic (various cand. titles)
        'Cand.scient.':                         8,
        'Cand.mag.':                            8,
        'Cand.polit.':                          8,
        'Cand.phil.':                           8,
        'Cand.jur.':                            8,
        'Cand.med.':                            8,
        'Cand.psych.':                          8,
        'Cand.merc.':                           8,
        'Cand.oecon.':                          8,
        'Ingénieur Diplômé':                    8,   # France Grande École
        'Diplôme d\'Ingénieur':                 8,
        'Diplome d\'Ingenieur':                 8,
        'Grande École Diploma':                 8,
        'Diploma di Laurea':                    8,   # Old Italian 4/5-yr
        'Laurea Specialistica':                 8,
        'Licenciatura':                         8,   # Spain / Latin Am 5-yr
        'Licenciado':                           8,
        'Licenciada':                           8,
        'Grado en':                             8,   # Spain 4-yr (some 5-yr)
        'Ingeniería':                           8,
        'Ingeniero':                            8,
        'Ingenieria':                           8,
        'PDEng':                                8,   # Professional Doctorate in Engineering (NL)
        'EngD':                                 8,   # UK Engineering Doctorate
        'Professional Doctorate Engineering':   8,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 7 — MASTER'S DEGREE
        # ─────────────────────────────────────────────────────────────────────────

        # ── Generic ───────────────────────────────────────────────────────────
        'Master\'s Degree':                     7,
        'Masters Degree':                       7,
        'Master Degree':                        7,
        'Postgraduate Degree':                  7,

        # ── US / Canada / International MS / MA ──────────────────────────────
        'Master of Science':                    7,
        'MS':                                   7,
        'M.S':                                  7,
        'M.S.':                                 7,
        'Master of Arts':                       7,
        'MA':                                   7,
        'M.A':                                  7,
        'M.A.':                                 7,
        'Master of Business Administration':    7,
        'MBA':                                  7,
        'M.B.A':                                7,
        'M.B.A.':                               7,
        'Executive MBA':                        7,
        'EMBA':                                 7,
        'Global MBA':                           7,
        'Online MBA':                           7,
        'Part-time MBA':                        7,
        'Master of Fine Arts':                  7,
        'MFA':                                  7,
        'M.F.A':                                7,
        'M.F.A.':                               7,
        'Master of Engineering':                7,
        'MEng':                                 7,
        'M.Eng':                                7,
        'Master of Technology':                 7,
        'M.Tech':                               7,
        'MTech':                                7,
        'M Tech':                               7,
        'Master of Architecture':               7,
        'MArch':                                7,
        'M.Arch':                               7,
        'Master of Education':                  7,
        'MEd':                                  7,
        'M.Ed':                                 7,
        'M.Ed.':                                7,
        'Master of Laws':                       7,
        'LLM':                                  7,
        'LL.M':                                 7,
        'LL.M.':                                7,
        'Master of Music':                      7,
        'MMus':                                 7,
        'M.Mus':                                7,
        'Master of Nursing':                    7,
        'MSN':                                  7,
        'M.S.N':                                7,
        'Master of Social Work':                7,
        'MSW':                                  7,
        'M.S.W':                                7,
        'Master of Public Health':              7,
        'MPH':                                  7,
        'M.P.H':                                7,
        'Master of Public Administration':      7,
        'MPA':                                  7,
        'M.P.A':                                7,
        'Master of Computer Science':           7,
        'Master of Computer Applications':      7,
        'MCA':                                  7,
        'M.C.A':                                7,
        'Master of Commerce':                   7,
        'M.Com':                                7,
        'MCom':                                 7,
        'Master of Philosophy':                 7,
        'MPhil':                                7,
        'M.Phil':                               7,
        'M.Phil.':                              7,
        'Master of Research':                   7,
        'MRes':                                 7,
        'M.Res':                                7,
        'Master of Information Technology':     7,
        'MIT':                                  7,   # context-dependent
        'Master of Information Systems':        7,
        'MIS':                                  7,
        'Master of Data Science':               7,
        'MDS':                                  7,
        'Master of Cybersecurity':              7,
        'Master of Library Science':            7,
        'MLS':                                  7,
        'M.L.S':                                7,
        'M.L.I.Sc':                             7,
        'Master of Information Science':        7,
        'MLIS':                                 7,
        'Master of Health Administration':      7,
        'MHA':                                  7,
        'M.H.A':                                7,
        'Master of Hospital Administration':    7,
        'Master of Science in Nursing':         7,
        'Master of Pharmacy':                   7,
        'M.Pharm':                              7,
        'MPharm':                               7,
        'Master of Science in Agriculture':     7,
        'Master of Veterinary Science':         7,
        'M.V.Sc':                               7,
        'MVSc':                                 7,
        'Master of Physiotherapy':              7,
        'MPT':                                  7,
        'M.P.T':                                7,
        'Master of Occupational Therapy':       7,
        'MOT':                                  7,
        'Master of Divinity':                   7,
        'MDiv':                                 7,
        'M.Div':                                7,
        'Master of Theology':                   7,
        'ThM':                                  7,
        'Th.M':                                 7,
        'Master of Accountancy':                7,
        'MAcc':                                 7,
        'M.Acc':                                7,
        'Master of Finance':                    7,
        'MFin':                                 7,
        'Master of Economics':                  7,
        'MEcon':                                7,
        'Master of Taxation':                   7,
        'MTax':                                 7,
        'Master of International Business':     7,
        'MIB':                                  7,
        'Master of Supply Chain Management':    7,
        'MSCM':                                 7,
        'Master of Human Resources':            7,
        'MHR':                                  7,
        'Master of Urban Planning':             7,
        'MUP':                                  7,
        'Master of Landscape Architecture':     7,
        'MLA':                                  7,
        'Master of Interior Architecture':      7,
        'Master of Applied Science':            7,
        'MASc':                                 7,
        'M.A.Sc':                               7,
        'Master of Health Sciences':            7,
        'MHSc':                                 7,
        'Master of Kinesiology':                7,
        'MKin':                                 7,
        'Master of Environmental Studies':      7,
        'MEnvS':                                7,
        'Master of Management':                 7,
        'MMgmt':                                7,
        'Master of Business':                   7,
        'MBus':                                 7,
        'Master of Teaching':                   7,
        'MTeach':                               7,
        'Master of Design':                     7,
        'MDes':                                 7,
        'M.Des':                                7,
        'Master of Communication':              7,
        'MComm':                                7,
        'Master of Journalism':                 7,
        'MJourn':                               7,
        'Master of Mass Communication':         7,
        'MMC':                                  7,
        'Master of Applied Mathematics':        7,
        'Master of Applied Statistics':         7,
        'Master of Statistics':                 7,
        'M.Stat':                               7,
        'Master of Engineering Science':        7,

        # ── India-specific ────────────────────────────────────────────────────
        'Master of Engineering':                7,
        'M.E':                                  7,
        'ME':                                   7,
        'M.E.':                                 7,
        'M.Sc':                                 7,
        'MSc':                                  7,
        'Post Graduate Programme in Management':7,
        'PGPM':                                 7,
        'Post Graduate Programme':              7,
        'PGP':                                  7,

        # ── UK ────────────────────────────────────────────────────────────────
        'DPhil':                                9,   # Oxford PhD equivalent → already at 9
        'MSc':                                  7,
        'M.Sc.':                                7,

        # ── France ───────────────────────────────────────────────────────────
        'Master':                               7,
        'Master Professionnel':                 7,
        'Master Recherche':                     7,
        'Mastère Spécialisé':                   7,
        'DESS':                                 7,   # old French DEA/DESS
        'DEA':                                  7,

        # ── Italy ─────────────────────────────────────────────────────────────
        'Laurea Magistrale':                    7,
        'Master di Primo Livello':              7,
        'Master di Secondo Livello':            7,

        # ── Spain / Latin America ─────────────────────────────────────────────
        'Máster':                               7,
        'Master Universitario':                 7,
        'Maestría':                             7,
        'Maestria':                             7,
        'Especialización':                      7,
        'Especializacion':                      7,
        'Posgrado':                             7,
        'Postgrado':                            7,

        # ── Netherlands ──────────────────────────────────────────────────────
        'WO Master':                            7,
        'HBO Master':                           7,
        'Doctorandus':                          7,   # old Dutch pre-Bologna
        'Drs.':                                 7,

        # ── Scandinavia ───────────────────────────────────────────────────────
        'Masterexamen':                         7,
        'Magisterexamen':                       7,
        'Mastergrad':                           7,   # Norway
        'Fil.mag.':                             7,

        # ── Russia / Eastern Europe ───────────────────────────────────────────
        'Magistr':                              7,
        'Mgr.':                                 7,   # Czech / Slovak Master's
        'Mgr. art.':                            7,
        'Aspirantura':                          7,   # Russia PhD track (coursework)

        # ── China ─────────────────────────────────────────────────────────────
        'Shuoshi':                              7,
        'Yanjiusheng':                          7,

        # ── Japan ─────────────────────────────────────────────────────────────
        'Shushi':                               7,
        'Senmon Shushi':                        7,
        'Kyoiku Gakushi (Master)':             7,

        # ── Korea ─────────────────────────────────────────────────────────────
        'Sokseok':                              7,
        'Daehakwon':                            7,

        # ── Southeast Asia / Indonesia ────────────────────────────────────────
        'Sarjana (S2)':                         7,
        'Magister':                             7,
        'S2':                                   7,
        'Ijazah Sarjana':                       7,
        'Diploma Siswazah':                     7,
        'Sarjana':                              7,

        # ── Middle East ───────────────────────────────────────────────────────
        'Master of Islamic Studies':            7,
        'Master of Business Administration ME': 7,

        # ── Africa ────────────────────────────────────────────────────────────
        'Postgraduate Diploma':                 7,   # African usage → level 7
        'Postgraduate Certificate in Education':7,

        # ── Canada ────────────────────────────────────────────────────────────
        'Diplôme d\'études collégiales':        5,   # → reassigned below to level 5
        'Diplôme d\'études supérieures spécialisées': 7,
        'DESS Quebec':                          7,

        # ── Australia ─────────────────────────────────────────────────────────
        'Master of Business':                   7,
        'MBus':                                 7,
        'Master of Commerce':                   7,
        'MCom':                                 7,
        'Master of Information Systems':        7,
        'MInfoSys':                             7,
        'Master of Nursing':                    7,
        'MNurs':                                7,
        'Master of Education (Australia)':      7,
        'Master of Social Work':                7,
        'MSocWork':                             7,
        'Master of Health Science':             7,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 6 — BACHELOR'S DEGREE
        # ─────────────────────────────────────────────────────────────────────────

        # ── Generic ───────────────────────────────────────────────────────────
        'Bachelor\'s Degree':                   6,
        'Bachelors Degree':                     6,
        'Bachelor Degree':                      6,
        'Undergraduate Degree':                 6,
        'Honours Degree':                       6,
        'Honors Degree':                        6,
        'First Class Honours':                  6,
        'Second Class Honours':                 6,
        'Third Class Honours':                  6,
        'Double Degree':                        6,
        'Joint Degree':                         6,
        'Dual Degree':                          6,

        # ── US ────────────────────────────────────────────────────────────────
        'Bachelor of Science':                  6,
        'BS':                                   6,
        'B.S':                                  6,
        'B.S.':                                 6,
        'Bachelor of Arts':                     6,
        'BA':                                   6,
        'B.A':                                  6,
        'B.A.':                                 6,
        'Bachelor of Business Administration':  6,
        'BBA':                                  6,
        'B.B.A':                                6,
        'B.B.A.':                               6,
        'Bachelor of Fine Arts':                6,
        'BFA':                                  6,
        'B.F.A':                                6,
        'B.F.A.':                               6,
        'Bachelor of Engineering':              6,
        'BE':                                   6,
        'B.E':                                  6,
        'B.E.':                                 6,
        'Bachelor of Technology':               6,
        'B.Tech':                               6,
        'BTech':                                6,
        'B Tech':                               6,
        'Bachelor of Architecture':             6,
        'BArch':                                6,
        'B.Arch':                               6,
        'B.Arch.':                              6,
        'Bachelor of Education':                6,
        'BEd':                                  6,
        'B.Ed':                                 6,
        'B.Ed.':                                6,
        'Bachelor of Laws':                     6,
        'LLB':                                  6,
        'LL.B':                                 6,
        'LL.B.':                                6,
        'Bachelor of Music':                    6,
        'BMus':                                 6,
        'B.Mus':                                6,
        'Bachelor of Nursing':                  6,
        'BN':                                   6,
        'BSN':                                  6,
        'B.S.N':                                6,
        'Bachelor of Social Work':              6,
        'BSW':                                  6,
        'B.S.W':                                6,
        'Bachelor of Public Health':            6,
        'BSPH':                                 6,
        'Bachelor of Computer Science':         6,
        'BCS':                                  6,
        'Bachelor of Information Technology':   6,
        'BIT':                                  6,
        'Bachelor of Commerce':                 6,
        'BCom':                                 6,
        'B.Com':                                6,
        'Bachelor of Philosophy':               6,
        'BPhil':                                6,
        'Bachelor of Economics':                6,
        'BEcon':                                6,
        'Bachelor of Psychology':               6,
        'BPsych':                               6,
        'Bachelor of Applied Science':          6,
        'BASc':                                 6,
        'B.A.Sc':                               6,
        'Bachelor of General Studies':          6,
        'BGS':                                  6,
        'Bachelor of Science in Nursing':       6,
        'Bachelor of Science in Education':     6,
        'Bachelor of Health Sciences':          6,
        'BHSc':                                 6,
        'Bachelor of Kinesiology':              6,
        'BKin':                                 6,
        'Bachelor of Health Administration':    6,
        'Bachelor of Journalism':               6,
        'BJourn':                               6,
        'Bachelor of Communication':            6,
        'BComm':                                6,
        'Bachelor of Liberal Arts':             6,
        'BLA':                                  6,
        'Bachelor of Criminal Justice':         6,
        'BCJ':                                  6,
        'Bachelor of Design':                   6,
        'BDes':                                 6,
        'B.Des':                                6,
        'Bachelor of Vocation':                 6,
        'B.Voc':                                6,

        # ── India ─────────────────────────────────────────────────────────────
        'Bachelor of Computer Applications':    6,
        'BCA':                                  6,
        'B.C.A':                                6,
        'Bachelor of Pharmacy':                 6,
        'BPharm':                               6,
        'B.Pharm':                              6,
        'Bachelor of Dental Surgery':           6,
        'BDS':                                  6,
        'B.D.S':                                6,
        'Bachelor of Physiotherapy':            6,
        'BPT':                                  6,
        'B.P.T':                                6,
        'Bachelor of Hotel Management':         6,
        'BHM':                                  6,
        'B.H.M':                                6,
        'Bachelor of Mass Communication':       6,
        'BMC':                                  6,
        'BJMC':                                 6,
        'B.J.M.C':                              6,
        'Bachelor of Library Science':          6,
        'B.L.I.Sc':                             6,
        'Bachelor of Occupational Therapy':     6,
        'BOT':                                  6,
        'B.O.T':                                6,
        'Bachelor of Naturopathy and Yogic Sciences': 6,
        'BNYS':                                 6,
        'Bachelor of Ayurvedic Medicine and Surgery': 6,
        'BAMS':                                 6,
        'Bachelor of Homeopathic Medicine and Surgery': 6,
        'BHMS':                                 6,
        'Bachelor of Unani Medicine and Surgery':6,
        'BUMS':                                 6,
        'B.Sc Agriculture':                     6,
        'B.F.Sc':                               6,
        'Bachelor of Statistics':               6,
        'B.Stat':                               6,
        'Bachelor of Business Management':      6,
        'BBM':                                  6,
        'B.Com (Hons)':                         6,

        # ── UK ────────────────────────────────────────────────────────────────
        'BSc (Hons)':                           6,
        'BA (Hons)':                            6,
        'BSc(Hons)':                            6,
        'BA(Hons)':                             6,
        'B.Sc (Hons)':                          6,
        'BSc Hons':                             6,
        'BA Hons':                              6,
        'BSc':                                  6,
        'B.Sc':                                 6,
        'B.Sc.':                                6,
        'BEng':                                 6,
        'B.Eng':                                6,
        'B.Eng.':                               6,
        'BEng (Hons)':                          6,
        'LLB (Hons)':                           6,
        'MEng (Hons)':                          6,   # UK 4-yr integrated — some treat as 7
        'Ordinary Degree':                      6,
        'Bachelor of Science with Honours':     6,
        'Bachelor of Arts with Honours':        6,

        # ── Australia / NZ ────────────────────────────────────────────────────
        'BBus':                                 6,
        'B.Bus':                                6,
        'BNurs':                                6,
        'B.Nurs':                               6,
        'BPsychSc':                             6,
        'BInfoSys':                             6,
        'BSocWork':                             6,
        'BHSc':                                 6,
        'BDes':                                 6,
        'BMedSc':                               6,
        'BPhysio':                              6,
        'BE (Hons)':                            6,
        'BSc (Hons) Australia':                 6,
        'BDSc':                                 6,
        'Bachelor of Medicine Bachelor of Surgery': 6,

        # ── France ───────────────────────────────────────────────────────────
        'Licence':                              6,
        'Licence Professionnelle':              6,
        'Licence Pro':                          6,

        # ── Italy ─────────────────────────────────────────────────────────────
        'Laurea':                               6,
        'Laurea Triennale':                     6,

        # ── Spain / Latin America ─────────────────────────────────────────────
        'Grado':                                6,
        'Título de':                            6,
        'Titulo de':                            6,
        'Graduado en':                          6,
        'Técnico Universitario':                6,
        'Diplomado Universitario':              6,

        # ── Netherlands ──────────────────────────────────────────────────────
        'WO Bachelor':                          6,
        'HBO Bachelor':                         6,
        'Ingenieur':                            6,   # Dutch / Belgian Ir.
        'Ing.':                                 6,
        'Ir.':                                  6,

        # ── Scandinavia ───────────────────────────────────────────────────────
        'Kandidatexamen':                       6,
        'Kandidat':                             6,
        'Fil.kand.':                            6,
        'Tekn.kand.':                           6,
        'Yrkesexamen':                          6,
        'Bachelorgrad':                         6,   # Norway

        # ── Russia / Eastern Europe ───────────────────────────────────────────
        'Bakalavr':                             6,
        'Bc.':                                  6,   # Czech / Slovak Bachelor
        'Licencjat':                            6,   # Poland
        'Inżynier':                             6,   # Poland (engineer — 3.5 yr)

        # ── China ─────────────────────────────────────────────────────────────
        'Xueshi':                               6,
        'Benke':                                6,

        # ── Japan ─────────────────────────────────────────────────────────────
        'Gakushi':                              6,
        'Kyoiku Gakushi':                       6,
        'Nogaku Gakushi':                       6,

        # ── Korea ─────────────────────────────────────────────────────────────
        'Daegak':                               6,
        'Daehak':                               6,

        # ── Southeast Asia / Indonesia ────────────────────────────────────────
        'Sarjana Muda':                         6,
        'S1':                                   6,
        'Ijazah Sarjana Muda':                  6,
        'Cu Nhan':                              6,   # Vietnam
        'Ky Su':                                6,   # Vietnam engineering

        # ── Malaysia ──────────────────────────────────────────────────────────
        'Sarjana (Undergrad)':                  6,

        # ── Middle East ───────────────────────────────────────────────────────
        'Bachelor of Islamic Studies':          6,

        # ── Africa ────────────────────────────────────────────────────────────
        'Bachelor of Agriculture':              6,
        'Bachelor of Social Work Africa':       6,
        'Bachelor of Public Administration':    6,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 5 — ASSOCIATE DEGREE / FOUNDATION DEGREE / SHORT-CYCLE HE
        # ─────────────────────────────────────────────────────────────────────────

        # ── US ────────────────────────────────────────────────────────────────
        'Associate Degree':                     5,
        'Associate of Arts':                    5,
        'AA':                                   5,
        'A.A':                                  5,
        'Associate of Science':                 5,
        'AS':                                   5,
        'A.S':                                  5,
        'Associate of Applied Science':         5,
        'AAS':                                  5,
        'A.A.S':                                5,
        'Associate of Business':                5,
        'Associate of Applied Business':        5,
        'AAB':                                  5,
        'Associate of Occupational Studies':    5,
        'AOS':                                  5,
        'Associate of Engineering Technology':  5,
        'AET':                                  5,

        # ── UK ────────────────────────────────────────────────────────────────
        'Foundation Degree':                    5,
        'Foundation Degree Arts':               5,
        'Foundation Degree Science':            5,
        'FDA':                                  5,
        'FDS':                                  5,
        'Graduate Certificate':                 5,   # Note: can be level 6 in some contexts
        'Graduate Diploma':                     5,
        'GradCert':                             5,
        'GradDip':                              5,
        'DipHE':                                5,   # Diploma of Higher Education (UK)
        'Diploma of Higher Education':          5,
        'CertHE':                               5,   # Certificate of Higher Education (UK)
        'Certificate of Higher Education':      5,

        # ── Canada ────────────────────────────────────────────────────────────
        'College Diploma':                      5,
        'Advanced Diploma':                     5,
        'Diplôme d\'études collégiales':        5,
        'DEC':                                  5,
        'Attestation d\'études collégiales':    5,
        'AEC':                                  5,

        # ── Australia ─────────────────────────────────────────────────────────
        'Advanced Diploma Australia':           5,
        'Vocational Graduate Certificate':      5,
        'Vocational Graduate Diploma':          5,

        # ── Netherlands ──────────────────────────────────────────────────────
        'Associate Degree NL':                  5,
        'Post HBO':                             5,

        # ── China ─────────────────────────────────────────────────────────────
        'Zhuanke':                              5,
        'Junior College Diploma':               5,
        'Senior High School Diploma (College)': 5,

        # ── Japan ─────────────────────────────────────────────────────────────
        'Junior College':                       5,
        'Tankidaihak':                          5,
        'College of Technology':                5,
        'Kosen':                                5,

        # ── Korea ─────────────────────────────────────────────────────────────
        'Tankidaehak':                          5,

        # ── Southeast Asia / Indonesia ────────────────────────────────────────
        'Diploma III':                          5,
        'D3':                                   5,

        # ── France ───────────────────────────────────────────────────────────
        'BTS':                                  5,
        'Brevet de Technicien Supérieur':       5,
        'DUT':                                  5,
        'Diplôme Universitaire de Technologie': 5,
        'BUT':                                  5,   # Bachelor Universitaire de Technologie (2021+)
        'DEUG':                                 5,

        # ── India ─────────────────────────────────────────────────────────────
        'Post Graduate Diploma in Management':  5,
        'PGDM':                                 5,
        'Post Graduate Diploma':               5,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 4 — DIPLOMA / TECHNICIAN / HNC-HND
        # ─────────────────────────────────────────────────────────────────────────

        'Diploma':                              4,
        'Technical Diploma':                    4,
        'Postgraduate Diploma':                 4,   # Stand-alone PGDip without degree
        'Postgraduate Certificate':             4,   # Stand-alone PGCert without degree
        'PGDip':                                4,
        'PGCert':                               4,
        'PG Dip':                               4,
        'PG Cert':                              4,

        # ── UK ────────────────────────────────────────────────────────────────
        'Higher National Diploma':              4,
        'HND':                                  4,
        'Higher National Certificate':          4,
        'HNC':                                  4,
        'BTEC Higher National Diploma':         4,
        'BTEC Higher National Certificate':     4,
        'BTEC Level 5':                         4,
        'BTEC Level 4':                         4,
        'Ordinary National Diploma':            4,
        'OND':                                  4,
        'Ordinary National Certificate':        4,
        'ONC':                                  4,
        'National Diploma':                     4,
        'ND':                                   4,
        'National Certificate':                 4,
        'NC':                                   4,

        # ── Africa ────────────────────────────────────────────────────────────
        'Higher National Diploma Africa':       4,
        'HND Africa':                           4,
        'National Diploma Africa':              4,
        'OND Africa':                           4,
        'Diploma in Technology':                4,
        'Diploma in Business Studies':          4,
        'Technical and Vocational Certificate': 4,

        # ── India ─────────────────────────────────────────────────────────────
        'Diploma in Engineering':               4,
        'Diploma in Technology':                4,
        'Polytechnic Diploma':                  4,

        # ── Australia ─────────────────────────────────────────────────────────
        'TAFE Diploma':                         4,
        'Diploma (AQF)':                        4,

        # ── Indonesia / Southeast Asia ────────────────────────────────────────
        'Diploma IV':                           4,
        'D4':                                   4,
        'Diploma II':                           4,
        'D2':                                   4,
        'Diploma I':                            4,
        'D1':                                   4,

        # ── Netherlands ──────────────────────────────────────────────────────
        'MBO':                                  4,   # Senior secondary voc. (level 3-4)

        # ── France ───────────────────────────────────────────────────────────
        'Bac Pro':                              4,
        'Baccalauréat Professionnel':           4,
        'Baccalauréat Technologique':           4,
        'CAP':                                  4,
        'Certificat d\'Aptitude Professionnelle':4,
        'BEP':                                  4,
        'Brevet d\'Études Professionnelles':    4,
        'Titre Professionnel':                  4,
        'CQP':                                  4,

        # ── Germany ─────────────────────────────────────────────────────────
        'Ausbildung':                           4,
        'Berufsausbildung':                     4,
        'Fachinformatiker':                     4,
        'Kaufmann':                             4,
        'Kauffrau':                             4,
        'Industriemechaniker':                  4,
        'Elektroniker':                         4,
        'Mechatroniker':                        4,
        'Bankkaufmann':                         4,
        'Versicherungskaufmann':                4,

        # ── Italy ─────────────────────────────────────────────────────────────
        'Diploma di Specializzazione':          4,
        'ITS':                                  4,
        'Istruzione Tecnica Superiore':         4,

        # ── Spain / Latin America ─────────────────────────────────────────────
        'Técnico Superior':                     4,
        'Tecnico Superior':                     4,
        'Diplomatura':                          4,
        'Diplomado':                            4,
        'Formación Profesional':                4,
        'FP':                                   4,
        'Técnico':                              4,

        # ── Canada ────────────────────────────────────────────────────────────
        'Diplôme d\'études professionnelles':   4,
        'DEP':                                  4,
        'Attestation de spécialisation professionnelle': 4,
        'ASP':                                  4,

        # ── India ─────────────────────────────────────────────────────────────
        'ITI':                                  4,
        'Industrial Training Institute':        4,

        # ── Middle East ──────────────────────────────────────────────────────
        'Diploma of Technology ME':             4,
        'Higher Diploma ME':                    4,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 3 — CERTIFICATE / PROFESSIONAL CERT / VOCATIONAL LEVEL 3
        # ─────────────────────────────────────────────────────────────────────────

        'Certificate':                          3,
        'Professional Certificate':             3,
        'Certificate of Completion':            3,
        'Certificate Program':                  3,
        'Vocational Certificate':               3,
        'Short Course Certificate':             3,
        'Foundation Certificate':               3,

        # ── UK ────────────────────────────────────────────────────────────────
        'BTEC':                                 3,
        'BTEC National Diploma':                3,
        'BTEC Level 3':                         3,
        'NVQ':                                  3,
        'National Vocational Qualification':    3,
        'SVQ':                                  3,
        'Scottish Vocational Qualification':    3,
        'City and Guilds':                      3,
        'Extended Project Qualification':       3,
        'EPQ':                                  3,

        # ── Australia ─────────────────────────────────────────────────────────
        'Certificate IV':                       3,
        'Certificate III':                      3,
        'TAFE Certificate':                     3,

        # ── Australia lower ───────────────────────────────────────────────────
        'Certificate II':                       2,
        'Certificate I':                        2,

        # ── Professional / Industry ───────────────────────────────────────────
        'Chartered Financial Analyst':          3,
        'CFA':                                  3,
        'Certified Public Accountant':          3,
        'CPA':                                  3,
        'Certified Management Accountant':      3,
        'Project Management Professional':      3,
        'PMP':                                  3,
        'CISSP':                                3,
        'CISA':                                 3,
        'Certified Scrum Master':               3,
        'CSM':                                  3,
        'CCNA':                                 3,
        'CCNP':                                 3,
        'CCIE':                                 3,
        'CEH':                                  3,
        'CompTIA A+':                           3,
        'CompTIA Network+':                     3,
        'CompTIA Security+':                    3,
        'LEED AP':                              3,
        'AWS Certified':                        3,
        'AWS Certified Solutions Architect':    3,
        'Google Cloud Certified':               3,
        'Microsoft Certified':                  3,
        'MCSE':                                 3,
        'Oracle Certified':                     3,
        'Red Hat Certified':                    3,
        'RHCE':                                 3,
        'VMware Certified Professional':        3,
        'VCP':                                  3,
        'Salesforce Certified':                 3,
        'Six Sigma Black Belt':                 3,
        'Six Sigma Green Belt':                 3,
        'Six Sigma Yellow Belt':                3,
        'Lean Six Sigma':                       3,
        'PRINCE2':                              3,
        'ITIL':                                 3,
        'Certified Financial Planner':          3,
        'CFP':                                  3,
        'Chartered Financial Consultant':       3,
        'ChFC':                                 3,
        'PHR':                                  3,
        'SPHR':                                 3,
        'SHRM-CP':                              3,
        'SHRM-SCP':                             3,
        'CIPD':                                 3,
        'ACCA':                                 3,
        'ACA':                                  3,
        'ICAEW':                                3,
        'CIMA':                                 3,
        'CMI':                                  3,
        'Chartered Accountant':                 3,
        'CA':                                   3,
        'Company Secretary':                    3,
        'CMA (India)':                          3,
        'ICWA':                                 3,

        # ── India ─────────────────────────────────────────────────────────────
        'NET':                                  3,   # National Eligibility Test
        'CSIR-NET':                             3,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 2 — SECONDARY / HIGH SCHOOL / PRE-UNIVERSITY
        # ─────────────────────────────────────────────────────────────────────────

        # ── Generic ───────────────────────────────────────────────────────────
        'High School Diploma':                  2,
        'Secondary Education':                  2,
        'Upper Secondary':                      2,
        'Pre-University':                       2,
        'College Preparatory':                  2,

        # ── US ────────────────────────────────────────────────────────────────
        'GED':                                  2,
        'General Educational Development':      2,
        'HiSET':                                2,
        'TASC':                                 2,

        # ── UK ────────────────────────────────────────────────────────────────
        'A-Levels':                             2,
        'A Levels':                             2,
        'Advanced Levels':                      2,
        'AS-Levels':                            2,
        'GCSE':                                 2,
        'General Certificate of Secondary Education': 2,
        'Scottish Highers':                     2,
        'Scottish Advanced Highers':            2,
        'Higher':                               2,
        'Advanced Higher':                      2,
        'National 5':                           2,
        'Standard Grade':                       2,
        'Welsh Baccalaureate':                  2,
        'T-Level':                              2,
        'Access to Higher Education Diploma':   2,
        'Access to HE Diploma':                 2,

        # ── Ireland ───────────────────────────────────────────────────────────
        'Leaving Certificate':                  2,
        'Junior Certificate':                   2,

        # ── International ─────────────────────────────────────────────────────
        'International Baccalaureate':          2,
        'IB Diploma':                           2,
        'IB':                                   2,
        'Cambridge International A Level':      2,
        'Cambridge International AS':           2,
        'Cambridge IGCSE':                      2,
        'IGCSE':                                2,
        'Cambridge O Level':                    2,
        'O-Level':                              2,
        'Ordinary Level':                       2,
        'A-Level':                              2,
        'Advanced Level':                       2,

        # ── India ─────────────────────────────────────────────────────────────
        'SSC':                                  2,
        'HSC':                                  2,
        'S.S.C':                                2,
        'H.S.C':                                2,
        'Secondary School Certificate':         2,
        'Higher Secondary Certificate':         2,
        '10th Standard':                        2,
        '12th Standard':                        2,
        'Matriculation':                        2,
        'Intermediate':                         2,
        'CBSE':                                 2,
        'ICSE':                                 2,
        'ISC':                                  2,

        # ── Germany ─────────────────────────────────────────────────────────
        'Abitur':                               2,
        'Fachabitur':                           2,
        'Fachhochschulreife':                   2,
        'Allgemeine Hochschulreife':            2,
        'Hauptschulabschluss':                  2,
        'Realschulabschluss':                   2,
        'Mittlere Reife':                       2,

        # ── France ───────────────────────────────────────────────────────────
        'Baccalauréat':                         2,
        'Baccalaureat':                         2,
        'Bac':                                  2,
        'Brevet des Collèges':                  2,
        'DNB':                                  2,
        'Diplôme National du Brevet':           2,

        # ── Italy ─────────────────────────────────────────────────────────────
        'Maturità':                             2,
        'Esame di Stato':                       2,
        'Diploma di Scuola Superiore':          2,
        'Licenza Media':                        2,

        # ── Spain / Latin America ─────────────────────────────────────────────
        'Bachillerato':                         2,
        'Bachiller':                            2,
        'ESO':                                  2,
        'Educación Secundaria Obligatoria':     2,
        'Selectividad':                         2,
        'EBAU':                                 2,
        'PAU':                                  2,
        'Preparatoria':                         2,
        'Bachillerato Internacional':           2,

        # ── Netherlands ──────────────────────────────────────────────────────
        'VWO':                                  2,
        'HAVO':                                 2,
        'VMBO':                                 2,
        'MAVO':                                 2,

        # ── Scandinavia ───────────────────────────────────────────────────────
        'Gymnasieexamen':                       2,
        'Studentexamen':                        2,
        'Folkeskoleeksamen':                    2,
        'HF':                                   2,
        'HTX':                                  2,
        'STX':                                  2,
        'EUX':                                  2,

        # ── Russia / Eastern Europe ───────────────────────────────────────────
        'Maturita':                             2,
        'Matura':                               2,
        'Abiturient':                           2,

        # ── Canada ────────────────────────────────────────────────────────────
        'Ontario Secondary School Diploma':     2,
        'OSSD':                                 2,
        'British Columbia Graduation Program':  2,
        'Alberta High School Diploma':          2,
        'Quebec High School Diploma':           2,

        # ── Australia / NZ ────────────────────────────────────────────────────
        'Victorian Certificate of Education':   2,
        'VCE':                                  2,
        'Higher School Certificate':            2,
        'Western Australian Certificate of Education': 2,
        'WACE':                                 2,
        'South Australian Certificate of Education': 2,
        'SACE':                                 2,
        'Queensland Certificate of Education':  2,
        'QCE':                                  2,
        'Northern Territory Certificate of Education': 2,
        'NTCE':                                 2,
        'ACT Year 12 Certificate':              2,
        'NCEA':                                 2,
        'National Certificate of Educational Achievement': 2,

        # ── Middle East ───────────────────────────────────────────────────────
        'Thanawiya Amma':                       2,
        'Tawjihi':                              2,
        'Bagrut':                               2,
        'General Secondary Certificate':        2,
        'High School Certificate ME':           2,
        'Shahada':                              2,

        # ── China / East Asia ─────────────────────────────────────────────────
        'Gaokao':                               2,
        'Senior High School Diploma':           2,
        'Zhongkao':                             2,
        'High School Certificate China':        2,

        # ── Japan ─────────────────────────────────────────────────────────────
        'Kotogakko Sotsugyo':                   2,   # Japanese high school graduation

        # ── Korea ─────────────────────────────────────────────────────────────
        'Suneung':                              2,
        'CSAT':                                 2,
        'College Scholastic Ability Test':      2,
        'Korea Scholastic Ability Test':        2,

        # ── Southeast Asia ────────────────────────────────────────────────────
        'Sijil Pelajaran Malaysia':             2,
        'SPM':                                  2,
        'Sijil Tinggi Persekolahan Malaysia':   2,
        'STPM':                                 2,
        'Ujian Nasional':                       2,
        'SMA':                                  2,
        'Philippine Education Certificate':     2,
        'Senior Secondary Education':           2,
        'High School Certificate Vietnam':      2,

        # ── Africa ────────────────────────────────────────────────────────────
        'National Senior Certificate':          2,
        'NSC':                                  2,
        'Matric':                               2,
        'Matriculation Certificate':            2,
        'West African Senior School Certificate': 2,
        'WASSCE':                               2,
        'Kenya Certificate of Secondary Education': 2,
        'KCSE':                                 2,
        'Zimbabwe General Certificate of Education': 2,
        'ZGCE':                                 2,
        'Uganda Certificate of Education':      2,
        'UCE':                                  2,
        'Uganda Advanced Certificate of Education': 2,
        'UACE':                                 2,
        'Tanzanian Certificate of Secondary Education': 2,
        'CSEE':                                 2,
        'Malawi Certificate of Education':      2,
        'Zambia School Certificate':            2,
        'Botswana General Certificate of Secondary Education': 2,
        'BGCSE':                                2,

        # ─────────────────────────────────────────────────────────────────────────
        # LEVEL 1 — PRIMARY / BASIC / ENTRY-LEVEL
        # ─────────────────────────────────────────────────────────────────────────
        'Primary School':                       1,
        'Elementary School':                    1,
        'Middle School':                        1,
        'Junior High School':                   1,
        'Some High School':                     1,
        'Some College':                         1,   # US: no degree conferred
        'No Formal Qualification':              1,
        'Self-Taught':                          1,
        'Kenya Certificate of Primary Education': 1,
        'KCPE':                                 1,
        'Junior Certificate Ireland':           1,
        'Certificate I':                        1,
        'Certificate II':                       1,
        'National Certificate Level 1':         1,
        'National Certificate Level 2':         1,
    }
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Pre-compile patterns for better performance
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for education extraction."""
        
        # Degree patterns
        self.degree_pattern = re.compile(
            r'\b(' + '|'.join(self.DEGREE_PATTERNS) + r')(?:\s+(?:of|in)\s+([A-Za-z\s&]+))?',
            re.IGNORECASE
        )
        
        # Institution patterns - handles both "X University" and "University of X" forms
        self.institution_patterns = [
            # Standard ending: "Delhi University", "MIT College"
            r'\b([A-Za-z][A-Za-z\s&,\']+?(?:University|College|Institute of Technology|Institute|School|Academy|Polytechnic|Campus|Center|Centre))(?:\s*,?\s*(?:19|20)\d{2}|\s*[-–]|\s*$|\s*,\s*[A-Z])',
            # "University of X", "Institute of X", "College of X"
            r'\b((?:University|Institute|College|School|Academy)\s+of\s+[A-Za-z\s&,\']+?)(?:\s*,?\s*(?:19|20)\d{2}|\s*[-–]|\s*$)',
            # IIT/NIT/BITS and similar short prefixes: "IIT Bombay", "NIT Trichy", "BITS Pilani"
            r'\b((?:IIT|NIT|BITS|IIIT|IISER|AIIMS|ISB|IIM|XLRI|TISS|IGNOU|IISc|NIFT|SRM|VIT|DTU|NSIT|BIT|MIT|RVCE|PES|DSCE|MSRIT)[\s,]+[A-Za-z\s]+?)(?:\s*,?\s*(?:19|20)\d{2}|\s*[-–]|\s*$)',
            # Broad fallback: Capitalized multi-word name that isn't a degree
            r'^([A-Z][a-zA-Z\s&,\']{5,60}?)(?:\s*,?\s*(?:19|20)\d{2}|\s*[-–])'
        ]
        
        # Year patterns - only match full 4-digit years
        self.year_pattern = re.compile(r'\b(19\d{2}|20\d{2})\b')
        self.year_range_pattern = re.compile(r'\b(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2})\b')
        
        # GPA patterns
        self.gpa_patterns = [
            r'GPA[:\s]*([0-4]\.?\d*)',
            r'CGPA[:\s]*([0-4]\.?\d*)',
            r'Grade[:\s]*([A][-+]?|[B][-+]?|[C][-+]?|[D][-+]?)',
            r'Percentage[:\s]*([0-9]{1,3})%'
        ]
        
        # Field of study patterns
        self.field_patterns = [
            r'(?:in|of)\s+([A-Za-z\s&]+)(?:\s+(?:Engineering|Science|Arts|Commerce|Business|Studies))?',
            r'(?:Computer Science|Data Science|Machine Learning|Artificial Intelligence|Software Engineering|Information Technology)',
            r'(?:Mechanical|Electrical|Civil|Chemical|Biomedical|Aerospace)\s+Engineering',
            r'(?:Business Administration|Finance|Marketing|Human Resources|Economics|Accounting)'
        ]
    
    def extract_education(self, education_section_text: str) -> List[Dict]:
        """
        Extract structured education information from education section text.
        
        Args:
            education_section_text: Text from the education section
            
        Returns:
            List of education dictionaries with detailed information
        """
        try:
            if not education_section_text or not education_section_text.strip():
                return []
            
            # Split into individual education blocks
            edu_blocks = self._split_into_education_blocks(education_section_text)
            
            education_list = []
            
            for block in edu_blocks:
                education = self._parse_education_block(block)
                if education:
                    education_list.append(education)
            
            # Determine highest degree
            education_list = self._mark_highest_degree(education_list)
            
            # Sort by end year (most recent first)
            education_list.sort(key=lambda x: x.get('end_year') or 0, reverse=True)
            
            self.logger.info(f"Extracted {len(education_list)} education entries")
            return education_list
            
        except Exception as e:
            self.logger.error(f"Error extracting education: {e}")
            return []
    
    def _split_into_education_blocks(self, text: str) -> List[str]:
        """
        Split education text into individual education blocks.
        
        Args:
            text: Education section text
            
        Returns:
            List of education blocks
        """
        # Split by common education separators
        separators = [
            r'\n(?=[A-Z][a-zA-Z\s]*\s*(?:University|College|Institute|School))',
            r'\n(?=\b(?:Bachelor|Master|PhD|Associate|Diploma|Certificate)(?:\s|$))',
            r'\n(?=\d{4})',
            r'\n(?=[A-Z][A-Za-z\s]{15,})'  # Long capitalized lines (likely institutions)
        ]
        
        combined_pattern = '|'.join(separators)
        blocks = re.split(combined_pattern, text, flags=re.MULTILINE)
        
        # Try to merge degree and institution if they were split
        merged_blocks = []
        current_block = None
        
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            
            # Check if this block looks like a degree line
            if re.search(r'\b(?:Bachelor|Master|PhD|Associate|Diploma|Certificate)', block, re.IGNORECASE):
                # If we have a current block, add it first
                if current_block:
                    merged_blocks.append(current_block)
                current_block = block
            elif current_block:
                # This might be the institution for the current degree
                current_block += '\n' + block
            else:
                # Standalone block
                merged_blocks.append(block)
        
        # Add the last block
        if current_block:
            merged_blocks.append(current_block)
        
        return [block.strip() for block in merged_blocks if block.strip()]
    
    def _parse_education_block(self, block: str) -> Optional[Dict]:
        """
        Parse a single education block into structured data.
        
        Args:
            block: Education block text
            
        Returns:
            Dictionary with structured education information
        """
        try:
            education = {
                'degree': '',
                'field_of_study': None,
                'institution': '',
                'start_year': None,
                'end_year': None,
                'gpa': None,
                'is_highest_degree': False
            }
            
            # Extract degree and field of study together
            degree, field_of_study = self._extract_degree_and_field(block)
            education['degree'] = degree
            education['field_of_study'] = field_of_study
            
            # If not found together, try separately
            if not education['degree']:
                education['degree'] = self._extract_degree(block)
            if not education['field_of_study']:
                education['field_of_study'] = self._extract_field_of_study(block)
            
            # Extract institution
            education['institution'] = self._extract_institution(block)
            
            # Extract years
            start_year, end_year = self._extract_years(block)
            education['start_year'] = start_year
            education['end_year'] = end_year
            
            # Extract GPA
            education['gpa'] = self._extract_gpa(block)
            
            # Validate the education entry before returning
            if not self._is_valid_education_entry(education, block):
                return None
            
            return education if education['degree'] or education['institution'] else None
            
        except Exception as e:
            self.logger.error(f"Error parsing education block: {e}")
            return None
    
    def _extract_degree(self, block: str) -> str:
        """Extract degree from block."""
        # First try to match full degree patterns with parentheses
        full_degree_pattern = re.compile(
            r'\b(Bachelor|Master)\s+(of\s+)?(Engineering|Technology|Science|Commerce|Business\s+Administration|Computer\s+Applications)\s*\([^)]+\)',
            re.IGNORECASE
        )
        
        matches = full_degree_pattern.findall(block)
        if matches:
            # Extract the full degree with abbreviation
            degree_match = re.search(r'\b(Bachelor\s+(?:of\s+)?(?:Engineering|Technology|Science|Commerce|Business\s+Administration|Computer\s+Applications)\s*\([^)]+\))', block, re.IGNORECASE)
            if degree_match:
                return degree_match.group(1).strip()
        
        # Try standard degree pattern
        matches = self.degree_pattern.findall(block)
        if matches:
            degree = matches[0][0]
            # Normalize degree
            return self.normalize_degree(degree)
        
        # Check for degree variations
        degree_variations = {
            'B.S.': 'Bachelor of Science',
            'M.S.': 'Master of Science',
            'B.A.': 'Bachelor of Arts',
            'M.A.': 'Master of Arts',
            'B.Tech': 'Bachelor of Technology',
            'M.Tech': 'Master of Technology',
            'B.E.': 'Bachelor of Engineering',
            'M.E.': 'Master of Engineering',
            'B.E': 'Bachelor of Engineering',
            'M.E': 'Master of Engineering',
            'B.Sc': 'Bachelor of Science',
            'M.Sc': 'Master of Science',
            'B.Com': 'Bachelor of Commerce',
            'BBA': 'Bachelor of Business Administration',
            'MBA': 'Master of Business Administration',
            'BCA': 'Bachelor of Computer Applications',
            'MCA': 'Master of Computer Applications',
            # ========== BACHELOR'S DEGREES ==========
            'B.S.': 'Bachelor of Science',
            'BS': 'Bachelor of Science',
            'B.Sc': 'Bachelor of Science',
            'B.Sc.': 'Bachelor of Science',
            'B.A.': 'Bachelor of Arts',
            'BA': 'Bachelor of Arts',
            'B.Tech': 'Bachelor of Technology',
            'B.Tech.': 'Bachelor of Technology',
            'BTech': 'Bachelor of Technology',
            'B.E.': 'Bachelor of Engineering',
            'B.E': 'Bachelor of Engineering',
            'BE': 'Bachelor of Engineering',
            'BEng': 'Bachelor of Engineering',
            'B.Eng': 'Bachelor of Engineering',
            'B.Eng.': 'Bachelor of Engineering',
            'B.Com': 'Bachelor of Commerce',
            'B.Com.': 'Bachelor of Commerce',
            'BCom': 'Bachelor of Commerce',
            'BBA': 'Bachelor of Business Administration',
            'B.B.A': 'Bachelor of Business Administration',
            'B.B.A.': 'Bachelor of Business Administration',
            'BCA': 'Bachelor of Computer Applications',
            'B.C.A': 'Bachelor of Computer Applications',
            'B.C.A.': 'Bachelor of Computer Applications',
            'BIT': 'Bachelor of Information Technology',
            'B.I.T': 'Bachelor of Information Technology',
            'B.I.T.': 'Bachelor of Information Technology',
            'BCS': 'Bachelor of Computer Science',
            'B.C.S': 'Bachelor of Computer Science',
            'B.C.S.': 'Bachelor of Computer Science',
            'BIS': 'Bachelor of Information Systems',
            'B.I.S': 'Bachelor of Information Systems',
            'B.Math': 'Bachelor of Mathematics',
            'BMath': 'Bachelor of Mathematics',
            'B.Stat': 'Bachelor of Statistics',
            'BStat': 'Bachelor of Statistics',
            'B.Econ': 'Bachelor of Economics',
            'BEcon': 'Bachelor of Economics',
            'B.Fin': 'Bachelor of Finance',
            'BFin': 'Bachelor of Finance',
            'B.Acc': 'Bachelor of Accounting',
            'BAcc': 'Bachelor of Accounting',
            'B.Accy': 'Bachelor of Accountancy',
            'BAcy': 'Bachelor of Accountancy',
            'BPA': 'Bachelor of Public Administration',
            'B.P.A': 'Bachelor of Public Administration',
            'B.P.A.': 'Bachelor of Public Administration',
            'B.P.H': 'Bachelor of Public Health',
            'BPH': 'Bachelor of Public Health',
            'B.S.W': 'Bachelor of Social Work',
            'B.S.W.': 'Bachelor of Social Work',
            'BSW': 'Bachelor of Social Work',
            'B.S.N': 'Bachelor of Science in Nursing',
            'BSN': 'Bachelor of Science in Nursing',
            'B.Sc.Nursing': 'Bachelor of Science in Nursing',
            'BN': 'Bachelor of Nursing',
            'BNSc': 'Bachelor of Nursing Science',
            'B.N.Sc': 'Bachelor of Nursing Science',
            'BPT': 'Bachelor of Physiotherapy',
            'B.P.T': 'Bachelor of Physiotherapy',
            'BOT': 'Bachelor of Occupational Therapy',
            'B.O.T': 'Bachelor of Occupational Therapy',
            'BMLT': 'Bachelor of Medical Laboratory Technology',
            'BRIT': 'Bachelor of Radiological Imaging Technology',
            'BASLP': 'Bachelor of Audiology and Speech Language Pathology',
            'B.Optom': 'Bachelor of Optometry',
            'BOptom': 'Bachelor of Optometry',
            'BHMS': 'Bachelor of Homeopathic Medicine and Surgery',
            'BAMS': 'Bachelor of Ayurvedic Medicine and Surgery',
            'BUMS': 'Bachelor of Unani Medicine and Surgery',
            'BNYS': 'Bachelor of Naturopathy and Yogic Sciences',
            'BSMS': 'Bachelor of Siddha Medicine and Surgery',
            'MBBS': 'Bachelor of Medicine and Bachelor of Surgery',
            'M.B.B.S': 'Bachelor of Medicine and Bachelor of Surgery',
            'M.B.B.S.': 'Bachelor of Medicine and Bachelor of Surgery',
            'M.B.Ch.B': 'Bachelor of Medicine and Bachelor of Surgery',
            'MBChB': 'Bachelor of Medicine and Bachelor of Surgery',
            'M.B.B.Ch': 'Bachelor of Medicine and Bachelor of Surgery',
            'BDS': 'Bachelor of Dental Surgery',
            'B.D.S': 'Bachelor of Dental Surgery',
            'B.D.S.': 'Bachelor of Dental Surgery',
            'BVSC': 'Bachelor of Veterinary Science',
            'B.V.Sc': 'Bachelor of Veterinary Science',
            'B.V.Sc.AH': 'Bachelor of Veterinary Science and Animal Husbandry',
            'B.F.Sc': 'Bachelor of Fisheries Science',
            'BFSc': 'Bachelor of Fisheries Science',
            'B.Sc.Ag': 'Bachelor of Science in Agriculture',
            'BSc.Ag': 'Bachelor of Science in Agriculture',
            'B.Sc.Hort': 'Bachelor of Science in Horticulture',
            'B.For': 'Bachelor of Forestry',
            'BFor': 'Bachelor of Forestry',
            'B.Arch': 'Bachelor of Architecture',
            'B.Arch.': 'Bachelor of Architecture',
            'BArch': 'Bachelor of Architecture',
            'B.Plan': 'Bachelor of Planning',
            'BPlan': 'Bachelor of Planning',
            'B.Des': 'Bachelor of Design',
            'BDes': 'Bachelor of Design',
            'B.F.A': 'Bachelor of Fine Arts',
            'B.F.A.': 'Bachelor of Fine Arts',
            'BFA': 'Bachelor of Fine Arts',
            'B.Mus': 'Bachelor of Music',
            'B.Mus.': 'Bachelor of Music',
            'BMus': 'Bachelor of Music',
            'B.Perf': 'Bachelor of Performance',
            'BPerf': 'Bachelor of Performance',
            'B.Ed': 'Bachelor of Education',
            'B.Ed.': 'Bachelor of Education',
            'BEd': 'Bachelor of Education',
            'B.P.Ed': 'Bachelor of Physical Education',
            'BPEd': 'Bachelor of Physical Education',
            'B.Lib': 'Bachelor of Library Science',
            'BLib': 'Bachelor of Library Science',
            'BLIS': 'Bachelor of Library and Information Science',
            'B.L.I.S': 'Bachelor of Library and Information Science',
            'B.J': 'Bachelor of Journalism',
            'B.J.': 'Bachelor of Journalism',
            'BJ': 'Bachelor of Journalism',
            'BJMC': 'Bachelor of Journalism and Mass Communication',
            'B.M.C': 'Bachelor of Mass Communication',
            'BMC': 'Bachelor of Mass Communication',
            'BMS': 'Bachelor of Management Studies',
            'B.M.S': 'Bachelor of Management Studies',
            'BHM': 'Bachelor of Hotel Management',
            'B.H.M': 'Bachelor of Hotel Management',
            'BHMCT': 'Bachelor of Hotel Management and Catering Technology',
            'B.T.T.M': 'Bachelor of Travel and Tourism Management',
            'BTTM': 'Bachelor of Travel and Tourism Management',
            'B.A.Hons': 'Bachelor of Arts with Honours',
            'B.Sc.Hons': 'Bachelor of Science with Honours',
            'B.Com.Hons': 'Bachelor of Commerce with Honours',
            'B.Th': 'Bachelor of Theology',
            'B.Th.': 'Bachelor of Theology',
            'BTh': 'Bachelor of Theology',
            'B.Div': 'Bachelor of Divinity',
            'BDiv': 'Bachelor of Divinity',
            'B.Min': 'Bachelor of Ministry',
            'BMin': 'Bachelor of Ministry',
            'B.Soc.Sc': 'Bachelor of Social Science',
            'BSocSc': 'Bachelor of Social Science',
            'B.Psych': 'Bachelor of Psychology',
            'BPsych': 'Bachelor of Psychology',
            'B.Criminology': 'Bachelor of Criminology',
            'B.Pol.Sc': 'Bachelor of Political Science',
            'BPolSc': 'Bachelor of Political Science',
            'B.Geog': 'Bachelor of Geography',
            'BGeog': 'Bachelor of Geography',
            'B.Phil': 'Bachelor of Philosophy',
            'BPhil': 'Bachelor of Philosophy',
            'B.Pharm': 'Bachelor of Pharmacy',
            'B.Pharm.': 'Bachelor of Pharmacy',
            'BPharm': 'Bachelor of Pharmacy',
            'B.F.Tech': 'Bachelor of Fashion Technology',
            'BFTech': 'Bachelor of Fashion Technology',
            'B.F.M': 'Bachelor of Financial Markets',
            'BFM': 'Bachelor of Financial Markets',
            'LLB': 'Bachelor of Laws',
            'LL.B': 'Bachelor of Laws',
            'LL.B.': 'Bachelor of Laws',
            'B.C.L': 'Bachelor of Civil Law',
            'B.C.L.': 'Bachelor of Civil Law',
            'BCL': 'Bachelor of Civil Law',

            # ========== MASTER'S DEGREES ==========
            'M.S.': 'Master of Science',
            'MS': 'Master of Science',
            'M.Sc': 'Master of Science',
            'M.Sc.': 'Master of Science',
            'M.A.': 'Master of Arts',
            'MA': 'Master of Arts',
            'M.Tech': 'Master of Technology',
            'M.Tech.': 'Master of Technology',
            'MTech': 'Master of Technology',
            'M.E.': 'Master of Engineering',
            'M.E': 'Master of Engineering',
            'ME': 'Master of Engineering',
            'MEng': 'Master of Engineering',
            'M.Eng': 'Master of Engineering',
            'M.Eng.': 'Master of Engineering',
            'MBA': 'Master of Business Administration',
            'M.B.A': 'Master of Business Administration',
            'M.B.A.': 'Master of Business Administration',
            'MCA': 'Master of Computer Applications',
            'M.C.A': 'Master of Computer Applications',
            'M.C.A.': 'Master of Computer Applications',
            'MIT': 'Master of Information Technology',
            'M.I.T': 'Master of Information Technology',
            'MCS': 'Master of Computer Science',
            'M.C.S': 'Master of Computer Science',
            'MIS': 'Master of Information Systems',
            'M.I.S': 'Master of Information Systems',
            'M.Math': 'Master of Mathematics',
            'MMath': 'Master of Mathematics',
            'M.Stat': 'Master of Statistics',
            'MStat': 'Master of Statistics',
            'M.Econ': 'Master of Economics',
            'MEcon': 'Master of Economics',
            'M.Fin': 'Master of Finance',
            'MFin': 'Master of Finance',
            'M.Acc': 'Master of Accounting',
            'MAcc': 'Master of Accounting',
            'M.Com': 'Master of Commerce',
            'M.Com.': 'Master of Commerce',
            'MCom': 'Master of Commerce',
            'MMS': 'Master of Management Studies',
            'M.M.S': 'Master of Management Studies',
            'MPA': 'Master of Public Administration',
            'M.P.A': 'Master of Public Administration',
            'M.P.A.': 'Master of Public Administration',
            'MPP': 'Master of Public Policy',
            'M.P.P': 'Master of Public Policy',
            'MPH': 'Master of Public Health',
            'M.P.H': 'Master of Public Health',
            'M.P.H.': 'Master of Public Health',
            'MSW': 'Master of Social Work',
            'M.S.W': 'Master of Social Work',
            'M.S.W.': 'Master of Social Work',
            'M.Sc.Nursing': 'Master of Science in Nursing',
            'MSN': 'Master of Science in Nursing',
            'MN': 'Master of Nursing',
            'MPT': 'Master of Physiotherapy',
            'M.P.T': 'Master of Physiotherapy',
            'MOT': 'Master of Occupational Therapy',
            'M.O.T': 'Master of Occupational Therapy',
            'MMLT': 'Master of Medical Laboratory Technology',
            'M.Optom': 'Master of Optometry',
            'MOptom': 'Master of Optometry',
            'M.Pharm': 'Master of Pharmacy',
            'M.Pharm.': 'Master of Pharmacy',
            'MPharm': 'Master of Pharmacy',
            'M.Sc.Ag': 'Master of Science in Agriculture',
            'MSc.Ag': 'Master of Science in Agriculture',
            'M.Sc.Hort': 'Master of Science in Horticulture',
            'M.F.Sc': 'Master of Fisheries Science',
            'MFSc': 'Master of Fisheries Science',
            'M.For': 'Master of Forestry',
            'MFor': 'Master of Forestry',
            'M.Arch': 'Master of Architecture',
            'M.Arch.': 'Master of Architecture',
            'MArch': 'Master of Architecture',
            'M.Plan': 'Master of Planning',
            'MPlan': 'Master of Planning',
            'M.Des': 'Master of Design',
            'MDes': 'Master of Design',
            'M.F.A': 'Master of Fine Arts',
            'M.F.A.': 'Master of Fine Arts',
            'MFA': 'Master of Fine Arts',
            'M.Mus': 'Master of Music',
            'M.Mus.': 'Master of Music',
            'MMus': 'Master of Music',
            'M.Ed': 'Master of Education',
            'M.Ed.': 'Master of Education',
            'MEd': 'Master of Education',
            'M.P.Ed': 'Master of Physical Education',
            'MPEd': 'Master of Physical Education',
            'MLIS': 'Master of Library and Information Science',
            'M.L.I.S': 'Master of Library and Information Science',
            'M.Lib': 'Master of Library Science',
            'MLib': 'Master of Library Science',
            'M.J': 'Master of Journalism',
            'M.J.': 'Master of Journalism',
            'MJ': 'Master of Journalism',
            'MJMC': 'Master of Journalism and Mass Communication',
            'M.F.M': 'Master of Financial Management',
            'MFM': 'Master of Financial Management',
            'M.Phil': 'Master of Philosophy',
            'M.Phil.': 'Master of Philosophy',
            'MPhil': 'Master of Philosophy',
            'M.Res': 'Master of Research',
            'MRes': 'Master of Research',
            'M.Litt': 'Master of Letters',
            'M.Litt.': 'Master of Letters',
            'MLitt': 'Master of Letters',
            'M.Th': 'Master of Theology',
            'M.Th.': 'Master of Theology',
            'MTh': 'Master of Theology',
            'M.Div': 'Master of Divinity',
            'M.Div.': 'Master of Divinity',
            'MDiv': 'Master of Divinity',
            'M.Soc.Sc': 'Master of Social Science',
            'MSocSc': 'Master of Social Science',
            'M.Psych': 'Master of Psychology',
            'MPsych': 'Master of Psychology',
            'M.Geog': 'Master of Geography',
            'MGeog': 'Master of Geography',
            'MIA': 'Master of International Affairs',
            'MIR': 'Master of International Relations',
            'MIS.Intl': 'Master of International Studies',
            'MHROD': 'Master of Human Resource and Organizational Development',
            'MHRM': 'Master of Human Resource Management',
            'M.HRM': 'Master of Human Resource Management',
            'MHM': 'Master of Hotel Management',
            'M.H.M': 'Master of Hotel Management',
            'MTM': 'Master of Tourism Management',
            'M.T.M': 'Master of Tourism Management',
            'LLM': 'Master of Laws',
            'LL.M': 'Master of Laws',
            'LL.M.': 'Master of Laws',
            'M.Sc.Eng': 'Master of Science in Engineering',
            'M.Sc.Eng.': 'Master of Science in Engineering',

            # ========== DOCTORATE DEGREES ==========
            'PhD': 'Doctor of Philosophy',
            'Ph.D': 'Doctor of Philosophy',
            'Ph.D.': 'Doctor of Philosophy',
            'D.Phil': 'Doctor of Philosophy',
            'D.Phil.': 'Doctor of Philosophy',
            'DPhil': 'Doctor of Philosophy',
            'D.Sc': 'Doctor of Science',
            'D.Sc.': 'Doctor of Science',
            'DSc': 'Doctor of Science',
            'D.Litt': 'Doctor of Letters',
            'D.Litt.': 'Doctor of Letters',
            'DLitt': 'Doctor of Letters',
            'Ed.D': 'Doctor of Education',
            'Ed.D.': 'Doctor of Education',
            'EdD': 'Doctor of Education',
            'D.Ed': 'Doctor of Education',
            'D.Ed.': 'Doctor of Education',
            'DBA': 'Doctor of Business Administration',
            'D.B.A': 'Doctor of Business Administration',
            'D.B.A.': 'Doctor of Business Administration',
            'JD': 'Juris Doctor',
            'J.D': 'Juris Doctor',
            'J.D.': 'Juris Doctor',
            'J.S.D': 'Doctor of Juridical Science',
            'J.S.D.': 'Doctor of Juridical Science',
            'JSD': 'Doctor of Juridical Science',
            'S.J.D': 'Doctor of Juridical Science',
            'S.J.D.': 'Doctor of Juridical Science',
            'SJD': 'Doctor of Juridical Science',
            'LLD': 'Doctor of Laws',
            'LL.D': 'Doctor of Laws',
            'LL.D.': 'Doctor of Laws',
            'Th.D': 'Doctor of Theology',
            'Th.D.': 'Doctor of Theology',
            'ThD': 'Doctor of Theology',
            'D.Min': 'Doctor of Ministry',
            'D.Min.': 'Doctor of Ministry',
            'DMin': 'Doctor of Ministry',
            'D.M.A': 'Doctor of Musical Arts',
            'D.M.A.': 'Doctor of Musical Arts',
            'DMA': 'Doctor of Musical Arts',
            'D.N.P': 'Doctor of Nursing Practice',
            'D.N.P.': 'Doctor of Nursing Practice',
            'DNP': 'Doctor of Nursing Practice',
            'Pharm.D': 'Doctor of Pharmacy',
            'Pharm.D.': 'Doctor of Pharmacy',
            'PharmD': 'Doctor of Pharmacy',
            'Psy.D': 'Doctor of Psychology',
            'Psy.D.': 'Doctor of Psychology',
            'PsyD': 'Doctor of Psychology',
            'D.P.T': 'Doctor of Physical Therapy',
            'D.P.T.': 'Doctor of Physical Therapy',
            'DPT': 'Doctor of Physical Therapy',
            'Au.D': 'Doctor of Audiology',
            'Au.D.': 'Doctor of Audiology',
            'AuD': 'Doctor of Audiology',
            'O.D': 'Doctor of Optometry',
            'O.D.': 'Doctor of Optometry',
            'OD': 'Doctor of Optometry',
            'D.O': 'Doctor of Osteopathic Medicine',
            'D.O.': 'Doctor of Osteopathic Medicine',
            'DO': 'Doctor of Osteopathic Medicine',
            'M.D': 'Doctor of Medicine',
            'M.D.': 'Doctor of Medicine',
            'MD': 'Doctor of Medicine',
            'D.D.S': 'Doctor of Dental Surgery',
            'D.D.S.': 'Doctor of Dental Surgery',
            'DDS': 'Doctor of Dental Surgery',
            'D.M.D': 'Doctor of Dental Medicine',
            'D.M.D.': 'Doctor of Dental Medicine',
            'DMD': 'Doctor of Dental Medicine',
            'D.V.M': 'Doctor of Veterinary Medicine',
            'D.V.M.': 'Doctor of Veterinary Medicine',
            'DVM': 'Doctor of Veterinary Medicine',
            'D.P.H': 'Doctor of Public Health',
            'D.P.H.': 'Doctor of Public Health',
            'DrPH': 'Doctor of Public Health',
            'D.S.W': 'Doctor of Social Work',
            'D.S.W.': 'Doctor of Social Work',
            'DSW': 'Doctor of Social Work',
            'D.Arch': 'Doctor of Architecture',
            'D.Arch.': 'Doctor of Architecture',
            'DArch': 'Doctor of Architecture',
            'D.F.A': 'Doctor of Fine Arts',
            'D.F.A.': 'Doctor of Fine Arts',
            'DFA': 'Doctor of Fine Arts',
            'D.H.Sc': 'Doctor of Health Science',
            'DHSc': 'Doctor of Health Science',
            'DClinPsy': 'Doctor of Clinical Psychology',
            'D.Clin.Psy': 'Doctor of Clinical Psychology',
            'D.Clin.Psych': 'Doctor of Clinical Psychology',
            'DC': 'Doctor of Chiropractic',
            'D.C': 'Doctor of Chiropractic',
            'D.C.': 'Doctor of Chiropractic',
            'DPM': 'Doctor of Podiatric Medicine',
            'D.P.M': 'Doctor of Podiatric Medicine',
            'D.P.M.': 'Doctor of Podiatric Medicine',
            'DACM': 'Doctor of Acupuncture and Chinese Medicine',
            'DAOM': 'Doctor of Acupuncture and Oriental Medicine',
            'DOM': 'Doctor of Oriental Medicine',
            'ND': 'Doctor of Naturopathic Medicine',
            'N.D': 'Doctor of Naturopathic Medicine',
            'N.D.': 'Doctor of Naturopathic Medicine',

            # ========== POSTGRADUATE DIPLOMAS & CERTIFICATES ==========
            'PGDM': 'Post Graduate Diploma in Management',
            'PGDBA': 'Post Graduate Diploma in Business Administration',
            'PGDCA': 'Post Graduate Diploma in Computer Applications',
            'PGDIT': 'Post Graduate Diploma in Information Technology',
            'PGDHRM': 'Post Graduate Diploma in Human Resource Management',
            'PGDFM': 'Post Graduate Diploma in Financial Management',
            'PGDMM': 'Post Graduate Diploma in Marketing Management',
            'PGDOM': 'Post Graduate Diploma in Operations Management',
            'PGDip': 'Postgraduate Diploma',
            'PGCert': 'Postgraduate Certificate',
            'PGD': 'Postgraduate Diploma',
            'GradDip': 'Graduate Diploma',
            'GradCert': 'Graduate Certificate',
            'Adv.Dip': 'Advanced Diploma',
            'AdvDip': 'Advanced Diploma',
            'Dip': 'Diploma',
            'Cert': 'Certificate',
            'Cert.IV': 'Certificate IV',
            'Cert.III': 'Certificate III',
            'Cert.II': 'Certificate II',
            'Cert.I': 'Certificate I',
            'HND': 'Higher National Diploma',
            'HNC': 'Higher National Certificate',
            'OND': 'Ordinary National Diploma',
            'ONC': 'Ordinary National Certificate',
            'BTEC': 'Business and Technology Education Council',
            'DipHE': 'Diploma of Higher Education',
            'CertHE': 'Certificate of Higher Education',
            'FdA': 'Foundation Degree in Arts',
            'FdSc': 'Foundation Degree in Science',
            'FdEng': 'Foundation Degree in Engineering',
            'Assoc.Deg': 'Associate Degree',
            'A.A': 'Associate of Arts',
            'A.S': 'Associate of Science',
            'A.A.S': 'Associate of Applied Science',
            'A.A.': 'Associate of Arts',
            'A.S.': 'Associate of Science',
            'A.A.S.': 'Associate of Applied Science',
            'AAS': 'Associate of Applied Science',

            # ========== EUROPEAN DEGREES ==========
            'Dipl.Ing': 'Diplom-Ingenieur',
            'Dipl.Ing.': 'Diplom-Ingenieur',
            'DiplIng': 'Diplom-Ingenieur',
            'Dipl.Kfm': 'Diplom-Kaufmann',
            'Dipl.Kfm.': 'Diplom-Kaufmann',
            'Dipl.Inf': 'Diplom-Informatiker',
            'Dipl.Math': 'Diplom-Mathematiker',
            'Dipl.Phys': 'Diplom-Physiker',
            'Dipl.Chem': 'Diplom-Chemiker',
            'Dipl.Biol': 'Diplom-Biologe',
            'Dipl.Psych': 'Diplom-Psychologe',
            'Dipl.Soz': 'Diplom-Soziologe',
            'Dipl.Päd': 'Diplom-Pädagoge',
            'Dr.Ing': 'Doktor-Ingenieur',
            'Dr.Ing.': 'Doktor-Ingenieur',
            'Dr.rer.nat': 'Doctor Rerum Naturalium',
            'Dr.rer.nat.': 'Doctor Rerum Naturalium',
            'Dr.rer.pol': 'Doctor Rerum Politicarum',
            'Dr.rer.pol.': 'Doctor Rerum Politicarum',
            'Dr.phil': 'Doctor Philosophiae',
            'Dr.phil.': 'Doctor Philosophiae',
            'Dr.med': 'Doctor Medicinae',
            'Dr.med.': 'Doctor Medicinae',
            'Dr.med.dent': 'Doctor Medicinae Dentariae',
            'Dr.med.vet': 'Doctor Medicinae Veterinariae',
            'Dr.jur': 'Doctor Juris',
            'Dr.jur.': 'Doctor Juris',
            'Dr.theol': 'Doctor Theologiae',
            'Dr.theol.': 'Doctor Theologiae',
            'Dr.rer.soc.oec': 'Doctor Rerum Socialium Oeconomicarumque',
            'Dr.mont': 'Doctor Montanisticus',
            'Dr.techn': 'Doctor Technicae',
            'Mgr': 'Magister',
            'Mgr.': 'Magister',
            'Bc': 'Bakalář',
            'Bc.': 'Bakalář',
            'Ing': 'Inženýr',
            'Ing.': 'Inženýr',
            'Ing.arch': 'Inženýr Architekt',
            'RNDr': 'Rerum Naturalium Doctor',
            'RNDr.': 'Rerum Naturalium Doctor',
            'PhDr': 'Philosophiae Doctor',
            'PhDr.': 'Philosophiae Doctor',
            'JUDr': 'Juris Utriusque Doctor',
            'JUDr.': 'Juris Utriusque Doctor',
            'MUDr': 'Medicinae Universae Doctor',
            'MUDr.': 'Medicinae Universae Doctor',
            'MVDr': 'Medicinae Veterinariae Doctor',
            'MVDr.': 'Medicinae Veterinariae Doctor',
            'PaedDr': 'Paedagogiae Doctor',
            'PaedDr.': 'Paedagogiae Doctor',
            'ThDr': 'Theologiae Doctor',
            'ThDr.': 'Theologiae Doctor',
            'ThLic': 'Theologiae Licentiatus',
            'CSc': 'Candidatus Scientiarum',
            'CSc.': 'Candidatus Scientiarum',
            'DrSc': 'Doctor Scientiarum',
            'DrSc.': 'Doctor Scientiarum',
            'DSc': 'Doctor of Science',
            'Lic': 'Licenciate',
            'Lic.': 'Licenciate',
            'Cand.Scient': 'Candidatus Scientiarum',
            'Cand.Mag': 'Candidatus Magisterii',
            'Cand.Med': 'Candidatus Medicinae',
            'Cand.Jur': 'Candidatus Juris',
            'Cand.Theol': 'Candidatus Theologiae',
            'Cand.Oecon': 'Candidatus Oeconomiae',
            'Cand.Phil': 'Candidatus Philosophiae',
            'Cand.Psychol': 'Candidatus Psychologiae',
            'Cand.Polyt': 'Candidatus Polytechnices',
            'Siv.Ing': 'Sivilingeniør',
            'Siv.Ing.': 'Sivilingeniør',
            'SivIng': 'Sivilingeniør',
            'Siv.Øk': 'Siviløkonom',
            'SivØk': 'Siviløkonom',
            'Fil.dr': 'Filosofie Doktor',
            'Fil.kand': 'Filosofie Kandidat',
            'Fil.mag': 'Filosofie Magister',
            'Tek.dr': 'Teknologie Doktor',
            'Tek.lic': 'Teknologie Licentiat',
            'Med.dr': 'Medicine Doktor',
            'Jur.dr': 'Juris Doktor',
            'Ekon.dr': 'Ekonomie Doktor',
            'Agr.dr': 'Agrariae Doktor',
            'Vet.dr': 'Veterinäriae Doktor',
            'Odont.dr': 'Odontologiae Doktor',
            'Psyk.dr': 'Psykologiae Doktor',
            'Agr.kand': 'Agrariae Kandidat',
            'M.Sc.Econ': 'Master of Science in Economics',
            'B.Sc.Econ': 'Bachelor of Science in Economics',
            'Oecon': 'Oeconomiae',
            'Drs': 'Doctorandus',
            'Ir': 'Ingenieur',
            'Mr': 'Meester in de Rechten',
            'Dr.ir': 'Doctor Ingenieur',
            'Dr.Mr': 'Doctor Meester',

            # ========== FRENCH DEGREES ==========
            'DEUG': "Diplôme d'Études Universitaires Générales",
            'DUT': 'Diplôme Universitaire de Technologie',
            'BTS': 'Brevet de Technicien Supérieur',
            'Lic.': 'Licence',
            'M1': 'Master 1',
            'M2': 'Master 2',
            'IUT': 'Institut Universitaire de Technologie',
            'Grande École': 'Grande École Diploma',
            'Agrégation': 'Agrégation',
            'HDR': 'Habilitation à Diriger des Recherches',
            'DESS': "Diplôme d'Études Supérieures Spécialisées",
            'DEA': "Diplôme d'Études Approfondies",
            'DNAP': "Diplôme National d'Arts Plastiques",
            'DNSEP': "Diplôme National Supérieur d'Expression Plastique",
            'DNO': "Diplôme National d'Oenologie",
            'DipArch': 'Diploma in Architecture',

            # ========== SPANISH / LATIN AMERICAN DEGREES ==========
            'Lic.Adm': 'Licenciado en Administración',
            'Lic.Der': 'Licenciado en Derecho',
            'Lic.Cont': 'Licenciado en Contaduría',
            'Ing.Ind': 'Ingeniero Industrial',
            'Ing.Civ': 'Ingeniero Civil',
            'Ing.Sist': 'Ingeniero en Sistemas',
            'Ing.Quim': 'Ingeniero Químico',
            'Ing.Elec': 'Ingeniero Eléctrico',
            'Ing.Mec': 'Ingeniero Mecánico',
            'Arq': 'Arquitecto',
            'Vet': 'Médico Veterinario',
            'Mtro': 'Maestro',
            'Dr.Adm': 'Doctor en Administración',
            'Dr.Der': 'Doctor en Derecho',
            'Dr.Med': 'Doctor en Medicina',
            'Bach.': 'Bachiller',
            'Esp': 'Especialista',

            # ========== ITALIAN DEGREES ==========
            'Dott': 'Dottore',
            'Dott.': 'Dottore',
            'Dott.ssa': 'Dottoressa',
            'Dott.Ing': 'Dottore in Ingegneria',
            'Dott.Arch': 'Dottore in Architettura',
            'Laurea': 'Laurea',
            'Laurea Mag': 'Laurea Magistrale',
            'Laurea Triennale': 'Laurea Triennale',
            'LL': 'Laurea in Legge',

            # ========== AUSTRALIAN / NZ / UK DEGREES ==========
            'B.Sc.Hons': 'Bachelor of Science with Honours',
            'B.A.Hons': 'Bachelor of Arts with Honours',
            'B.Eng.Hons': 'Bachelor of Engineering with Honours',
            'B.Com.Hons': 'Bachelor of Commerce with Honours',
            'B.Sc.(Hons)': 'Bachelor of Science with Honours',
            'B.A.(Hons)': 'Bachelor of Arts with Honours',
            'M.Sc.Hons': 'Master of Science with Honours',
            'DipTESOL': 'Diploma in Teaching English to Speakers of Other Languages',
            'CertTESOL': 'Certificate in Teaching English to Speakers of Other Languages',
            'CELTA': 'Certificate in English Language Teaching to Adults',
            'DELTA': 'Diploma in English Language Teaching to Adults',
            'PGCE': 'Postgraduate Certificate in Education',
            'QTS': 'Qualified Teacher Status',
            'NVQ': 'National Vocational Qualification',
            'SVQ': 'Scottish Vocational Qualification',
            'GNVQ': 'General National Vocational Qualification',
            'A-Level': 'Advanced Level',
            'AS-Level': 'Advanced Subsidiary Level',
            'GCSE': 'General Certificate of Secondary Education',
            'B.Nurs': 'Bachelor of Nursing',
            'M.Nurs': 'Master of Nursing',
            'B.MidwifSc': 'Bachelor of Midwifery Science',
            'BAppSc': 'Bachelor of Applied Science',
            'MAppSc': 'Master of Applied Science',
            'B.App.Sc': 'Bachelor of Applied Science',
            'M.App.Sc': 'Master of Applied Science',
            'B.Bus': 'Bachelor of Business',
            'M.Bus': 'Master of Business',
            'BBus': 'Bachelor of Business',
            'MBus': 'Master of Business',
            'B.HealthSci': 'Bachelor of Health Science',
            'M.HealthSci': 'Master of Health Science',
            'BHlthSc': 'Bachelor of Health Science',
            'B.SpeechPath': 'Bachelor of Speech Pathology',
            'B.Pod': 'Bachelor of Podiatry',
            'B.Osteop': 'Bachelor of Osteopathy',
            'B.Chiro': 'Bachelor of Chiropractic',
            'B.Acup': 'Bachelor of Acupuncture',
            'B.TCM': 'Bachelor of Traditional Chinese Medicine',

            # ========== CANADIAN DEGREES ==========
            'B.A.Sc': 'Bachelor of Applied Science',
            'B.A.Sc.': 'Bachelor of Applied Science',
            'BASc': 'Bachelor of Applied Science',
            'M.A.Sc': 'Master of Applied Science',
            'MASc': 'Master of Applied Science',
            'B.Comm': 'Bachelor of Commerce',
            'M.Comm': 'Master of Commerce',
            'B.Ed.French': 'Bachelor of Education in French',
            'M.Sc.A': 'Master of Science Applied',
            'D.Sc.A': 'Doctor of Science Applied',
            'B.A.A': 'Bachelor of Applied Arts',

            # ========== CHINESE / EAST ASIAN DEGREES ==========
            'B.Eng.CHN': 'Bachelor of Engineering (China)',
            'M.Eng.CHN': 'Master of Engineering (China)',
            'Gong.Xue.Shi': 'Bachelor of Engineering (Chinese)',
            'Li.Xue.Shi': 'Bachelor of Science (Chinese)',
            'Wen.Xue.Shi': 'Bachelor of Arts (Chinese)',
            'Gong.Xue.Shuoshi': 'Master of Engineering (Chinese)',
            'Li.Xue.Shuoshi': 'Master of Science (Chinese)',
            'Gong.Xue.Boshi': 'Doctor of Engineering (Chinese)',
            'Xueshi': 'Bachelor (Chinese)',
            'Shuoshi': 'Master (Chinese)',
            'Boshi': 'Doctor (Chinese)',

            # ========== SOUTH AFRICAN DEGREES ==========
            'B.Proc': 'Bachelor of Procedure',
            'B.Iuris': 'Bachelor of Iuris',
            'B.Compt': 'Bachelor of Comptabilité',
            'B.Admin': 'Bachelor of Administration',
            'M.Admin': 'Master of Administration',
            'B.Cur': 'Bachelor of Curationis',
            'M.Cur': 'Master of Curationis',
            'D.Cur': 'Doctor of Curationis',
            'B.Soc.Sc.Hons': 'Bachelor of Social Science with Honours',

            # ========== PROFESSIONAL CERTIFICATIONS (Global) ==========
            'CPA': 'Certified Public Accountant',
            'CA': 'Chartered Accountant',
            'ACA': 'Associate Chartered Accountant',
            'FCA': 'Fellow Chartered Accountant',
            'ACCA': 'Association of Chartered Certified Accountants',
            'CIMA': 'Chartered Institute of Management Accountants',
            'CMA': 'Certified Management Accountant',
            'CFA': 'Chartered Financial Analyst',
            'CFP': 'Certified Financial Planner',
            'FRM': 'Financial Risk Manager',
            'CAIA': 'Chartered Alternative Investment Analyst',
            'CIA': 'Certified Internal Auditor',
            'CISa': 'Certified Information Systems Auditor',
            'CISM': 'Certified Information Security Manager',
            'CISSP': 'Certified Information Systems Security Professional',
            'PMP': 'Project Management Professional',
            'PMI-ACP': 'PMI Agile Certified Practitioner',
            'CAPM': 'Certified Associate in Project Management',
            'PRINCE2': 'Projects in Controlled Environments',
            'CSM': 'Certified Scrum Master',
            'CSPO': 'Certified Scrum Product Owner',
            'AWS-SAA': 'AWS Certified Solutions Architect Associate',
            'AWS-SAP': 'AWS Certified Solutions Architect Professional',
            'GCP-ACE': 'Google Cloud Certified Associate Cloud Engineer',
            'AZ-900': 'Microsoft Azure Fundamentals',
            'AZ-104': 'Microsoft Azure Administrator',
            'MCSE': 'Microsoft Certified Solutions Expert',
            'MCTS': 'Microsoft Certified Technology Specialist',
            'CCNA': 'Cisco Certified Network Associate',
            'CCNP': 'Cisco Certified Network Professional',
            'CCIE': 'Cisco Certified Internetwork Expert',
            'CEH': 'Certified Ethical Hacker',
            'OSCP': 'Offensive Security Certified Professional',
            'CompTIA A+': 'CompTIA A+ Certification',
            'CompTIA Net+': 'CompTIA Network+ Certification',
            'CompTIA Sec+': 'CompTIA Security+ Certification',
            'ITIL': 'Information Technology Infrastructure Library',
            'Six Sigma BB': 'Six Sigma Black Belt',
            'Six Sigma GB': 'Six Sigma Green Belt',
            'PG.Cert': 'Postgraduate Certificate',
            'PG.Dip': 'Postgraduate Diploma',
            'Exec.MBA': 'Executive Master of Business Administration',
            'EMBA': 'Executive Master of Business Administration',
            'Global MBA': 'Global Master of Business Administration',
            'Online MBA': 'Online Master of Business Administration',
            'Part-time MBA': 'Part-time Master of Business Administration',

            # ========== MIDDLE EAST / ARABIC DEGREES ==========
            'Bac': 'Baccalauréat',
            'Licence.Arab': 'Licence (Arabic)',
            'Maîtrise': 'Maîtrise (Master Level)',
            'DEUA': "Diplôme d'Études Universitaires Appliquées",
            'Magistère': 'Magistère',
            'Doctorat': 'Doctorat',
            "Doctorat d'État": "Doctorat d'État",
            'B.Shariah': 'Bachelor of Shariah',
            'M.Shariah': 'Master of Shariah',
            'D.Shariah': 'Doctor of Shariah',
            'B.Islamic.Studies': 'Bachelor of Islamic Studies',
            'M.Islamic.Studies': 'Master of Islamic Studies',

            # ========== JAPANESE / KOREAN DEGREES ==========
            'Gakushi': 'Bachelor (Japanese)',
            'Shushi': 'Master (Japanese)',
            'Hakushi': 'Doctor (Japanese)',
            'B.Eng.JPN': 'Bachelor of Engineering (Japan)',
            'M.Eng.JPN': 'Master of Engineering (Japan)',
            'Hak.Ji': 'Bachelor (Korean)',
            'Suk.Sa': 'Master (Korean)',
            'Bak.Sa': 'Doctor (Korean)',

            # ========== RUSSIAN / EASTERN EUROPEAN DEGREES ==========
            'Bakalavr': 'Bakalavr (Russian Bachelor)',
            'Magistr': 'Magistr (Russian Master)',
            'Kandidat.Nauk': 'Kandidat Nauk (Russian Candidate of Sciences)',
            'Doktor.Nauk': 'Doktor Nauk (Russian Doctor of Sciences)',
            'Specialist': 'Specialist (5-year Russian Degree)',
            'Aspirantura': 'Aspirantura (Russian Postgraduate Study)',
            'Doctorantura': 'Doctorantura (Russian Doctoral Study)',
            'Dipl': 'Diplom (Eastern European)',
            'Habil': 'Habilitation',

            # ========== ONLINE / MODERN CREDENTIALS ==========
            'MOOCCert': 'MOOC Certificate',
            'NanoDeg': 'Nanodegree',
            'MicroMasters': 'MicroMasters Certificate',
            'XSeries': 'XSeries Certificate',
            'Specialization': 'Coursera Specialization Certificate',
            'ProfCert': 'Professional Certificate',
            'BootCamp.Cert': 'Bootcamp Certificate',
            'Coding.Cert': 'Coding Bootcamp Certificate',
            'DataSci.Cert': 'Data Science Certificate',
            'ML.Cert': 'Machine Learning Certificate',
            'AI.Cert': 'Artificial Intelligence Certificate',
            'Blockchain.Cert': 'Blockchain Certificate',
            'Cybersec.Cert': 'Cybersecurity Certificate',
            'UX.Cert': 'UX Design Certificate',
            'DigMkt.Cert': 'Digital Marketing Certificate'
        }
        
        for variation, normalized in degree_variations.items():
            if variation in block:
                return normalized
        
        return ''
    
    def _extract_degree_and_field(self, block: str) -> Tuple[str, Optional[str]]:
        """Extract both degree and field of study from a degree line."""
        # Pattern to match: "Bachelor of Engineering (B.E.) - Computer Science"
        degree_field_pattern = re.compile(
            r'\b(Bachelor\s+(?:of\s+)?(?:Engineering|Technology|Science|Commerce|Business\s+Administration|Computer\s+Applications)\s*\([^)]+\))\s*[-–—]\s*(.+)',
            re.IGNORECASE
        )
        
        match = degree_field_pattern.search(block)
        if match:
            degree = match.group(1).strip()
            field_of_study = match.group(2).strip()
            return degree, field_of_study
        
        # Fallback: try to extract degree and field separately
        degree = self._extract_degree(block)
        field = self._extract_field_of_study(block)
        
        return degree, field
    
    def _extract_field_of_study(self, block: str) -> Optional[str]:
        """Extract field of study from block."""
        for pattern in self.field_patterns:
            matches = re.findall(pattern, block, re.IGNORECASE)
            if matches:
                field = matches[0].strip()
                # Clean up field name
                field = re.sub(r'\s+', ' ', field)
                if len(field) > 2:
                    return field
        
        return None
    
    def _extract_institution(self, block: str) -> str:
        """Extract institution name from block."""
        # Remove the degree line(s) first to avoid false matches
        lines = block.split('\n')
        institution_lines = []
        
        DEGREE_LINE_RE = re.compile(
            r'\b(?:Bachelor|Master|PhD|Ph\.D|Associate|Diploma|Certificate|Degree|'
            r'B\.Tech|M\.Tech|BTech|MTech|B\.E\b|M\.E\b|B\.Sc|M\.Sc|BCA|MCA|'
            r'BBA|MBA|B\.B\.A|M\.B\.A|B\.Com|M\.Com|B\.A\b|M\.A\b|BS\b|MS\b)',
            re.IGNORECASE
        )
        
        for line in lines:
            stripped = line.strip()
            if stripped and not DEGREE_LINE_RE.search(stripped):
                institution_lines.append(stripped)
        
        institution_text = '\n'.join(institution_lines)
        
        # Try each pattern
        for pattern in self.institution_patterns:
            try:
                matches = re.findall(pattern, institution_text, re.IGNORECASE | re.MULTILINE)
                if matches:
                    institution = matches[0].strip() if isinstance(matches[0], str) else matches[0][0].strip()
                    # Strip trailing comma/year/dash artifacts
                    institution = re.sub(r'[,;]?\s*(?:19|20)\d{2}.*$', '', institution).strip()
                    institution = re.sub(r'\s*[-–—]\s*$', '', institution).strip()
                    institution = re.sub(r'^[-–—,;\s]+', '', institution).strip()
                    institution = re.sub(r'[\|•].*$', '', institution).strip()
                    if len(institution) > 3 and not re.match(r'^\d+$', institution):
                        return institution
            except Exception:
                continue
        
        # Final fallback: look for any line with institution keywords anywhere in the text
        institution_keywords = re.compile(
            r'\b((?:[A-Z][A-Za-z&\s,\']{2,60}?)?'
            r'(?:University|College|Institute(?:\s+of\s+Technology)?|School|Academy|Polytechnic)'
            r'(?:\s+of\s+[A-Za-z\s]+)?)',
            re.IGNORECASE
        )
        for line in lines:
            stripped = line.strip()
            if stripped and not DEGREE_LINE_RE.search(stripped):
                m = institution_keywords.search(stripped)
                if m:
                    inst = m.group(1).strip()
                    inst = re.sub(r'[,;]?\s*(?:19|20)\d{2}.*$', '', inst).strip()
                    if len(inst) > 3:
                        return inst
        
        return ''
    
    def _extract_years(self, block: str) -> Tuple[Optional[int], Optional[int]]:
        """Extract start and end years from block."""
        def validate_year(year_str: str) -> Optional[int]:
            """Validate and return year if it's a valid 4-digit year."""
            try:
                year = int(year_str)
                # Only accept years between 1950 and 2030
                if 1950 <= year <= 2030:
                    return year
                return None
            except (ValueError, TypeError):
                return None
        
        # Try year range first
        range_matches = self.year_range_pattern.findall(block)
        if range_matches:
            start_year_str, end_year_str = range_matches[0]
            start_year = validate_year(start_year_str)
            end_year = validate_year(end_year_str)
            if start_year and end_year:
                return start_year, end_year
        
        # Try individual years
        year_matches = self.year_pattern.findall(block)
        if len(year_matches) >= 2:
            year1 = validate_year(year_matches[0])
            year2 = validate_year(year_matches[1])
            if year1 and year2:
                return year1, year2
        elif year_matches:
            year = validate_year(year_matches[0])
            if year:
                return None, year
        
        return None, None
    
    def _extract_gpa(self, block: str) -> Optional[float]:
        """Extract GPA from block."""
        for pattern in self.gpa_patterns:
            matches = re.findall(pattern, block, re.IGNORECASE)
            if matches:
                try:
                    gpa_value = matches[0]
                    # Handle letter grades
                    if gpa_value in ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D']:
                        # Convert letter grade to GPA scale
                        grade_to_gpa = {'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0}
                        return grade_to_gpa.get(gpa_value, None)
                    
                    # Handle percentage
                    if '%' in gpa_value:
                        percentage = float(gpa_value.replace('%', ''))
                        return min(4.0, percentage / 25)  # Convert percentage to 4.0 scale
                    
                    # Handle numeric GPA
                    return float(gpa_value)
                except ValueError:
                    continue
        
        return None
    
    def normalize_degree(self, raw_degree: str) -> str:
        """
        Normalize degree name to standard format.
        
        Args:
            raw_degree: Raw degree string
            
        Returns:
            Normalized degree name
        """
        if not raw_degree:
            return raw_degree
        
        # Degree mapping for normalization
        degree_mapping = {
            # Bachelor variations
            'BS': 'Bachelor of Science',
            'B.S': 'Bachelor of Science',
            'B.S.': 'Bachelor of Science',
            'BSc': 'Bachelor of Science',
            'B.Sc': 'Bachelor of Science',
            'B.Sc.': 'Bachelor of Science',
            
            'BA': 'Bachelor of Arts',
            'B.A': 'Bachelor of Arts',
            'B.A.': 'Bachelor of Arts',
            
            'B.Tech': 'Bachelor of Technology',
            'B.Tech.': 'Bachelor of Technology',
            'BTech': 'Bachelor of Technology',
            
            # Indian degree formats
            'B.E': 'Bachelor of Engineering',
            'B.E.': 'Bachelor of Engineering',
            'BE': 'Bachelor of Engineering',
            
            'M.E': 'Master of Engineering',
            'M.E.': 'Master of Engineering',
            'ME': 'Master of Engineering',
            
            'M.Tech': 'Master of Technology',
            'M.Tech.': 'Master of Technology',
            'MTech': 'Master of Technology',
            
            'B.Com': 'Bachelor of Commerce',
            'B.Com.': 'Bachelor of Commerce',
            'BCom': 'Bachelor of Commerce',
            
            'BBA': 'Bachelor of Business Administration',
            'BBA.': 'Bachelor of Business Administration',
            
            'MBA': 'Master of Business Administration',
            'MBA.': 'Master of Business Administration',
            
            'BCA': 'Bachelor of Computer Applications',
            'BCA.': 'Bachelor of Computer Applications',
            
            'MCA': 'Master of Computer Applications',
            'MCA.': 'Master of Computer Applications',
            
            'M.Sc': 'Master of Science',
            'M.Sc.': 'Master of Science',
            'MSc': 'Master of Science',
            
            # Master variations
            'MS': 'Master of Science',
            'M.S': 'Master of Science',
            'M.S.': 'Master of Science',
            'MSc': 'Master of Science',
            
            'MA': 'Master of Arts',
            'M.A': 'Master of Arts',
            'M.A.': 'Master of Arts',
            
            'M.Com': 'Master of Commerce',
            'M.Com.': 'Master of Commerce',
            
            # PhD variations
            'Ph.D': 'PhD',
            'Ph.D.': 'PhD',
            'Doctorate': 'PhD',
            'AA':    'Associate of Arts',
            'A.A':   'Associate of Arts',
            'A.A.':  'Associate of Arts',
            'AS':    'Associate of Science',
            'A.S':   'Associate of Science',
            'A.S.':  'Associate of Science',
            'AAS':   'Associate of Applied Science',
            'A.A.S': 'Associate of Applied Science',
            'A.A.S.':'Associate of Applied Science',
            'AAT':   'Associate of Arts in Teaching',
            'AGS':   'Associate of General Studies',
            'AFA':   'Associate of Fine Arts',

            # ─── Bachelor Degrees ───────────────────────
            'BS':      'Bachelor of Science',
            'B.S':     'Bachelor of Science',
            'B.S.':    'Bachelor of Science',
            'BSc':     'Bachelor of Science',
            'B.Sc':    'Bachelor of Science',
            'B.Sc.':   'Bachelor of Science',
            'BA':      'Bachelor of Arts',
            'B.A':     'Bachelor of Arts',
            'B.A.':    'Bachelor of Arts',
            'BBA':     'Bachelor of Business Administration',
            'B.B.A':   'Bachelor of Business Administration',
            'B.B.A.':  'Bachelor of Business Administration',
            'BFA':     'Bachelor of Fine Arts',
            'B.F.A':   'Bachelor of Fine Arts',
            'B.F.A.':  'Bachelor of Fine Arts',
            'BEd':     'Bachelor of Education',
            'B.Ed':    'Bachelor of Education',
            'B.Ed.':   'Bachelor of Education',
            'BSW':     'Bachelor of Social Work',
            'B.S.W':   'Bachelor of Social Work',
            'BPA':     'Bachelor of Public Administration',
            'BSCS':    'Bachelor of Science in Computer Science',
            'BSEE':    'Bachelor of Science in Electrical Engineering',
            'BSME':    'Bachelor of Science in Mechanical Engineering',
            'BSCE':    'Bachelor of Science in Civil Engineering',
            'BSBA':    'Bachelor of Science in Business Administration',
            'BSIT':    'Bachelor of Science in Information Technology',
            'BSPH':    'Bachelor of Science in Public Health',
            'BAS':     'Bachelor of Applied Science',
            'BCJ':     'Bachelor of Criminal Justice',
            'BPS':     'Bachelor of Professional Studies',
            'BLS':     'Bachelor of Liberal Studies',
            'BIS':     'Bachelor of Interdisciplinary Studies',
            'BMus':    'Bachelor of Music',
            'B.Mus':   'Bachelor of Music',
            'BArch':   'Bachelor of Architecture',
            'B.Arch':  'Bachelor of Architecture',
            'BSN':     'Bachelor of Science in Nursing',
            'BPharm':  'Bachelor of Pharmacy',
            'BSPT':    'Bachelor of Science in Physical Therapy',

            # ─── Master Degrees ─────────────────────────
            'MS':      'Master of Science',
            'M.S':     'Master of Science',
            'M.S.':    'Master of Science',
            'MSc':     'Master of Science',
            'M.Sc':    'Master of Science',
            'M.Sc.':   'Master of Science',
            'MA':      'Master of Arts',
            'M.A':     'Master of Arts',
            'M.A.':    'Master of Arts',
            'MBA':     'Master of Business Administration',
            'MBA.':    'Master of Business Administration',
            'M.B.A':   'Master of Business Administration',
            'M.B.A.':  'Master of Business Administration',
            'MFA':     'Master of Fine Arts',
            'M.F.A':   'Master of Fine Arts',
            'M.F.A.':  'Master of Fine Arts',
            'MEd':     'Master of Education',
            'M.Ed':    'Master of Education',
            'M.Ed.':   'Master of Education',
            'MPA':     'Master of Public Administration',
            'M.P.A':   'Master of Public Administration',
            'MPS':     'Master of Professional Studies',
            'MPH':     'Master of Public Health',
            'M.P.H':   'Master of Public Health',
            'MSW':     'Master of Social Work',
            'M.S.W':   'Master of Social Work',
            'MArch':   'Master of Architecture',
            'M.Arch':  'Master of Architecture',
            'MCJ':     'Master of Criminal Justice',
            'MLS':     'Master of Liberal Studies',
            'MMus':    'Master of Music',
            'M.Mus':   'Master of Music',
            'MLIS':    'Master of Library and Information Science',
            'MIS':     'Master of Information Systems',
            'MSCS':    'Master of Science in Computer Science',
            'MSEE':    'Master of Science in Electrical Engineering',
            'MSMIS':   'Master of Science in Management Information Systems',
            'MDes':    'Master of Design',
            'MHA':     'Master of Health Administration',
            'MHRM':    'Master of Human Resource Management',
            'MEM':     'Master of Engineering Management',
            'MTM':     'Master of Technology Management',
            'MIM':     'Master of International Management',
            'MSF':     'Master of Science in Finance',
            'MFin':    'Master of Finance',
            'MPhil':   'Master of Philosophy',
            'M.Phil':  'Master of Philosophy',
            'M.Phil.': 'Master of Philosophy',

            # ─── Professional Degrees ───────────────────
            'JD':      'Juris Doctor',
            'J.D':     'Juris Doctor',
            'J.D.':    'Juris Doctor',
            'MD':      'Doctor of Medicine',
            'M.D':     'Doctor of Medicine',
            'M.D.':    'Doctor of Medicine',
            'DO':      'Doctor of Osteopathic Medicine',
            'D.O':     'Doctor of Osteopathic Medicine',
            'D.O.':    'Doctor of Osteopathic Medicine',
            'DDS':     'Doctor of Dental Surgery',
            'D.D.S':   'Doctor of Dental Surgery',
            'D.D.S.':  'Doctor of Dental Surgery',
            'DMD':     'Doctor of Dental Medicine',
            'D.M.D':   'Doctor of Dental Medicine',
            'PharmD':  'Doctor of Pharmacy',
            'Pharm.D': 'Doctor of Pharmacy',
            'DVM':     'Doctor of Veterinary Medicine',
            'D.V.M':   'Doctor of Veterinary Medicine',
            'OD':      'Doctor of Optometry',
            'O.D':     'Doctor of Optometry',
            'DPT':     'Doctor of Physical Therapy',
            'DNP':     'Doctor of Nursing Practice',
            'AuD':     'Doctor of Audiology',
            'Au.D':    'Doctor of Audiology',
            'PsyD':    'Doctor of Psychology',
            'Psy.D':   'Doctor of Psychology',
            'DC':      'Doctor of Chiropractic',
            'D.C':     'Doctor of Chiropractic',
            'DPM':     'Doctor of Podiatric Medicine',
            'LLB':     'Bachelor of Laws',
            'LL.B':    'Bachelor of Laws',
            'LLM':     'Master of Laws',
            'LL.M':    'Master of Laws',
            'LL.M.':   'Master of Laws',
            'LLD':     'Doctor of Laws',
            'LL.D':    'Doctor of Laws',
            'SJD':     'Doctor of Juridical Science',
            'S.J.D':   'Doctor of Juridical Science',
            'MCL':     'Master of Comparative Law',
            'ThD':     'Doctor of Theology',
            'Th.D':    'Doctor of Theology',
            'MDiv':    'Master of Divinity',
            'M.Div':   'Master of Divinity',

            # ─── Doctoral Degrees ───────────────────────
            'PhD':       'Doctor of Philosophy',
            'Ph.D':      'Doctor of Philosophy',
            'Ph.D.':     'Doctor of Philosophy',
            'DPhil':     'Doctor of Philosophy',
            'D.Phil':    'Doctor of Philosophy',
            'D.Phil.':   'Doctor of Philosophy',
            'EdD':       'Doctor of Education',
            'Ed.D':      'Doctor of Education',
            'Ed.D.':     'Doctor of Education',
            'DBA':       'Doctor of Business Administration',
            'D.B.A':     'Doctor of Business Administration',
            'DSW':       'Doctor of Social Work',
            'DPA':       'Doctor of Public Administration',
            'Doctorate': 'Doctor of Philosophy',
            'DrPH':      'Doctor of Public Health',
            'Dr.PH':     'Doctor of Public Health',
            'DSc':       'Doctor of Science',
            'D.Sc':      'Doctor of Science',
            'D.Sc.':     'Doctor of Science',
            'ScD':       'Doctor of Science',
            'Sc.D':      'Doctor of Science',
            'DA':        'Doctor of Arts',
            'DLitt':     'Doctor of Letters',
            'D.Litt':    'Doctor of Letters',
            'LittD':     'Doctor of Letters',
            'Litt.D':    'Doctor of Letters',
            'DMus':      'Doctor of Music',
            'D.Mus':     'Doctor of Music',
            'DArch':     'Doctor of Architecture',
            'DFA':       'Doctor of Fine Arts',

            # ═══════════════════════════════════════════
            # 🇮🇳 INDIA
            # ═══════════════════════════════════════════

            'B.E':          'Bachelor of Engineering',
            'B.E.':         'Bachelor of Engineering',
            'BE':           'Bachelor of Engineering',
            'B.Tech':       'Bachelor of Technology',
            'B.Tech.':      'Bachelor of Technology',
            'BTech':        'Bachelor of Technology',
            'B.Tech(Hons)': 'Bachelor of Technology (Honours)',
            'M.Tech':       'Master of Technology',
            'M.Tech.':      'Master of Technology',
            'MTech':        'Master of Technology',
            'M.E':          'Master of Engineering',
            'M.E.':         'Master of Engineering',
            'ME':           'Master of Engineering',
            'B.Com':        'Bachelor of Commerce',
            'B.Com.':       'Bachelor of Commerce',
            'BCom':         'Bachelor of Commerce',
            'B.Com(Hons)':  'Bachelor of Commerce (Honours)',
            'M.Com':        'Master of Commerce',
            'M.Com.':       'Master of Commerce',
            'MCom':         'Master of Commerce',
            'BBA.':         'Bachelor of Business Administration',
            'MBA.':         'Master of Business Administration',
            'PGDM':         'Post Graduate Diploma in Management',
            'P.G.D.M':      'Post Graduate Diploma in Management',
            'BCA':          'Bachelor of Computer Applications',
            'BCA.':         'Bachelor of Computer Applications',
            'MCA':          'Master of Computer Applications',
            'MCA.':         'Master of Computer Applications',
            'BHM':          'Bachelor of Hotel Management',
            'B.H.M':        'Bachelor of Hotel Management',
            'MHM':          'Master of Hotel Management',
            'B.Sc(Hons)':   'Bachelor of Science (Honours)',
            'B.A(Hons)':    'Bachelor of Arts (Honours)',
            'B.A.(Hons)':   'Bachelor of Arts (Honours)',
            'B.Ed':         'Bachelor of Education',
            'B.Ed.':        'Bachelor of Education',
            'M.Ed':         'Master of Education',
            'M.Ed.':        'Master of Education',
            'D.Ed':         'Diploma in Education',
            'D.El.Ed':      'Diploma in Elementary Education',
            'B.P.Ed':       'Bachelor of Physical Education',
            'M.P.Ed':       'Master of Physical Education',
            'MBBS':         'Bachelor of Medicine and Bachelor of Surgery',
            'M.B.B.S':      'Bachelor of Medicine and Bachelor of Surgery',
            'BDS':          'Bachelor of Dental Surgery',
            'B.D.S':        'Bachelor of Dental Surgery',
            'MDS':          'Master of Dental Surgery',
            'M.D.S':        'Master of Dental Surgery',
            'BAMS':         'Bachelor of Ayurvedic Medicine and Surgery',
            'B.A.M.S':      'Bachelor of Ayurvedic Medicine and Surgery',
            'BHMS':         'Bachelor of Homeopathic Medicine and Surgery',
            'B.H.M.S':      'Bachelor of Homeopathic Medicine and Surgery',
            'BUMS':         'Bachelor of Unani Medicine and Surgery',
            'B.U.M.S':      'Bachelor of Unani Medicine and Surgery',
            'BNYS':         'Bachelor of Naturopathy and Yogic Sciences',
            'B.Pharm':      'Bachelor of Pharmacy',
            'B.Pharm.':     'Bachelor of Pharmacy',
            'MPharm':       'Master of Pharmacy',
            'M.Pharm':      'Master of Pharmacy',
            'BPT':          'Bachelor of Physiotherapy',
            'B.P.T':        'Bachelor of Physiotherapy',
            'MPT':          'Master of Physiotherapy',
            'BOT':          'Bachelor of Occupational Therapy',
            'BVSC':         'Bachelor of Veterinary Science',
            'B.V.Sc':       'Bachelor of Veterinary Science',
            'MVSc':         'Master of Veterinary Science',
            'M.Arch':       'Master of Architecture',
            'B.Plan':       'Bachelor of Planning',
            'M.Plan':       'Master of Planning',
            'B.Des':        'Bachelor of Design',
            'M.Des':        'Master of Design',
            'B.Lib':        'Bachelor of Library Science',
            'B.Lib.Sc':     'Bachelor of Library Science',
            'M.Lib':        'Master of Library Science',
            'M.Lib.Sc':     'Master of Library Science',
            'BJ':           'Bachelor of Journalism',
            'BJC':          'Bachelor of Journalism and Communication',
            'BJMC':         'Bachelor of Journalism and Mass Communication',
            'MJMC':         'Master of Journalism and Mass Communication',
            'BStats':       'Bachelor of Statistics',
            'B.Stat':       'Bachelor of Statistics',
            'MStat':        'Master of Statistics',
            'M.Stat':       'Master of Statistics',
            'IMSc':         'Integrated Master of Science',
            'IMTech':       'Integrated Master of Technology',
            'DD':           'Dual Degree',
            'B.Voc':        'Bachelor of Vocation',
            'PGDBA':        'Post Graduate Diploma in Business Administration',
            'PGDCA':        'Post Graduate Diploma in Computer Applications',
            'DPharm':       'Diploma in Pharmacy',
            'D.Pharm':      'Diploma in Pharmacy',
            'GNM':          'General Nursing and Midwifery',
            'ANM':          'Auxiliary Nurse Midwifery',
            'B.Sc Nursing': 'Bachelor of Science in Nursing',
            'M.Sc Nursing': 'Master of Science in Nursing',

            # ═══════════════════════════════════════════
            # 🇬🇧 UNITED KINGDOM
            # ═══════════════════════════════════════════

            'BA(Hons)':    'Bachelor of Arts (Honours)',
            'BSc(Hons)':   'Bachelor of Science (Honours)',
            'BEng':        'Bachelor of Engineering',
            'B.Eng':       'Bachelor of Engineering',
            'BEng(Hons)':  'Bachelor of Engineering (Honours)',
            'MEng':        'Master of Engineering',
            'M.Eng':       'Master of Engineering',
            'MChem':       'Master of Chemistry',
            'MPhys':       'Master of Physics',
            'MMath':       'Master of Mathematics',
            'MBiochem':    'Master of Biochemistry',
            'MBiol':       'Master of Biology',
            'MGeol':       'Master of Geology',
            'MA(Hons)':    'Master of Arts (Honours)',
            'MSc(Hons)':   'Master of Science (Honours)',
            'MSci':        'Master of Natural Sciences',
            'BMed':        'Bachelor of Medicine',
            'MBChB':       'Bachelor of Medicine and Bachelor of Surgery',
            'MB.ChB':      'Bachelor of Medicine and Bachelor of Surgery',
            'MBBCh':       'Bachelor of Medicine and Bachelor of Surgery',
            'MB BChir':    'Bachelor of Medicine and Bachelor of Surgery',
            'BMBCh':       'Bachelor of Medicine and Bachelor of Surgery',
            'BChir':       'Bachelor of Surgery',
            'BCh':         'Bachelor of Surgery',
            'ChM':         'Master of Surgery',
            'MCh':         'Master of Surgery',
            'BVetMed':     'Bachelor of Veterinary Medicine',
            'BVSc':        'Bachelor of Veterinary Science',
            'BN':          'Bachelor of Nursing',
            'BNurs':       'Bachelor of Nursing',
            'LLB(Hons)':   'Bachelor of Laws (Honours)',
            'GDL':         'Graduate Diploma in Law',
            'LPC':         'Legal Practice Course',
            'BPTC':        'Bar Professional Training Course',
            'PGCE':        'Postgraduate Certificate in Education',
            'QTS':         'Qualified Teacher Status',
            'BEd(Hons)':   'Bachelor of Education (Honours)',
            'HND':         'Higher National Diploma',
            'HNC':         'Higher National Certificate',
            'DipHE':       'Diploma of Higher Education',
            'CertHE':      'Certificate of Higher Education',
            'FdA':         'Foundation Degree in Arts',
            'FdSc':        'Foundation Degree in Science',
            'FdEng':       'Foundation Degree in Engineering',

            # ═══════════════════════════════════════════
            # 🇦🇺 AUSTRALIA & NEW ZEALAND
            # ═══════════════════════════════════════════

            'GradDip':     'Graduate Diploma',
            'GradDipEd':   'Graduate Diploma in Education',
            'GradCert':    'Graduate Certificate',
            'BAppSc':      'Bachelor of Applied Science',
            'B.App.Sc':    'Bachelor of Applied Science',
            'BAppSci':     'Bachelor of Applied Science',
            'BEconSc':     'Bachelor of Economic Science',
            'BMedSci':     'Bachelor of Medical Science',
            'BJuris':      'Bachelor of Jurisprudence',
            'BBiomedSc':   'Bachelor of Biomedical Science',
            'BPsych':      'Bachelor of Psychology',
            'BSpPath':     'Bachelor of Speech Pathology',
            'BOccThy':     'Bachelor of Occupational Therapy',
            'BPhty':       'Bachelor of Physiotherapy',
            'BOptom':      'Bachelor of Optometry',
            'MBiostat':    'Master of Biostatistics',
            'MClinPsych':  'Master of Clinical Psychology',
            'MClinSci':    'Master of Clinical Science',
            'MEnvSc':      'Master of Environmental Science',
            'MIntBus':     'Master of International Business',
            'MNurs':       'Master of Nursing',
            'MPsy':        'Master of Psychology',
            'MSpPath':     'Master of Speech Pathology',
            'DPsych':      'Doctor of Psychology',
            'DClinPsych':  'Doctor of Clinical Psychology',
            'DEdPsych':    'Doctor of Educational Psychology',
            'MBBSHons':    'Bachelor of Medicine and Bachelor of Surgery (Honours)',
            'MDSc':        'Doctor of Dental Science',
            'BForSc':      'Bachelor of Forensic Science',
            'BActSt':      'Bachelor of Actuarial Studies',
            'BAcc':        'Bachelor of Accounting',
            'BComm':       'Bachelor of Commerce',
            'B.Comm':      'Bachelor of Commerce',

            # ═══════════════════════════════════════════
            # 🇨🇦 CANADA
            # ═══════════════════════════════════════════

            'BPE':     'Bachelor of Physical Education',
            'BKin':    'Bachelor of Kinesiology',
            'BHSc':    'Bachelor of Health Sciences',
            'BHK':     'Bachelor of Human Kinetics',
            'BScPhm':  'Bachelor of Science in Pharmacy',
            'MScPhm':  'Master of Science in Pharmacy',
            'BScN':    'Bachelor of Science in Nursing',
            'BMLSc':   'Bachelor of Medical Laboratory Science',
            'BMgt':    'Bachelor of Management',
            'MScMgt':  'Master of Science in Management',
            'JSD':     'Doctor of the Science of Law',
            'BCL':     'Bachelor of Civil Law',
            'LLL':     'Licentiate in Laws',
            'DCL':     'Doctor of Civil Law',
            'BPhEd':   'Bachelor of Physical Education',

            # ═══════════════════════════════════════════
            # 🇩🇪 GERMANY / 🇦🇹 AUSTRIA / 🇨🇭 SWITZERLAND
            # ═══════════════════════════════════════════

            'Dipl-Ing':      'Diplom-Ingenieur',
            'Dipl.-Ing':     'Diplom-Ingenieur',
            'Dipl.-Ing.':    'Diplom-Ingenieur',
            'Dipl-Kfm':      'Diplom-Kaufmann',
            'Dipl.-Kfm':     'Diplom-Kaufmann',
            'Dipl-Phys':     'Diplom-Physiker',
            'Dipl.-Phys':    'Diplom-Physiker',
            'Dipl-Math':     'Diplom-Mathematiker',
            'Dipl.-Math':    'Diplom-Mathematiker',
            'Dipl-Inf':      'Diplom-Informatiker',
            'Dipl.-Inf':     'Diplom-Informatiker',
            'Dipl-Biol':     'Diplom-Biologe',
            'Dipl.-Biol':    'Diplom-Biologe',
            'Dipl-Chem':     'Diplom-Chemiker',
            'Dipl.-Chem':    'Diplom-Chemiker',
            'Dipl-Psych':    'Diplom-Psychologe',
            'Dipl.-Psych':   'Diplom-Psychologe',
            'Dipl-Sozarb':   'Diplom-Sozialarbeiter',
            'Dipl-Päd':      'Diplom-Pädagoge',
            'Dr.rer.nat':    'Doktor rerum naturalium',
            'Dr.rer.nat.':   'Doktor rerum naturalium',
            'Dr.ing':        'Doktor-Ingenieur',
            'Dr.-Ing':       'Doktor-Ingenieur',
            'Dr.-Ing.':      'Doktor-Ingenieur',
            'Dr.phil':       'Doktor der Philosophie',
            'Dr.phil.':      'Doktor der Philosophie',
            'Dr.rer.soc':    'Doktor rerum socialium',
            'Dr.oec':        'Doktor oeconomiae',
            'Dr.jur':        'Doktor der Rechtswissenschaft',
            'Dr.jur.':       'Doktor der Rechtswissenschaft',
            'Dr.med':        'Doktor der Medizin',
            'Dr.med.':       'Doktor der Medizin',
            'Dr.med.dent':   'Doktor der Zahnmedizin',
            'Dr.rer.pol':    'Doktor rerum politicarum',
            'Dr.theol':      'Doktor der Theologie',
            'Staatsexamen':  'State Examination',
            'Magister':      'Magister Artium',
            'Mag':           'Magister',
            'Mag.':          'Magister',
            'Bakk':          'Bakkalaureus',
            'FH-Bachelor':   'Bachelor (University of Applied Sciences)',
            'FH-Master':     'Master (University of Applied Sciences)',

            # ═══════════════════════════════════════════
            # 🇫🇷 FRANCE
            # ═══════════════════════════════════════════

            'Licence':       'Licence',
            'Licence Pro':   'Licence Professionnelle',
            'DUT':           'Diplôme Universitaire de Technologie',
            'BTS':           'Brevet de Technicien Supérieur',
            'BTSA':          'Brevet de Technicien Supérieur Agricole',
            'DEUG':          "Diplôme d'Études Universitaires Générales",
            'Maîtrise':      'Maîtrise',
            'DEA':           "Diplôme d'Études Approfondies",
            'DESS':          "Diplôme d'Études Supérieures Spécialisées",
            'Master':        'Master',
            'Master 1':      'Master 1',
            'Master 2':      'Master 2',
            'Doctorat':      'Doctorat',
            'Habilitation':  'Habilitation à Diriger des Recherches',
            'HDR':           'Habilitation à Diriger des Recherches',
            'CPGE':          'Classe Préparatoire aux Grandes Écoles',
            'Ingénieur':     "Diplôme d'Ingénieur",
            'IUT':           'Institut Universitaire de Technologie Diploma',
            'DCEM':          'Deuxième Cycle des Études Médicales',
            'PCEM':          'Premier Cycle des Études Médicales',
            'CES':           "Certificat d'Études Spécialisées",

            # ═══════════════════════════════════════════
            # 🇳🇱 NETHERLANDS / 🇧🇪 BELGIUM (Dutch)
            # ═══════════════════════════════════════════

            'Kandidaat':     'Kandidaat',
            'Propaedeuse':   'Propaedeuse',
            'Drs':           'Doctorandus',
            'Drs.':          'Doctorandus',
            'Ir':            'Ingenieur (Netherlands)',
            'Ir.':           'Ingenieur (Netherlands)',
            'Mr':            'Meester in de rechten',
            'Mr.':           'Meester in de rechten',
            'Dr':            'Doctor',
            'Dr.':           'Doctor',
            'HBO-Bachelor':  'Bachelor (University of Applied Sciences, Netherlands)',
            'HBO-Master':    'Master (University of Applied Sciences, Netherlands)',
            'WO-Bachelor':   'Bachelor (Research University, Netherlands)',
            'WO-Master':     'Master (Research University, Netherlands)',

            # ═══════════════════════════════════════════
            # 🇸🇪 SWEDEN / 🇳🇴 NORWAY / 🇩🇰 DENMARK / 🇫🇮 FINLAND
            # ═══════════════════════════════════════════

            'Kandidat':           'Bachelor (Scandinavia)',
            'Fil.kand':           'Filosofie Kandidat',
            'Fil.kand.':          'Filosofie Kandidat',
            'Fil.mag':            'Filosofie Magister',
            'Fil.mag.':           'Filosofie Magister',
            'Fil.dr':             'Filosofie Doktor',
            'Fil.dr.':            'Filosofie Doktor',
            'Tekn.dr':            'Teknologie Doktor',
            'Tekn.dr.':           'Teknologie Doktor',
            'Tekn.lic':           'Teknologie Licentiat',
            'Civ.ing':            'Civilingenjör',
            'Civ.ing.':           'Civilingenjör',
            'Civ.ek':             'Civilekonom',
            'Civ.ek.':            'Civilekonom',
            'Med.dr':             'Medicine Doktor',
            'Jurist':             'Jurist',
            'Juris kandidat':     'Juris Kandidat',
            'LicMed':             'Licentiate in Medicine',
            'LicPhil':            'Licentiate in Philosophy',
            'KTH-MSc':            'Master of Science (KTH)',
            'Sivilingeniør':      'Master of Science in Engineering (Norway)',
            'Siviløkonom':        'Master of Business (Norway)',
            'Cand.mag':           'Candidatus/Candidata Magisterii',
            'Cand.mag.':          'Candidatus/Candidata Magisterii',
            'Cand.scient':        'Candidatus/Candidata Scientiarum',
            'Cand.jur':           'Candidatus/Candidata Juris',
            'Cand.med':           'Candidatus/Candidata Medicinae',
            'Cand.merc':          'Candidatus/Candidata Mercaturae',
            'Cand.polit':         'Candidatus/Candidata Politicarum',
            'Cand.psych':         'Candidatus/Candidata Psychologiae',
            'Cand.oecon':         'Candidatus/Candidata Oeconomices',
            'Cand.ling.merc':     'Candidatus/Candidata Linguae Mercatoriae',
            'Dr.philos':          'Doctor Philosophiae (Scandinavia)',
            'Dr.scient':          'Doctor Scientiarum',

            # ═══════════════════════════════════════════
            # 🇷🇺 RUSSIA / CIS COUNTRIES
            # ═══════════════════════════════════════════

            'Bakalavr':        'Bachelor (Russia)',
            'Specialist':      'Specialist Diploma (Russia)',
            'Magistr':         'Master (Russia)',
            'Kandidat nauk':   'Candidate of Sciences',
            'Doktor nauk':     'Doctor of Sciences',
            'Aspirantura':     'Postgraduate Research Degree (Russia)',
            'Doctorantura':    'Doctoral Research Degree (Russia)',

            # ═══════════════════════════════════════════
            # 🇯🇵 JAPAN
            # ═══════════════════════════════════════════

            'Gakushi':       'Bachelor (Japan)',
            'Shushi':        'Master (Japan)',
            'Hakase':        'Doctor (Japan)',
            'Juris Master':  'Juris Master (Japan)',
            'Hōmu Hakase':   'Doctor of Laws (Japan)',

            # ═══════════════════════════════════════════
            # 🇨🇳 CHINA
            # ═══════════════════════════════════════════

            'Zhuanke':  'Associate Degree (China)',
            'Benkezi':  'Bachelor (China)',
            'Shuoshi':  'Master (China)',
            'Boshi':    'Doctor of Philosophy (China)',

            # ═══════════════════════════════════════════
            # 🇧🇷 BRAZIL / 🇵🇹 PORTUGAL
            # ═══════════════════════════════════════════

            'Bacharelado':     'Bachelor (Brazil)',
            'Licenciatura':    'Bachelor/Teaching Degree (Brazil/Portugal)',
            'Tecnólogo':       'Technologist Degree (Brazil)',
            'Especialização':  'Specialization (Brazil)',
            'Mestrado':        'Master (Brazil)',
            'Mestrado Prof':   'Professional Master (Brazil)',
            'Doutorado':       'Doctorate (Brazil)',
            'Pós-Doutorado':   'Post-Doctorate (Brazil)',

            # ═══════════════════════════════════════════
            # 🇪🇸 SPAIN / 🇲🇽 MEXICO / LATIN AMERICA
            # ═══════════════════════════════════════════

            'Licenciado':     'Bachelor (Spain/Latin America)',
            'Lic':            'Licenciado',
            'Lic.':           'Licenciado',
            'Grado':          'Bachelor (Spain - Bologna)',
            'Máster':         'Master (Spain)',
            'Master Oficial': 'Official Master (Spain)',
            'Doctorado':      'Doctorate (Spain)',
            'Doctor':         'Doctor (Spain/Latin America)',
            'Ingeniero':      'Engineer (Spain)',
            'Ing':            'Ingeniero',
            'Ing.':           'Ingeniero',
            'Arquitecto':     'Architect (Spain)',
            'Arq':            'Arquitecto',
            'Arq.':           'Arquitecto',
            'Abogado':        'Lawyer (Spain/Latin America)',
            'Especialidad':   'Specialization (Mexico/Latin America)',

            # ═══════════════════════════════════════════
            # 🇮🇹 ITALY
            # ═══════════════════════════════════════════

            'Laurea Triennale':    'Bachelor (Italy)',
            'Laurea':              'Bachelor/Master (Italy)',
            'Laurea Magistrale':   'Master (Italy)',
            'Laurea Specialistica':'Specialist Master (Italy)',
            'Laurea V.O':          'Old System Degree (Italy)',
            'Dottorato':           'Doctorate (Italy)',
            'Dott':                'Dottore',
            'Dott.':               'Dottore',
            'Dott.ssa':            'Dottoressa',
            'Specializzazione':    'Specialization (Italy)',
            'Master Universitario':'University Master (Italy)',

            # ═══════════════════════════════════════════
            # 🇵🇰 PAKISTAN / 🇧🇩 BANGLADESH / 🇱🇰 SRI LANKA
            # ═══════════════════════════════════════════

            'BSc(Eng)':     'Bachelor of Science in Engineering',
            'B.Sc(Eng)':    'Bachelor of Science in Engineering',
            'BScEngg':      'Bachelor of Science in Engineering',
            'MSc(Eng)':     'Master of Science in Engineering',
            'BVSc&AH':      'Bachelor of Veterinary Science and Animal Husbandry',
            'B.Sc.Ag':      'Bachelor of Science in Agriculture',
            'M.Sc.Ag':      'Master of Science in Agriculture',
            'BSocSci':      'Bachelor of Social Science',
            'MSocSci':      'Master of Social Science',

            # ═══════════════════════════════════════════
            # 🌍 AFRICA (General / Regional)
            # ═══════════════════════════════════════════

            'BTech(SA)':    'Bachelor of Technology (South Africa)',
            'BTechHons':    'Bachelor of Technology (Honours)',
            'BSocSc':       'Bachelor of Social Science',
            'BCurr':        'Bachelor of Curationis (Nursing, South Africa)',
            'BProc':        'Bachelor of Procurationis (Law, South Africa)',
            'LLB(SA)':      'Bachelor of Laws (South Africa)',
            'BComHons':     'Bachelor of Commerce (Honours)',
            'BScHons':      'Bachelor of Science (Honours)',
            'BScEng':       'Bachelor of Science in Engineering',
            'DEd':          'Doctor of Education (Africa)',
            'MBChB(SA)':    'Bachelor of Medicine and Surgery (South Africa)',
            'BPharm(SA)':   'Bachelor of Pharmacy (South Africa)',
            'BDS(SA)':      'Bachelor of Dental Surgery (South Africa)',
            'MTech(SA)':    'Master of Technology (South Africa)',
            'DTech':        'Doctor of Technology',
            'DLitt et Phil':'Doctor of Letters and Philosophy',
            'DChD':         'Doctor of Chiropractic (South Africa)',

            # ═══════════════════════════════════════════
            # 🌏 SOUTHEAST ASIA
            # ═══════════════════════════════════════════

            'SB':       'Bachelor of Science (MIT notation)',
            'AB':       'Bachelor of Arts (Harvard notation)',
            'Sarjana':  'Bachelor (Indonesia)',
            'S1':       'Sarjana 1 / Bachelor (Indonesia)',
            'S2':       'Sarjana 2 / Master (Indonesia)',
            'S3':       'Sarjana 3 / Doctorate (Indonesia)',
            'Magister': 'Master (Indonesia)',
            'Doktor':   'Doctor (Indonesia)',

            # ═══════════════════════════════════════════
            # 🏫 GENERAL / DIPLOMA / CERTIFICATE
            # ═══════════════════════════════════════════

            'Cert':              'Certificate',
            'Cert.':             'Certificate',
            'PGCert':            'Postgraduate Certificate',
            'PGDip':             'Postgraduate Diploma',
            'Dip':               'Diploma',
            'Dip.':              'Diploma',
            'AdvDip':            'Advanced Diploma',
            'Adv.Dip':           'Advanced Diploma',
            'Foundation Degree': 'Foundation Degree',
            'Assoc':             'Associate Degree',
            'Assoc.':            'Associate Degree',
            'HND':               'Higher National Diploma',
            'HNC':               'Higher National Certificate',
            'BTEC':              'Business and Technology Education Council Qualification',
            'NCTVET':            'National Council on Technical and Vocational Education and Training Certificate',
            'City&Guilds':       'City and Guilds Certification',

            # ═══════════════════════════════════════════
            # 💼 PROFESSIONAL CERTIFICATIONS
            # ═══════════════════════════════════════════

            'CPA':      'Certified Public Accountant',
            'CA':       'Chartered Accountant',
            'ACCA':     'Association of Chartered Certified Accountants',
            'CFA':      'Chartered Financial Analyst',
            'CFP':      'Certified Financial Planner',
            'PMP':      'Project Management Professional',
            'CISSP':    'Certified Information Systems Security Professional',
            'MCE':      'Microsoft Certified Engineer',
            'MCSE':     'Microsoft Certified Solutions Expert',
            'CCNA':     'Cisco Certified Network Associate',
            'CCNP':     'Cisco Certified Network Professional',
            'CEH':      'Certified Ethical Hacker',
            'AWS-SAA':  'AWS Certified Solutions Architect – Associate',
            'AWS-SAP':  'AWS Certified Solutions Architect – Professional',
            'GCP-ACE':  'Google Cloud Associate Cloud Engineer',
            'AZ-900':   'Microsoft Azure Fundamentals'
        }
        
        # Clean and normalize input
        clean_degree = raw_degree.strip()
        
        # Direct mapping
        if clean_degree in degree_mapping:
            return degree_mapping[clean_degree]
        
        # Pattern matching for variations
        for pattern, normalized in degree_mapping.items():
            if pattern.lower() in clean_degree.lower():
                return normalized
        
        # Return original if no mapping found
        return clean_degree
    
    def _is_valid_education_entry(self, education: Dict, block: str) -> bool:
        """
        Validate if an education entry is legitimate and not a false positive.
        
        Args:
            education: Extracted education dictionary
            block: Original text block
            
        Returns:
            True if valid education entry, False otherwise
        """
        degree = education.get('degree', '')
        institution = education.get('institution', '')
        
        # Filter out invalid degrees
        invalid_degrees = ['AWS', 'Pe', 'CA', 'CPA', 'PMP', 'CISSP', 'CEH', 'CCNA', 'CCNP']
        if degree in invalid_degrees:
            return False
        
        # Degree must be at least 3 characters
        if degree and len(degree) < 3:
            return False
        
        # Filter out medical/dental degrees that are unlikely for tech resumes
        # (unless there's a clear institution indicating it's real)
        medical_degrees = [
            'Doctor of Optometry', 'Doctor of Osteopathic Medicine', 
            'Doctor of Dental Surgery', 'Doctor of Dental Medicine',
            'Doctor of Veterinary Medicine', 'Doctor of Podiatric Medicine',
            'Doctor of Chiropractic', 'Doctor of Pharmacy'
        ]
        if degree in medical_degrees and not institution:
            # If no institution, likely a false match from certifications
            return False
        
        # Block should have some minimum content (not just a keyword)
        if len(block.strip()) < 15:
            return False
        
        # If degree exists but no institution and no years, likely invalid
        if degree and not institution and not education.get('start_year') and not education.get('end_year'):
            # Check if block has typical education indicators
            education_indicators = ['university', 'college', 'institute', 'school', 'gpa', 'graduated']
            if not any(indicator in block.lower() for indicator in education_indicators):
                return False
        
        return True
    
    def _mark_highest_degree(self, education_list: List[Dict]) -> List[Dict]:
        """
        Mark the highest degree in the education list.
        
        Args:
            education_list: List of education dictionaries
            
        Returns:
            Updated education list with highest degree marked
        """
        if not education_list:
            return education_list
        
        max_level = -1
        highest_degree_index = 0
        
        for i, edu in enumerate(education_list):
            degree = edu.get('degree', '')
            level = self._get_degree_level(degree)
            
            if level > max_level:
                max_level = level
                highest_degree_index = i
        
        # Mark the highest degree
        if highest_degree_index < len(education_list):
            education_list[highest_degree_index]['is_highest_degree'] = True
        
        return education_list
    
    def _get_degree_level(self, degree: str) -> int:
        """
        Get the hierarchy level of a degree.
        
        Args:
            degree: Degree name
            
        Returns:
            Hierarchy level (higher number = higher degree)
        """
        if not degree:
            return 0
        
        for normalized_degree, level in self.DEGREE_HIERARCHY.items():
            if normalized_degree.lower() in degree.lower():
                return level
        
        return 0
    
    def get_education_summary(self, education_list: List[Dict]) -> Dict:
        """
        Get summary statistics for education history.
        
        Args:
            education_list: List of education dictionaries
            
        Returns:
            Dictionary with education summary
        """
        try:
            summary = {
                'total_degrees': len(education_list),
                'highest_degree': '',
                'institutions': [],
                'fields_of_study': [],
                'average_gpa': None,
                'education_span_years': 0
            }
            
            if not education_list:
                return summary
            
            # Find highest degree
            for edu in education_list:
                if edu.get('is_highest_degree'):
                    summary['highest_degree'] = edu.get('degree', '')
                    break
            
            # Collect unique institutions and fields
            institutions = set()
            fields = set()
            gpa_values = []
            years = []
            
            for edu in education_list:
                if edu.get('institution'):
                    institutions.add(edu['institution'])
                if edu.get('field_of_study'):
                    fields.add(edu['field_of_study'])
                if edu.get('gpa'):
                    gpa_values.append(edu['gpa'])
                if edu.get('end_year'):
                    years.append(edu['end_year'])
            
            summary['institutions'] = sorted(list(institutions))
            summary['fields_of_study'] = sorted(list(fields))
            
            # Calculate average GPA
            if gpa_values:
                summary['average_gpa'] = round(sum(gpa_values) / len(gpa_values), 2)
            
            # Calculate education span
            if years:
                summary['education_span_years'] = max(years) - min(years)
            
            return summary
            
        except Exception as e:
            self.logger.error(f"Error calculating education summary: {e}")
            return {
                'total_degrees': 0,
                'highest_degree': '',
                'institutions': [],
                'fields_of_study': [],
                'average_gpa': None,
                'education_span_years': 0
            }


# Example usage and testing
if __name__ == "__main__":
    # Sample education text for testing
    sample_education = """
    Bachelor of Science in Computer Science
    University of Technology
    2014 - 2018
    GPA: 3.8
    
    Master of Technology in Software Engineering
    Indian Institute of Technology
    2019 - 2021
    CGPA: 8.5
    
    PhD in Artificial Intelligence
    Stanford University
    2022 - Present
    """
    
    extractor = EducationExtractor()
    
    # Test education extraction
    education_list = extractor.extract_education(sample_education)
    print(f"Extracted {len(education_list)} education entries:")
    
    for i, edu in enumerate(education_list, 1):
        print(f"\n{i}. {edu['degree']}")
        print(f"   Field: {edu['field_of_study']}")
        print(f"   Institution: {edu['institution']}")
        print(f"   Years: {edu['start_year']} - {edu['end_year']}")
        print(f"   GPA: {edu['gpa']}")
        print(f"   Highest Degree: {edu['is_highest_degree']}")
    
    # Test degree normalization
    test_degrees = ['BS', 'B.S.', 'M.S.', 'Ph.D', 'B.Tech', 'MBA']
    print(f"\nDegree Normalization:")
    for degree in test_degrees:
        normalized = extractor.normalize_degree(degree)
        print(f"{degree} -> {normalized}")
    
    # Test education summary
    summary = extractor.get_education_summary(education_list)
    print(f"\nEducation Summary:")
    print(f"Highest Degree: {summary['highest_degree']}")
    print(f"Total Degrees: {summary['total_degrees']}")
    print(f"Institutions: {', '.join(summary['institutions'])}")
    print(f"Average GPA: {summary['average_gpa']}")
