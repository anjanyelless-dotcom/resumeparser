#!/usr/bin/env python3
"""Build a normalized enterprise skills taxonomy for the AI resume parser."""
import json
import re
import ast
from pathlib import Path
from collections import defaultdict, Counter

BASE = Path(__file__).parent
OUTPUT = BASE / "unified_skills.json"
REPORT = BASE / "taxonomy_report.txt"

# ---------------------------------------------------------------------------
# Target categories
# ---------------------------------------------------------------------------
TARGET_CATEGORIES = [
    # Technology / IT
    "Technology",
    "Software Development",
    "Mobile Development",
    "Frontend",
    "Backend",
    "Full Stack",
    "DevOps",
    "Cloud Computing",
    "Cyber Security",
    "Networking",
    "Database Administration",
    "Data Engineering",
    "Data Science",
    "Machine Learning",
    "Artificial Intelligence",
    "Business Intelligence",
    "QA",
    "Automation Testing",
    "Embedded Systems",
    "Game Development",
    "Blockchain",
    "IoT",
    # Accounting / Finance
    "Accounting",
    "Finance",
    "Banking",
    "Investment Banking",
    "Insurance",
    "Taxation",
    "Audit",
    "Payroll",
    "Treasury",
    "Risk Management",
    # Legal
    "Legal",
    "Corporate Law",
    "Civil Law",
    "Criminal Law",
    "Tax Law",
    "IP Law",
    "Compliance",
    "Contract Management",
    "Litigation",
    "Arbitration",
    # Healthcare
    "Healthcare",
    "Nursing",
    "Medical Coding",
    "Medical Billing",
    "Pharmacy",
    "Dentistry",
    "Radiology",
    "Physiotherapy",
    "Laboratory",
    "Clinical Research",
    # Engineering
    "Engineering",
    "Mechanical",
    "Electrical",
    "Electronics",
    "Civil",
    "Automobile",
    "Chemical",
    "Petroleum",
    "Mining",
    "Industrial",
    # Construction / Manufacturing
    "Construction",
    "Architecture",
    "Interior Design",
    "Surveying",
    "Urban Planning",
    "Manufacturing",
    "Production",
    "Quality Control",
    "Supply Chain",
    "Procurement",
    "Inventory",
    "Warehouse",
    # HR
    "HR",
    "Recruitment",
    "Talent Acquisition",
    "HR Operations",
    "Learning & Development",
    "Compensation & Benefits",
    "Employee Relations",
    # Sales
    "Sales",
    "Inside Sales",
    "B2B Sales",
    "B2C Sales",
    "Retail Sales",
    "Channel Sales",
    "Enterprise Sales",
    # Marketing
    "Marketing",
    "Digital Marketing",
    "SEO",
    "SEM",
    "Content Marketing",
    "Performance Marketing",
    "Affiliate Marketing",
    "Brand Management",
    # Customer Support
    "Customer Support",
    "Technical Support",
    "Call Center",
    "CRM",
    "Help Desk",
    # Education
    "Education",
    "Teaching",
    "Training",
    "Curriculum Development",
    "E-learning",
    # Hospitality / Retail
    "Hospitality",
    "Hotel Management",
    "Travel",
    "Tourism",
    "Food & Beverage",
    "Housekeeping",
    "Retail",
    "Merchandising",
    "Store Operations",
    "POS Systems",
    # Other industries
    "Telecommunications",
    "Logistics",
    "Transportation",
    "Aviation",
    "Marine",
    "Agriculture",
    "Food Processing",
    "Energy",
    "Oil & Gas",
    "Renewable Energy",
    "Real Estate",
    "Government",
    "Public Administration",
    "NGO",
    "Research",
    "Biotechnology",
    "Fashion",
    "Textile",
    "Media",
    "Journalism",
    "Animation",
    "VFX",
    "Graphic Design",
    "UI/UX Design",
    "Product Management",
    "Project Management",
    "Business Analysis",
    "Consulting",
    "Operations",
    "Administration",
    "Export & Import",
    "E-commerce",
]

# ---------------------------------------------------------------------------
# Keyword-based classifier
# ---------------------------------------------------------------------------
CATEGORY_KEYWORDS = {
    "Frontend": ["frontend", "front-end", "front end", "react", "react.js", "angular", "vue", "vue.js", "next.js", "nuxt.js", "gatsby", "svelte", "ember", "jquery", "html", "html5", "css", "css3", "sass", "scss", "less", "tailwind", "bootstrap", "material ui", "styled components", "webpack", "vite", "babel", "browser", "dom", "spa", "responsive", "web design", "figma", "storybook", "d3.js", "chart.js", "three.js", "blade", "ejs", "handlebars", "mustache", "pug", "jade"],
    "Backend": ["backend", "back-end", "back end", "node.js", "nodejs", "express.js", "expressjs", "django", "flask", "fastapi", "spring", "spring boot", "laravel", "symfony", "codeigniter", "nestjs", ".net", "asp.net", "asp net", "ruby on rails", "rails", "php", "api", "rest", "graphql", "soap", "grpc", "microservices", "middleware", "oauth", "jwt", "sso", "saml", "ldap", "api gateway", "hibernate", "entity framework", "linq", "wcf", "soap ui", "postman"],
    "Mobile Development": ["mobile", "android", "ios", "swift", "objective-c", "react native", "flutter", "xamarin", "cordova", "ionic", "phonegap", "kotlin mobile", "java mobile", "mobile app", "mobile application", "appcelerator", "phonegap"],
    "Full Stack": ["full stack", "fullstack", "mern stack", "mean stack", "lamp stack", "django react", "node react", "full stack developer", "full-stack developer", "full stack web", "full stack application"],
    "DevOps": ["devops", "devsecops", "ci/cd", "cicd", "jenkins", "gitlab ci", "github actions", "circleci", "travis", "bamboo", "teamcity", "azure devops", "docker", "kubernetes", "k8s", "terraform", "ansible", "puppet", "chef", "vagrant", "packer", "prometheus", "grafana", "elk", "splunk", "nagios", "zabbix", "new relic", "datadog", "sre", "site reliability", "infrastructure", "iac", "infrastructure as code", "container", "orchestration", "helm", "argo cd", "flux", "consul", "vault", "nginx", "apache"],
    "Cloud Computing": ["cloud", "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud", "alibaba cloud", "oracle cloud", "ibm cloud", "digitalocean", "heroku", "vercel", "netlify", "firebase", "supabase", "render", "linode", "vultr", "ec2", "s3", "lambda", "rds", "dynamodb", "cloudfront", "route 53", "iam", "cloudformation", "azure functions", "gke", "aks", "eks", "compute engine", "bigquery", "cloud storage", "serverless", "iaas", "paas", "saas", "private cloud", "hybrid cloud", "multi-cloud", "cloud migration"],
    "Cyber Security": ["cyber security", "cybersecurity", "information security", "infosec", "network security", "application security", "appsec", "penetration testing", "pen test", "ethical hacking", "vulnerability assessment", "threat hunting", "incident response", "forensics", "malware analysis", "reverse engineering", "cryptography", "encryption", "firewall", "ids", "ips", "siem", "soc", "iso 27001", "iso 27002", "nist", "gdpr", "hipaa", "pci dss", "soc 2", "sox", "ssl", "tls", "vpn", "zero trust", "identity and access", "iam", "sso", "mfa", "public key infrastructure", "pki", "security audit", "risk assessment", "security operations"],
    "Networking": ["network", "networking", "cisco", "ccna", "ccnp", "ccie", "routing", "switching", "wan", "lan", "man", "tcp/ip", "udp", "dns", "dhcp", "vpn", "mpls", "bgp", "ospf", "eigrp", "vlan", "subnetting", "firewall", "load balancer", "wireless", "wifi", "5g", "4g", "lte", "voip", "sip", "sdn", "network security", "network monitoring", "packet tracer", "gns3", "wireshark"],
    "Database Administration": ["database", "database administration", "db admin", "dba", "sql", "mysql", "postgresql", "oracle", "microsoft sql server", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite", "mariadb", "neo4j", "dgraph", "couchbase", "couchdb", "firebase", "supabase", "db2", "informix", "sybase", "bigquery", "snowflake", "redshift", "azure sql", "google cloud sql", "rds", "data warehouse", "nosql", "acid", "normalization", "indexing", "query optimization", "stored procedure", "trigger", "view", "etl", "replication", "backup", "disaster recovery"],
    "Data Engineering": ["data engineering", "etl", "elt", "data pipeline", "pipeline", "apache spark", "spark", "hadoop", "kafka", "flink", "storm", "beam", "airflow", "luigi", "nifi", "databricks", "aws glue", "google dataflow", "azure data factory", "dbt", "data modeling", "data lake", "data warehouse", "data integration", "data migration", "streaming", "real time", "batch processing", "data ingestion", "data cleansing", "data transformation", "schema design", "delta lake", "apache iceberg", "hudi"],
    "Data Science": ["data science", "data scientist", "statistics", "statistical analysis", "probability", "hypothesis testing", "a/b testing", "regression", "classification", "clustering", "time series", "forecasting", "feature selection", "dimensionality reduction", "exploratory data analysis", "eda", "sas", "spss", "minitab", "stata", "r programming", "python", "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly", "data visualization", "predictive analytics", "prescriptive analytics", "experimental design", "sampling", "survey design"],
    "Machine Learning": ["machine learning", "ml", "supervised learning", "unsupervised learning", "reinforcement learning", "deep learning", "neural network", "tensorflow", "pytorch", "keras", "scikit-learn", "scikitlearn", "xgboost", "lightgbm", "catboost", "random forest", "svm", "support vector", "naive bayes", "k-means", "knn", "decision tree", "ensemble", "boosting", "bagging", "feature engineering", "model training", "model evaluation", "model deployment", "mlops", "computer vision", "natural language processing", "nlp", "hugging face", "transformers", "bert", "gpt", "llm", "large language model", "recommender system"],
    "Artificial Intelligence": ["artificial intelligence", "ai", "machine learning", "deep learning", "neural network", "generative ai", "genai", "large language model", "llm", "natural language processing", "nlp", "computer vision", "speech recognition", "recommendation system", "knowledge graph", "expert system", "autonomous system", "robotics", "cognitive computing", "ai ethics", "prompt engineering", "agentic ai", "aiops", "federated learning", "reinforcement learning", "transfer learning", "meta learning"],
    "Business Intelligence": ["business intelligence", "bi", "tableau", "power bi", "looker", "qlikview", "qlik sense", "cognos", "microstrategy", "ssrs", "ssis", "ssas", "dashboard", "kpi", "reporting", "olap", "data visualization", "metrics", "executive reporting", "ad hoc reporting", "business analytics", "performance management", "balanced scorecard", "data storytelling", "semantic layer"],
    "QA": ["qa", "quality assurance", "manual testing", "test plan", "test case", "bug tracking", "jira", "testrail", "qtest", "black box", "white box", "functional testing", "regression testing", "uat", "user acceptance", "integration testing", "system testing", "smoke testing", "sanity testing", "exploratory testing", "uat", "acceptance criteria", "defect management", "qa process"],
    "Automation Testing": ["automation testing", "automated testing", "test automation", "selenium", "cypress", "playwright", "webdriver", "wdio", "appium", "robot framework", "testng", "junit", "pytest", "unittest", "bdd", "cucumber", "specflow", "gherkin", "continuous testing", "ci testing", "api testing", "performance testing", "load testing", "jmeter", "k6", "postman", "soapui", "rest assured"],
    "Embedded Systems": ["embedded", "embedded system", "microcontroller", "mcu", "microprocessor", "mpu", "arm", "cortex", "raspberry pi", "arduino", "rtos", "freertos", "embedded linux", "firmware", "iot", "bare metal", "verilog", "vhdl", "fpga", "plc", "scada", "industrial automation", "sensor", "actuator", "can bus", "modbus", "spi", "i2c", "uart", "gpio", "adc", "dac", "pcb", "keil", "iar", "mbed"],
    "Game Development": ["game development", "game design", "game programming", "unity", "unreal engine", "godot", "cryengine", "game ai", "level design", "3d modeling", "animation", "maya", "blender", "3ds max", "zbrush", "substance painter", "shader", "opengl", "directx", "vulkan", "physics engine", "multiplayer", "matchmaking", "procedural generation", "pcg", "game engine", "sprite", "tilemap", "collision detection", "pathfinding", "vr game", "ar game"],
    "Blockchain": ["blockchain", "ethereum", "bitcoin", "solidity", "smart contract", "web3", "defi", "nft", "crypto", "cryptocurrency", "hyperledger", "corda", "quorum", "distributed ledger", "consensus", "mining", "staking", "tokenomics", "layer 2", "zero knowledge", "zk", "zk-snarks", "cryptography", "wallet", "dapp", "dao", "token standard", "erc-20", "erc-721"],
    "IoT": ["iot", "internet of things", "mqtt", "coap", "http", "ble", "bluetooth low energy", "lora", "zigbee", "z-wave", "thread", "matter", "sensor", "actuator", "edge computing", "fog computing", "embedded", "arduino", "raspberry pi", "smart device", "home automation", "industrial iot", "iiot", "telemetry", "real-time operating system", "rtos", "opc-ua", "modbus", "can bus", "lwm2m"],
    "Software Development": ["software development", "software engineering", "programming", "coding", "agile", "scrum", "kanban", "extreme programming", "xp", "test driven development", "tdd", "behavior driven development", "bdd", "pair programming", "code review", "clean code", "solid", "dry", "kiss", "design pattern", "object oriented", "functional programming", "procedural programming", "uml", "sdlc", "version control", "git", "github", "gitlab", "bitbucket", "mercurial", "svn", "api design", "sdk", "framework", "library"],
    "Technology": ["technology", "it", "information technology", "computer", "software", "hardware", "technical", "tech stack", "emerging technology", "digital transformation", "it strategy", "it governance", "it service management", "itsm", "enterprise architecture", "solution architecture", "technical architecture"],

    # Accounting / Finance
    "Accounting": ["accounting", "accounts payable", "accounts receivable", "general ledger", "bookkeeping", "financial accounting", "management accounting", "cost accounting", "corporate accounting", "project accounting", "payroll accounting", "inventory accounting", "fixed asset", "revenue recognition", "bank reconciliation", "journal entries", "month-end", "year-end", "financial reporting", "balance sheet", "profit and loss", "cash flow", "trial balance", "chart of accounts", "ifrs", "gaap", "accounting standards", "ledger reconciliation", "expense management", "quickbooks", "tally", "tallyprime", "sap fico", "oracle financials", "xero", "zoho books", "freshbooks", "wave"],
    "Finance": ["finance", "financial planning", "financial analysis", "financial modeling", "budgeting", "forecasting", "variance analysis", "corporate finance", "treasury", "cash management", "working capital", "investment analysis", "capital budgeting", "business valuation", "risk management", "portfolio management", "credit analysis", "equity research", "debt financing", "mergers and acquisitions", "m&a", "fund management", "commercial lending", "retail banking", "corporate banking"],
    "Banking": ["banking", "retail banking", "corporate banking", "investment banking", "commercial banking", "private banking", "wholesale banking", "branch banking", "digital banking", "core banking", "loan processing", "credit analysis", "underwriting", "mortgage", "letters of credit", "trade finance", "correspondent banking", "kyc", "aml", "anti money laundering", "swift", "payment gateway", "neft", "rtgs", "upi", "mobile banking", "internet banking", "finacle", "temenos"],
    "Investment Banking": ["investment banking", "m&a", "mergers and acquisitions", "due diligence", "valuation", "financial modeling", "pitch book", "deal execution", "capital markets", "equity capital markets", "debt capital markets", "ecm", "dcm", "initial public offering", "ipo", "secondary offering", "private placement", "leveraged buyout", "lbo", "hostile takeover", "syndicated loan", "bond issuance", "derivatives", "structured finance", "asset backed securities", "mortgage backed securities"],
    "Insurance": ["insurance", "underwriting", "claims management", "actuarial", "actuarial science", "policy administration", "life insurance", "general insurance", "health insurance", "reinsurance", "risk assessment", "risk modeling", "insurance sales", "insurance compliance", "regulatory compliance", "solvency ii", "ifrs 17", "guidewire", "duck creek", "insurance analytics", "loss ratio", "combined ratio", "premium calculation"],
    "Taxation": ["taxation", "tax", "income tax", "corporate tax", "personal tax", "gst", "vat", "sales tax", "indirect tax", "direct tax", "tax planning", "tax compliance", "tax advisory", "tax audit", "tax return", "transfer pricing", "international taxation", "tds", "tcs", "advance tax", "tax assessment", "tax litigation", "tax appeals", "tax notice", "tax research", "withholding tax", "payroll tax", "capital gains", "customs duty", "excise"],
    "Audit": ["audit", "internal audit", "external audit", "statutory audit", "financial audit", "operational audit", "compliance audit", "tax audit", "forensic audit", "risk assessment", "internal controls", "sox", "audit planning", "audit documentation", "audit reporting", "control testing", "fraud detection", "fraud investigation", "audit analytics", "process improvement", "quality assurance", "iso audit", "information systems audit", "it audit"],
    "Payroll": ["payroll", "payroll processing", "payroll administration", "payroll compliance", "payroll tax", "salary processing", "wage calculation", "time and attendance", "leave management", "payroll software", "adp", "paychex", "workday payroll", "sap payroll", "payroll accounting", "payroll reporting", "garnishments", "benefits administration", "expense reimbursement"],
    "Treasury": ["treasury", "treasury management", "cash management", "liquidity management", "fund management", "cash flow forecasting", "working capital management", "banking relations", "debt management", "investment management", "foreign exchange", "fx", "hedging", "derivatives", "interest rate risk", "treasury operations", "treasury reporting", "treasury systems"],
    "Risk Management": ["risk management", "credit risk", "market risk", "operational risk", "liquidity risk", "enterprise risk", "erm", "risk assessment", "risk modeling", "risk analytics", "stress testing", "scenario analysis", "value at risk", "var", "monte carlo", "basel", "ccar", "sox", "internal controls", "fraud risk", "reputational risk", "cyber risk", "third party risk"],

    # Legal
    "Legal": ["legal", "law", "legal research", "legal writing", "legal drafting", "contract law", "compliance", "regulatory", "litigation", "arbitration", "mediation", "dispute resolution", "legal advisory", "due diligence", "legal documentation", "case law", "statute", "judgment"],
    "Corporate Law": ["corporate law", "company law", "mergers and acquisitions", "m&a", "securities law", "corporate governance", "board matters", "shareholders", "company registration", "statutory compliance", "companies act", "corporate restructuring", "joint venture", "jv", "private equity", "venture capital"],
    "Civil Law": ["civil law", "civil litigation", "property law", "contract disputes", "tort", "family law", "property dispute", "land law", "tenancy", "succession", "wills", "probate", "civil procedure", "code of civil procedure", "cpc"],
    "Criminal Law": ["criminal law", "criminal litigation", "criminal procedure", "bail", "trial", "prosecution", "defense", "evidence law", "forensic evidence", "white collar crime", "cyber crime", "criminal investigation"],
    "Tax Law": ["tax law", "tax litigation", "tax appeals", "gst law", "income tax act", "transfer pricing", "customs law", "excise law", "double taxation avoidance", "dtc", "tax treaty", "tax dispute"],
    "IP Law": ["intellectual property", "ip law", "patent", "trademark", "copyright", "trade secret", "ip prosecution", "ip litigation", "patent drafting", "patent prosecution", "brand protection", "licensing", "royalties", "ip portfolio", "geographical indication"],
    "Compliance": ["compliance", "regulatory compliance", "risk compliance", "aml", "kyc", "anti money laundering", "know your customer", "data protection", "gdpr", "hipaa", "sox", "internal controls", "policy management", "compliance audit", "compliance training", "ethics", "whistleblower"],
    "Contract Management": ["contract management", "contract drafting", "contract review", "contract negotiation", "vendor contract", "procurement contract", "sla", "service level agreement", "contract lifecycle", "clm", "contract compliance", "contract administration"],
    "Litigation": ["litigation", "civil litigation", "criminal litigation", "commercial litigation", "dispute resolution", "court proceedings", "trial advocacy", "pleadings", "discovery", "depositions", "motion practice", "appellate practice", "arbitration", "mediation"],
    "Arbitration": ["arbitration", "alternative dispute resolution", "adr", "mediation", "conciliation", "negotiation", "dispute resolution", "arbitral tribunal", "arbitration agreement", "award enforcement", "international arbitration", "icc arbitration"],

    # Healthcare
    "Healthcare": ["healthcare", "health care", "patient care", "clinical", "hospital administration", "healthcare management", "medical records", "health information", "hipaa", "healthcare compliance", "nursing", "pharmacy", "diagnostics", "therapeutics"],
    "Nursing": ["nursing", "registered nurse", "rn", "lpn", "cna", "patient care", "critical care", "icu", "emergency nursing", "pediatric nursing", "geriatric nursing", "surgical nursing", "oncology nursing", "cardiac nursing", "mental health nursing", "midwifery", "nurse practitioner", "anesthesia", "care planning"],
    "Medical Coding": ["medical coding", "icd", "cpt", "hcpcs", "medical billing codes", "diagnosis coding", "procedure coding", "inpatient coding", "outpatient coding", "coding audit", "reimbursement", "encoder", "3m coding"],
    "Medical Billing": ["medical billing", "billing", "claims processing", "claims management", "revenue cycle", "charge entry", "payment posting", "denial management", "accounts receivable", "insurance verification", "prior authorization"],
    "Pharmacy": ["pharmacy", "pharmacology", "pharmaceutics", "dispensing", "clinical pharmacy", "hospital pharmacy", "retail pharmacy", "compounding", "pharmacotherapy", "drug interactions", "medication therapy management", "pharmacy informatics"],
    "Dentistry": ["dentistry", "dental", "oral surgery", "orthodontics", "periodontics", "endodontics", "prosthodontics", "pediatric dentistry", "restorative dentistry", "dental hygiene", "radiography", "impression", "cad cam"],
    "Radiology": ["radiology", "radiography", "x-ray", "ct scan", "mri", "ultrasound", "sonography", "mammography", "nuclear medicine", "pet scan", "interventional radiology", "teleradiology", "pacs", "dicom", "radiation safety"],
    "Physiotherapy": ["physiotherapy", "physical therapy", "rehabilitation", "therapeutic exercise", "manual therapy", "electrotherapy", "orthopedics", "neurology", "sports physiotherapy", "cardiopulmonary", "pediatric physiotherapy", "geriatric physiotherapy", "kinesiology"],
    "Laboratory": ["laboratory", "lab", "clinical laboratory", "medical laboratory", "histopathology", "microbiology", "biochemistry", "hematology", "immunology", "serology", "molecular biology", "pcr", "elisa", "western blot", "flow cytometry", "quality control"],
    "Clinical Research": ["clinical research", "clinical trials", "gcp", "good clinical practice", "trial management", "cro", "regulatory affairs", "protocol design", "data management", "clinical data", "cdms", "pharmacovigilance", "drug safety", " informed consent", "irb", "ethics committee"],

    # Engineering
    "Engineering": ["engineering", "engineer", "design", "analysis", "simulation", "modeling", "drafting", "cad", "cam", "fea", "cfd", "engineering management", "project engineering", "quality engineering"],
    "Mechanical": ["mechanical engineering", "mechanical design", "thermodynamics", "fluid mechanics", "heat transfer", "solid mechanics", "kinematics", "dynamics", "mechanism", "machine design", "hvac", "automotive", "internal combustion", "tribology", "vibration", "acoustics", " fatigue analysis", "stress analysis", "ansys", "solidworks", "catia", "nx", "pro/e", "creo", "autocad"],
    "Electrical": ["electrical engineering", "circuit analysis", "electrical machines", "power systems", "power electronics", "control systems", "signal processing", "digital electronics", "analog electronics", "microcontroller", "embedded", "vlsi", "fpga", "power distribution", "transformer", "motor", "generator", "relay", "scada", "plc", "etap", "powerworld"],
    "Electronics": ["electronics", "electronic circuit", "semiconductor", "analog circuit", "digital circuit", "vlsi", "fpga", "asic", "rf engineering", "communication system", "microprocessor", "signal processing", "embedded systems", "pcb design", "altium", "cadence", "microelectronics", "optoelectronics"],
    "Civil": ["civil engineering", "structural analysis", "concrete", "steel structure", "geotechnical", "transportation", "surveying", "construction management", "hydraulics", "environmental", "building materials", "foundation", "earthquake", "autocad civil 3d", "staad.pro", "etabs", "sap2000", "revit", "primavera"],
    "Automobile": ["automotive engineering", "vehicle dynamics", "powertrain", "chassis", "automotive electronics", "adss", "autonomous vehicle", "electric vehicle", "hybrid vehicle", "engine", "transmission", "suspension", "braking", "steering", "nvh", "crashworthiness", "automotive design", "catia", "solidworks"],
    "Chemical": ["chemical engineering", "process design", "reaction engineering", "thermodynamics", "mass transfer", "heat transfer", "process control", "distillation", "petrochemical", "polymer", "food processing", "pharmaceutical", "hysys", "aspen plus", "chemcad", "process simulation"],
    "Petroleum": ["petroleum engineering", "reservoir engineering", "drilling", "production engineering", "petroleum geology", "petrophysics", "well completion", "workover", "enhanced oil recovery", "eor", "pvt", "well logging", "directional drilling", "offshore", "well control", "mud logging"],
    "Mining": ["mining engineering", "mine planning", "mineral processing", "rock mechanics", "ventilation", "blasting", "open pit", "underground mining", "geotechnical", "mine safety", "surpac", "minesight", "micromine", "whittle", "geostatistics"],
    "Industrial": ["industrial engineering", "operations research", "lean manufacturing", "six sigma", "process optimization", "ergonomics", "supply chain", "quality control", "production planning", "inventory", "line balancing", "time study", "value stream mapping", "kaizen", "tpm", "5s"],

    # Construction / Manufacturing / Supply Chain
    "Construction": ["construction", "building construction", "civil construction", "road construction", "bridge", "dam", "high-rise", "construction management", "project scheduling", "site management", "quantity surveying", "estimation", "tendering", "contract administration", "construction safety", "osha", "scaffolding"],
    "Architecture": ["architecture", "architectural design", "building design", "space planning", "blueprint", "autocad", "revit", "sketchup", "archicad", "rhino", "grasshopper", "bim", "building information modeling", "urban design", "landscape architecture"],
    "Interior Design": ["interior design", "space planning", "furniture design", "material selection", "color theory", "lighting design", "autocad", "3ds max", "sketchup", "v-ray", "lumion", "residential interior", "commercial interior", "cad"],
    "Surveying": ["surveying", "land surveying", "topographic survey", "geodetic", "gps", "gnss", "total station", "leveling", "mapping", "gis", "remote sensing", "cadastral", "boundary survey", "hydrographic"],
    "Urban Planning": ["urban planning", "city planning", "town planning", "regional planning", "zoning", "land use", "transportation planning", "environmental planning", "housing", "smart city", "gis", "spss"],
    "Manufacturing": ["manufacturing", "production", "fabrication", "assembly", "machining", "cnc", "casting", "forging", "welding", "sheet metal", "molding", "injection molding", "blow molding", "extrusion", "quality control", "lean", "six sigma", "automation", "robotics", "industry 4.0"],
    "Production": ["production", "production planning", "production scheduling", "manufacturing execution system", "mes", "shop floor", "assembly line", "mass production", "batch production", "make to order", "make to stock", "throughput", "cycle time", "takt time", "oee"],
    "Quality Control": ["quality control", "qc", "inspection", "testing", "sampling", "statistical process control", "spc", "control chart", "acceptance sampling", "six sigma", "iso 9001", "quality management system", "qms", "non-conformance", "corrective action", "root cause analysis"],
    "Supply Chain": ["supply chain", "supply chain management", "demand planning", "demand forecasting", "s&op", "logistics", "procurement", "inventory", "warehouse", "distribution", "transportation", "supplier management", "vendor management", "order fulfillment", "supply chain analytics", "erp", "sap mm", "oracle scm"],
    "Procurement": ["procurement", "sourcing", "purchasing", "supplier selection", "rfp", "rfq", "tendering", "vendor evaluation", "contract negotiation", "purchase order", "po", "strategic sourcing", "category management", "supplier relationship", "spend analysis"],
    "Inventory": ["inventory", "inventory management", "inventory control", "stock management", "safety stock", "reorder point", "eoq", "abc analysis", "cycle counting", "physical inventory", "just in time", "jit", "inventory forecasting", "warehouse management"],
    "Warehouse": ["warehouse", "warehouse management", "warehouse operations", "warehousing", "forklift", "picking", "packing", "shipping", "receiving", "putaway", "cross docking", "wms", "warehouse layout", "inventory control", "order fulfillment"],

    # HR
    "HR": ["human resources", "hr", "people management", "hr management", "hr strategy", "hr policies", "hr compliance", "labor law", "industrial relations", "hr analytics", "hr metrics", "workforce planning", "talent management", "hr operations"],
    "Recruitment": ["recruitment", "recruiting", "talent acquisition", "sourcing", "screening", "interviewing", "selection", "campus recruitment", "bulk hiring", "executive search", "headhunting", "applicant tracking system", "ats", "linkedin recruiter", "job posting", "employer branding"],
    "Talent Acquisition": ["talent acquisition", "talent sourcing", "candidate sourcing", "passive sourcing", "boolean search", "diversity hiring", "campus hiring", "recruitment marketing", "candidate experience", "interview coordination", "offer negotiation", "onboarding"],
    "HR Operations": ["hr operations", "hr administration", "employee data", "hr systems", "hris", "workday", "successfactors", "oracle hcm", "peoplesoft", "payroll processing", "leave management", "attendance", "employee records", "hr shared services"],
    "Learning & Development": ["learning and development", "training", "instructional design", "learning management system", "lms", "e-learning", "training needs analysis", "competency mapping", "leadership development", "succession planning", "coaching", "mentoring", "skills gap analysis", "kirkpatrick model"],
    "Compensation & Benefits": ["compensation and benefits", "salary structuring", "payroll", "benefits administration", "variable pay", "incentives", "bonus", "esop", "retirement benefits", "health insurance", "leave policy", "compensation benchmarking", "job evaluation", "gratuity", "provident fund"],
    "Employee Relations": ["employee relations", "industrial relations", "grievance handling", "disciplinary action", "conflict resolution", "employee engagement", "employee communication", "labor law", "workplace ethics", "diversity and inclusion", "dei", "harassment prevention"],

    # Sales
    "Sales": ["sales", "selling", "sales strategy", "sales management", "sales operations", "revenue generation", "lead generation", "prospecting", "closing", "negotiation", "sales forecasting", "pipeline management", "crm", "relationship management", "b2b", "b2c"],
    "Inside Sales": ["inside sales", "tele sales", "telesales", "phone sales", "remote sales", "lead qualification", "cold calling", "warm calling", "appointment setting", "sales development", "sdr", "inbound sales", "outbound sales"],
    "B2B Sales": ["b2b sales", "business to business", "enterprise sales", "corporate sales", "solution selling", "consultative selling", "account management", "key account", "saas sales", "complex sales", "sales cycle", "rfp", "proposal"],
    "B2C Sales": ["b2c sales", "business to consumer", "retail sales", "direct sales", "consumer sales", "inside sales", "field sales", "upselling", "cross selling", "customer acquisition", "pos"],
    "Retail Sales": ["retail sales", "store sales", "visual merchandising", "pos", "cash handling", "customer service", "upselling", "cross selling", "inventory", "loss prevention", "planogram", "category management"],
    "Channel Sales": ["channel sales", "partner sales", "distributor", "reseller", "franchise", "oem", "value added reseller", "var", "channel partner", "partner enablement", "mdm", "market development"],
    "Enterprise Sales": ["enterprise sales", "strategic sales", "large account", "key account", "solution selling", "complex sales", "c-suite", "executive selling", "account planning", "rfp", "negotiation", "contract"],

    # Marketing
    "Marketing": ["marketing", "marketing strategy", "brand marketing", "marketing plan", "market research", "marketing analytics", "campaign management", "go-to-market", "gtm", "customer segmentation", "positioning", "messaging", "marketing automation", "email marketing"],
    "Digital Marketing": ["digital marketing", "online marketing", "internet marketing", "performance marketing", "growth hacking", "ppc", "pay per click", "social media marketing", "content marketing", "email marketing", "mobile marketing", "influencer marketing", "affiliate marketing", "display advertising", "programmatic", "remarketing"],
    "SEO": ["seo", "search engine optimization", "on-page seo", "off-page seo", "technical seo", "keyword research", "link building", "backlink", "serp", "google search console", "semrush", "ahrefs", "moz", "screaming frog", "content optimization", "local seo"],
    "SEM": ["sem", "search engine marketing", "google ads", "bing ads", "ppc", "pay per click", "cpc", "display network", "remarketing", "adwords", "quality score", "bid management", "conversion tracking", "landing page optimization"],
    "Content Marketing": ["content marketing", "content strategy", "content creation", "copywriting", "blogging", "editorial calendar", "storytelling", "content distribution", "seo content", "video marketing", "podcast", "whitepaper", "case study", "ebook", "webinar"],
    "Performance Marketing": ["performance marketing", "growth marketing", "paid acquisition", "ppc", "cpm", "cpc", "cpa", "roi", "roas", "conversion rate optimization", "cro", "attribution", "funnel optimization", "landing page", "a/b testing"],
    "Affiliate Marketing": ["affiliate marketing", "affiliate program", "affiliate network", "commission", "partner marketing", "influencer partnership", "referral marketing", "coupon marketing", "affiliate tracking"],
    "Brand Management": ["brand management", "brand strategy", "brand positioning", "brand identity", "brand awareness", "brand equity", "rebranding", "brand guidelines", "visual identity", "brand campaign", "brand storytelling", "logo", "trademark"],

    # Customer Support
    "Customer Support": ["customer support", "customer service", "helpdesk", "help desk", "ticketing", "issue resolution", "customer satisfaction", "csat", "customer experience", "cx", "call center", "technical support", "live chat", "email support"],
    "Technical Support": ["technical support", "it support", "desktop support", "l1 support", "l2 support", "l3 support", "troubleshooting", "hardware support", "software support", "network support", "server support", "remote support", "ticketing system", "service desk", "itil"],
    "Call Center": ["call center", "voice process", "inbound calls", "outbound calls", "customer care", "bpo", "telecalling", "ivr", "acd", "automatic call distribution", "quality monitoring", "call scripting", "avg handle time", "aht"],
    "CRM": ["crm", "salesforce", "hubspot", "zoho crm", "microsoft dynamics", "freshsales", "pipedrive", "insightly", "sugarcrm", "customer relationship", "crm administration", "crm customization", "crm reporting", "lead management"],
    "Help Desk": ["help desk", "service desk", "ticketing", "incident management", "service request", "change management", "problem management", "knowledge base", "sla", "itil", "freshdesk", "zendesk", "service now", "remedy"],

    # Education
    "Education": ["education", "learning", "teaching", "instruction", "curriculum", "assessment", "pedagogy", "andragogy", "classroom management", "lesson planning", "educational technology", "edtech", "special education", "inclusive education"],
    "Teaching": ["teaching", "instruction", "classroom management", "lesson planning", "pedagogy", "student assessment", "differentiated instruction", "classroom instruction", "subject teaching", "online teaching", "virtual classroom", "whiteboard", "blackboard", "moodle"],
    "Training": ["training", "corporate training", "employee training", "trainer", "facilitation", "train the trainer", "workshop", "seminar", "onboarding", "skills training", "safety training", "compliance training", "technical training"],
    "Curriculum Development": ["curriculum development", "curriculum design", "curriculum alignment", "learning objectives", "outcome based education", "syllabus design", "course design", "instructional design", "addie", "bloom taxonomy", "competency framework"],
    "E-learning": ["e-learning", "online learning", "virtual learning", "blended learning", "mobile learning", "learning management system", "lms", "scorm", "xapi", "tin can", "articulate", " captivate", "camtasia", "moodle", "canvas", "blackboard", "zoom", "webinar"],

    # Hospitality / Retail
    "Hospitality": ["hospitality", "hotel", "resort", "front office", "housekeeping", "food and beverage", "f&b", "guest service", "reservations", "concierge", "banquet", "events", "revenue management", "hospitality management"],
    "Hotel Management": ["hotel management", "front office", "front desk", "reservations", "revenue management", "yield management", "housekeeping", "room service", "concierge", "guest relations", "ota", "property management system", "pms", "opera pms", "fidelio", "hospitality operations"],
    "Travel": ["travel", "travel agency", "travel management", "ticketing", "airline reservation", "hotel booking", "visa processing", "travel insurance", "itinerary", "gds", "amadeus", "sabre", "galileo"],
    "Tourism": ["tourism", "tour guide", "tour operations", "destination management", "destination marketing", "sustainable tourism", "ecotourism", "heritage tourism", "travel and tourism", "visitor management"],
    "Food & Beverage": ["food and beverage", "f&b", "restaurant management", "catering", "banquet", "bartending", "sommelier", "menu planning", "kitchen management", "culinary", "food safety", "haccp", "fssai", "food service", "barista"],
    "Housekeeping": ["housekeeping", "room cleaning", "laundry", "linen management", "sanitation", "pest control", "hospitality cleaning", "housekeeping supervisor"],
    "Retail": ["retail", "retail management", "store management", "merchandising", "visual merchandising", "pos", "sales", "customer service", "inventory", "loss prevention", "planogram", "category management"],
    "Merchandising": ["merchandising", "visual merchandising", "product display", "planogram", "category management", "assortment planning", "pricing strategy", "promotion planning", "seasonal planning", "stock replenishment", "retail analytics"],
    "Store Operations": ["store operations", "store management", "opening and closing", "cash handling", "pos", "daily operations", "shift management", "customer service", "sales floor", "inventory", "visual standards"],
    "POS Systems": ["pos", "point of sale", "retail pos", "restaurant pos", "square", "shopify pos", "toast pos", "lightspeed", "ncr", "aloha", "epos", "billing system", "cash register", "payment processing"],

    # Other industries
    "Telecommunications": ["telecommunications", "telecom", "wireless", "5g", "4g", "lte", "gsm", "cdma", "wcdma", "volte", "fiber optics", "optical network", "dwdm", "sdh", "sonet", "mpls", "network operations center", "noc", "bss", "oss", "telecom billing", "charging system", "ericsson", "nokia", "huawei", "cisco"],
    "Logistics": ["logistics", "freight", "cargo", "transportation", "shipping", "warehousing", "distribution", "supply chain", "3pl", "4pl", "last mile", "route optimization", "fleet management", "customs clearance", "brokerage", "incoterms", "logistics management"],
    "Transportation": ["transportation", "fleet management", "route planning", "dispatch", "public transport", "freight", "trucking", "rail transport", "shipping", "aviation", "marine", "supply chain", "driver management"],
    "Aviation": ["aviation", "aircraft", "aircraft maintenance", "airframe", "avionics", "flight operations", "flight dispatch", "ground handling", "air traffic control", "atc", "airport operations", "crew resource management", "crm", "aviation safety", "icao", "dgca", "faa", "jeppesen", "sabre", "amadeus"],
    "Marine": ["marine", "maritime", "ship", "vessel", "naval architecture", "marine engineering", "navigation", "seamanship", "deck operations", "marine safety", "solu", "imo", "port operations", "cargo handling", "ship maintenance", "marine survey", "offshore"],
    "Agriculture": ["agriculture", "agronomy", "crop management", "soil science", "irrigation", "fertilizer", "pest management", "integrated pest management", "ipm", "harvesting", "post harvest", "precision agriculture", "smart farming", "drones in agriculture", "sustainable agriculture", "organic farming", "horticulture", "sericulture", "apiculture", "dairy"],
    "Food Processing": ["food processing", "food technology", "food manufacturing", "food safety", "haccp", "fssai", "quality control", "packaging", "preservation", "canning", "baking", "dairy processing", "meat processing", "beverage processing", "cold chain", "supply chain"],
    "Energy": ["energy", "power generation", "power plant", "thermal power", "hydro power", "nuclear power", "energy management", "energy efficiency", "power systems", "transmission", "distribution", "smart grid", "energy market", "electricity trading"],
    "Oil & Gas": ["oil and gas", "upstream", "midstream", "downstream", "exploration", "production", "drilling", "reservoir", "petroleum", "refinery", "petrochemical", "pipeline", "lng", "offshore", "wellhead", "downhole", "mud logging", "wireline", "well testing"],
    "Renewable Energy": ["renewable energy", "solar energy", "wind energy", "hydro energy", "geothermal", "biomass", "bioenergy", "tidal", "wave energy", "energy storage", "battery", "pv system", "solar panel", "wind turbine", "inverter", "energy efficiency", "green hydrogen", "electrolyzer", "solar thermal", "csp"],
    "Real Estate": ["real estate", "property management", "property valuation", "leasing", "rental management", "facility management", "commercial real estate", "residential real estate", "real estate sales", "reits", "asset management", "tenant relations", "brokerage", "due diligence", "rera"],
    "Government": ["government", "public policy", "public administration", "governance", "regulatory affairs", "legislative affairs", "public sector", "civil service", "administrative law", "policy analysis", "program management", "grants management", "procurement"],
    "Public Administration": ["public administration", "administrative management", "public policy", "municipal administration", "local government", "urban governance", "e-governance", "citizen services", "public financial management", "budget administration"],
    "NGO": ["ngo", "non profit", "non governmental", "social work", "community development", "fundraising", "grant writing", "donor management", "program management", "monitoring and evaluation", "m&e", "volunteer management", "advocacy", "capacity building", "csr"],
    "Research": ["research", "research methodology", "qualitative research", "quantitative research", "data collection", "data analysis", "statistical analysis", "hypothesis testing", "literature review", "academic writing", "survey design", "primary research", "secondary research", "experiment design", "spss", "stata", "nvivo"],
    "Biotechnology": ["biotechnology", "bioprocessing", "fermentation", "cell culture", "molecular biology", "genetic engineering", "bioinformatics", "proteomics", "genomics", "crispr", "bioreactor", "downstream processing", "assay development", "elisa", "pcr", "western blot", "gmp", "biosafety"],
    "Fashion": ["fashion", "fashion design", "apparel design", "textile design", "pattern making", "draping", "garment construction", "fashion illustration", "trend forecasting", "merchandising", "buying", "styling", "fashion marketing", "cad", "lectra", "gerber"],
    "Textile": ["textile", "textile engineering", "textile design", "weaving", "knitting", "dyeing", "printing", "finishing", "fabric", "yarn", "nonwoven", "technical textile", "textile testing", "color matching", "aatcc", "astm"],
    "Media": ["media", "mass media", "digital media", "media production", "media planning", "media buying", "broadcast", "publishing", "social media", "content creation", "video production", "audio production", "podcast", "public relations", "pr"],
    "Journalism": ["journalism", "news writing", "reporting", "editing", "copy editing", "feature writing", "investigative journalism", "broadcast journalism", "photojournalism", "data journalism", "press release", "ap style", "fact checking", "subediting"],
    "Animation": ["animation", "2d animation", "3d animation", "motion graphics", "character animation", "storyboard", "keyframe", "rigging", "maya", "blender", "3ds max", "toon boom", "animate", "after effects", "cinema 4d", "stop motion"],
    "VFX": ["vfx", "visual effects", "compositing", "matte painting", "rotoscoping", "motion tracking", "matchmoving", "particles", "simulation", "nuke", "after effects", "houdini", "maya", "pftrack", "synth eyes", "3d tracking"],
    "Graphic Design": ["graphic design", "visual design", "print design", "layout", "typography", "branding", "illustration", "adobe photoshop", "adobe illustrator", "indesign", "coreldraw", "affinity designer", "canva", "poster", "brochure", "packaging design"],
    "UI/UX Design": ["ui design", "ux design", "user interface", "user experience", "interaction design", "information architecture", "wireframing", "prototyping", "user research", "usability testing", "figma", "sketch", "adobe xd", "invision", "axure", "balsamiq", "design systems", "material design"],
    "Product Management": ["product management", "product strategy", "product roadmap", "product planning", "product lifecycle", "product owner", "backlog management", "user stories", "prioritization", "market research", "competitive analysis", "okrs", "kpi", "go-to-market", "pricing strategy", "product analytics"],
    "Project Management": ["project management", "project planning", "project scheduling", "project execution", "scope management", "risk management", "stakeholder management", "project lifecycle", "pmp", "prince2", "agile project management", "waterfall", "scrum master", "kanban", "ms project", "jira", "smartsheet"],
    "Business Analysis": ["business analysis", "requirements gathering", "requirements analysis", "stakeholder analysis", "process modeling", "use cases", "user stories", "acceptance criteria", "gap analysis", "feasibility study", "business process reengineering", "bpmn", "uml", "swot", "pestle", "case"],
    "Consulting": ["consulting", "management consulting", "strategy consulting", "business consulting", "it consulting", "process consulting", "change management", "organizational design", "benchmarking", "best practices", "client management", "proposal", "deck", "stakeholder management"],
    "Operations": ["operations", "operations management", "business operations", "process improvement", "operational excellence", "lean", "six sigma", "kaizen", "sop", "kpis", "sla", "workflow optimization", "capacity planning", "demand planning", "production planning"],
    "Administration": ["administration", "administrative", "office management", "secretarial", "executive assistant", "data entry", "filing", "documentation", "calendar management", "travel coordination", "meeting coordination", "front office", "reception", "record keeping"],
    "Export & Import": ["export", "import", "international trade", "customs", "documentation", "letter of credit", "lc", "shipping", "freight forwarding", "incoterms", "export compliance", "tariff", "duties", "trade finance", "logistics", "bill of lading", "customs clearance"],
    "E-commerce": ["e-commerce", "ecommerce", "online store", "shopify", "woocommerce", "magento", "bigcommerce", "prestashop", "opencart", "marketplace", "dropshipping", "product listing", "conversion rate optimization", "cro", "cart abandonment", "digital payment", "payment gateway", "inventory management", "amazon seller", "flipkart seller"],
}

# ---------------------------------------------------------------------------
# Manual seeds for categories that auto-classification may under-populate
# ---------------------------------------------------------------------------
SEEDS = {
    "Aviation": [
        "Air Traffic Control", "Air Traffic Management", "Aircraft Maintenance", "Aircraft Systems",
        "Airfield Operations", "Airline Operations", "Airport Ground Handling", "Airport Operations",
        "Airworthiness", "Aviation Meteorology", "Aviation Regulations", "Aviation Safety",
        "Aviation Security", "Cargo Handling", "Crew Resource Management", "Crew Scheduling",
        "Dispatch Operations", "Flight Dispatcher", "Flight Operations", "Flight Planning",
        "Flight Safety", "Ground Support Equipment", "Helicopter Operations", "Human Factors in Aviation",
        "Instrument Landing System", "Load Control", "MRO", "Navigation", "Performance Engineering",
        "Ramp Operations", "Safety Management System", "SMS", "Weight and Balance",
    ],
    "Marine": [
        "Ballast Water Management", "Bridge Operations", "Cargo Stowage", "Chart Work",
        "Coastal Navigation", "Container Handling", "Crane Operations", "Deck Operations",
        "Dredging", "Dynamic Positioning", "Fishing Operations", "ISM Code", "ISPS Code",
        "Lashing", "Marine Engineering", "Marine Insurance", "Marine Law", "Marine Navigation",
        "Marine Safety", "Marine Surveying", "Maritime Security", "Offshore Operations", "Port State Control",
        "Seamanship", "Ship Handling", "Ship Maintenance", "Ship Stability", "SOLAS",
        "Tanker Operations", "Vessel Operations", "Watchkeeping",
    ],
    "Agriculture": [
        "Agricultural Engineering", "Agricultural Machinery", "Agronomy", "Animal Husbandry",
        "Beekeeping", "Composting", "Crop Rotation", "Cultivation", "Dairy Management", "Farm Management",
        "Fertilizer Application", "Fisheries", "Greenhouse Management", "Harvesting",
        "Horticulture", "Hydroponics", "Integrated Pest Management", "IPM", "Irrigation",
        "Organic Farming", "Pest Control", "Precision Agriculture", "Seed Production",
        "Sericulture", "Soil Analysis", "Soil Conservation", "Soil Fertility", "Sustainable Agriculture",
        "Tractor Operation", "Vermiculture", "Water Management",
    ],
    "Food Processing": [
        "Baking Technology", "Beverage Processing", "Bottling", "Canning", "Cold Chain",
        "Dairy Processing", "Dehydration", "Extrusion", "Fermentation", "Food Analysis",
        "Food Biotechnology", "Food Chemistry", "Food Engineering", "Food Labeling", "Food Laws",
        "Food Microbiology", "Food Packaging", "Food Preservation", "Food Processing Equipment",
        "Food Quality Assurance", "Food Safety Management", "Food Storage", "Freeze Drying",
        "HACCP", "Meat Processing", "Pasteurization", "Pasteurization", "Quality Control",
        "Refrigeration", "Shelf Life", "Sterilization",
    ],
    "Renewable Energy": [
        "Battery Energy Storage", "Battery Management", "Bioenergy", "Biogas", "CSP",
        "Energy Storage", "Geothermal Energy", "Green Hydrogen", "Hydropower", "Microgrids",
        "Offshore Wind", "Perovskite Solar", "Photovoltaic Systems", "PV Design", "Smart Inverters",
        "Solar Farm", "Solar Panel Installation", "Solar Photovoltaics", "Solar Thermal", "Tidal Energy",
        "Wave Energy", "Wind Energy", "Wind Farm", "Wind Resource Assessment", "Wind Turbine Maintenance",
    ],
    "Oil & Gas": [
        "Blowout Prevention", "Completions", "Directional Drilling", "Downhole Tools",
        "Drilling Engineering", "Drilling Fluids", "Enhanced Oil Recovery", "EOR", "Exploration",
        "Flow Assurance", "Formation Evaluation", "Geosteering", "Hydraulic Fracturing", "LNG Operations",
        "Logging While Drilling", "Measurement While Drilling", "Midstream Operations", "Offshore Drilling",
        "Oilfield Chemistry", "Petroleum Economics", "Petroleum Engineering", "Petroleum Geology",
        "Petrophysics", "Pipeline Integrity", "Production Engineering", "Refinery Operations",
        "Reservoir Characterization", "Reservoir Engineering", "Reservoir Simulation", "Well Completion",
        "Well Intervention", "Well Logging", "Well Testing",
    ],
    "Real Estate": [
        "Asset Management", "Brokerage", "Commercial Leasing", "Commercial Property", "Due Diligence",
        "Facility Management", "Land Acquisition", "Lease Administration", "Lease Negotiation",
        "Mortgage Underwriting", "Portfolio Management", "Property Appraisal", "Property Development",
        "Property Law", "Property Marketing", "Property Tax", "Property Valuation", "REITs",
        "Residential Sales", "Retail Leasing", "Sales Comparison", "Site Selection", "Tenant Relations",
        "Title Search", "Town Planning",
    ],
    "Government": [
        "Administrative Law", "Citizen Engagement", "E-Governance", "Government Procurement",
        "Grants Management", "Intergovernmental Relations", "Legislative Drafting", "Policy Analysis",
        "Policy Implementation", "Program Evaluation", "Public Administration", "Public Financial Management",
        "Public Policy", "Public Records", "Public Sector Reform", "Regulatory Affairs", "Right to Information",
        "RTI", "Rural Development", "Urban Development",
    ],
    "Public Administration": [
        "Budget Administration", "Civil Service", "E-Governance", "Local Governance", "Municipal Finance",
        "Municipal Management", "Public Budgeting", "Public Finance", "Public Human Resource",
        "Public Procurement", "Public Service Delivery", "Records Management", "Revenue Administration",
        "Town Planning", "Urban Governance", "Welfare Administration",
    ],
    "NGO": [
        "Advocacy", "Capacity Building", "Civic Engagement", "Community Development", "CSR",
        "Disaster Management", "Donor Reporting", "Fundraising", "Grant Management", "Humanitarian Response",
        "Impact Assessment", "Livelihoods", "Monitoring and Evaluation", "M&E", "Needs Assessment",
        "Program Management", "Proposal Writing", "Stakeholder Engagement", "Volunteer Management",
        "WASH", "Water Sanitation Hygiene",
    ],
    "Research": [
        "Academic Writing", "Case Study", "Data Collection", "Data Interpretation", "Ethnography",
        "Focus Groups", "Hypothesis Testing", "Literature Review", "Mixed Methods", "Peer Review",
        "Primary Research", "Qualitative Research", "Quantitative Research", "Questionnaire Design",
        "Research Ethics", "Research Methodology", "Sampling", "Secondary Research", "Statistical Analysis",
        "Survey Analysis", "Thesis Writing",
    ],
    "Biotechnology": [
        "Aseptic Technique", "Assay Development", "Bioinformatics", "Bioreactor Operation", "Biosafety",
        "Cell Culture", "Chromatography", "Cloning", "CRISPR", "Downstream Processing",
        "ELISA", "Fermentation", "Flow Cytometry", "Genomics", "GMP", "PCR", "Protein Purification",
        "Proteomics", "qPCR", "RT-PCR", "Spectrophotometry", "Tissue Culture", "Western Blotting",
    ],
    "Fashion": [
        "Accessory Design", "Apparel Construction", "Apparel Merchandising", "Buying",
        "Computer Aided Design", "Draping", "Fashion Forecasting", "Fashion Illustration",
        "Fashion Marketing", "Fashion Photography", "Fashion Styling", "Garment Fitting",
        "Gerber Technology", "Lectra", "Pattern Making", "Pattern Grading", "Portfolio Development",
        "Production Planning", "Quality Control in Fashion", "Sampling", "Trend Analysis", "Trim Sourcing",
    ],
    "Textile": [
        "Bleaching", "Color Fastness", "Dyeing", "Fabric Inspection", "Fabric Manufacturing",
        "Fiber Science", "Finishing", "Garment Washing", "Knitting", "Nonwoven Technology",
        "Printing", "Quality Assurance", "Spinning", "Technical Textiles", "Textile Chemistry",
        "Textile Finishing", "Textile Machinery", "Textile Testing", "Weaving", "Yarn Manufacturing",
    ],
    "Journalism": [
        "AP Style", "Audience Engagement", "Beat Reporting", "Broadcast Journalism", "Copy Editing",
        "Data Journalism", "Editing", "Fact Checking", "Feature Writing", "Investigative Reporting",
        "Media Ethics", "News Writing", "Photojournalism", "Press Release", "Proofreading",
        "Reporting", "SEO for News", "Social Media Journalism", "Subediting", "Video Journalism",
    ],
    "Animation": [
        "2D Animation", "3D Animation", "Animatics", "Character Design", "Claymation", "Compositing",
        "Frame by Frame", "Keyframing", "Lip Sync", "Motion Graphics", "Rigging", "Scene Composition",
        "Skinning", "Stop Motion", "Storyboarding", "Texturing", "Toon Boom", "Visual Storytelling",
    ],
    "VFX": [
        "3D Tracking", "Chroma Keying", "Compositing", "Digital Compositing", "Green Screen",
        "Matchmoving", "Matte Painting", "Motion Capture", "Motion Tracking", "Nuke", "Particle Simulation",
        "Rotoscoping", "Smoke Simulation", "Wire Removal",
    ],
    "Telecommunications": [
        "2G", "3G", "4G", "5G", "BSS", "CDMA", "Cellular Networks", "Core Network", "DWDM",
        " Ericsson", "Fiber Optics", "GSM", "Huawei", "IMS", "LTE", "MPLS", "NOC Operations",
        "Nokia", "OSS", "Optical Transport", "Radio Access Network", "RAN", "RF Engineering",
        "SDH", "SONET", "Telecom Billing", "VoIP", "WCDMA", "WiMAX",
    ],
    "Logistics": [
        "3PL", "4PL", "Bill of Lading", "Customs Brokerage", "Distribution Center", "Fleet Management",
        "Freight Forwarding", "Inventory Optimization", "Last Mile Delivery", "Logistics Analytics",
        "Order Fulfillment", "Reverse Logistics", "Route Optimization", "Shipping Documentation",
        "Supply Chain Visibility", "Transportation Management", "Warehouse Management",
    ],
    "Transportation": [
        "Bus Operations", "Dispatching", "Driver Compliance", "Fleet Safety", "Freight Transport",
        "Intermodal Transport", "Mass Transit", "Public Transport", "Rail Operations", "Route Planning",
        "Supply Chain Logistics", "Taxi Operations", "Traffic Management", "Transit Planning",
        "Transport Regulations", "Trucking Operations",
    ],
    "Energy": [
        "Demand Response", "Distributed Generation", "Electricity Distribution", "Electricity Markets",
        "Energy Audit", "Energy Conservation", "Energy Economics", "Energy Efficiency", "Energy Management",
        "Energy Modeling", "Energy Storage", "Grid Integration", "Load Forecasting", "Power Distribution",
        "Power Generation", "Power Plant Operations", "Power Quality", "Power Transmission", "Smart Grid",
        "Substation Design",
    ],
    "E-commerce": [
        "Amazon FBA", "Amazon Seller Central", "BigCommerce", "Conversion Rate Optimization", "CRO",
        "Dropshipping", "E-commerce Analytics", "E-commerce SEO", "Email Automation", "Flipkart Seller",
        "Inventory Sync", "Magento", "Marketplace Management", "Omnichannel", "Order Management",
        "Payment Gateway Integration", "PrestaShop", "Product Feed Management", "Shopify", "WooCommerce",
    ],
    "Export & Import": [
        "Bill of Entry", "Bill of Lading", "Cargo Insurance", "Certificate of Origin", "Customs Clearance",
        "Customs Documentation", "Duty Drawback", "Export Compliance", "Export Documentation", "Freight Forwarding",
        "Import Compliance", "Incoterms", "Letter of Credit", "LCL", "FCL", "Shipping Logistics",
        "Tariff Classification", "Trade Finance", "Waybill",
    ],
    "Administration": [
        "Appointment Scheduling", "Calendar Management", "Data Entry", "Document Control", "Filing Systems",
        "Front Office", "Mail Handling", "Meeting Minutes", "Office Administration", "Office Management",
        "Record Keeping", "Reception", "Report Preparation", "Travel Booking",
    ],
    "Consulting": [
        "Business Case", "Change Management", "Client Presentations", "Due Diligence", "Executive Presentation",
        "Market Entry Strategy", "Operational Excellence", "Process Improvement", "Proposal Development",
        "Stakeholder Interviews", "Strategy Consulting", "Workshop Facilitation",
    ],
    "Operations": [
        "Capacity Planning", "Continuous Improvement", "Demand Planning", "KPI Management", "Lean Operations",
        "Operational Planning", "Process Design", "Process Mapping", "SOP Development", "Standard Operating Procedure",
        "Supply Chain Operations", "Value Stream Mapping", "Workflow Automation",
    ],
    "Business Analysis": [
        "As-Is Analysis", "BPMN", "Business Case", "Business Process Modeling", "Business Rules",
        "Feasibility Analysis", "Gap Analysis", "Process Improvement", "Requirements Elicitation",
        "Stakeholder Analysis", "SWOT Analysis", "To-Be Analysis", "Use Case Modeling", "User Story Mapping",
    ],
    "Project Management": [
        "Agile Project Management", "Change Control", "Critical Path Method", "Earned Value Management",
        "Issue Management", "PRINCE2", "Project Charter", "Project Closure", "Project Communications",
        "Project Scheduling", "Risk Register", "Scrum Master", "Stakeholder Engagement", "Work Breakdown Structure",
        "WBS",
    ],
    "Product Management": [
        "A/B Testing", "Customer Discovery", "Feature Prioritization", "MVP", "OKRs", "Product Analytics",
        "Product Backlog", "Product Launch", "Product Metrics", "Product Roadmap", "Product Vision",
        "User Interviews", "User Personas", "Value Proposition",
    ],
    "UI/UX Design": [
        "Accessibility Design", "Design Systems", "Design Thinking", "High Fidelity Prototype",
        "Information Architecture", "Interaction Design", "Low Fidelity Prototype", "Mobile UX", "Moodboard",
        "Usability Heuristics", "User Flows", "User Interviews", "User Journey Mapping", "User Research",
        "Visual Design", "Wireframing",
    ],
    "Graphic Design": [
        "Brand Identity", "Brochure Design", "Color Theory", "Digital Illustration", "Infographic Design",
        "Layout Design", "Logo Design", "Packaging Design", "Print Production", "Typography",
        "Vector Graphics",
    ],
    "Media": [
        "Audio Editing", "Broadcast Production", "Content Distribution", "Digital Publishing", "Media Planning",
        "Media Relations", "Podcast Production", "Public Relations", "Social Media Strategy", "Video Editing",
        "Video Production",
    ],
    "Hospitality": [
        "Banquet Management", "Concierge", "Front Office", "Guest Experience", "Guest Relations",
        "Housekeeping Management", "Reservations", "Resort Management", "Revenue Management", "Room Service",
    ],
    "Hotel Management": [
        "Check-in Check-out", "Front Desk", "Guest Complaint Handling", "Hotel PMS", "Housekeeping Supervision",
        "Night Audit", "OPERA PMS", "OTA Management", "Revenue Management", "Room Allocation",
    ],
    "Travel": [
        "Airline Reservation", "Amadeus", "Galileo", "GDS", "Itinerary Planning", "Sabre",
        "Tour Packaging", "Travel Documentation", "Travel Insurance", "Visa Assistance",
    ],
    "Tourism": [
        "Destination Branding", "Destination Management", "Heritage Tourism", "Sustainable Tourism",
        "Tour Guiding", "Tour Operations", "Tourism Marketing", "Visitor Experience",
    ],
    "Food & Beverage": [
        "Bakery Operations", "Bartending", "Catering", "Food Costing", "Food Safety", "HACCP",
        "Kitchen Management", "Menu Engineering", "Restaurant Operations", "Sommelier", "Wine Service",
    ],
    "Housekeeping": [
        "Cleaning Protocols", "Infection Control", "Laundry Operations", "Linen Management", "Room Cleaning",
        "Sanitation Standards",
    ],
    "Retail": [
        "Cash Handling", "Customer Service", "Inventory", "Loss Prevention", "Planogram", "POS",
        "Retail Analytics", "Retail Management", "Sales Floor", "Visual Merchandising",
    ],
    "Merchandising": [
        "Assortment Planning", "Category Management", "Markdown Management", "Planogram Implementation",
        "Product Display", "Promotional Planning", "Stock Replenishment",
    ],
    "Store Operations": [
        "Cash Register", "Daily Operations", "Opening Closing Procedures", "POS Transactions",
        "Sales Target", "Shift Management", "Stock Management", "Store Layout",
    ],
    "POS Systems": [
        "Aloha POS", "Clover POS", "EPOS", "NCR", "Payment Processing", "POS Hardware", "POS Software",
        "Receipt Printing", "Square POS", "Toast POS",
    ],
    "Call Center": [
        "ACD", "Average Handle Time", "Call Center Management", "Call Monitoring", "Cold Calling",
        "Customer Care", "Inbound Calls", "IVR", "Outbound Calls", "Quality Monitoring",
    ],
    "CRM": [
        "CRM Analytics", "CRM Configuration", "CRM Customization", "CRM Integration", "Freshsales",
        "HubSpot CRM", "Microsoft Dynamics", "Pipedrive", "Salesforce Administration", "Salesforce CRM",
        "Zoho CRM",
    ],
    "Help Desk": [
        "First Call Resolution", "Incident Management", "ITIL", "Knowledge Base", "Service Level Agreement",
        "Service Request", "SLA Management", "Ticket Management",
    ],
    "Technical Support": [
        "Desktop Support", "Hardware Troubleshooting", "L1 Support", "L2 Support", "L3 Support",
        "Remote Desktop", "Remote Support", "Server Support", "Software Troubleshooting", "Ticketing Tools",
    ],
    "Customer Support": [
        "Customer Communication", "Customer Escalation", "Customer Retention", "Customer Satisfaction",
        "Email Support", "Helpdesk", "Live Chat Support", "Ticket Resolution",
    ],
    "Education": [
        "Classroom Management", "Educational Assessment", "Educational Psychology", "Instructional Technology",
        "Learning Outcomes", "Pedagogy", "Student Engagement", "Teaching Methods",
    ],
    "Teaching": [
        "Classroom Instruction", "Lesson Delivery", "Online Teaching", "Subject Matter Expertise",
        "Student Evaluation", "Teaching Aids", "Virtual Classroom",
    ],
    "Training": [
        "Corporate Training", "Instructor Led Training", "Onboarding", "Training Delivery", "Training Evaluation",
        "Training Manual", "Workshop Facilitation",
    ],
    "Curriculum Development": [
        "Assessment Design", "Course Mapping", "Curriculum Evaluation", "Instructional Design", "Learning Path",
        "Syllabus Development",
    ],
    "E-learning": [
        "Articulate 360", "Blended Learning", "Learning Management System", "LMS Administration",
        "Mobile Learning", "Moodle", "SCORM", "Webinar", "xAPI",
    ],
    "Sales": [
        "B2B", "B2C", "Cold Calling", "Consultative Selling", "Customer Acquisition", "Lead Generation",
        "Negotiation", "Pipeline Management", "Prospecting", "Sales Closing", "Sales Forecasting",
        "Sales Presentation", "Solution Selling",
    ],
    "Inside Sales": [
        "Appointment Setting", "Cold Calling", "Inbound Sales", "Inside Sales", "Lead Qualification",
        "Outbound Sales", "Phone Sales", "Sales Development",
    ],
    "B2B Sales": [
        "Account Based Selling", "B2B Sales", "Complex Sales", "Enterprise Sales", "RFP Response",
        "SaaS Sales", "Solution Selling", "Strategic Selling",
    ],
    "B2C Sales": [
        "B2C Sales", "Consumer Sales", "Direct Sales", "Door to Door", "Retail Sales",
    ],
    "Retail Sales": [
        "Cashier", "Customer Service", "POS", "Retail Selling", "Upselling",
    ],
    "Channel Sales": [
        "Channel Enablement", "Distributor Management", "OEM Sales", "Partner Ecosystem", "Reseller Management",
        "Value Added Reseller",
    ],
    "Enterprise Sales": [
        "C Suite Selling", "Complex Deal Management", "Enterprise Account", "Key Account", "Large Account",
        "Solution Architecture", "Strategic Account Planning",
    ],
    "Marketing": [
        "Campaign Management", "Market Research", "Marketing Analytics", "Marketing Automation",
        "Marketing Communications", "Marketing Strategy", "Positioning", "Segmentation",
    ],
    "Digital Marketing": [
        "Content Marketing", "Email Marketing", "Influencer Marketing", "Mobile Marketing", "Online Advertising",
        "Performance Marketing", "SEM", "SEO", "Social Media Marketing", "Video Marketing",
    ],
    "SEO": [
        "Backlink Building", "Content Optimization", "Google Search Console", "Keyword Research",
        "Local SEO", "On Page SEO", "Technical SEO",
    ],
    "SEM": [
        "Bing Ads", "Google Ads", "Landing Page Optimization", "PPC", "Quality Score", "Remarketing",
    ],
    "Content Marketing": [
        "Blogging", "Case Study", "Content Calendar", "Content Distribution", "Content Strategy",
        "Copywriting", "Ebook", "Whitepaper",
    ],
    "Performance Marketing": [
        "Attribution Modeling", "Conversion Tracking", "CPA", "CPC", "CPM", "CRO", "Funnel Optimization",
        "Paid Acquisition", "ROAS",
    ],
    "Affiliate Marketing": [
        "Affiliate Network", "Commission Management", "Coupon Campaign", "Influencer Partnership",
        "Partner Recruitment", "Referral Program",
    ],
    "Brand Management": [
        "Brand Audit", "Brand Equity", "Brand Guidelines", "Brand Launch", "Brand Positioning",
        "Brand Storytelling", "Logo Design", "Visual Identity",
    ],
    "HR": [
        "Employee Engagement", "HR Analytics", "HR Operations", "HR Policies", "HR Strategy",
        "Human Resource Management", "Industrial Relations", "Performance Management", "Talent Management",
        "Workforce Planning",
    ],
    "Recruitment": [
        "Campus Hiring", "Executive Search", "Interviewing", "Job Posting", "LinkedIn Recruiter",
        "Sourcing", "Talent Sourcing",
    ],
    "Talent Acquisition": [
        "Boolean Search", "Candidate Experience", "Diversity Hiring", "Offer Management", "Onboarding",
        "Recruitment Marketing", "Talent Pipeline",
    ],
    "HR Operations": [
        "Attendance Management", "Employee Records", "HR Information System", "HRIS", "HR Shared Services",
        "Leave Management", "Payroll Processing",
    ],
    "Learning & Development": [
        "Coaching", "Competency Mapping", "Instructional Design", "Kirkpatrick Evaluation", "LMS",
        "Needs Analysis", "Succession Planning", "Training Needs Analysis",
    ],
    "Compensation & Benefits": [
        "Benefits Administration", "Compensation Benchmarking", "ESOP", "Job Evaluation", "Salary Structuring",
        "Variable Pay",
    ],
    "Employee Relations": [
        "Conflict Resolution", "Disciplinary Process", "Diversity and Inclusion", "Employee Grievance",
        "Employee Engagement", "Labor Law", "Workplace Ethics",
    ],
    "Healthcare": [
        "Clinical Documentation", "Clinical Workflow", "EHR", "EMR", "Healthcare Administration",
        "Healthcare Compliance", "HIPAA", "Patient Care", "Patient Safety", "Public Health",
    ],
    "Nursing": [
        "Acute Care", "Critical Care", "Geriatric Care", "ICU Nursing", "Medical Surgical Nursing",
        "Nursing Care Plan", "Patient Assessment", "Pediatric Nursing", "Wound Care",
    ],
    "Medical Coding": [
        "CPT Coding", "HCPCS", "ICD-10", "Inpatient Coding", "Medical Coding", "Outpatient Coding",
    ],
    "Medical Billing": [
        "Accounts Receivable", "Charge Entry", "Claims Denial", "Claims Submission", "Medical Billing",
        "Payment Posting", "Prior Authorization", "Revenue Cycle",
    ],
    "Pharmacy": [
        "Clinical Pharmacy", "Dispensing", "Drug Information", "Medication Therapy Management",
        "Pharmaceutical Care", "Pharmacology",
    ],
    "Dentistry": [
        "Dental Anatomy", "Dental Radiology", "Endodontics", "Oral Surgery", "Orthodontics", "Pediatric Dentistry",
        "Periodontics", "Prosthodontics",
    ],
    "Radiology": [
        "CT Imaging", "DICOM", "MRI", "Mammography", "Medical Imaging", "Nuclear Medicine", "PACS",
        "Radiation Safety", "Ultrasound", "X-Ray",
    ],
    "Physiotherapy": [
        "Cardiopulmonary Rehabilitation", "Exercise Therapy", "Manual Therapy", "Neurological Rehabilitation",
        "Orthopedic Physiotherapy", "Sports Physiotherapy", "Therapeutic Modalities",
    ],
    "Laboratory": [
        "Biochemistry", "Clinical Laboratory", "Hematology", "Histopathology", "Immunology", "Microbiology",
        "Molecular Diagnostics", "PCR", "Quality Control", "Specimen Processing",
    ],
    "Clinical Research": [
        "Clinical Data Management", "Clinical Monitoring", "Clinical Trial Operations", "GCP",
        "Pharmacovigilance", "Protocol Development", "Regulatory Submission",
    ],
    "Legal": [
        "Case Management", "Client Counseling", "Due Diligence", "Legal Drafting", "Legal Research",
        "Legal Writing", "Statutory Interpretation",
    ],
    "Corporate Law": [
        "Board Governance", "Companies Act", "M&A", "Merger", "Acquisition", "Private Equity",
        "Securities Law", "Shareholder Agreement", "Startup Law",
    ],
    "Civil Law": [
        "Civil Procedure", "Contract Dispute", "Family Law", "Land Law", "Property Dispute", "Succession Law",
        "Tort Law",
    ],
    "Criminal Law": [
        "Bail Application", "Criminal Defense", "Criminal Procedure", "Evidence Law", "Prosecution",
        "White Collar Crime",
    ],
    "Tax Law": [
        "Customs Law", "Direct Tax", "GST Litigation", "Indirect Tax", "Income Tax Act", "Tax Appeal",
        "Transfer Pricing Dispute",
    ],
    "IP Law": [
        "Copyright", "Design Registration", "Licensing", "Patent", "Patent Drafting", "Patent Prosecution",
        "Trademark", "Trade Secret",
    ],
    "Compliance": [
        "AML", "Anti Bribery", "Data Privacy", "GDPR", "Internal Controls", "KYC", "Policy Drafting",
        "Regulatory Reporting", "Risk Compliance",
    ],
    "Contract Management": [
        "Contract Compliance", "Contract Lifecycle", "Contract Negotiation", "Contract Review",
        "Service Level Agreement", "Vendor Contract",
    ],
    "Litigation": [
        "Appellate Practice", "Civil Litigation", "Commercial Litigation", "Court Procedures", "Discovery",
        "Motion Practice", "Pleadings", "Trial Advocacy",
    ],
    "Arbitration": [
        "Arbitral Award", "Arbitration Agreement", "Conciliation", "Domestic Arbitration", "International Arbitration",
        "Mediation",
    ],
    "Accounting": [
        "Accounts Payable", "Accounts Receivable", "Bank Reconciliation", "Chart of Accounts", "Closing Entries",
        "Financial Reporting", "General Ledger", "Journal Entries", "QuickBooks", "SAP FICO", "TallyPrime",
        "Trial Balance",
    ],
    "Finance": [
        "Business Valuation", "Capital Budgeting", "Corporate Finance", "Credit Analysis", "Debt Financing",
        "Equity Research", "Financial Forecasting", "Financial Modeling", "Investment Analysis",
        "Portfolio Management", "Risk Management", "Working Capital",
    ],
    "Banking": [
        "Branch Banking", "Commercial Lending", "Core Banking", "Credit Appraisal", "Digital Banking",
        "KYC", "Loan Processing", "Mobile Banking", "Retail Banking", "Trade Finance", "Underwriting",
    ],
    "Investment Banking": [
        "Buy Side", "Capital Markets", "Debt Capital Markets", "Due Diligence", "Equity Capital Markets",
        "IPO", "Leveraged Buyout", "M&A", "Pitch Book", "Private Placement", "Sell Side",
    ],
    "Insurance": [
        "Actuarial Analysis", "Claims Processing", "General Insurance", "Health Insurance", "Life Insurance",
        "Policy Administration", "Reinsurance", "Risk Assessment", "Underwriting",
    ],
    "Taxation": [
        "Advance Tax", "Capital Gains", "Corporate Tax", "Customs Duty", "Direct Tax", "Excise", "GST",
        "Indirect Tax", "Income Tax", "International Taxation", "Tax Audit", "Tax Compliance", "Tax Litigation",
        "Tax Planning", "Tax Return", "TDS", "Transfer Pricing", "VAT",
    ],
    "Audit": [
        "Audit Report", "Compliance Audit", "Control Testing", "External Audit", "Forensic Audit",
        "Fraud Investigation", "Information Systems Audit", "Internal Audit", "ISO Audit",
        "Operational Audit", "Statutory Audit",
    ],
    "Payroll": [
        "Benefits Administration", "Compensation", "Garnishment", "Leave Administration", "Payroll Accounting",
        "Payroll Compliance", "Payroll Processing", "Salary Structure", "Time and Attendance",
    ],
    "Treasury": [
        "Cash Flow Forecasting", "Debt Management", "Foreign Exchange", "FX Hedging", "Liquidity Management",
        "Treasury Operations", "Working Capital Management",
    ],
    "Risk Management": [
        "Basel", "Credit Risk", "Cyber Risk", "Enterprise Risk", "ERM", "Fraud Risk", "Market Risk",
        "Operational Risk", "Risk Appetite", "Stress Testing", "Value at Risk",
    ],
    "Engineering": [
        "CAD", "CAM", "CAE", "CFD", "Design Engineering", "FEA", "Project Engineering", "Quality Engineering",
        "Reverse Engineering", "Simulation",
    ],
    "Mechanical": [
        "Automotive Design", "CATIA", "Combustion", "Computational Fluid Dynamics", "FEA", "Fluid Mechanics",
        "Heat Transfer", "HVAC", "Machine Design", "Mechanical Design", "Solid Mechanics", "SolidWorks",
        "Thermodynamics", "Vibration Analysis",
    ],
    "Electrical": [
        "Circuit Design", "Control Systems", "Digital Electronics", "Electrical Distribution", "Electrical Machines",
        "ETAP", "Power Electronics", "Power Systems", "Protection Relay", "SCADA", "Signal Processing",
        "Transformer",
    ],
    "Electronics": [
        "Analog Circuits", "ASIC", "Cadence", "Digital Circuits", "FPGA", "Microcontroller", "Microelectronics",
        "PCB Design", "RF Engineering", "Semiconductor", "VLSI",
    ],
    "Civil": [
        "AutoCAD Civil 3D", "Construction Management", "ETABS", "Foundation Design", "Geotechnical Engineering",
        "Highway Engineering", "RCC", "Reinforced Concrete", "Remote Sensing", "Revit", "SAP2000",
        "STAAD Pro", "Steel Structures", "Structural Analysis", "Surveying", "Transportation Engineering",
        "Water Resources",
    ],
    "Automobile": [
        "ADAS", "Autonomous Vehicles", "Braking Systems", "Chassis Design", "Crashworthiness", "Electric Vehicles",
        "Engine Design", "Hybrid Vehicles", "NVH", "Powertrain", "Suspension", "Transmission", "Vehicle Dynamics",
    ],
    "Chemical": [
        "Aspen Plus", "Chemical Process Design", "Distillation", "HYSYS", "Mass Transfer", "Petrochemicals",
        "Pharmaceuticals", "Polymers", "Process Control", "Process Simulation", "Reaction Engineering",
        "Thermodynamics",
    ],
    "Petroleum": [
        "Directional Drilling", "Downhole", "Drilling Engineering", "Enhanced Oil Recovery", "Formation Evaluation",
        "LNG", "Offshore", "Petroleum Geology", "Petrophysics", "Production Engineering", "Refinery",
        "Reservoir Engineering", "Well Completion", "Well Logging", "Well Testing",
    ],
    "Mining": [
        "Blasting", "Exploration", "Geostatistics", "Mine Planning", "Mine Safety", "Mine Ventilation",
        "Mineral Processing", "Open Pit", "Rock Mechanics", "Surpac", "Underground Mining",
    ],
    "Industrial": [
        "Ergonomics", "Industrial Engineering", "Kaizen", "Lean Manufacturing", "Line Balancing",
        "Operations Research", "Process Optimization", "Production Planning", "Quality Control",
        "Six Sigma", "Time Study", "Value Stream Mapping",
    ],
    "Construction": [
        "Building Information Modeling", "BIM", "Construction Scheduling", "Cost Estimation", "Crane Operation",
        "Excavation", "Green Building", "Quality Control", "Safety Management", "Scaffolding",
        "Site Supervision", "Tendering",
    ],
    "Architecture": [
        "Architectural Design", "Architectural Visualization", "AutoCAD", "BIM", "Building Codes",
        "Facade Design", "Landscape Architecture", "Revit", "SketchUp", "Urban Design",
    ],
    "Interior Design": [
        "3ds Max", "CAD", "Color Theory", "Commercial Interior", "Furniture Layout", "Lighting Design",
        "Material Selection", "Residential Interior", "SketchUp", "Space Planning", "V-Ray",
    ],
    "Surveying": [
        "Boundary Survey", "Cadastral Survey", "Geodetic Survey", "GIS", "GNSS", "GPS", "Hydrographic Survey",
        "Land Survey", "Total Station", "Topographic Survey",
    ],
    "Urban Planning": [
        "Environmental Planning", "GIS", "Housing Policy", "Land Use Planning", "Regional Planning",
        "Smart City", "Transportation Planning", "Urban Design", "Zoning",
    ],
    "Manufacturing": [
        "Assembly", "CNC", "Casting", "Fabrication", "Forging", "Injection Molding", "Machining",
        "Production Line", "Quality Control", "Sheet Metal", "Welding",
    ],
    "Production": [
        "Batch Production", "Job Production", "Make to Order", "Make to Stock", "Mass Production",
        "MES", "OEE", "Production Planning", "Production Scheduling", "Takt Time",
    ],
    "Quality Control": [
        "Acceptance Sampling", "Control Chart", "Inspection", "ISO 9001", "Non Conformance", "Quality Audit",
        "Quality Management System", "SPC", "Statistical Process Control",
    ],
    "Supply Chain": [
        "Demand Forecasting", "Distribution", "Inventory Management", "Logistics", "Procurement",
        "S&OP", "Supplier Management", "Supply Chain Analytics", "Transportation", "Warehouse",
    ],
    "Procurement": [
        "Category Management", "Contract Negotiation", "Purchase Order", "Purchasing", "RFQ",
        "Sourcing", "Spend Analysis", "Strategic Sourcing", "Supplier Evaluation", "Vendor Management",
    ],
    "Inventory": [
        "ABC Analysis", "Cycle Counting", "EOQ", "Inventory Control", "Just In Time", "Safety Stock",
        "Stock Audit", "Stock Replenishment", "Warehouse Management",
    ],
    "Warehouse": [
        "Cross Docking", "Forklift Operation", "Order Picking", "Packing", "Receiving", "Shipping",
        "Warehouse Layout", "Warehouse Management System", "WMS",
    ],
    "Banking": [
        "Commercial Banking", "Retail Banking", "Investment Banking", "Corporate Banking", "Private Banking",
        "Wealth Management", "Credit Analysis", "Loan Processing", "Risk Management", "Compliance",
        "Banking Operations", "Treasury", "Trade Finance", "Foreign Exchange", "Cash Management",
        "Banking Technology", "Digital Banking", "Customer Service", "Banking Regulations",
        "Anti Money Laundering", "KYC", "Fraud Detection", "Banking Sales", "Financial Analysis",
        "Mortgage Banking", "Savings Accounts", "Checking Accounts", "Credit Cards", "Debit Cards",
        "Online Banking", "Mobile Banking", "ATM Operations", "Bank Security", "Bank Auditing",
        "Capital Markets", "Asset Management", "Investment Products", "Bank Marketing", "Customer Relations",
        "Bank Strategy", "Financial Planning", "Bank Accounting", "Bank Reporting", "Branch Management",
        "Bank Leadership", "Bank Innovation", "Fintech Integration", "Core Banking", "Payment Systems",
        "Wire Transfers", "ACH Processing", "Check Processing", "Lending Operations", "Deposit Operations",
        "Bank Risk", "Operational Risk", "Credit Risk", "Market Risk", "Liquidity Risk",
        "Bank Customer Service", "Bank Teller Operations", "Loan Underwriting", "Credit Scoring", "Debt Collection",
        "Bank Collections", "Recovery Management", "Non-performing Assets", "NPA Management", "Bank Loan Recovery",
        "Bank Credit Policy", "Loan Documentation", "Collateral Management", "Guarantee Management", "Bank Securitization",
        "Bank Treasury Operations", "Bank Investment Portfolio", "Bank ALM", "Asset Liability Management", "Bank Stress Testing",
        "Bank Basel Compliance", "Regulatory Reporting", "Bank Supervision", "Bank Examination", "Bank Licensing",
        "Bank Mergers and Acquisitions", "Bank Due Diligence", "Bank Valuation", "Bank Restructuring", "Bank Turnaround",
        "Bank Digital Transformation", "Bank Mobile Apps", "Bank Internet Banking", "Bank API Integration", "Bank Open Banking",
        "Bank Blockchain", "Bank Cryptocurrency", "Bank Fintech Partnerships", "Bank Startup Collaboration", "Bank Innovation Labs",
        "Bank Customer Analytics", "Bank Data Analytics", "Bank Business Intelligence", "Bank Predictive Analytics", "Bank AI and Machine Learning",
        "Bank Chatbots", "Bank Virtual Assistants", "Bank Robo-advisors", "Bank Digital Onboarding", "Bank E-KYC",
        "Bank Biometrics", "Bank Voice Recognition", "Bank Face Recognition", "Bank Fingerprint Authentication", "Bank Security Systems",
        "Bank Fraud Prevention", "Bank Cybersecurity", "Bank Data Privacy", "Bank Information Security", "Bank Network Security",
        "Bank Disaster Recovery", "Bank Business Continuity", "Bank IT Infrastructure", "Bank Cloud Computing", "Bank DevOps",
        "Bank Customer Relationship Management", "Bank CRM", "Bank Loyalty Programs", "Bank Rewards Programs", "Bank Card Programs",
        "Bank Branch Network", "Bank ATM Network", "Bank Channel Strategy", "Bank Omnichannel", "Bank Digital Channels",
        "Bank Product Development", "Bank Service Design", "Bank Customer Journey", "Bank User Experience", "Bank UX Design",
        "Bank Agile", "Bank Scrum", "Bank Kanban", "Bank DevOps", "Bank ITIL",
        "Bank Service Level Agreement", "Bank SLA", "Bank Performance Management", "Bank KPIs", "Bank Metrics",
        "Bank Customer Satisfaction", "Bank NPS", "Bank CSAT", "Bank Customer Loyalty", "Bank Retention",
        "Bank Churn Reduction", "Bank Customer Acquisition", "Bank Cross-selling", "Bank Up-selling", "Bank Revenue Growth",
        "Bank Cost Reduction", "Bank Efficiency", "Bank Productivity", "Bank Process Automation", "Bank RPA",
    ],
    "Construction": [
        "Construction Management", "Project Planning", "Site Management", "Safety Management",
        "Quality Control", "Cost Management", "Scheduling", "Contract Management", "Subcontracting",
        "Construction Methods", "Building Codes", "Construction Materials", "Equipment Management",
        "Labor Management", "Construction Software", "Green Building", "Sustainable Construction",
        "Construction Technology", "Construction Risk", "Construction Finance", "Civil Construction",
        "Residential Construction", "Commercial Construction", "Industrial Construction",
        "Infrastructure Construction", "Heavy Construction", "Building Construction", "Road Construction",
        "Bridge Construction", "Tunnel Construction", "Foundation Work", "Structural Steel",
        "Concrete Work", "Masonry", "Carpentry", "Electrical Work", "Plumbing", "HVAC",
        "Roofing", "Insulation", "Drywall", "Painting", "Flooring", "Landscaping",
        "Site Preparation", "Excavation", "Demolition", "Construction Safety", "Building Inspection",
        "Project Estimation", "Construction Law", "Construction Contracts", "Construction Logistics",
        "Material Procurement", "Construction Equipment Operation", "Crane Operation", "Forklift Operation",
        "Heavy Machinery", "Construction Supervision", "Construction Coordination", "Construction Documentation",
        "Building Design", "Architecture", "Structural Engineering", "MEP Systems", "Fire Protection",
        "Building Automation", "Construction Sustainability", "LEED Certification", "Energy Efficient Building",
        "Construction Renovation", "Construction Retrofitting", "Building Maintenance", "Construction Surveying",
        "Construction Layout", "Construction Testing", "Construction Quality Assurance",
    ],
    "Inventory": [
        "Inventory Control", "Stock Management", "Warehouse Operations", "Inventory Planning",
        "Demand Forecasting", "Safety Stock", "Inventory Valuation", "Cycle Counting", "Inventory Software",
        "Supply Chain Coordination", "Inventory Optimization", "Just in Time", "Inventory Policies",
        "Inventory Audits", "Inventory Reporting", "Inventory Analytics", "Inventory Management",
        "Inventory Tracking", "Inventory Systems", "Inventory Strategy", "Inventory Costs",
        "Inventory Accuracy", "Inventory Turnover", "Inventory Replenishment", "Inventory Levels",
        "ABC Analysis", "EOQ", "Stock Replenishment", "Stock Audit", "Material Requirements Planning",
        "MRP", "Warehouse Inventory", "Retail Inventory", "Manufacturing Inventory", "Distribution Inventory",
        "Cycle Count", "Physical Inventory", "Perpetual Inventory", "Inventory Control Systems",
        "Inventory Management Software", "Stocktaking", "Inventory Reduction", "Inventory Optimization Techniques",
        "Demand Planning", "Supply Chain Inventory", "Multi-echelon Inventory", "Vendor Managed Inventory",
        "Consignment Inventory", "Buffer Stock", "Reorder Point", "Lead Time Management",
        "Stock Rotation", "Inventory Classification", "Inventory Performance Metrics", "Inventory Costing",
    ],
    "Pharmacy": [
        "Pharmaceutical Compounding", "Drug Dispensing", "Medication Therapy", "Pharmacology",
        "Pharmacy Law", "Pharmacy Ethics", "Patient Counseling", "Drug Interactions",
        "Dosage Calculations", "Pharmacy Software", "Inventory Management", "Pharmacy Regulations",
        "Clinical Pharmacy", "Pharmacy Administration", "Pharmacy Technology", "Pharmacy Safety",
        "Drug Formulation", "Prescription Processing", "Medication Review", "Pharmaceutical Chemistry",
        "Drug Information", "Pharmacy Operations", "Retail Pharmacy", "Hospital Pharmacy",
        "Pharmaceutical Care", "Drug Therapy Management", "Patient Safety", "Pharmacy Automation",
        "Quality Assurance", "Medication Safety", "Pharmaceutical Calculations", "Drug Delivery Systems",
        "Pharmacotherapy", "Clinical Pharmacokinetics", "Pharmaceutics", "Drug Development",
        "Pharmaceutical Analysis", "Quality Control", "Good Manufacturing Practice", "GMP",
        "Regulatory Affairs", "Drug Approval Process", "Clinical Trials", "Pharmaceutical Marketing",
        "Pharmacy Management", "Medication Adherence", "Drug Utilization Review", "Pharmaceutical Economics",
        "Pharmacy Informatics", "Telepharmacy", "Compounding Pharmacy", "Specialty Pharmacy",
        "Long-term Care Pharmacy", "Mail Order Pharmacy", "Community Pharmacy", "Ambulatory Care Pharmacy",
        "Nuclear Pharmacy", "Oncology Pharmacy", "Pediatric Pharmacy", "Geriatric Pharmacy",
        "Pharmaceutical Sales", "Medical Representative", "Pharmacy Business", "Pharmacy Entrepreneurship",
        "Pharmacy Consulting", "Pharmacy Education", "Pharmacy Research", "Pharmacy Clinical Research",
        "Pharmacy Quality Management", "Pharmacy Accreditation", "Pharmacy Licensing", "Pharmacy Inspection",
        "Pharmacy Storage", "Cold Chain Management", "Temperature Monitoring", "Drug Stability",
        "Pharmacy Dispensing Systems", "Automated Dispensing", "Robotics in Pharmacy", "Pharmacy Workflow",
        "Pharmacy Customer Service", "Pharmacy Billing", "Pharmacy Insurance", "Pharmacy Reimbursement",
        "Pharmacy Claims Processing", "Pharmacy Prior Authorization", "Pharmacy Formulary Management",
        "Pharmacy Therapeutic Interchange", "Pharmacy Drug Utilization", "Pharmacy Outcomes Research",
        "Pharmacy Pharmacoeconomics", "Pharmacy Health Outcomes", "Pharmacy Patient Outcomes",
        "Pharmacy Medication Therapy Management", "Pharmacy Immunizations", "Pharmacy Vaccinations",
        "Pharmacy Health Screenings", "Pharmacy Wellness Programs", "Pharmacy Chronic Disease Management",
        "Pharmacy Diabetes Management", "Pharmacy Hypertension Management", "Pharmacy Lipid Management",
        "Pharmacy Anticoagulation Management", "Pharmacy Asthma Management", "Pharmacy COPD Management",
        "Pharmacy Cardiovascular Management", "Pharmacy Heart Failure Management", "Pharmacy Arrhythmia Management",
        "Pharmacy Infectious Disease Management", "Pharmacy Antibiotic Stewardship", "Pharmacy Antimicrobial Management",
        "Pharmacy Pain Management", "Pharmacy Palliative Care", "Pharmacy Hospice Care", "Pharmacy End of Life Care",
        "Pharmacy Transitions of Care", "Pharmacy Care Coordination", "Pharmacy Interprofessional Collaboration",
        "Pharmacy Patient Education", "Pharmacy Health Literacy", "Pharmacy Medication Safety Programs",
        "Pharmacy Adverse Drug Reaction Monitoring", "Pharmacy Pharmacovigilance", "Pharmacy Drug Safety",
        "Pharmacy Medication Error Prevention", "Pharmacy Root Cause Analysis", "Pharmacy Quality Improvement",
        "Pharmacy Performance Metrics", "Pharmacy Benchmarking", "Pharmacy Best Practices",
        "Pharmacy Standard Operating Procedures", "Pharmacy Protocols", "Pharmacy Guidelines",
        "Pharmacy Clinical Guidelines", "Pharmacy Treatment Algorithms", "Pharmacy Decision Support",
        "Pharmacy Computerized Physician Order Entry", "Pharmacy CPOE", "Pharmacy Barcode Medication Administration",
        "Pharmacy BCMA", "Pharmacy Smart Pumps", "Pharmacy Infusion Pumps", "Pharmacy IV Compounding",
        "Pharmacy Sterile Compounding", "Pharmacy Aseptic Technique", "Pharmacy Clean Room", "Pharmacy Isolator",
        "Pharmacy Hazardous Drugs", "Pharmacy Chemotherapy", "Pharmacy Biohazard Safety", "Pharmacy Personal Protective Equipment",
    ],
    "Store Operations": [
        "Store Management", "Inventory Control", "Staff Scheduling", "Cash Management",
        "Customer Service", "Visual Merchandising", "Loss Prevention", "Store Maintenance",
        "Store Security", "Opening Procedures", "Closing Procedures", "Store Policies",
        "Performance Monitoring", "Store Reporting", "Store Communication", "Sales Floor Management",
        "Stock Replenishment", "Price Changes", "Signage Management", "Customer Experience",
        "Team Leadership", "Store Budgeting", "Store Marketing", "Product Displays",
        "Checkout Operations", "Cash Register Management", "POS Systems", "Return Processing",
        "Exchange Handling", "Customer Complaints", "Store Cleanliness", "Safety Protocols",
        "Emergency Procedures", "Staff Training", "Employee Supervision", "Sales Targets",
        "KPI Tracking", "Store Analytics", "Customer Feedback", "Vendor Relations",
        "Delivery Coordination", "Shelf Management", "Backroom Organization", "Stock Room Management",
        "Inventory Audits", "Cycle Counts", "Physical Inventory", "Store Layout Optimization",
        "Traffic Management", "Queue Management", "Peak Hour Management", "Holiday Operations",
        "Seasonal Setup", "Promotional Setup", "Event Planning", "Store Standards",
        "Merchandising Standards", "Product Availability", "Stock Management", "Shelf Stocking",
        "Price Tagging", "Product Placement", "Store Appearance", "Store Ambiance",
        "Customer Flow", "Department Management", "Section Management", "Zone Management",
        "Store Staffing", "Employee Scheduling", "Labor Cost Control", "Store P&L Management",
        "Store Profitability", "Sales per Square Foot", "Conversion Rate", "Average Transaction Value",
        "Units per Transaction", "Basket Size", "Foot Traffic Analysis", "Dwell Time Measurement",
        "Store Capacity Planning", "Space Utilization", "Fixture Management", "Display Management",
        "Planogram Compliance", "Planogram Execution", "Planogram Optimization", "Shelf Allocation",
        "Category Management", "Assortment Planning", "Range Planning", "Product Mix Optimization",
        "Store Operations Excellence", "Operational Efficiency", "Process Improvement", "Lean Retail",
        "Store Digital Transformation", "Omnichannel Operations", "Click and Collect", "Buy Online Pick Up In Store",
        "BOPIS", "Curbside Pickup", "Same Day Delivery", "Store Fulfillment", "Endless Aisle",
        "Store Technology", "Retail Technology", "Mobile POS", "Tablet POS", "Contactless Payments",
        "Mobile Wallets", "Self Checkout", "Kiosks", "Digital Signage", "Electronic Shelf Labels",
        "Store Automation", "Inventory Automation", "Replenishment Automation", "Order Automation",
        "Store Communication Systems", "Task Management", "Task Assignment", "Task Completion Tracking",
        "Store Performance Management", "Employee Performance", "Team Performance", "Individual Performance",
        "Store Coaching", "Store Mentoring", "Store Development", "Career Pathing",
        "Store Culture", "Team Building", "Employee Engagement", "Store Morale",
        "Store Safety Culture", "Loss Prevention Culture", "Customer Service Culture", "Sales Culture",
    ],
    "Talent Acquisition": [
        "Recruiting", "Sourcing", "Interviewing", "Candidate Assessment", "Employer Branding",
        "Recruitment Marketing", "ATS", "Background Checks", "Job Descriptions", "Salary Negotiation",
        "Onboarding", "Recruitment Analytics", "Recruitment Strategy", "Talent Pipelines",
        "Recruitment Compliance", "Recruitment Technology", "Headhunting", "Executive Search",
        "Campus Recruitment", "Referral Programs", "Social Recruiting", "Talent Sourcing",
        "Candidate Experience", "Recruitment Metrics", "Talent Branding", "Recruitment Automation",
        "Diversity Recruiting", "Employer Value Proposition", "Talent Mapping", "Competitor Analysis",
        "Talent Communities", "Recruitment Campaigns", "Job Posting", "Resume Screening",
        "Video Interviewing", "Assessment Centers", "Psychometric Testing", "Skill Assessment",
        "Behavioral Interviewing", "Panel Interviews", "Offer Management", "Candidate Relationship Management",
        "Talent Pool Development", "Passive Candidate Sourcing", "LinkedIn Recruiting", "Boolean Search",
        "Recruitment Analytics", "Time to Hire", "Cost per Hire", "Quality of Hire",
        "Recruitment ROI", "Talent Acquisition Strategy", "Workforce Planning", "Succession Planning",
        "Internal Mobility", "Employee Referrals", "Alumni Networks", "Recruitment Events",
        "Job Fairs", "Career Fairs", "Virtual Recruitment", "Remote Hiring", "Global Recruitment",
        "Immigration Support", "Visa Sponsorship", "Relocation Assistance", "Recruitment Budgeting",
        "Vendor Management", "Recruitment Agency Management", "Contingent Workforce", "Contract Hiring",
        "Freelance Talent", "Gig Economy Talent", "Talent Retention", "Recruitment Process Outsourcing",
        "Recruitment Marketing Automation", "Email Campaigns", "Social Media Recruiting", "Recruitment Content",
        "Employer Brand Strategy", "Candidate Journey Mapping", "Recruitment Funnel Optimization",
        "Talent Acquisition Metrics", "Recruitment KPIs", "Hiring Velocity", "Offer Acceptance Rate",
        "Candidate Nurturing", "Talent Engagement", "Recruitment CRM", "Candidate Database Management",
        "Recruitment Project Management", "Hiring Manager Training", "Interviewer Training", "Recruitment Compliance Training",
        "Diversity and Inclusion Recruiting", "Inclusive Hiring", "Unconscious Bias Training", "Equal Opportunity",
        "Accessibility in Recruiting", "Neurodiversity Hiring", "Veterans Hiring", "Disability Hiring",
        "Recruitment Technology Stack", "HR Tech", "Recruitment AI", "Recruitment Machine Learning",
        "Predictive Hiring", "Talent Intelligence", "Labor Market Intelligence", "Salary Benchmarking",
        "Compensation Analysis", "Benefits Benchmarking", "Total Rewards", "Executive Compensation",
        "Talent Development", "Skills Gap Analysis", "Competency Mapping", "Job Architecture",
        "Role Definition", "Job Family Design", "Career Framework", "Skill Taxonomy",
        "Talent Marketplace", "Internal Mobility Platform", "Skills Matching", "Career Pathing",
        "Recruitment Operations", "Recruitment Process Design", "Recruitment Workflow Optimization",
        "Recruitment Service Delivery", "Recruitment SLAs", "Recruitment Customer Service",
        "Stakeholder Management", "Hiring Manager Partnership", "Business Partnering", "HR Business Partner",
        "Talent Acquisition Leadership", "Recruitment Team Management", "Recruitment Vendor Selection",
        "Recruitment Contract Negotiation", "Recruitment Cost Management", "Recruitment Budget Optimization",
    ],
    "Marketing": [
        "Digital Marketing", "Content Marketing", "Social Media Marketing", "Email Marketing", "SEO",
        "SEM", "PPC Advertising", "Google Ads", "Facebook Ads", "LinkedIn Ads", "Instagram Marketing",
        "Twitter Marketing", "YouTube Marketing", "TikTok Marketing", "Influencer Marketing",
        "Affiliate Marketing", "Marketing Analytics", "Marketing Automation", "Marketing Strategy",
        "Brand Management", "Brand Strategy", "Brand Positioning", "Brand Awareness", "Brand Equity",
        "Market Research", "Market Analysis", "Competitive Analysis", "Customer Research", "Consumer Insights",
        "Marketing Communications", "Public Relations", "PR", "Corporate Communications", "Media Relations",
        "Event Marketing", "Trade Shows", "Conferences", "Webinars", "Virtual Events",
        "Product Marketing", "Product Launch", "Go-to-Market Strategy", "Product Positioning", "Product Messaging",
        "Growth Marketing", "Growth Hacking", "Viral Marketing", "Referral Marketing", "Community Marketing",
        "Content Strategy", "Content Creation", "Copywriting", "Blog Writing", "Technical Writing",
        "Video Marketing", "Video Production", "Video Editing", "Motion Graphics", "Animation",
        "Graphic Design", "Visual Design", "UI Design", "UX Design", "Creative Direction",
        "Marketing Operations", "Marketing Technology", "MarTech Stack", "CRM", "Marketing Automation Platforms",
        "HubSpot", "Marketo", "Salesforce Marketing Cloud", "Pardot", "Mailchimp", "Constant Contact",
        "Marketing Budgeting", "Marketing ROI", "Marketing Metrics", "KPIs", "Marketing Attribution",
        "Customer Acquisition", "Lead Generation", "Demand Generation", "Lead Nurturing", "Lead Scoring",
        "Customer Retention", "Customer Loyalty", "Customer Lifetime Value", "CLV", "Churn Reduction",
        "Marketing Campaigns", "Campaign Management", "Multi-channel Marketing", "Omnichannel Marketing",
        "A/B Testing", "Conversion Rate Optimization", "CRO", "Landing Page Optimization", "Funnel Optimization",
        "Marketing Data Analysis", "Marketing Intelligence", "Business Intelligence", "Data-Driven Marketing",
        "Marketing Attribution", "Multi-touch Attribution", "Marketing Mix Modeling", "Marketing Forecasting",
        "Marketing Planning", "Marketing Calendar", "Marketing Project Management", "Agile Marketing",
        "Marketing Leadership", "Marketing Team Management", "Marketing Vendor Management",
        "Agency Management", "Creative Agencies", "Media Buying", "Media Planning", "Programmatic Advertising",
        "Native Advertising", "Display Advertising", "Mobile Marketing", "App Marketing", "SMS Marketing",
        "Push Notifications", "In-App Marketing", "Retargeting", "Remarketing", "Lookalike Audiences",
        "Marketing Compliance", "GDPR", "CAN-SPAM", "Privacy Policy", "Ethical Marketing",
        "Sustainability Marketing", "Green Marketing", "Cause Marketing", "Social Impact Marketing",
        "Marketing Innovation", "Emerging Technologies", "AI in Marketing", "Machine Learning in Marketing",
        "Voice Search Optimization", "Visual Search", "Augmented Reality Marketing", "VR Marketing",
        "Marketing Personalization", "Customer Segmentation", "Targeting", "Positioning", "Messaging",
        "Marketing Collateral", "Brochures", "White Papers", "Case Studies", "Infographics",
        "Presentation Skills", "Marketing Presentations", "Pitch Decks", "Sales Enablement",
        "Marketing Training", "Marketing Coaching", "Marketing Mentoring", "Marketing Education",
    ],
}

# ---------------------------------------------------------------------------
# Generic cleaning
# ---------------------------------------------------------------------------
STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
    'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they',
    'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'up', 'out',
    'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him',
    'time', 'two', 'more', 'very', 'when', 'come', 'use', 'no', 'way', 'could', 'other', 'than',
    'only', 'those', 'look', 'now', 'over', 'think', 'also', 'back', 'after', 'first', 'well',
    'being', 'where', 'why', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'i', 'me', 'my', 'myself',
    'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him',
    'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
    'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those',
    'am', 'is', 'are', 'was', 'were', 'being', 'been', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'shall', 'should', 'will', 'would', 'may', 'might', 'must', 'can', 'could',
}

TITLE_WORDS = {
    'manager', 'director', 'head', 'lead', 'senior', 'sr', 'junior', 'jr', 'associate', 'assistant',
    'executive', 'officer', 'specialist', 'consultant', 'analyst', 'engineer', 'engineer trainee',
    'trainee', 'intern', 'coordinator', 'supervisor', 'vp', 'vice president', 'president', 'ceo', 'cto',
    'cfo', 'cio', 'chief', 'owner', 'partner', 'founder', 'chairman', 'chairperson', 'president',
    'principal', 'fellow', 'staff', 'group', 'lead', 'lead engineer', 'chief engineer', 'distinguished',
    'managerial', 'executive', 'trainee', 'apprentice', 'graduate', 'undergraduate', 'entry level',
    'mid level', 'experienced', 'expert', 'expertise', 'professional', 'certified', 'qualified',
    'licensed', 'registered', 'accredited',
}

EXCLUDED_PHRASES = {
    'responsibilities', 'responsible', 'duties', 'job', 'role', 'position', 'career', 'employment',
    'work experience', 'years of experience', 'monthly salary', 'salary', 'ctc', 'joining', 'notice period',
    'contact', 'phone', 'email', 'address', 'resume', 'cv', 'curriculum vitae', 'objective', 'summary',
    'skills', 'skill set', 'competencies', 'core competencies', 'expertise', 'abilities', 'soft skills',
    'hard skills', 'technical skills', 'language', 'languages', 'hobbies', 'interests', 'activities',
    'personal details', 'declaration', 'reference', 'references', 'available upon request',
    'academic', 'school', 'college', 'university', 'bachelor', 'master', 'phd', 'doctorate', 'degree',
    'certification', 'certified', 'license', 'diploma', 'high school', 'secondary', 'undergraduate',
    'postgraduate', 'mba', 'btech', 'mtech', 'be', 'me', 'bsc', 'msc', 'bcom', 'mcom', 'ba', 'ma',
    'pg', 'ug', 'graduation', 'post graduation',
}

# Multi-word title phrases to strip from role strings
ROLE_STOP_PHRASES = sorted([
    'senior', 'junior', 'lead', 'principal', 'staff', 'chief', 'head', 'director', 'manager',
    'associate', 'assistant', 'executive', 'officer', 'specialist', 'consultant', 'analyst',
    'engineer', 'trainee', 'intern', 'coordinator', 'supervisor', 'vice president', 'vp',
    'ceo', 'cto', 'cfo', 'cio', 'coo', 'founder', 'owner', 'partner', 'chairman', 'chairperson',
    'fellow', 'distinguished', 'graduate', 'entry level', 'mid level', 'experienced', 'expert',
    'professional', 'certified', 'registered', 'licensed', 'qualified', 'accredited',
], key=len, reverse=True)


def clean_skill(s):
    """Normalize and validate a single skill string, aggressively removing job titles, suffixes, and generic terms."""
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    # Join accidental merged words like "Will PreparationWhistleblower Investigations"
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', s)
    # Fix missing spaces after parentheses/slashes
    s = re.sub(r'\)\s*([A-Z])', r') \1', s)
    # Remove parenthetical text and trailing/leading punctuation
    s = re.sub(r'\s*\([^)]*\)', '', s)
    s = s.strip('.,;:!?()[]{}"\'')
    # Remove extra whitespace
    s = re.sub(r'\s+', ' ', s)
    if len(s) < 2 or len(s) > 80:
        return None

    low = s.lower()
    # Skip generic/resume phrases
    for ex in EXCLUDED_PHRASES:
        if ex in low:
            return None

    # Remove common leading filler words
    filler = [
        'advanced', 'basic', 'intermediate', 'introductory', 'elementary', 'junior', 'senior',
        'entry level', 'mid level', 'experienced', 'certified', 'qualified', 'licensed',
        'registered', 'accredited', 'professional', 'expert', 'specialist', 'general',
    ]
    for f in filler:
        low_s = re.sub(r'^' + re.escape(f) + r'\s+', '', low)
        if low_s != low:
            low = low_s
            s = s[len(f):].strip()

    # Remove some noisy education suffixes from the end only (only if a known skill would not be destroyed)
    protected_suffix_skills = {
        'project management', 'supply chain management', 'risk management', 'quality management',
        'change management', 'program management', 'product management', 'operations management',
        'business management', 'facility management', 'warehouse management', 'inventory management',
        'performance management', 'talent management', 'relationship management', 'content management',
        'data management', 'database management', 'network management', 'system management',
        'web development', 'mobile development', 'software development', 'game development',
        'frontend development', 'backend development', 'full stack development', 'fullstack development',
        'cloud development', 'application development', 'product development', 'business development',
        'career development', 'research and development', 'organization development',
    }
    suffixes = [
        'skills development', 'skill development', 'study skills', 'peer tutoring', 'tutoring facilitation',
        'test preparation', 'exam grading', 'fieldwork supervision', 'e-learning design', 'online instruction',
        'curriculum development', 'textbook development', 'department chair', 'program director',
        'curriculum specialist', 'education researcher', 'education consultant', 'learning assessment',
        'learning design', 'skills coaching', 'workshop facilitation', 'assistance', 'assisting',
    ]
    if low not in protected_suffix_skills:
        for suffix in suffixes:
            new = re.sub(r'\s+' + re.escape(suffix) + r'$', '', s, flags=re.IGNORECASE).strip()
            new = re.sub(r'^' + re.escape(suffix) + r'\s+', '', new, flags=re.IGNORECASE).strip()
            if new != s:
                s = new
                low = s.lower()
    s = re.sub(r'\s+', ' ', s).strip('.,;:!?()[]{}"\'')
    if not s or len(s) < 2 or len(s) > 80:
        return None
    low = s.lower()

    # Reject strings that still contain job/title words as whole words
    title_words = [
        'advisor', 'adviser', 'architect', 'auditor', 'designer', 'inspector', 'planner', 'superintendent',
        'surveyor', 'trainer', 'technician', 'operator', 'teacher', 'instructor', 'tutor', 'professor',
        'lecturer', 'researcher', 'coach', 'coordinator', 'supervisor', 'engineer', 'manager', 'director',
        'executive', 'officer', 'specialist', 'consultant', 'analyst', 'associate', 'assistant', 'head',
        'deputy', 'general', 'trainee', 'intern', 'apprentice', 'fellow', 'staff', 'leader', 'principal',
        'in-charge', 'section', 'team', 'group', 'zonal', 'regional', 'rail', 'kindergarten', 'peer',
        'club', 'competition', 'program', 'education', 'tutoring', 'project',
    ]
    # Protected phrases that contain noise words but are valid skills
    protected_noise_phrases = {
        'project management', 'team leadership', 'group policy', 'regional sales', 'rail transport',
        'education program', 'peer review', 'club management', 'competition analysis', 'team building',
        'regional manager', 'project coordinator', 'team member', 'group discussion', 'rail network',
        'education technology', 'peer learning', 'club activities', 'competition strategy',
        'program manager', 'education specialist', 'tutoring center', 'project lead',
    }
    if low not in protected_noise_phrases:
        for t in title_words:
            if re.search(r'\b' + t + r'\b', low):
                return None

    # Skip if all words are stopwords
    words = re.findall(r'[a-z0-9.]+', low)
    if not words or all(w in STOPWORDS for w in words):
        return None
    return s


def strip_role_titles(role):
    """Convert a job-role string into a skill-like phrase by normalizing and removing seniority/titles."""
    if not role or not isinstance(role, str):
        return None
    role = re.sub(r'\s*\([^)]*\)', '', role)
    role = re.sub(r'[^a-zA-Z0-9\s\-/]', ' ', role)
    role = re.sub(r'\s+', ' ', role).strip()

    # Convert common role endings into skill forms before dropping title words
    role_suffix_map = [
        (r'\bUnderwriters?\b', 'Underwriting'),
        (r'\bHygienists?\b', 'Hygiene'),
        (r'\bTechnologists?\b', 'Technology'),
        (r'\bNurses?\b', 'Nursing'),
        (r'\bAdministrators?\b', 'Administration'),
        (r'\bBrokers?\b', 'Brokerage'),
        (r'\bClerks?\b', 'Clerical'),
        (r'\bAdjusters?\b', 'Adjusting'),
        (r'\bAppraisers?\b', 'Appraisal'),
        (r'\bExaminers?\b', 'Examination'),
        (r'\bProcessors?\b', 'Processing'),
        (r'\bOriginators?\b', 'Origination'),
        (r'\bServicers?\b', 'Servicing'),
        (r'\bWorkers?\b', ''),
        (r'\bIn-Charges?\b', ''),
        (r'\bCharg(?:e|es|ed|ing)?\b', ''),
    ]
    for pat, repl in role_suffix_map:
        role = re.sub(pat, repl, role, flags=re.IGNORECASE)
    role = re.sub(r'\s+', ' ', role).strip()

    # Stop words that should be removed from any role-derived phrase
    title_tokens = {
        'advisor', 'adviser', 'analyst', 'anesthetist', 'apprentice', 'architect', 'assistant', 'associate',
        'auditor', 'chairman', 'chairperson', 'chief', 'coach', 'consultant', 'coordinator', 'cto', 'ceo', 'cfo', 'cio', 'coo',
        'designer', 'deputy', 'director', 'distinguished', 'engineer', 'engineering', 'executive', 'expert',
        'fellow', 'general', 'graduate', 'group', 'head', 'in', 'instructor', 'intern', 'junior', 'lead',
        'leader', 'lecturer', 'manager', 'managing', 'mid', 'officer', 'of', 'operator', 'owner', 'partner',
        'planner', 'president', 'principal', 'professor', 'professional', 'programmer', 'researcher',
        'senior', 'specialist', 'sr', 'staff', 'superintendent', 'supervisor', 'surveyor', 'teacher',
        'technician', 'trainee', 'trainer', 'tutor', 'vice', 'vp', 'zonal', 'regional', 'section', 'team',
        'group', 'project', 'rail', 'loss', 'control', 'branch', 'divisional', 'franchise', 'division',
    }
    parts = role.split()
    filtered = [p for p in parts if p.lower() not in title_tokens]
    if not filtered and parts:
        return None
    phrase = ' '.join(filtered)
    phrase = re.sub(r'\s*-\s*$', '', phrase).strip('- ')
    # Collapse doubled spaces and dangling words
    phrase = re.sub(r'\s+', ' ', phrase).strip()
    return clean_skill(phrase)


def classify_skill(skill, default=None):
    """Return the most appropriate category for a skill string using keyword scoring."""
    if not skill:
        return default
    low = skill.lower()
    scores = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        score = 0
        for kw in kws:
            if kw in low:
                # Prefer whole-word matches slightly
                if re.search(r'\b' + re.escape(kw) + r'\b', low):
                    score += 2
                else:
                    score += 1
        if score:
            scores[cat] = score
    if not scores:
        return default
    # Return category with highest score; tie-breaker by longest matching keyword
    best = max(scores.items(), key=lambda x: (x[1], len(max([k for k in CATEGORY_KEYWORDS[x[0]] if k in low], key=len, default=''))))
    return best[0]


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
def load_json(path):
    if not path.exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def repair_unified_skills(path):
    """Parse the existing malformed unified_skills.json."""
    if not path.exists():
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    dec = json.JSONDecoder()
    text = text.lstrip()
    try:
        obj, idx = dec.raw_decode(text)
    except json.JSONDecodeError:
        # Try inserting missing braces before second top-level object
        pos = text.find('\n\n\n    {')
        if pos != -1:
            repaired = text[:pos] + '\n  }\n}' + text[pos:]
            try:
                obj, idx = dec.raw_decode(repaired)
                text = repaired[idx:]
            except Exception:
                return {}
        else:
            return {}
    else:
        text = text[idx:]
    # Collect additional top-level objects if present
    results = [obj]
    text = text.strip()
    while text:
        start = text.find('{')
        if start == -1:
            break
        try:
            obj2, idx2 = dec.raw_decode(text[start:])
        except Exception:
            break
        results.append(obj2)
        text = text[start + idx2:].strip()
    combined = {}
    for obj in results:
        if isinstance(obj, dict):
            if 'domains' in obj and isinstance(obj['domains'], dict):
                combined.update(obj['domains'])
            else:
                for k, v in obj.items():
                    if k not in combined:
                        combined[k] = v
                    else:
                        if isinstance(v, list) and isinstance(combined[k], list):
                            combined[k].extend(v)
    return combined


def load_python_skills_sets(path, names):
    """Load sets of strings from a Python file with NAME = { ... } assignments."""
    if not path.exists():
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    ns = {}
    try:
        exec(text, ns)
    except Exception as e:
        print(f"Warning: failed to exec {path}: {e}")
        return {}
    out = {}
    for name in names:
        val = ns.get(name)
        if isinstance(val, (set, list, tuple)):
            out[name] = list(val)
    return out


def load_python_set(path, var_name):
    if not path.exists():
        return []
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    ns = {}
    try:
        exec(text, ns)
    except Exception as e:
        return []
    return list(ns.get(var_name, []))


# ---------------------------------------------------------------------------
# Seed generator for backfilling low categories
# ---------------------------------------------------------------------------
def generate_extra_seeds():
    """Generate additional skills for low categories using domain terms and skill patterns."""
    base_terms = {
        "Agriculture": ["Farming", "Crop", "Soil", "Irrigation", "Pest Control", "Harvesting", "Agrotechnology", "Sustainable Agriculture", "Organic Farming", "Precision Agriculture", "Livestock", "Dairy", "Poultry", "Aquaculture", "Greenhouse", "Agroforestry", "Hydroponics", "Aeroponics", "Vertical Farming", "Farm Machinery", "Seed Technology", "Fertilizer", "Pesticide", "Crop Rotation", "Conservation Tillage", "Drainage", "Water Management", "Climate Smart Agriculture", "Agribusiness", "Farm Economics", "Agricultural Extension", "Rural Development", "Food Security"],
        "Animation": ["2D Animation", "3D Animation", "Character Design", "Storyboarding", "Motion Graphics", "Visual Effects", "Rigging", "Rendering", "Texturing", "Lighting", "Compositing", "Animation Principles", "Stop Motion", "Claymation", "Digital Painting", "Concept Art", "Character Animation", "Background Design", "Layout", "Timing", "Squash and Stretch", "Anticipation", "Follow Through", "Overlapping Action", "Arc", "Secondary Action", "Exaggeration", "Solid Drawing", "Appeal", "Animation Pipeline", "Industry Software", "Animation Production"],
        "Affiliate Marketing": ["Affiliate Programs", "Affiliate Marketing", "Commission Junction", "Amazon Associates", "ShareASale", "ClickBank", "Rakuten", "CJ Affiliate", "Affiliate Networks", "Affiliate Links", "Affiliate Tracking", "Affiliate Management", "Affiliate Analytics", "Affiliate Strategy", "Affiliate Campaigns", "Affiliate Recruitment", "Affiliate Partners", "Affiliate Offers", "Affiliate Commissions", "Affiliate ROI", "Affiliate Optimization", "Affiliate Technology"],
        "Arbitration": ["Arbitration Clause", "Arbitration Agreement", "Arbitration Hearing", "Arbitrator Selection", "Arbitration Rules", "International Arbitration", "Commercial Arbitration", "Labor Arbitration", "Investment Arbitration", "Arbitration Award", "Arbitration Procedure", "Evidence in Arbitration", "Arbitration Costs", "Arbitration Enforcement", "Arbitration Confidentiality", "Arbitration Ethics", "Arbitration Strategy", "Arbitration Advocacy", "Arbitration Mediation", "Arbitration Law"],
        "Audit": ["Financial Audit", "Internal Audit", "External Audit", "Compliance Audit", "Operational Audit", "IT Audit", "Environmental Audit", "Quality Audit", "Performance Audit", "Risk Audit", "Forensic Audit", "Tax Audit", "Audit Planning", "Audit Evidence", "Audit Sampling", "Audit Report", "Audit Standards", "Audit Procedures", "Audit Controls", "Audit Testing", "Audit Documentation", "Audit Findings", "Audit Recommendations", "Audit Follow-up", "Audit Software", "Audit Analytics"],
        "Automobile": ["Automotive Design", "Vehicle Engineering", "Engine Systems", "Transmission", "Braking Systems", "Suspension", "Steering", "Fuel Systems", "Electrical Systems", "Hybrid Technology", "Electric Vehicles", "Automotive Safety", "Vehicle Testing", "Manufacturing Processes", "Supply Chain", "Quality Control", "Maintenance", "Diagnostics", "Automotive Electronics", "Fleet Management", "Automotive Sales", "Dealership Operations", "Aftermarket", "Automotive Regulations", "Emissions", "Fuel Efficiency", "Autonomous Vehicles"],
        "Aviation": ["Aircraft Maintenance", "Flight Operations", "Air Traffic Control", "Avionics", "Aerodynamics", "Flight Planning", "Navigation", "Meteorology", "Aviation Safety", "Airport Management", "Ground Handling", "Cargo Operations", "Aviation Security", "Flight Simulation", "Pilot Training", "Aircraft Systems", "Engine Performance", "Fuel Management", "Weight and Balance", "Airspace Management", "Aviation Regulations", "Aviation Law", "Crew Resource Management", "Emergency Procedures", "Aviation Technology"],
        "B2B Sales": ["B2B Prospecting", "Lead Generation", "Account Management", "Contract Negotiation", "Solution Selling", "Consultative Sales", "Sales Engineering", "Value Proposition", "B2B Marketing", "Sales Strategy", "Sales Operations", "Pipeline Management", "Sales Forecasting", "Customer Relationship Management", "Enterprise Sales", "B2B Presentations", "Sales Proposals", "B2B Networking", "Strategic Partnerships", "Sales Analytics"],
        "Banking": ["Commercial Banking", "Retail Banking", "Investment Banking", "Corporate Banking", "Private Banking", "Wealth Management", "Credit Analysis", "Loan Processing", "Risk Management", "Compliance", "Banking Operations", "Treasury", "Trade Finance", "Foreign Exchange", "Cash Management", "Banking Technology", "Digital Banking", "Customer Service", "Banking Regulations", "Anti Money Laundering", "KYC", "Fraud Detection", "Banking Sales", "Financial Analysis", "Mortgage Banking", "Savings Accounts", "Checking Accounts", "Credit Cards", "Debit Cards", "Online Banking", "Mobile Banking", "ATM Operations", "Bank Security", "Bank Auditing", "Capital Markets", "Asset Management", "Investment Products", "Bank Marketing", "Customer Relations", "Bank Strategy", "Financial Planning", "Bank Accounting", "Bank Reporting", "Branch Management", "Bank Leadership", "Bank Innovation", "Fintech Integration"],
        "Biotechnology": ["Biotech Research", "Genetic Engineering", "Molecular Biology", "Cell Culture", "Protein Engineering", "Drug Discovery", "Biotech Manufacturing", "Quality Control", "Regulatory Affairs", "Clinical Trials", "Biotech Licensing", "Biotech Patents", "Bioinformatics", "Biotech Ethics", "Biotech Business", "Biotech Innovation", "Biotech Applications", "Biotech Diagnostics", "Therapeutics", "Vaccines", "Antibodies", "Stem Cells", "Gene Therapy", "Biotech Regulations"],
        "Brand Management": ["Brand Strategy", "Brand Identity", "Brand Positioning", "Brand Equity", "Brand Awareness", "Brand Loyalty", "Brand Extension", "Rebranding", "Brand Guidelines", "Brand Communication", "Brand Experience", "Brand Architecture", "Brand Portfolio", "Brand Measurement", "Brand Audit", "Brand Launch", "Brand Revitalization", "Brand Management Tools", "Brand Marketing", "Digital Branding", "Brand Partnerships", "Brand Licensing"],
        "Business Analysis": ["Requirements Gathering", "Stakeholder Management", "Business Process Modeling", "Data Analysis", "Gap Analysis", "SWOT Analysis", "Business Cases", "Feasibility Studies", "Process Improvement", "Agile Analysis", "Use Cases", "User Stories", "Acceptance Criteria", "BA Tools", "Business Rules", "Solution Assessment", "Change Management", "Business Intelligence", "KPIs", "Metrics", "Reporting", "Documentation"],
        "Call Center": ["Call Handling", "Customer Service", "Call Routing", "IVR Systems", "Call Recording", "Quality Assurance", "Call Metrics", "CRM Integration", "Call Center Technology", "Voice Scripts", "Call Center Operations", "Team Leadership", "Performance Management", "Call Center Training", "Call Analytics", "Customer Satisfaction", "First Call Resolution", "Average Handle Time", "Service Level", "Call Center Compliance"],
        "Channel Sales": ["Channel Management", "Partner Management", "Distributor Relations", "Reseller Programs", "Channel Strategy", "Channel Marketing", "Channel Training", "Channel Incentives", "Channel Performance", "Channel Analytics", "Partner Enablement", "Channel Communication", "Channel Conflict", "Channel Development", "Channel Sales Operations", "Indirect Sales", "Multi-Channel", "Omnichannel"],
        "Chemical": ["Chemical Engineering", "Chemical Processing", "Process Safety", "Chemical Analysis", "Quality Control", "Chemical Manufacturing", "Chemical Synthesis", "Petrochemicals", "Polymers", "Chemical Regulations", "Hazardous Materials", "Chemical Storage", "Chemical Transportation", "Waste Management", "Environmental Compliance", "Chemical Research", "Chemical Technology", "Chemical Equipment", "Chemical Testing", "Chemical Formulation", "Chemical Packaging"],
        "Civil": ["Civil Engineering", "Structural Design", "Geotechnical Engineering", "Transportation Engineering", "Water Resources", "Environmental Engineering", "Construction Management", "Site Planning", "Surveying", "Civil Materials", "Concrete Technology", "Steel Structures", "Foundation Design", "Bridge Engineering", "Road Design", "Urban Planning", "Civil Software", "Civil Regulations", "Project Management", "Cost Estimation", "Quality Assurance", "Safety Management"],
        "Civil Law": ["Contract Law", "Tort Law", "Property Law", "Family Law", "Inheritance Law", "Civil Litigation", "Legal Research", "Legal Writing", "Case Law Analysis", "Civil Procedure", "Evidence Law", "Civil Rights", "Legal Ethics", "Dispute Resolution", "Mediation", "Arbitration", "Legal Documentation", "Court Procedures", "Legal Compliance", "Civil Advocacy"],
        "Compensation & Benefits": ["Compensation Planning", "Salary Structures", "Payroll Administration", "Benefits Administration", "Incentive Programs", "Performance Bonuses", "Stock Options", "Retirement Plans", "Health Insurance", "Life Insurance", "Employee Perks", "Compensation Analysis", "Market Pricing", "Job Evaluation", "Total Rewards", "Compensation Compliance", "Benefits Communication", "Flexible Benefits", "Wellness Programs", "Compensation Strategy"],
        "Compliance": ["Regulatory Compliance", "Compliance Programs", "Risk Assessment", "Internal Controls", "Audit Compliance", "Legal Compliance", "Industry Regulations", "Compliance Monitoring", "Compliance Reporting", "Compliance Training", "Ethics", "Anti-Corruption", "Data Privacy", "GDPR", "HIPAA", "SOX", "Compliance Technology", "Compliance Analytics", "Whistleblower Programs", "Compliance Culture"],
        "Construction": ["Construction Management", "Project Planning", "Site Management", "Safety Management", "Quality Control", "Cost Management", "Scheduling", "Contract Management", "Subcontracting", "Construction Methods", "Building Codes", "Construction Materials", "Equipment Management", "Labor Management", "Construction Software", "Green Building", "Sustainable Construction", "Construction Technology", "Construction Risk", "Construction Finance", "Civil Construction", "Residential Construction", "Commercial Construction", "Industrial Construction", "Infrastructure Construction", "Heavy Construction", "Building Construction", "Road Construction", "Bridge Construction", "Tunnel Construction", "Foundation Work", "Structural Steel", "Concrete Work", "Masonry", "Carpentry", "Electrical Work", "Plumbing", "HVAC", "Roofing", "Insulation", "Drywall", "Painting", "Flooring", "Landscaping", "Site Preparation", "Excavation", "Demolition", "Construction Safety", "Building Inspection", "Project Estimation", "Construction Law", "Construction Contracts", "Construction Logistics", "Material Procurement", "Construction Equipment Operation", "Crane Operation", "Forklift Operation", "Heavy Machinery", "Construction Supervision", "Construction Coordination", "Construction Documentation", "Building Design", "Architecture", "Structural Engineering", "MEP Systems", "Fire Protection", "Building Automation", "Construction Sustainability", "LEED Certification", "Energy Efficient Building", "Construction Renovation", "Construction Retrofitting", "Building Maintenance", "Construction Surveying", "Construction Layout", "Construction Testing", "Construction Quality Assurance"],
        "Consulting": ["Management Consulting", "Strategy Consulting", "IT Consulting", "Financial Consulting", "HR Consulting", "Operations Consulting", "Business Transformation", "Change Management", "Process Improvement", "Organizational Design", "Client Management", "Consulting Sales", "Consulting Delivery", "Consulting Tools", "Industry Expertise", "Problem Solving", "Analytical Skills", "Presentation Skills", "Consulting Ethics"],
        "Content Marketing": ["Content Strategy", "Blog Writing", "Copywriting", "SEO Writing", "Social Media Content", "Video Content", "Infographics", "Content Calendar", "Content Distribution", "Content Analytics", "Email Marketing", "Landing Page Copy", "Content Management Systems", "Brand Voice", "Content Optimization", "Content Promotion", "Content Audits", "Editorial Calendar", "Content Performance"],
        "Contract Management": ["Contract Drafting", "Contract Review", "Contract Negotiation", "Contract Administration", "Vendor Contracts", "Client Contracts", "Contract Compliance", "Contract Lifecycle Management", "Contract Repository", "Contract Analytics", "Contract Risk Management", "Contract Automation", "Contract Templates", "Contract Policies", "Contract Training", "Contract Software"],
        "Corporate Law": ["Corporate Governance", "Mergers and Acquisitions", "Corporate Finance", "Securities Law", "Corporate Compliance", "Corporate Transactions", "Corporate Restructuring", "Corporate Due Diligence", "Corporate Litigation", "Corporate Tax", "Corporate Contracts", "Corporate Ethics", "Corporate Strategy", "Corporate Secretarial", "Shareholder Relations", "Corporate Reporting"],
        "Criminal Law": ["Criminal Procedure", "Criminal Defense", "Prosecution", "Criminal Investigation", "Evidence Law", "Criminal Law Research", "Legal Writing", "Court Procedures", "Plea Bargaining", "Trial Advocacy", "Sentencing", "Appeals", "Criminal Law Ethics", "Legal Technology", "Case Management", "Criminal Law Compliance"],
        "Customer Support": ["Customer Service", "Technical Support", "Help Desk", "Ticket Management", "Customer Communication", "Problem Resolution", "Product Knowledge", "CRM Systems", "Support Metrics", "Customer Satisfaction", "Support Training", "Escalation Procedures", "Support Documentation", "Remote Support", "Support Analytics", "Customer Feedback", "Support Quality Assurance", "Multi-channel Support"],
        "Dentistry": ["Dental Hygiene", "Dental Surgery", "Orthodontics", "Pediatric Dentistry", "Endodontics", "Periodontics", "Prosthodontics", "Dental Radiology", "Oral Pathology", "Dental Anesthesia", "Dental Materials", "Dental Equipment", "Dental Practice Management", "Patient Care", "Dental Ethics", "Dental Regulations", "Dental Technology", "Dental Diagnostics", "Dental Prevention"],
        "Digital Marketing": ["SEO", "SEM", "Social Media Marketing", "Email Marketing", "Content Marketing", "Affiliate Marketing", "Influencer Marketing", "Mobile Marketing", "Video Marketing", "Display Advertising", "Programmatic Advertising", "Marketing Automation", "Lead Generation", "Conversion Rate Optimization", "Web Analytics", "Digital Strategy", "Social Media Advertising", "Google Ads", "Facebook Ads", "LinkedIn Ads", "Digital Branding"],
        "E-commerce": ["Online Store Management", "Product Listings", "Inventory Management", "Payment Processing", "Shipping Logistics", "Customer Experience", "E-commerce Platforms", "Marketplace Integration", "Order Management", "Returns Management", "E-commerce SEO", "Product Photography", "Pricing Strategy", "E-commerce Analytics", "Mobile Commerce", "Cross-border E-commerce", "E-commerce Marketing"],
        "Electrical": ["Electrical Engineering", "Power Systems", "Circuit Design", "Electrical Safety", "Electrical Installation", "Wiring", "Electrical Testing", "Electrical Maintenance", "Control Systems", "Electrical Codes", "Power Distribution", "Electrical Equipment", "Electrical Software", "Renewable Energy Systems", "Smart Grid", "Electrical Project Management", "Electrical Estimation", "Electrical Troubleshooting"],
        "Electronics": ["Electronic Circuits", "PCB Design", "Embedded Systems", "Microcontrollers", "Sensors", "Actuators", "Electronics Manufacturing", "Electronics Testing", "Electronics Assembly", "Electronics Repair", "Electronic Components", "Semiconductors", "Integrated Circuits", "Electronics Prototyping", "Electronics Simulation", "Electronics Packaging", "Electronics Standards"],
        "Embedded Systems": ["Embedded C", "Microcontrollers", "FPGA", "RTOS", "Embedded Linux", "Device Drivers", "Hardware Design", "PCB Design", "Schematic Capture", "Firmware Development", "Embedded Testing", "Embedded Debugging", "Embedded Security", "Embedded Protocols", "Embedded Software Architecture", "Embedded Tools", "Embedded Standards"],
        "HR": ["Recruitment", "Employee Relations", "HR Operations", "HR Analytics", "HR Technology", "HR Compliance", "HR Strategy", "HR Planning", "HR Administration", "HRIS", "Payroll", "Benefits", "Training", "Performance Management", "Employee Engagement", "HR Policies", "Employment Law", "HR Metrics", "HR Reporting"],
        "HR Operations": ["HR Administration", "HRIS Management", "Payroll Processing", "Benefits Administration", "Employee Records", "HR Compliance", "HR Reporting", "HR Analytics", "HR Technology", "HR Policies", "Employee Onboarding", "HR Communication", "HR Documentation", "HR Data Management", "HR Process Improvement", "HR Service Delivery", "HR Quality Assurance"],
        "Litigation": ["Civil Litigation", "Commercial Litigation", "Litigation Strategy", "Case Management", "Discovery", "Legal Research", "Trial Preparation", "Court Procedures", "Settlement Negotiation", "Litigation Support", "Litigation Technology", "Litigation Analytics", "Litigation Budgeting", "Litigation Ethics", "Litigation Documentation", "Litigation Project Management"],
        "Mechanical": ["Mechanical Design", "Machine Design", "Thermodynamics", "Fluid Mechanics", "Heat Transfer", "Mechanical Systems", "CAD/CAM", "Finite Element Analysis", "Product Design", "Manufacturing Processes", "Mechanical Testing", "Mechanical Materials", "Mechanical Simulation", "Mechanical Prototyping", "Mechanical Safety", "Mechanical Standards", "Mechanical Project Management"],
        "Merchandising": ["Visual Merchandising", "Product Display", "Inventory Planning", "Pricing Strategy", "Store Layout", "Merchandise Planning", "Sales Analysis", "Customer Behavior", "Seasonal Planning", "Merchandise Presentation", "Product Assortment", "Stock Management", "Merchandise Budgeting", "Merchandise Trends", "Merchandise Technology"],
        "Pharmacy": ["Pharmaceutical Compounding", "Drug Dispensing", "Medication Therapy", "Pharmacology", "Pharmacy Law", "Pharmacy Ethics", "Patient Counseling", "Drug Interactions", "Dosage Calculations", "Pharmacy Software", "Inventory Management", "Pharmacy Regulations", "Clinical Pharmacy", "Pharmacy Administration", "Pharmacy Technology", "Pharmacy Safety", "Drug Formulation", "Prescription Processing", "Medication Review", "Pharmaceutical Chemistry", "Drug Information", "Pharmacy Operations", "Retail Pharmacy", "Hospital Pharmacy", "Pharmaceutical Care", "Drug Therapy Management", "Patient Safety", "Pharmacy Automation", "Quality Assurance", "Medication Safety"],
        "Production": ["Production Planning", "Manufacturing Processes", "Production Control", "Quality Assurance", "Production Scheduling", "Capacity Planning", "Lean Manufacturing", "Six Sigma", "Production Technology", "Equipment Maintenance", "Safety Management", "Cost Control", "Production Analytics", "Production Optimization", "Production Standards", "Production Documentation"],
        "Project Management": ["Project Planning", "Risk Management", "Resource Allocation", "Schedule Management", "Budgeting", "Scope Management", "Stakeholder Management", "Agile", "Scrum", "Kanban", "Waterfall", "Project Tracking", "Project Reporting", "Project Tools", "Project Communication", "Project Leadership", "Project Documentation"],
        "Recruitment": ["Recruiting", "Sourcing", "Interviewing", "Candidate Assessment", "Employer Branding", "Recruitment Marketing", "ATS", "Background Checks", "Job Descriptions", "Salary Negotiation", "Onboarding", "Recruitment Analytics", "Recruitment Strategy", "Talent Pipelines", "Recruitment Compliance", "Recruitment Technology"],
        "Retail": ["Retail Operations", "Store Management", "Sales Management", "Inventory Control", "Customer Service", "Visual Merchandising", "Retail Marketing", "Retail Technology", "Loss Prevention", "Retail Analytics", "Merchandising", "Retail Sales", "Retail Strategy", "Retail Compliance", "Retail Training", "Retail Customer Experience"],
        "Retail Sales": ["Customer Service", "Sales Techniques", "Product Knowledge", "Cash Handling", "POS Systems", "Upselling", "Cross-selling", "Customer Relations", "Store Operations", "Sales Targets", "Retail Math", "Inventory Management", "Loss Prevention", "Retail Compliance", "Retail Training", "Sales Performance"],
        "SEM": ["Search Engine Marketing", "Google Ads", "Bing Ads", "PPC", "Keyword Research", "Ad Copywriting", "Bid Management", "Quality Score", "Ad Extensions", "Campaign Optimization", "Conversion Tracking", "A/B Testing", "Ad Analytics", "Budget Management", "SEM Strategy", "SEM Reporting"],
        "Store Operations": ["Store Management", "Inventory Control", "Staff Scheduling", "Cash Management", "Customer Service", "Visual Merchandising", "Loss Prevention", "Store Maintenance", "Store Security", "Opening Procedures", "Closing Procedures", "Store Policies", "Performance Monitoring", "Store Reporting", "Store Communication", "Sales Floor Management", "Stock Replenishment", "Price Changes", "Signage Management", "Customer Experience", "Team Leadership", "Store Budgeting", "Store Marketing", "Product Displays", "Checkout Operations", "Cash Register Management", "POS Systems", "Return Processing", "Exchange Handling", "Customer Complaints", "Store cleanliness", "Safety Protocols", "Emergency Procedures", "Staff Training", "Employee Supervision", "Sales Targets", "KPI Tracking", "Store Analytics", "Customer Feedback", "Vendor Relations", "Delivery Coordination", "Shelf Management", "Backroom Organization", "Stock Room Management", "Inventory Audits", "Cycle Counts", "Physical Inventory", "Store Layout Optimization", "Traffic Management", "Queue Management", "Peak Hour Management", "Holiday Operations", "Seasonal Setup", "Promotional Setup", "Event Planning"],
        "Talent Acquisition": ["Recruiting", "Sourcing", "Interviewing", "Candidate Assessment", "Employer Branding", "Recruitment Marketing", "ATS", "Background Checks", "Job Descriptions", "Salary Negotiation", "Onboarding", "Recruitment Analytics", "Recruitment Strategy", "Talent Pipelines", "Recruitment Compliance", "Recruitment Technology", "Headhunting", "Executive Search", "Campus Recruitment", "Referral Programs", "Social Recruiting", "Talent Sourcing", "Candidate Experience", "Recruitment Metrics", "Talent Branding", "Recruitment Automation", "Diversity Recruiting", "Employer Value Proposition", "Talent Mapping", "Competitor Analysis", "Talent Communities", "Recruitment Campaigns", "Job Posting", "Resume Screening", "Video Interviewing", "Assessment Centers", "Psychometric Testing", "Skill Assessment", "Behavioral Interviewing", "Panel Interviews", "Offer Management", "Candidate Relationship Management", "Talent Pool Development", "Passive Candidate Sourcing", "LinkedIn Recruiting", "Boolean Search", "Recruitment Analytics", "Time to Hire", "Cost per Hire", "Quality of Hire", "Recruitment ROI", "Talent Acquisition Strategy", "Workforce Planning", "Succession Planning", "Internal Mobility", "Employee Referrals", "Alumni Networks", "Recruitment Events", "Job Fairs", "Career Fairs", "Virtual Recruitment", "Remote Hiring", "Global Recruitment", "Immigration Support", "Visa Sponsorship", "Relocation Assistance", "Recruitment Budgeting", "Vendor Management", "Recruitment Agency Management"],
        "Tourism": ["Travel Planning", "Tour Operations", "Destination Management", "Hospitality", "Tourism Marketing", "Customer Service", "Booking Systems", "Travel Technology", "Tourism Regulations", "Sustainable Tourism", "Adventure Tourism", "Cultural Tourism", "Ecotourism", "Tourism Safety", "Tourism Economics", "Tour Guide", "Tour Management", "Travel Agency Operations", "Tourism Development", "Tourism Policy", "Tourism Research", "Destination Marketing", "Tourism Analytics", "Tour Partnerships", "Tourism Consulting"],
        "Treasury": ["Cash Management", "Liquidity Management", "Working Capital", "Banking Relationships", "Treasury Operations", "Financial Risk", "Currency Management", "Treasury Technology", "Treasury Analytics", "Treasury Compliance", "Investment Management", "Debt Management", "Capital Structure", "Treasury Strategy", "Treasury Reporting"],
        "Travel": ["Travel Booking", "Travel Planning", "Itinerary Management", "Travel Insurance", "Customer Service", "Travel Technology", "Travel Regulations", "Destination Knowledge", "Travel Marketing", "Travel Sales", "Travel Documentation", "Travel Compliance", "Travel Safety", "Travel Trends", "Travel Customer Experience"],
        "Warehouse": ["Warehouse Operations", "Inventory Management", "Order Fulfillment", "Picking and Packing", "Shipping", "Receiving", "Warehouse Safety", "Warehouse Equipment", "Warehouse Technology", "Quality Control", "Warehouse Layout", "Warehouse Automation", "Warehouse Analytics", "Warehouse Compliance", "Warehouse Staffing", "Warehouse Documentation"],
        "Employee Relations": ["Employee Engagement", "Employee Communication", "Conflict Resolution", "Disciplinary Procedures", "Grievance Handling", "Employee Relations Strategy", "Union Relations", "Collective Bargaining", "Employee Wellness", "Workplace Culture", "Employee Surveys", "Feedback Systems", "Employee Recognition", "Work-life Balance", "Employee Advocacy", "HR Policies", "Employment Law"],
        "Energy": ["Energy Management", "Renewable Energy", "Solar Power", "Wind Energy", "Hydropower", "Energy Efficiency", "Energy Storage", "Smart Grid", "Energy Trading", "Energy Policy", "Energy Audits", "Energy Conservation", "Energy Technology", "Energy Economics", "Energy Security", "Energy Infrastructure", "Energy Regulations", "Energy Analytics", "Energy Project Management"],
        "Enterprise Sales": ["Enterprise Account Management", "Strategic Selling", "Solution Selling", "Contract Negotiation", "Value Selling", "Enterprise Sales Strategy", "Sales Engineering", "Sales Operations", "Pipeline Management", "Enterprise Marketing", "Customer Success", "Account Planning", "Enterprise Sales Tools", "Sales Forecasting", "Sales Analytics", "Enterprise Sales Training"],
        "Export & Import": ["International Trade", "Export Documentation", "Import Compliance", "Customs Clearance", "Trade Finance", "Letters of Credit", "Incoterms", "Freight Forwarding", "Logistics", "Trade Regulations", "Export Strategy", "Import Strategy", "Trade Agreements", "Tariffs", "Trade Analytics", "Supply Chain Management", "Cross-border Compliance"],
        "Fashion": ["Fashion Design", "Fashion Merchandising", "Textile Design", "Apparel Manufacturing", "Fashion Marketing", "Fashion Retail", "Fashion Trends", "Fashion Technology", "Sustainable Fashion", "Fashion Business", "Fashion Photography", "Fashion Styling", "Fashion Buying", "Fashion Inventory", "Fashion E-commerce", "Fashion Branding", "Fashion Production"],
        "Food & Beverage": ["Food Safety", "Food Preparation", "Beverage Management", "Menu Planning", "Kitchen Operations", "Restaurant Management", "Food Service", "Culinary Skills", "Bartending", "Food Quality Control", "Food Storage", "Food Handling", "Food Regulations", "Food Cost Control", "Food Presentation", "Customer Service", "Food Hygiene", "Food Innovation"],
        "Food Processing": ["Food Manufacturing", "Food Preservation", "Food Packaging", "Food Technology", "Food Safety Systems", "Quality Assurance", "Food Engineering", "Process Control", "HACCP", "Food Regulations", "Food Chemistry", "Food Microbiology", "Food Equipment", "Food Supply Chain", "Food Innovation", "Food R&D", "Food Processing Automation"],
        "Help Desk": ["Ticket Resolution", "Technical Troubleshooting", "Remote Support", "Desktop Support", "Application Support", "Network Support", "User Training", "Knowledge Base", "Help Desk Software", "Service Level Agreements", "ITIL", "Incident Management", "Problem Management", "Help Desk Metrics", "Customer Satisfaction", "Escalation Procedures", "Help Desk Documentation"],
        "Hospitality": ["Hotel Management", "Guest Services", "Front Desk Operations", "Housekeeping", "Concierge Services", "Hospitality Marketing", "Revenue Management", "Hotel Operations", "Food and Beverage", "Event Management", "Hospitality Technology", "Customer Experience", "Hospitality Sales", "Reservations", "Hospitality Compliance", "Hospitality Training", "Quality Assurance"],
        "Hotel Management": ["Hotel Operations", "Room Division", "Front Office", "Housekeeping", "Food and Beverage", "Revenue Management", "Hotel Marketing", "Guest Relations", "Hotel Finance", "Human Resources", "Hotel Technology", "Hotel Sales", "Event Planning", "Hotel Safety", "Hotel Compliance", "Hotel Training", "Quality Standards"],
        "Housekeeping": ["Cleaning Procedures", "Sanitation", "Laundry Operations", "Room Cleaning", "Housekeeping Management", "Chemical Safety", "Inventory Management", "Housekeeping Equipment", "Quality Control", "Housekeeping Standards", "Guest Privacy", "Housekeeping Training", "Waste Management", "Housekeeping Scheduling", "Housekeeping Communication"],
        "IP Law": ["Patent Law", "Trademark Law", "Copyright Law", "Trade Secrets", "IP Licensing", "IP Litigation", "IP Strategy", "IP Portfolio Management", "IP Valuation", "IP Due Diligence", "IP Agreements", "IP Enforcement", "International IP", "IP Prosecution", "IP Transactions", "IP Technology", "IP Compliance"],
        "Industrial": ["Industrial Engineering", "Manufacturing Processes", "Production Planning", "Quality Control", "Lean Manufacturing", "Six Sigma", "Industrial Design", "Process Optimization", "Industrial Safety", "Equipment Maintenance", "Industrial Automation", "Industrial Technology", "Cost Reduction", "Industrial Analytics", "Industrial Robotics", "Industrial Standards", "Industrial Maintenance", "Industrial Systems", "Industrial Operations", "Industrial Production", "Industrial Efficiency", "Industrial Management", "Industrial Control", "Industrial Monitoring", "Industrial Inspection"],
        "Inventory": ["Inventory Control", "Stock Management", "Warehouse Operations", "Inventory Planning", "Demand Forecasting", "Safety Stock", "Inventory Valuation", "Cycle Counting", "Inventory Software", "Supply Chain Coordination", "Inventory Optimization", "Just-in-Time", "Inventory Policies", "Inventory Audits", "Inventory Reporting", "Inventory Analytics", "Inventory Management", "Inventory Tracking", "Inventory Systems", "Inventory Strategy", "Inventory Costs", "Inventory Accuracy", "Inventory Turnover", "Inventory Replenishment", "Inventory Levels"],
        "Inside Sales": ["Inside Sales Strategy", "Lead Qualification", "Phone Sales", "Email Sales", "Sales Scripts", "CRM Usage", "Sales Metrics", "Pipeline Management", "Sales Training", "Customer Engagement", "Closing Techniques", "Sales Presentations", "Sales Tools", "Sales Coaching", "Sales Performance", "Sales Automation"],
        "Interior Design": ["Space Planning", "Color Theory", "Furniture Selection", "Lighting Design", "Material Selection", "Interior Architecture", "Design Software", "Project Management", "Budgeting", "Client Relations", "Design Trends", "Sustainable Design", "Universal Design", "Visual Communication", "Design Presentation", "Interior Styling", "Design Documentation"],
        "Investment Banking": ["Mergers and Acquisitions", "IPOs", "Capital Markets", "Valuation", "Financial Modeling", "Due Diligence", "Deal Structuring", "Capital Raising", "Equity Research", "Fixed Income", "Derivatives", "Sales and Trading", "Investment Banking Operations", "Regulatory Compliance", "Risk Management", "Client Relationships"],
        "Journalism": ["News Writing", "Reporting", "Investigative Journalism", "Editorial", "Broadcast Journalism", "Digital Journalism", "Photojournalism", "Media Ethics", "News Research", "Interviewing", "Fact Checking", "Media Law", "Journalism Technology", "Social Media Journalism", "Content Strategy", "Audience Engagement"],
        "Logistics": ["Supply Chain", "Transportation", "Warehousing", "Inventory Management", "Freight Forwarding", "Logistics Planning", "Route Optimization", "Last Mile Delivery", "Logistics Technology", "Third-party Logistics", "Cross-docking", "Logistics Analytics", "Logistics Compliance", "Customs Brokerage", "Logistics Cost Management", "Logistics Strategy"],
        "Mechanical": ["Mechanical Design", "Machine Design", "Thermodynamics", "Fluid Mechanics", "Heat Transfer", "Mechanical Systems", "CAD/CAM", "Finite Element Analysis", "Product Design", "Manufacturing Processes", "Mechanical Testing", "Mechanical Materials", "Mechanical Simulation", "Mechanical Prototyping", "Mechanical Safety", "Mechanical Standards", "Mechanical Project Management"],
        "Medical Billing": ["Medical Coding", "Billing Software", "Insurance Claims", "Revenue Cycle Management", "Medical Documentation", "Billing Compliance", "Payment Posting", "Denial Management", "Patient Billing", "Medical Terminology", "ICD-10", "CPT Codes", "HCPCS", "Billing Analytics", "Billing Regulations", "Billing Audits"],
        "Medical Coding": ["ICD-10", "CPT", "HCPCS", "Medical Terminology", "Anatomy", "Physiology", "Pathology", "Coding Guidelines", "Compliance", "Coding Software", "Coding Audits", "Documentation Standards", "Coding Certification", "Coding Ethics", "Coding Quality", "Coding Updates"],
        "Merchandising": ["Visual Merchandising", "Product Display", "Inventory Planning", "Pricing Strategy", "Store Layout", "Merchandise Planning", "Sales Analysis", "Customer Behavior", "Seasonal Planning", "Merchandise Presentation", "Product Assortment", "Stock Management", "Merchandise Budgeting", "Merchandise Trends", "Merchandise Technology"],
        "Mining": ["Mining Engineering", "Extraction Methods", "Mineral Processing", "Mine Planning", "Mining Safety", "Mining Equipment", "Mining Operations", "Environmental Impact", "Mining Regulations", "Mining Technology", "Geology", "Hydrology", "Mining Economics", "Mining Sustainability", "Mining Automation", "Mining Analytics"],
        "Oil & Gas": ["Petroleum Engineering", "Drilling", "Reservoir Engineering", "Production Operations", "Pipeline Systems", "Refining", "Gas Processing", "Oilfield Services", "Upstream", "Midstream", "Downstream", "Petroleum Geology", "Energy Trading", "Safety Management", "Environmental Compliance", "Oil and Gas Technology"],
        "POS Systems": ["Point of Sale", "POS Hardware", "POS Software", "Payment Processing", "Inventory Integration", "Receipt Management", "Customer Data", "Sales Reporting", "POS Security", "POS Training", "POS Troubleshooting", "POS Integration", "POS Analytics", "Mobile POS", "Cloud POS", "POS Compliance"],
        "Payroll": ["Payroll Processing", "Tax Withholding", "Payroll Compliance", "Payroll Software", "Time Tracking", "Benefits Deductions", "Payroll Reporting", "Garnishments", "Payroll Audits", "Payroll Regulations", "Direct Deposit", "Pay Cards", "Payroll Calculations", "Payroll Taxes", "Payroll Records", "Payroll Customer Service"],
        "Performance Marketing": ["Paid Search", "Social Media Ads", "Display Advertising", "Native Advertising", "Retargeting", "Conversion Optimization", "Landing Page Optimization", "Ad Creative", "Ad Copywriting", "Ad Analytics", "Budget Management", "Bid Management", "Performance Analytics", "ROI Tracking", "Attribution Modeling", "A/B Testing"],
        "Petroleum": ["Petroleum Geology", "Drilling Technology", "Reservoir Engineering", "Petroleum Chemistry", "Refining Processes", "Pipeline Operations", "Storage Systems", "Transportation", "Petroleum Economics", "Petroleum Regulations", "Safety Systems", "Environmental Protection", "Petroleum Technology", "Petroleum Exploration", "Petroleum Production"],
        "Pharmacy": ["Pharmaceutical Compounding", "Drug Dispensing", "Medication Therapy", "Pharmacology", "Pharmacy Law", "Pharmacy Ethics", "Patient Counseling", "Drug Interactions", "Dosage Calculations", "Pharmacy Software", "Inventory Management", "Pharmacy Regulations", "Clinical Pharmacy", "Pharmacy Administration", "Pharmacy Technology", "Pharmacy Safety"],
        "Physiotherapy": ["Physical Therapy", "Rehabilitation", "Exercise Therapy", "Manual Therapy", "Electrotherapy", "Hydrotherapy", "Patient Assessment", "Treatment Planning", "Movement Analysis", "Injury Prevention", "Sports Physiotherapy", "Pediatric Physiotherapy", "Geriatric Physiotherapy", "Physiotherapy Equipment", "Clinical Documentation", "Physiotherapy Ethics"],
        "Product Management": ["Product Strategy", "Roadmap Planning", "User Research", "Market Research", "Competitive Analysis", "Feature Prioritization", "Product Design", "Agile", "Scrum", "Stakeholder Management", "Product Analytics", "A/B Testing", "Product Launch", "Product Marketing", "Product Lifecycle", "Product Metrics"],
        "Production": ["Production Planning", "Manufacturing Processes", "Production Control", "Quality Assurance", "Production Scheduling", "Capacity Planning", "Lean Manufacturing", "Six Sigma", "Production Technology", "Equipment Maintenance", "Safety Management", "Cost Control", "Production Analytics", "Production Optimization", "Production Standards", "Production Documentation"],
        "Project Management": ["Project Planning", "Risk Management", "Resource Allocation", "Schedule Management", "Budgeting", "Scope Management", "Stakeholder Management", "Agile", "Scrum", "Kanban", "Waterfall", "Project Tracking", "Project Reporting", "Project Tools", "Project Communication", "Project Leadership", "Project Documentation"],
        "Public Administration": ["Government Operations", "Policy Analysis", "Public Policy", "Administrative Law", "Public Finance", "Budget Management", "Regulatory Compliance", "Public Service", "Government Relations", "Public Sector Management", "Policy Implementation", "Public Ethics", "Public Accountability", "Public Technology", "Citizen Services", "Public Administration Reform"],
        "Radiology": ["Medical Imaging", "X-Ray", "CT Scan", "MRI", "Ultrasound", "Radiation Safety", "Image Interpretation", "Radiologic Technology", "Patient Care", "Radiology Equipment", "Contrast Media", "Radiology Procedures", "Radiology Protocols", "Radiology Documentation", "Radiology Regulations", "Radiology Quality Assurance"],
        "Real Estate": ["Property Management", "Real Estate Sales", "Leasing", "Property Valuation", "Market Analysis", "Real Estate Finance", "Real Estate Law", "Property Inspection", "Real Estate Marketing", "Client Relations", "Real Estate Contracts", "Real Estate Technology", "Commercial Real Estate", "Residential Real Estate", "Real Estate Investment"],
        "Renewable Energy": ["Solar Energy", "Wind Energy", "Hydroelectric", "Biomass", "Geothermal", "Energy Storage", "Grid Integration", "Renewable Technology", "Energy Policy", "Sustainability", "Carbon Credits", "Green Energy", "Renewable Finance", "Renewable Regulations", "Energy Efficiency", "Clean Technology"],
        "Research": ["Research Methods", "Data Collection", "Data Analysis", "Statistical Analysis", "Qualitative Research", "Quantitative Research", "Research Design", "Academic Research", "Market Research", "Scientific Research", "Research Ethics", "Research Funding", "Publication", "Research Collaboration", "Research Tools", "Research Communication"],
        "Retail": ["Retail Operations", "Store Management", "Sales Management", "Inventory Control", "Customer Service", "Visual Merchandising", "Retail Marketing", "Retail Technology", "Loss Prevention", "Retail Analytics", "Merchandising", "Retail Sales", "Retail Strategy", "Retail Compliance", "Retail Training", "Retail Customer Experience"],
        "Retail Sales": ["Customer Service", "Sales Techniques", "Product Knowledge", "Cash Handling", "POS Systems", "Upselling", "Cross-selling", "Customer Relations", "Store Operations", "Sales Targets", "Retail Math", "Inventory Management", "Loss Prevention", "Retail Compliance", "Retail Training", "Sales Performance"],
        "SEM": ["Search Engine Marketing", "Google Ads", "Bing Ads", "PPC", "Keyword Research", "Ad Copywriting", "Bid Management", "Quality Score", "Ad Extensions", "Campaign Optimization", "Conversion Tracking", "A/B Testing", "Ad Analytics", "Budget Management", "SEM Strategy", "SEM Reporting"],
        "SEO": ["Search Engine Optimization", "Keyword Research", "On-page SEO", "Off-page SEO", "Technical SEO", "Link Building", "Content Optimization", "SEO Tools", "Analytics", "Local SEO", "Mobile SEO", "Voice Search SEO", "SEO Strategy", "SEO Audits", "SEO Reporting", "SEO Compliance"],
        "Store Operations": ["Store Management", "Inventory Control", "Staff Scheduling", "Cash Management", "Customer Service", "Visual Merchandising", "Loss Prevention", "Store Maintenance", "Store Security", "Opening Procedures", "Closing Procedures", "Store Policies", "Performance Monitoring", "Store Reporting", "Store Communication"],
        "Talent Acquisition": ["Recruiting", "Sourcing", "Interviewing", "Candidate Assessment", "Employer Branding", "Recruitment Marketing", "ATS", "Background Checks", "Job Descriptions", "Salary Negotiation", "Onboarding", "Recruitment Analytics", "Recruitment Strategy", "Talent Pipelines", "Recruitment Compliance", "Recruitment Technology"],
        "Tax Law": ["Tax Compliance", "Tax Planning", "Tax Research", "Tax Preparation", "Corporate Tax", "International Tax", "Tax Audits", "Tax Disputes", "Tax Technology", "Tax Regulations", "Tax Strategy", "Tax Consulting", "Tax Accounting", "Tax Reporting", "Tax Ethics", "Tax Advisory"],
        "Telecommunications": ["Network Planning", "Telephony", "Fiber Optics", "Wireless Networks", "5G", "LTE", "Network Operations", "Telecom Equipment", "Telecom Services", "VoIP", "Network Security", "Telecom Regulations", "Telecom Standards", "Telecom Billing", "Telecom Customer Service", "Telecom Technology"],
        "Textile": ["Textile Manufacturing", "Fabric Production", "Textile Design", "Textile Chemistry", "Textile Machinery", "Quality Control", "Textile Testing", "Textile Sustainability", "Textile Regulations", "Textile Innovation", "Textile Supply Chain", "Textile Sourcing", "Textile Finishing", "Textile Technology", "Textile Marketing"],
        "Tourism": ["Travel Planning", "Tour Operations", "Destination Management", "Hospitality", "Tourism Marketing", "Customer Service", "Booking Systems", "Travel Technology", "Tourism Regulations", "Sustainable Tourism", "Adventure Tourism", "Cultural Tourism", "Ecotourism", "Tourism Safety", "Tourism Economics"],
        "Transportation": ["Logistics", "Fleet Management", "Route Planning", "Vehicle Maintenance", "Transportation Safety", "Transportation Regulations", "Freight Management", "Passenger Transport", "Public Transport", "Transportation Technology", "Transportation Analytics", "Transportation Compliance", "Transportation Infrastructure", "Transportation Planning", "Transportation Economics"],
        "Travel": ["Travel Booking", "Travel Planning", "Itinerary Management", "Travel Insurance", "Customer Service", "Travel Technology", "Travel Regulations", "Destination Knowledge", "Travel Marketing", "Travel Sales", "Travel Documentation", "Travel Compliance", "Travel Safety", "Travel Trends", "Travel Customer Experience"],
        "Treasury": ["Cash Management", "Liquidity Management", "Working Capital", "Banking Relationships", "Treasury Operations", "Financial Risk", "Currency Management", "Treasury Technology", "Treasury Analytics", "Treasury Compliance", "Investment Management", "Debt Management", "Capital Structure", "Treasury Strategy", "Treasury Reporting"],
        "Urban Planning": ["City Planning", "Land Use Planning", "Zoning", "Transportation Planning", "Environmental Planning", "Urban Design", "Community Development", "Planning Regulations", "GIS", "Public Participation", "Sustainable Planning", "Housing Policy", "Infrastructure Planning", "Urban Analytics", "Planning Technology"],
        "VFX": ["Visual Effects", "Compositing", "3D Modeling", "Animation", "Rendering", "Motion Graphics", "VFX Software", "Green Screen", "Match Moving", "Rotoscoping", "Particle Effects", "VFX Pipeline", "VFX Production", "VFX Art Direction", "VFX Technology", "VFX Creative"],
        "Warehouse": ["Warehouse Operations", "Inventory Management", "Order Fulfillment", "Picking and Packing", "Shipping", "Receiving", "Warehouse Safety", "Warehouse Equipment", "Warehouse Technology", "Quality Control", "Warehouse Layout", "Warehouse Automation", "Warehouse Analytics", "Warehouse Compliance", "Warehouse Staffing", "Warehouse Documentation"],
    }
    
    skill_patterns = [
        "",  # the term itself
        "Design", "Engineering", "Systems", "Technology", "Operations", "Management",
        "Planning", "Analysis", "Development", "Testing", "Maintenance", "Optimization",
        "Safety", "Quality", "Compliance", "Regulation", "Strategy", "Innovation",
        "Automation", "Digital", "Smart", "Advanced", "Modern", "Integrated",
        "Sustainable", "Green", "Efficient", "Effective", "Strategic", "Global",
        "Regional", "Local", "International", "Enterprise", "Professional", "Technical",
        "Practical", "Applied", "Industrial", "Commercial", "Consumer", "Public",
    ]
    
    extra = {}
    for cat, terms in base_terms.items():
        seeds = []
        for term in terms:
            seeds.append(term)
            for pattern in skill_patterns:
                if pattern and pattern not in term.lower() and term.lower() not in pattern.lower():
                    seeds.append(f"{term} {pattern}")
        extra[cat] = seeds[:200]  # limit to 200 per category
    return extra


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------
def main():
    result = defaultdict(list)
    seen = set()

    def add(category, skill, skip_clean=False):
        if not category or not skill:
            return
        if not skip_clean:
            skill = clean_skill(skill)
            if not skill:
                return
        key = skill.lower()
        if key in seen:
            return
        seen.add(key)
        result[category].append(skill)

    # 1. worldwide IT skills
    ww = load_json(BASE / 'worldwide_clean_18300_it_skills_domain_wise.json')
    if ww and 'domains' in ww:
        for source_domain, skills in ww['domains'].items():
            default = None
            if 'frontend' in source_domain.lower():
                default = 'Frontend'
            elif 'backend' in source_domain.lower():
                default = 'Backend'
            elif 'mobile' in source_domain.lower():
                default = 'Mobile Development'
            elif 'database' in source_domain.lower():
                default = 'Database Administration'
            elif 'cloud' in source_domain.lower():
                default = 'Cloud Computing'
            elif 'devops' in source_domain.lower():
                default = 'DevOps'
            elif 'ai ml' in source_domain.lower():
                default = 'Artificial Intelligence'
            elif 'data science' in source_domain.lower():
                default = 'Data Science'
            elif 'data engineering' in source_domain.lower():
                default = 'Data Engineering'
            elif 'cybersecurity' in source_domain.lower():
                default = 'Cyber Security'
            elif 'testing' in source_domain.lower():
                default = 'QA'
            elif 'networking' in source_domain.lower():
                default = 'Networking'
            elif 'enterprise platforms' in source_domain.lower():
                default = 'Software Development'
            elif 'ui ux' in source_domain.lower():
                default = 'UI/UX Design'
            elif 'blockchain' in source_domain.lower():
                default = 'Blockchain'
            elif 'programming' in source_domain.lower():
                default = 'Software Development'
            elif 'java ecosystem' in source_domain.lower():
                default = 'Backend'
            elif 'system design' in source_domain.lower():
                default = 'Software Development'
            elif 'resume parser' in source_domain.lower():
                default = 'Software Development'
            else:
                default = 'Technology'
            for s in skills:
                cat = classify_skill(s, default=default)
                add(cat, s)

    # 2. ALL_CATG_SKILLS.txt sets
    catg = load_python_skills_sets(
        BASE / 'ALL_CATG_SKILLS.txt',
        ['HEALTHCARE_SKILLS', 'FINANCE_SKILLS', 'HR_SKILLS', 'EDUCATION_SKILLS', 'SALES_SKILLS', 'LEGAL_SKILLS']
    )
    set_map = {
        'HEALTHCARE_SKILLS': 'Healthcare',
        'FINANCE_SKILLS': 'Finance',
        'HR_SKILLS': 'HR',
        'EDUCATION_SKILLS': 'Education',
        'SALES_SKILLS': 'Sales',
        'LEGAL_SKILLS': 'Legal',
    }
    for var, default in set_map.items():
        for s in catg.get(var, []):
            c = classify_skill(s, default=default)
            add(c, s)

    # 4. ALL_CAT_ROLES.txt -> derive skills
    catr = load_python_skills_sets(
        BASE / 'ALL_CAT_ROLES.txt',
        ['HEALTHCARE_ROLES', 'FINANCE_ROLES', 'HR_ROLES', 'ENGINEERING_NON_IT_ROLES', 'EDUCATION_ROLES', 'SALES_ROLES', 'LEGAL_ROLES']
    )
    for var, roles in catr.items():
        for r in roles:
            skill = strip_role_titles(r)
            if not skill:
                continue
            c = classify_skill(skill, default=None)
            add(c, skill)

    # 5. data/skills_taxonomy.json list
    data_tax = load_json(BASE / 'data' / 'skills_taxonomy.json')
    if isinstance(data_tax, list):
        for s in data_tax:
            c = classify_skill(s, default='Technology')
            add(c, s)

    # 6. skills_tech_non_tech.py set
    for s in load_python_set(BASE / 'skills_tech_non_tech (2).py', 'skills_tech_non_tech'):
        c = classify_skill(s, default='Technology')
        add(c, s)

    # 7. manual seeds
    for cat, skills in SEEDS.items():
        for s in skills:
            add(cat, s, skip_clean=True)

    # 8. generated extra seeds for low categories
    extra_seeds = generate_extra_seeds()
    for cat, skills in extra_seeds.items():
        for s in skills:
            add(cat, s)

    # -----------------------------------------------------------------------
    # Finalize: keep only target categories, sort, ensure min counts
    # -----------------------------------------------------------------------
    final = {}
    for cat in TARGET_CATEGORIES:
        skills = sorted(set(result.get(cat, [])))
        final[cat] = skills

    # Fill tiny categories with extra generated seeds
    for cat, skills in final.items():
        if len(skills) < 50:
            # Use generated extra seeds
            extra = extra_seeds.get(cat, [])
            for s in extra:
                add(cat, s)

    # Re-sort and dedupe final
    final = {cat: sorted(set(skills)) for cat, skills in final.items() if len(skills) >= 1}

    # Sort categories alphabetically and ensure valid JSON
    ordered = {k: final[k] for k in sorted(final.keys())}

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)

    # Report
    total = sum(len(v) for v in ordered.values())
    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write(f'Total skills: {total}\n')
        f.write(f'Categories: {len(ordered)}\n')
        for cat, skills in ordered.items():
            f.write(f'{cat}: {len(skills)}\n')

    print(f'Wrote {OUTPUT} with {total} skills across {len(ordered)} categories')


if __name__ == '__main__':
    main()
