"""
Simple rule-based parser that doesn't require external dependencies.
Extracts basic entities using regex patterns.
"""

import re
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class SimpleRuleParser:
    """
    Simple rule-based parser using only Python standard library.
    Fallback when full RuleBasedParser fails to initialize.
    """
    
    def __init__(self):
        """Initialize the parser with compiled regex patterns."""
        self.logger = logging.getLogger(__name__)
        
        # Email pattern
        self.email_pattern = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        )
        
        # Phone patterns (including Indian formats)
        self.phone_patterns = [
            re.compile(r'\+91[-\s]?(\d{5})[-\s]?(\d{5})'),  # +91 87904 33333
            re.compile(r'(\d{3})[-\s]?(\d{3})[-\s]?(\d{4})'),  # 879-043-3333
            re.compile(r'(\d{10})'),  # 8790433333
        ]
        
        # LinkedIn pattern
        self.linkedin_pattern = re.compile(
            r'linkedin\.com/in/[\w\-]+', re.IGNORECASE
        )
        
        # GitHub pattern
        self.github_pattern = re.compile(
            r'github\.com/[\w\-]+', re.IGNORECASE
        )
        
        # Website pattern (basic)
        self.website_pattern = re.compile(
            r'https?://[^\s<>"{}|\\^`[\]]+', re.IGNORECASE
        )
        
        # Date patterns
        self.date_patterns = [
            re.compile(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'),  # MM/DD/YYYY
            re.compile(r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b'),  # YYYY/MM/DD
            re.compile(r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b', re.IGNORECASE),
        ]
        
        # Skills keywords
        self.skill_keywords = {
            'react', 'reactjs', 'react.js', 'vue', 'vuejs', 'angular', 'angularjs',
            'javascript', 'typescript', 'node', 'nodejs', 'node.js', 'express',
            'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less',
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'database',
            'git', 'github', 'gitlab', 'bitbucket', 'docker', 'kubernetes',
            'aws', 'azure', 'gcp', 'cloud', 'devops', 'ci/cd', 'jenkins',
            'rest', 'restful', 'api', 'graphql', 'microservices',
            'webpack', 'vite', 'babel', 'eslint', 'prettier', 'jest',
            'linux', 'ubuntu', 'windows', 'mac', 'unix', 'shell', 'bash',
            'tailwind', 'bootstrap', 'material-ui', 'styled-components',
            'redux', 'mobx', 'context', 'zustand', 'recoil'
        }
        
        self.logger.info("SimpleRuleParser initialized successfully")
    
    def extract_email(self, text: str) -> Optional[str]:
        """Extract email address from text."""
        matches = self.email_pattern.findall(text)
        return matches[0] if matches else None
    
    def extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number from text."""
        for pattern in self.phone_patterns:
            matches = pattern.findall(text)
            if matches:
                match = matches[0]
                if isinstance(match, tuple):
                    return ''.join(match)
                return match
        return None
    
    def extract_linkedin(self, text: str) -> Optional[str]:
        """Extract LinkedIn profile from text."""
        matches = self.linkedin_pattern.findall(text)
        return f"https://{matches[0]}" if matches else None
    
    def extract_github(self, text: str) -> Optional[str]:
        """Extract GitHub profile from text."""
        matches = self.github_pattern.findall(text)
        return f"https://{matches[0]}" if matches else None
    
    def extract_websites(self, text: str) -> List[str]:
        """Extract websites from text."""
        matches = self.website_pattern.findall(text)
        # Filter out social media links
        filtered = [m for m in matches if not any(social in m.lower() for social in ['linkedin', 'github', 'facebook', 'twitter'])]
        return list(set(filtered))
    
    def extract_dates(self, text: str) -> List[str]:
        """Extract dates from text."""
        dates = []
        for pattern in self.date_patterns:
            matches = pattern.findall(text)
            dates.extend(matches)
        return list(set(dates))
    
    def extract_years_of_experience(self, text: str) -> Optional[float]:
        """Extract years of experience from text."""
        # Look for patterns like "3+ years", "3 years", "3 years of experience"
        patterns = [
            r'(\d+(?:\.\d+)?)\+?\s*years?',
            r'(\d+(?:\.\d+)?)\+?\s*years?\s*of\s*experience',
            r'experience[:\s]*(\d+(?:\.\d+)?)\+?\s*years?',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        return None
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract technical skills from text."""
        found_skills = []
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Check multi-word skills first
        multi_word_skills = {
        'node.js': 'Node.js',
        'react.js': 'React.js', 
        'typescript': 'TypeScript',
        'tailwind css': 'Tailwind CSS',
        'material ui': 'Material UI',
        'styled components': 'Styled Components',
        'c#': 'C#',
        'f#': 'F#',
        '.net': '.NET',
        '.net 8': '.NET 8',
        '.net 9': '.NET 9',
        'vb.net': 'VB.NET',
        'objective-c': 'Objective-C',
        'pl/sql': 'PL/SQL',
        't-sql': 'T-SQL',
        'pl/pgsql': 'PL/pgSQL',
        'common lisp': 'Common Lisp',
        'standard ml': 'Standard ML',
        'visual basic': 'Visual Basic',
        'v lang': 'V Lang',
        'd language': 'D Language',
        'co-array fortran': 'Co-Array Fortran',

        # ── Web Frontend ──────────────────────────────────────────────
        'node.js': 'Node.js',
        'react.js': 'React.js',
        'vue.js': 'Vue.js',
        'next.js': 'Next.js',
        'nuxt.js': 'Nuxt.js',
        'three.js': 'Three.js',
        'express.js': 'Express.js',
        'socket.io': 'Socket.io',
        'alpine.js': 'Alpine.js',
        'ember.js': 'Ember.js',
        'backbone.js': 'Backbone.js',
        'tailwind css': 'Tailwind CSS',
        'material ui': 'Material UI',
        'material design': 'Material Design',
        'material design 3': 'Material Design 3',
        'styled components': 'Styled Components',
        'vanilla extract': 'Vanilla Extract',
        'ant design': 'Ant Design',
        'chakra ui': 'Chakra UI',
        'shadcn/ui': 'shadcn/ui',
        'headless ui': 'Headless UI',
        'radix ui': 'Radix UI',
        'react aria': 'React Aria',
        'tanstack query': 'TanStack Query',
        'redux toolkit': 'Redux Toolkit',
        'open props': 'Open Props',
        'css grid': 'CSS Grid',
        'css flexbox': 'CSS Flexbox',
        'css modules': 'CSS Modules',
        'css variables': 'CSS Variables',
        'web components': 'Web Components',
        'shadow dom': 'Shadow DOM',
        'custom elements': 'Custom Elements',
        'module federation': 'Module Federation',
        'web vitals': 'Web Vitals',
        'core web vitals': 'Core Web Vitals',
        'service workers': 'Service Workers',
        'web workers': 'Web Workers',

        # ── Web Backend ───────────────────────────────────────────────
        'asp.net': 'ASP.NET',
        'asp.net core': 'ASP.NET Core',
        'spring boot': 'Spring Boot',
        'spring mvc': 'Spring MVC',
        'spring webflux': 'Spring WebFlux',
        'play framework': 'Play Framework',
        'jakarta ee': 'Jakarta EE',
        'django rest framework': 'Django REST Framework',
        'django rest': 'Django REST',
        'ruby on rails': 'Ruby on Rails',
        'elixir phoenix': 'Elixir Phoenix',
        'erlang cowboy': 'Erlang Cowboy',
        'haskell servant': 'Haskell Servant',
        'minimal api': 'Minimal API',
        'json api': 'JSON API',
        'async api': 'AsyncAPI',

        # ── Databases ─────────────────────────────────────────────────
        'sql server': 'SQL Server',
        'microsoft sql server': 'Microsoft SQL Server',
        'ibm db2': 'IBM DB2',
        'mongodb atlas': 'MongoDB Atlas',
        'redis stack': 'Redis Stack',
        'redis cloud': 'Redis Cloud',
        'apache cassandra': 'Apache Cassandra',
        'azure table storage': 'Azure Table Storage',
        'astra db': 'Astra DB',
        'amazon neptune': 'Amazon Neptune',
        'apache druid': 'Apache Druid',
        'apache pinot': 'Apache Pinot',
        'active record': 'Active Record',
        'entity framework': 'Entity Framework',
        'sea-orm': 'SeaORM',

        # ── Cloud & Infrastructure ────────────────────────────────────
        'amazon web services': 'Amazon Web Services',
        'google cloud': 'Google Cloud',
        'google cloud platform': 'Google Cloud Platform',
        'microsoft azure': 'Microsoft Azure',
        'alibaba cloud': 'Alibaba Cloud',
        'tencent cloud': 'Tencent Cloud',
        'huawei cloud': 'Huawei Cloud',
        'oracle cloud': 'Oracle Cloud',
        'ibm cloud': 'IBM Cloud',
        'docker compose': 'Docker Compose',
        'docker swarm': 'Docker Swarm',
        'aws lambda': 'AWS Lambda',
        'aws ecs': 'AWS ECS',
        'aws eks': 'AWS EKS',
        'aws fargate': 'AWS Fargate',
        'aws s3': 'AWS S3',
        'aws rds': 'AWS RDS',
        'aws cloudfront': 'AWS CloudFront',
        'aws sagemaker': 'AWS SageMaker',
        'aws bedrock': 'AWS Bedrock',
        'azure functions': 'Azure Functions',
        'azure kubernetes': 'Azure Kubernetes',
        'azure devops': 'Azure DevOps',
        'azure openai': 'Azure OpenAI',
        'azure blob': 'Azure Blob',
        'azure sql': 'Azure SQL',
        'google cloud functions': 'Google Cloud Functions',
        'google cloud run': 'Google Cloud Run',
        'cloudflare workers': 'Cloudflare Workers',
        'cloudflare pages': 'Cloudflare Pages',
        'vercel edge functions': 'Vercel Edge Functions',
        'netlify functions': 'Netlify Functions',
        'github actions': 'GitHub Actions',
        'gitlab ci': 'GitLab CI',
        'argo cd': 'Argo CD',
        'terraform cloud': 'Terraform Cloud',
        'arm templates': 'ARM Templates',
        'config connector': 'Config Connector',

        # ── AI & GenAI ────────────────────────────────────────────────
        'gpt-4': 'GPT-4',
        'gpt-4o': 'GPT-4o',
        'gpt-4 turbo': 'GPT-4 Turbo',
        'gpt-3.5': 'GPT-3.5',
        'claude 3': 'Claude 3',
        'claude 3.5': 'Claude 3.5',
        'claude opus': 'Claude Opus',
        'claude sonnet': 'Claude Sonnet',
        'claude haiku': 'Claude Haiku',
        'gemini pro': 'Gemini Pro',
        'gemini ultra': 'Gemini Ultra',
        'gemini flash': 'Gemini Flash',
        'gemma 2': 'Gemma 2',
        'llama 2': 'LLaMA 2',
        'llama 3': 'LLaMA 3',
        'llama 3.1': 'LLaMA 3.1',
        'llama 3.2': 'LLaMA 3.2',
        'llama 3.3': 'LLaMA 3.3',
        'mistral 7b': 'Mistral 7B',
        'mixtral 8x7b': 'Mixtral 8x7B',
        'deepseek r1': 'DeepSeek R1',
        'deepseek v3': 'DeepSeek V3',
        'stable diffusion': 'Stable Diffusion',
        'dall-e': 'DALL-E',
        'dall-e 3': 'DALL-E 3',
        'midjourney v6': 'Midjourney v6',
        'retrieval augmented generation': 'Retrieval Augmented Generation',
        'chain of thought': 'Chain of Thought',
        'function calling': 'Function Calling',
        'tool use': 'Tool Use',
        'few-shot': 'Few-Shot',
        'zero-shot': 'Zero-Shot',
        'one-shot': 'One-Shot',
        'in-context learning': 'In-Context Learning',
        'prompt engineering': 'Prompt Engineering',
        'reinforcement learning from human feedback': 'RLHF',
        'text generation inference': 'Text Generation Inference',
        'lm studio': 'LM Studio',
        'weights and biases': 'Weights & Biases',
        'openai embeddings': 'OpenAI Embeddings',
        'sentence transformers': 'Sentence Transformers',
        'graph rag': 'Graph RAG',
        'hybrid search': 'Hybrid Search',
        'multi-agent': 'Multi-Agent',
        'agentic ai': 'Agentic AI',
        'ai agents': 'AI Agents',
        'ai safety': 'AI Safety',
        'constitutional ai': 'Constitutional AI',
        'nemo guardrails': 'NeMo Guardrails',
        'nvidia h100': 'NVIDIA H100',
        'nvidia a100': 'NVIDIA A100',
        'nvidia l40s': 'NVIDIA L40S',
        'google tpu': 'Google TPU',
        'aws trainium': 'AWS Trainium',
        'aws inferentia': 'AWS Inferentia',
        'intel gaudi': 'Intel Gaudi',
        'groq lpu': 'Groq LPU',

        # ── Data Science ──────────────────────────────────────────────
        'scikit-learn': 'Scikit-Learn',
        'apache spark': 'Apache Spark',
        'apache kafka': 'Apache Kafka',
        'apache flink': 'Apache Flink',
        'apache beam': 'Apache Beam',
        'apache hadoop': 'Apache Hadoop',
        'apache hive': 'Apache Hive',
        'apache nifi': 'Apache NiFi',
        'apache airflow': 'Apache Airflow',
        'dbt core': 'dbt Core',
        'dbt cloud': 'dbt Cloud',
        'delta lake': 'Delta Lake',
        'apache iceberg': 'Apache Iceberg',
        'apache hudi': 'Apache Hudi',
        'google colab': 'Google Colab',
        'jupyter lab': 'JupyterLab',
        'jupyter notebook': 'Jupyter Notebook',
        'power bi': 'Power BI',
        'looker studio': 'Looker Studio',
        'apache superset': 'Apache Superset',
        'sagemaker studio': 'SageMaker Studio',
        'plotly express': 'Plotly Express',

        # ── DevOps & Tools ────────────────────────────────────────────
        'vs code': 'VS Code',
        'visual studio code': 'Visual Studio Code',
        'visual studio': 'Visual Studio',
        'intellij idea': 'IntelliJ IDEA',
        'android studio': 'Android Studio',
        'qt creator': 'Qt Creator',
        'sublime text': 'Sublime Text',
        'notepad++': 'Notepad++',
        'vim neovim': 'Neovim',
        'github copilot': 'GitHub Copilot',
        'monday.com': 'Monday.com',
        'rocket.chat': 'Rocket.Chat',
        'microsoft teams': 'Microsoft Teams',
        'google meet': 'Google Meet',

        # ── Cybersecurity ─────────────────────────────────────────────
        'penetration testing': 'Penetration Testing',
        'ethical hacking': 'Ethical Hacking',
        'red team': 'Red Team',
        'blue team': 'Blue Team',
        'purple team': 'Purple Team',
        'vulnerability assessment': 'Vulnerability Assessment',
        'threat intelligence': 'Threat Intelligence',
        'privileged access management': 'Privileged Access Management',
        'zero trust': 'Zero Trust',
        'identity management': 'Identity Management',
        'cloud security': 'Cloud Security',
        'network security': 'Network Security',
        'endpoint security': 'Endpoint Security',
        'container security': 'Container Security',
        'runtime security': 'Runtime Security',
        'metasploit framework': 'Metasploit Framework',
        'burp suite': 'Burp Suite',
        'burp pro': 'Burp Pro',
        'john the ripper': 'John the Ripper',
        'owasp top 10': 'OWASP Top 10',
        'owasp zap': 'OWASP ZAP',
        'zero knowledge proof': 'Zero Knowledge Proof',
        'homomorphic encryption': 'Homomorphic Encryption',
        'active directory': 'Active Directory',
        'azure ad': 'Azure AD',
        'entra id': 'Entra ID',
        'ping identity': 'Ping Identity',
        'lets encrypt': "Let's Encrypt",
        'cis benchmarks': 'CIS Benchmarks',
        'iso 27001': 'ISO 27001',
        'iso 27002': 'ISO 27002',
        'pci dss': 'PCI DSS',
        'nist csf': 'NIST CSF',
        'soc 2': 'SOC 2',
        'soc2 type ii': 'SOC 2 Type II',
        'dora regulation': 'DORA Regulation',
        'nis2': 'NIS2',

        # ── Blockchain ────────────────────────────────────────────────
        'bnb chain': 'BNB Chain',
        'binance smart chain': 'Binance Smart Chain',
        'polygon zkEVM': 'Polygon zkEVM',
        'smart contracts': 'Smart Contracts',
        'zk proofs': 'ZK Proofs',
        'zk-snark': 'ZK-SNARK',
        'zk-stark': 'ZK-STARK',
        'optimistic rollup': 'Optimistic Rollup',
        'account abstraction': 'Account Abstraction',
        'liquid staking': 'Liquid Staking',
        'defi protocols': 'DeFi Protocols',
        'rainbow wallet': 'Rainbow Wallet',
        'coinbase wallet': 'Coinbase Wallet',
        'gnosis safe': 'Gnosis Safe',

        # ── Mobile ────────────────────────────────────────────────────
        'react native': 'React Native',
        'kotlin multiplatform': 'Kotlin Multiplatform',
        'compose multiplatform': 'Compose Multiplatform',
        'jetpack compose': 'Jetpack Compose',
        'android sdk': 'Android SDK',
        'android jetpack': 'Android Jetpack',
        'navigation component': 'Navigation Component',
        'swiftui': 'SwiftUI',
        'uikit': 'UIKit',
        'core data': 'Core Data',
        'core ml': 'Core ML',
        'google play console': 'Google Play Console',
        'firebase auth': 'Firebase Auth',
        'firebase fcm': 'Firebase FCM',
        'firebase crashlytics': 'Firebase Crashlytics',
        'firebase remote config': 'Firebase Remote Config',
        'firebase app distribution': 'Firebase App Distribution',
        'aws amplify': 'AWS Amplify',

        # ── IoT & Embedded ────────────────────────────────────────────
        'raspberry pi': 'Raspberry Pi',
        'raspberry pi 4': 'Raspberry Pi 4',
        'raspberry pi 5': 'Raspberry Pi 5',
        'raspberry pi zero': 'Raspberry Pi Zero',
        'arm cortex': 'ARM Cortex',
        'arm cortex-m': 'ARM Cortex-M',
        'arm cortex-a': 'ARM Cortex-A',
        'nordic nrf52': 'Nordic nRF52',
        'nordic nrf9160': 'Nordic nRF9160',
        'ti msp430': 'TI MSP430',
        'pic microcontroller': 'PIC Microcontroller',
        'nvidia jetson': 'NVIDIA Jetson',
        'jetson nano': 'Jetson Nano',
        'jetson orin': 'Jetson Orin',
        'can bus': 'CAN Bus',
        'opc-ua': 'OPC-UA',
        'home assistant': 'Home Assistant',
        'node-red': 'Node-RED',
        'aws iot core': 'AWS IoT Core',
        'aws iot greengrass': 'AWS IoT Greengrass',
        'azure iot hub': 'Azure IoT Hub',
        'azure iot edge': 'Azure IoT Edge',
        'edge impulse': 'Edge Impulse',
        'tflite micro': 'TFLite Micro',
        'tensorflow lite': 'TensorFlow Lite',
        'digital twin': 'Digital Twin',
        'industry 4.0': 'Industry 4.0',
        'predictive maintenance': 'Predictive Maintenance',

        # ── Game Development ──────────────────────────────────────────
        'unreal engine': 'Unreal Engine',
        'unreal engine 5': 'Unreal Engine 5',
        'game maker': 'GameMaker',
        'gamemaker studio': 'GameMaker Studio',
        'opengl es': 'OpenGL ES',
        'directx 12': 'DirectX 12',
        'webgl 2': 'WebGL 2',
        'ray tracing': 'Ray Tracing',
        'directx raytracing': 'DirectX Raytracing',
        'procedural generation': 'Procedural Generation',
        'navigation mesh': 'Navigation Mesh',
        'behavior tree': 'Behavior Tree',
        'finite state machine': 'Finite State Machine',
        'entity component system': 'Entity Component System',
        'physics engine': 'Physics Engine',
        'game loop': 'Game Loop',
        'substance painter': 'Substance Painter',
        'substance designer': 'Substance Designer',
        'marvelous designer': 'Marvelous Designer',
        'photon engine': 'Photon Engine',
        'epic online services': 'Epic Online Services',
        'mirror networking': 'Mirror Networking',
        'in-app purchase': 'In-App Purchase',
        'ads mediation': 'Ads Mediation',

        # ── Design & UX ───────────────────────────────────────────────
        'figma dev mode': 'Figma Dev Mode',
        'adobe xd': 'Adobe XD',
        'adobe photoshop': 'Adobe Photoshop',
        'adobe illustrator': 'Adobe Illustrator',
        'adobe after effects': 'Adobe After Effects',
        'adobe premiere': 'Adobe Premiere',
        'adobe animate': 'Adobe Animate',
        'adobe indesign': 'Adobe InDesign',
        'affinity designer': 'Affinity Designer',
        'affinity photo': 'Affinity Photo',
        'clip studio paint': 'Clip Studio Paint',
        'origami studio': 'Origami Studio',
        'framer motion': 'Framer Motion',
        'lottie files': 'Lottie Files',
        'user research': 'User Research',
        'usability testing': 'Usability Testing',
        'a/b testing': 'A/B Testing',
        'heuristic evaluation': 'Heuristic Evaluation',
        'card sorting': 'Card Sorting',
        'tree testing': 'Tree Testing',
        'eye tracking': 'Eye Tracking',
        'heat maps': 'Heat Maps',
        'session recording': 'Session Recording',
        'ui design': 'UI Design',
        'ux design': 'UX Design',
        'product design': 'Product Design',
        'interaction design': 'Interaction Design',
        'information architecture': 'Information Architecture',
        'user journey': 'User Journey',
        'user flow': 'User Flow',
        'task analysis': 'Task Analysis',
        'empathy map': 'Empathy Map',
        'jobs to be done': 'Jobs To Be Done',
        'design sprint': 'Design Sprint',
        'double diamond': 'Double Diamond',
        'human-centered design': 'Human-Centered Design',
        'service design': 'Service Design',
        'content strategy': 'Content Strategy',
        'design thinking': 'Design Thinking',
        'design system': 'Design System',
        'wcag 2.1': 'WCAG 2.1',
        'wcag 2.2': 'WCAG 2.2',
        'wai-aria': 'WAI-ARIA',
        'section 508': 'Section 508',
        'variable fonts': 'Variable Fonts',
        'google fonts': 'Google Fonts',
        'adobe fonts': 'Adobe Fonts',
        'brand identity': 'Brand Identity',
        'logo design': 'Logo Design',
        'lightning design system': 'Lightning Design System',
        'carbon design': 'Carbon Design',
        'atlassian design': 'Atlassian Design',
        'fluent design': 'Fluent Design',
        'apple hig': 'Apple HIG',

        # ── Networking ────────────────────────────────────────────────
        'tcp/ip': 'TCP/IP',
        'http/2': 'HTTP/2',
        'http/3': 'HTTP/3',
        'http/1.1': 'HTTP/1.1',
        'load balancer': 'Load Balancer',
        'reverse proxy': 'Reverse Proxy',
        'forward proxy': 'Forward Proxy',
        'ssl vpn': 'SSL VPN',
        'sd-wan': 'SD-WAN',
        'open vswitch': 'Open vSwitch',
        'tungsten fabric': 'Tungsten Fabric',
        'zero trust network': 'Zero Trust Network',
        'network automation': 'Network Automation',
        'ddos protection': 'DDoS Protection',
        'traffic shaping': 'Traffic Shaping',
        'network segmentation': 'Network Segmentation',
        'aws alb': 'AWS ALB',
        'aws nlb': 'AWS NLB',
        'azure load balancer': 'Azure Load Balancer',
        'gcp load balancer': 'GCP Load Balancer',

        # ── Quantum Computing ─────────────────────────────────────────
        'ibm quantum': 'IBM Quantum',
        'google quantum ai': 'Google Quantum AI',
        'google sycamore': 'Google Sycamore',
        'google willow': 'Google Willow',
        'microsoft quantum': 'Microsoft Quantum',
        'amazon braket': 'Amazon Braket',
        'azure quantum': 'Azure Quantum',
        'cuda quantum': 'CUDA Quantum',
        'quantum error correction': 'Quantum Error Correction',
        'quantum annealing': 'Quantum Annealing',
        'quantum supremacy': 'Quantum Supremacy',
        'quantum advantage': 'Quantum Advantage',
        'quantum gates': 'Quantum Gates',
        'quantum circuit': 'Quantum Circuit',
        'quantum entanglement': 'Quantum Entanglement',
        'quantum superposition': 'Quantum Superposition',
        'quantum teleportation': 'Quantum Teleportation',
        'quantum simulation': 'Quantum Simulation',
        'quantum chemistry': 'Quantum Chemistry',
        'fault tolerant': 'Fault Tolerant',
        'surface code': 'Surface Code',
        'topological code': 'Topological Code',
        'topological qubit': 'Topological Qubit',

        # ── AR/VR/XR ──────────────────────────────────────────────────
        'apple vision pro': 'Apple Vision Pro',
        'meta quest': 'Meta Quest',
        'meta quest 3': 'Meta Quest 3',
        'meta quest pro': 'Meta Quest Pro',
        'htc vive': 'HTC Vive',
        'valve index': 'Valve Index',
        'playstation vr': 'PlayStation VR',
        'microsoft hololens': 'Microsoft HoloLens',
        'hololens 2': 'HoloLens 2',
        'magic leap': 'Magic Leap',
        'magic leap 2': 'Magic Leap 2',
        'spatial computing': 'Spatial Computing',
        'mixed reality': 'Mixed Reality',
        'extended reality': 'Extended Reality',
        'virtual reality': 'Virtual Reality',
        'augmented reality': 'Augmented Reality',
        'holographic display': 'Holographic Display',
        'volumetric capture': 'Volumetric Capture',
        'gaussian splatting': 'Gaussian Splatting',
        'neural radiance fields': 'Neural Radiance Fields',
        'hand tracking': 'Hand Tracking',
        'body tracking': 'Body Tracking',
        'face tracking': 'Face Tracking',
        'inside-out tracking': 'Inside-Out Tracking',
        'haptic feedback': 'Haptic Feedback',
        'force feedback': 'Force Feedback',
        'industrial metaverse': 'Industrial Metaverse',
        'webxr device api': 'WebXR Device API',
        'universal scene description': 'Universal Scene Description',
        'nvidia omniverse': 'NVIDIA Omniverse',
        'snap lens studio': 'Snap Lens Studio',
        'spark ar': 'Spark AR',

        # ── Robotics ──────────────────────────────────────────────────
        'ros2': 'ROS 2',
        'ros humble': 'ROS Humble',
        'ros iron': 'ROS Iron',
        'ros jazzy': 'ROS Jazzy',
        'ignition gazebo': 'Ignition Gazebo',
        'isaac sim': 'Isaac Sim',
        'nvidia isaac': 'NVIDIA Isaac',
        'slam toolbox': 'SLAM Toolbox',
        'kalman filter': 'Kalman Filter',
        'motion planning': 'Motion Planning',
        'inverse kinematics': 'Inverse Kinematics',
        'autonomous vehicles': 'Autonomous Vehicles',
        'lidar perception': 'LiDAR Perception',
        'object detection': 'Object Detection',
        'lane detection': 'Lane Detection',
        'path planning': 'Path Planning',
        'behavior planning': 'Behavior Planning',
        'hd maps': 'HD Maps',
        'tesla autopilot': 'Tesla Autopilot',
        'swarm robotics': 'Swarm Robotics',
        'reinforcement learning robots': 'Reinforcement Learning (Robotics)',
        'imitation learning': 'Imitation Learning',
        'robot learning': 'Robot Learning',
        'legged robotics': 'Legged Robotics',
        'foundation models robotics': 'Foundation Models (Robotics)',

        # ── Methodologies ─────────────────────────────────────────────
        'domain driven design': 'Domain-Driven Design',
        'clean architecture': 'Clean Architecture',
        'solid principles': 'SOLID Principles',
        'design patterns': 'Design Patterns',
        'gang of four': 'Gang of Four',
        'boy scout rule': 'Boy Scout Rule',
        'code review': 'Code Review',
        'pair programming': 'Pair Programming',
        'mob programming': 'Mob Programming',
        'ensemble programming': 'Ensemble Programming',
        'code coverage': 'Code Coverage',
        'mutation testing': 'Mutation Testing',
        'property-based testing': 'Property-Based Testing',
        'event driven': 'Event-Driven',
        'event sourcing': 'Event Sourcing',
        'api gateway': 'API Gateway',
        'service mesh': 'Service Mesh',
        'hexagonal architecture': 'Hexagonal Architecture',
        'ports and adapters': 'Ports and Adapters',
        'onion architecture': 'Onion Architecture',
        'clean code': 'Clean Code',
        'twelve-factor app': 'Twelve-Factor App',
        'cell-based architecture': 'Cell-Based Architecture',
        'modular monolith': 'Modular Monolith',
        'vertical slice architecture': 'Vertical Slice Architecture',
        'strangler fig': 'Strangler Fig Pattern',
        'anti-corruption layer': 'Anti-Corruption Layer',
        'consumer-driven contracts': 'Consumer-Driven Contracts',
        'api versioning': 'API Versioning',
        'api rate limiting': 'API Rate Limiting',
        'site reliability engineering': 'Site Reliability Engineering',
        'error budget': 'Error Budget',
        'incident management': 'Incident Management',
        'chaos engineering': 'Chaos Engineering',
        'chaos monkey': 'Chaos Monkey',
        'feature flags': 'Feature Flags',
        'feature toggles': 'Feature Toggles',
        'canary deployment': 'Canary Deployment',
        'blue green deployment': 'Blue-Green Deployment',
        'rolling deployment': 'Rolling Deployment',
        'team topologies': 'Team Topologies',
        'stream aligned team': 'Stream-Aligned Team',
        'conways law': "Conway's Law",
        'sprint planning': 'Sprint Planning',
        'sprint review': 'Sprint Review',
        'product backlog': 'Product Backlog',
        'sprint backlog': 'Sprint Backlog',
        'user stories': 'User Stories',
        'story points': 'Story Points',
        'definition of done': 'Definition of Done',
        'definition of ready': 'Definition of Ready',
        'daily standup': 'Daily Standup',
        'scaled agile framework': 'Scaled Agile Framework',
        'spotify model': 'Spotify Model',
        'dora metrics': 'DORA Metrics',
        'flow metrics': 'Flow Metrics',
        'okrs': 'OKRs',
        'kpis': 'KPIs',
        'earned value management': 'Earned Value Management',
        'technical writing': 'Technical Writing',
        'stakeholder management': 'Stakeholder Management',
        'systems thinking': 'Systems Thinking',
        'critical thinking': 'Critical Thinking',
        'problem solving': 'Problem Solving',
        'time management': 'Time Management',

        # ── Fintech ───────────────────────────────────────────────────
        'open banking': 'Open Banking',
        'banking as a service': 'Banking as a Service',
        'core banking': 'Core Banking',
        'credit scoring': 'Credit Scoring',
        'alternative data': 'Alternative Data',
        'account aggregator': 'Account Aggregator',
        'india stack': 'India Stack',
        'upi payment': 'UPI Payment',
        'iso 20022': 'ISO 20022',
        '3d secure': '3D Secure',
        'stripe connect': 'Stripe Connect',
        'stripe treasury': 'Stripe Treasury',
        'stripe identity': 'Stripe Identity',
        'bitcoin lightning': 'Bitcoin Lightning',
        'coinbase commerce': 'Coinbase Commerce',

        # ── Healthtech ────────────────────────────────────────────────
        'hl7 fhir': 'HL7 FHIR',
        'fhir r4': 'FHIR R4',
        'fhir r5': 'FHIR R5',
        'snomed ct': 'SNOMED CT',
        'smart on fhir': 'SMART on FHIR',
        'epic fhir': 'Epic FHIR',
        'medical imaging': 'Medical Imaging',
        'radiology ai': 'Radiology AI',
        'pathology ai': 'Pathology AI',
        'remote patient monitoring': 'Remote Patient Monitoring',
        'continuous glucose monitoring': 'Continuous Glucose Monitoring',
        'alphafold 2': 'AlphaFold 2',
        'iso 13485': 'ISO 13485',
        'fda 21 cfr part 11': 'FDA 21 CFR Part 11',
        'eu mdr': 'EU MDR',

        # ── MarTech ───────────────────────────────────────────────────
        'google analytics 4': 'Google Analytics 4',
        'google search console': 'Google Search Console',
        'salesforce marketing cloud': 'Salesforce Marketing Cloud',
        'salesforce crm': 'Salesforce CRM',
        'hubspot crm': 'HubSpot CRM',
        'microsoft dynamics': 'Microsoft Dynamics',
        'twilio sendgrid': 'Twilio SendGrid',
        'the trade desk': 'The Trade Desk',
        'amazon dsp': 'Amazon DSP',
        'multi-touch attribution': 'Multi-Touch Attribution',
        'media mix modeling': 'Media Mix Modeling',
        'programmatic advertising': 'Programmatic Advertising',
        'technical seo': 'Technical SEO',
        'on-page seo': 'On-Page SEO',
        'off-page seo': 'Off-Page SEO',
        'schema markup': 'Schema Markup',
        'structured data': 'Structured Data',
        'screaming frog': 'Screaming Frog',
        'bing webmaster': 'Bing Webmaster',
        'yoast seo': 'Yoast SEO',
        'rank math': 'Rank Math',
        'ab tasty': 'AB Tasty',

        # ── Regional Tech ─────────────────────────────────────────────
        'wechat mini program': 'WeChat Mini Program',
        'harmony os': 'HarmonyOS',
        'line mini app': 'LINE Mini App',
        'kakao sdk': 'Kakao SDK',
        'naver oauth': 'Naver OAuth',
        'grab api': 'Grab API',
        'sea group': 'Sea Group',
        'stc pay': 'STC Pay',
        'benefit pay': 'Benefit Pay',
        'tap payments': 'Tap Payments',
        'm-pesa': 'M-Pesa',
        'mtn mobile money': 'MTN Mobile Money',
        'airtel money': 'Airtel Money',
        'chipper cash': 'Chipper Cash',
        'open banking europe': 'Open Banking Europe',
        'open finance brasil': 'Open Finance Brasil',
        'wi-fi alliance': 'Wi-Fi Alliance',
        'bluetooth sig': 'Bluetooth SIG',
        'zigbee alliance': 'Zigbee Alliance',
        'matter standard': 'Matter Standard',
    }

    # ── Run multi-word matching ────────────────────────────────────────
    for pattern, canonical in multi_word_skills.items():
        # Use word-boundary-aware regex for accurate matching
        escaped = re.escape(pattern)
        if re.search(r'(?<![a-z0-9])' + escaped + r'(?![a-z0-9])', text_lower):
            found_skills.add(canonical)

    # ──────────────────────────────────────────────────────────────────
    # STEP 2 ─ SINGLE-WORD & ABBREVIATION SKILLS
    # Maps lowercase token → display name
    # ──────────────────────────────────────────────────────────────────
    single_word_skills: Dict[str, str] = {

        # ── Languages ─────────────────────────────────────────────────
        'python': 'Python', 'java': 'Java', 'javascript': 'JavaScript',
        'typescript': 'TypeScript', 'go': 'Go', 'golang': 'Go',
        'rust': 'Rust', 'ruby': 'Ruby', 'php': 'PHP', 'swift': 'Swift',
        'kotlin': 'Kotlin', 'scala': 'Scala', 'perl': 'Perl',
        'matlab': 'MATLAB', 'haskell': 'Haskell', 'erlang': 'Erlang',
        'elixir': 'Elixir', 'clojure': 'Clojure', 'ocaml': 'OCaml',
        'lisp': 'Lisp', 'scheme': 'Scheme', 'racket': 'Racket',
        'prolog': 'Prolog', 'coq': 'Coq', 'agda': 'Agda',
        'idris': 'Idris', 'purescript': 'PureScript', 'elm': 'Elm',
        'assembly': 'Assembly', 'fortran': 'Fortran', 'cobol': 'COBOL',
        'ada': 'Ada', 'pascal': 'Pascal', 'delphi': 'Delphi',
        'zig': 'Zig', 'nim': 'Nim', 'verilog': 'Verilog',
        'vhdl': 'VHDL', 'systemverilog': 'SystemVerilog',
        'chisel': 'Chisel', 'oberon': 'Oberon', 'simula': 'Simula',
        'bash': 'Bash', 'zsh': 'Zsh', 'fish': 'Fish',
        'powershell': 'PowerShell', 'tcl': 'Tcl', 'awk': 'AWK',
        'sed': 'Sed', 'lua': 'Lua', 'julia': 'Julia',
        'sas': 'SAS', 'spss': 'SPSS', 'stata': 'Stata',
        'octave': 'Octave', 'mathematica': 'Mathematica',
        'wolfram': 'Wolfram', 'maxima': 'Maxima',
        'groovy': 'Groovy', 'coldfusion': 'ColdFusion',
        'abap': 'ABAP', 'vba': 'VBA', 'foxpro': 'FoxPro',
        'delphi': 'Delphi', 'solidity': 'Solidity', 'vyper': 'Vyper',
        'move': 'Move', 'cairo': 'Cairo', 'clarity': 'Clarity',
        'mojo': 'Mojo', 'gleam': 'Gleam', 'roc': 'Roc',
        'grain': 'Grain', 'ballerina': 'Ballerina', 'crystal': 'Crystal',
        'hack': 'Hack', 'cython': 'Cython', 'jython': 'Jython',
        'haxe': 'Haxe', 'tinygo': 'TinyGo', 'micropython': 'MicroPython',
        'circuitpython': 'CircuitPython',

        # ── Web Frontend ──────────────────────────────────────────────
        'html': 'HTML', 'html5': 'HTML5', 'css': 'CSS', 'css3': 'CSS3',
        'sass': 'Sass', 'scss': 'SCSS', 'less': 'Less', 'stylus': 'Stylus',
        'postcss': 'PostCSS', 'react': 'React', 'angular': 'Angular',
        'vue': 'Vue', 'svelte': 'Svelte', 'solid': 'Solid',
        'qwik': 'Qwik', 'preact': 'Preact', 'inferno': 'Inferno',
        'lit': 'Lit', 'stencil': 'Stencil', 'stimulus': 'Stimulus',
        'htmx': 'HTMX', 'mithril': 'Mithril', 'aurelia': 'Aurelia',
        'marko': 'Marko', 'hyperapp': 'Hyperapp',
        'nuxt': 'Nuxt', 'sveltekit': 'SvelteKit', 'remix': 'Remix',
        'gatsby': 'Gatsby', 'astro': 'Astro', 'eleventy': 'Eleventy',
        'jekyll': 'Jekyll', 'hugo': 'Hugo', 'hexo': 'Hexo',
        'vitepress': 'VitePress', 'gridsome': 'Gridsome',
        'bootstrap': 'Bootstrap', 'bulma': 'Bulma',
        'foundation': 'Foundation', 'materialize': 'Materialize',
        'mantine': 'Mantine', 'nextui': 'NextUI', 'tremor': 'Tremor',
        'daisyui': 'DaisyUI', 'flowbite': 'Flowbite',
        'webpack': 'Webpack', 'rollup': 'Rollup', 'parcel': 'Parcel',
        'esbuild': 'esbuild', 'vite': 'Vite', 'turbopack': 'Turbopack',
        'rspack': 'Rspack', 'babel': 'Babel', 'swc': 'SWC', 'bun': 'Bun',
        'redux': 'Redux', 'zustand': 'Zustand', 'mobx': 'MobX',
        'recoil': 'Recoil', 'jotai': 'Jotai', 'xstate': 'XState',
        'nanostores': 'Nanostores', 'valtio': 'Valtio',
        'pinia': 'Pinia', 'vuex': 'Vuex', 'ngrx': 'NgRx', 'ngxs': 'NGXS',
        'akita': 'Akita', 'swr': 'SWR', 'urql': 'URQL', 'relay': 'Relay',
        'jest': 'Jest', 'vitest': 'Vitest', 'cypress': 'Cypress',
        'playwright': 'Playwright', 'puppeteer': 'Puppeteer',
        'selenium': 'Selenium', 'storybook': 'Storybook',
        'chromatic': 'Chromatic', 'percy': 'Percy', 'applitools': 'Applitools',
        'nightwatch': 'Nightwatch', 'testcafe': 'TestCafe', 'ava': 'Ava',
        'gsap': 'GSAP', 'lottie': 'Lottie',
        'd3': 'D3.js', 'recharts': 'Recharts', 'victory': 'Victory',
        'nivo': 'Nivo', 'visx': 'Visx', 'highcharts': 'Highcharts',
        'echarts': 'ECharts', 'apexcharts': 'ApexCharts',
        'pixi': 'Pixi.js', 'konva': 'Konva', 'webgl': 'WebGL',
        'webgpu': 'WebGPU', 'i18next': 'i18next', 'lingui': 'Lingui',
        'workbox': 'Workbox', 'pwa': 'PWA',

        # ── Web Backend ───────────────────────────────────────────────
        'nodejs': 'Node.js', 'express': 'Express', 'fastify': 'Fastify',
        'nestjs': 'NestJS', 'hapi': 'Hapi', 'koa': 'Koa',
        'adonis': 'AdonisJS', 'strapi': 'Strapi', 'keystone': 'Keystone',
        'directus': 'Directus', 'feathers': 'FeathersJS',
        'loopback': 'LoopBack', 'restify': 'Restify', 'polka': 'Polka',
        'django': 'Django', 'flask': 'Flask', 'fastapi': 'FastAPI',
        'tornado': 'Tornado', 'pyramid': 'Pyramid', 'sanic': 'Sanic',
        'starlette': 'Starlette', 'litestar': 'Litestar',
        'aiohttp': 'aiohttp', 'bottle': 'Bottle', 'falcon': 'Falcon',
        'cherrypy': 'CherryPy', 'web2py': 'web2py', 'nameko': 'Nameko',
        'robyn': 'Robyn',
        'rails': 'Rails', 'sinatra': 'Sinatra', 'hanami': 'Hanami',
        'grape': 'Grape', 'roda': 'Roda', 'padrino': 'Padrino',
        'laravel': 'Laravel', 'symfony': 'Symfony',
        'codeigniter': 'CodeIgniter', 'yii': 'Yii', 'slim': 'Slim',
        'lumen': 'Lumen', 'phalcon': 'Phalcon', 'cakephp': 'CakePHP',
        'wordpress': 'WordPress', 'drupal': 'Drupal', 'joomla': 'Joomla',
        'magento': 'Magento', 'prestashop': 'PrestaShop',
        'opencart': 'OpenCart',
        'spring': 'Spring', 'quarkus': 'Quarkus', 'micronaut': 'Micronaut',
        'grails': 'Grails', 'javalin': 'Javalin', 'ktor': 'Ktor',
        'helidon': 'Helidon', 'dropwizard': 'Dropwizard',
        'jersey': 'Jersey', 'resteasy': 'RESTEasy',
        'blazor': 'Blazor', 'signalr': 'SignalR', 'dapr': 'Dapr',
        'orleans': 'Orleans',
        'gin': 'Gin', 'echo': 'Echo', 'fiber': 'Fiber', 'chi': 'Chi',
        'beego': 'Beego', 'buffalo': 'Buffalo', 'iris': 'Iris',
        'revel': 'Revel', 'goji': 'Goji',
        'actix': 'Actix', 'axum': 'Axum', 'rocket': 'Rocket',
        'warp': 'Warp', 'poem': 'Poem', 'tide': 'Tide', 'salvo': 'Salvo',
        'phoenix': 'Phoenix', 'plug': 'Plug', 'cowboy': 'Cowboy',
        'nerves': 'Nerves', 'scotty': 'Scotty', 'yesod': 'Yesod',
        'tapir': 'Tapir',
        'grpc': 'gRPC', 'trpc': 'tRPC', 'soap': 'SOAP', 'odata': 'OData',
        'swagger': 'Swagger', 'openapi': 'OpenAPI', 'websocket': 'WebSocket',
        'webhook': 'Webhook', 'graphql': 'GraphQL', 'restful': 'RESTful',
        'contentful': 'Contentful', 'sanity': 'Sanity', 'ghost': 'Ghost',
        'prismic': 'Prismic', 'storyblok': 'Storyblok',

        # ── Database ──────────────────────────────────────────────────
        'sql': 'SQL', 'mysql': 'MySQL', 'postgresql': 'PostgreSQL',
        'postgres': 'PostgreSQL', 'sqlite': 'SQLite', 'mariadb': 'MariaDB',
        'oracle': 'Oracle', 'teradata': 'Teradata', 'sybase': 'Sybase',
        'informix': 'Informix', 'cockroachdb': 'CockroachDB',
        'tidb': 'TiDB', 'yugabytedb': 'YugabyteDB', 'neon': 'Neon',
        'planetscale': 'PlanetScale', 'vitess': 'Vitess',
        'proxysql': 'ProxySQL', 'pgbouncer': 'PgBouncer',
        'percona': 'Percona', 'sap': 'SAP HANA', 'spanner': 'Spanner',
        'supabase': 'Supabase', 'turso': 'Turso', 'xata': 'Xata',
        'fauna': 'Fauna', 'singlestore': 'SingleStore',
        'mongodb': 'MongoDB', 'firestore': 'Firestore',
        'couchdb': 'CouchDB', 'couchbase': 'Couchbase',
        'ravendb': 'RavenDB', 'documentdb': 'DocumentDB',
        'pouchdb': 'PouchDB', 'realm': 'Realm',
        'redis': 'Redis', 'memcached': 'Memcached', 'etcd': 'etcd',
        'riak': 'Riak', 'aerospike': 'Aerospike', 'dragonfly': 'Dragonfly',
        'keydb': 'KeyDB', 'garnet': 'Garnet', 'valkey': 'Valkey',
        'cassandra': 'Cassandra', 'hbase': 'HBase', 'bigtable': 'Bigtable',
        'scylladb': 'ScyllaDB', 'dynamodb': 'DynamoDB',
        'elasticsearch': 'Elasticsearch', 'opensearch': 'OpenSearch',
        'solr': 'Solr', 'meilisearch': 'Meilisearch',
        'typesense': 'Typesense', 'algolia': 'Algolia',
        'neo4j': 'Neo4j', 'dgraph': 'Dgraph', 'tigergraph': 'TigerGraph',
        'arangodb': 'ArangoDB', 'janusgraph': 'JanusGraph',
        'hugegraph': 'HugeGraph', 'memgraph': 'Memgraph',
        'terminusdb': 'TerminusDB',
        'influxdb': 'InfluxDB', 'timescaledb': 'TimescaleDB',
        'questdb': 'QuestDB', 'victoriametrics': 'VictoriaMetrics',
        'clickhouse': 'ClickHouse', 'tdengine': 'TDengine',
        'opentsdb': 'OpenTSDB', 'griddb': 'GridDB',
        'pinecone': 'Pinecone', 'weaviate': 'Weaviate', 'qdrant': 'Qdrant',
        'chroma': 'Chroma', 'milvus': 'Milvus', 'pgvector': 'pgvector',
        'faiss': 'FAISS', 'annoy': 'Annoy', 'hnswlib': 'HNSWLib',
        'vald': 'Vald', 'vespa': 'Vespa', 'marqo': 'Marqo',
        'zilliz': 'Zilliz', 'turbopuffer': 'Turbopuffer', 'lancedb': 'LanceDB',
        'sqlalchemy': 'SQLAlchemy', 'alembic': 'Alembic', 'prisma': 'Prisma',
        'drizzle': 'Drizzle', 'typeorm': 'TypeORM', 'sequelize': 'Sequelize',
        'knex': 'Knex', 'objection': 'Objection', 'mikro-orm': 'MikroORM',
        'bookshelf': 'Bookshelf', 'mongoose': 'Mongoose',
        'eloquent': 'Eloquent', 'dapper': 'Dapper', 'gorm': 'GORM',
        'sqlx': 'sqlx', 'diesel': 'Diesel', 'hibernate': 'Hibernate',
        'jpa': 'JPA', 'querydsl': 'QueryDSL', 'mybatis': 'MyBatis',
        'avro': 'Avro', 'parquet': 'Parquet', 'orc': 'ORC',
        'arrow': 'Apache Arrow', 'protobuf': 'Protobuf',
        'flatbuffers': 'FlatBuffers',

        # ── Cloud ─────────────────────────────────────────────────────
        'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP',
        'ec2': 'EC2', 'lambda': 'Lambda', 's3': 'S3', 'rds': 'RDS',
        'ecs': 'ECS', 'eks': 'EKS', 'fargate': 'Fargate',
        'cloudfront': 'CloudFront', 'route53': 'Route 53', 'vpc': 'VPC',
        'iam': 'IAM', 'cloudwatch': 'CloudWatch', 'cloudtrail': 'CloudTrail',
        'sqs': 'SQS', 'sns': 'SNS', 'ses': 'SES', 'kinesis': 'Kinesis',
        'glue': 'Glue', 'athena': 'Athena', 'redshift': 'Redshift',
        'sagemaker': 'SageMaker', 'bedrock': 'Bedrock',
        'eventbridge': 'EventBridge', 'appsync': 'AppSync',
        'cognito': 'Cognito', 'elasticache': 'ElastiCache',
        'aurora': 'Aurora', 'timestream': 'Timestream',
        'msk': 'MSK', 'emr': 'EMR', 'batch': 'Batch',
        'lightsail': 'Lightsail',
        'heroku': 'Heroku', 'digitalocean': 'DigitalOcean',
        'render': 'Render', 'railway': 'Railway', 'vercel': 'Vercel',
        'netlify': 'Netlify', 'cloudflare': 'Cloudflare',
        'linode': 'Linode', 'akamai': 'Akamai', 'vultr': 'Vultr',
        'hetzner': 'Hetzner', 'ovh': 'OVH', 'scaleway': 'Scaleway',
        'ionos': 'IONOS', 'contabo': 'Contabo', 'upcloud': 'UpCloud',
        'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
        'k3s': 'K3s', 'k3d': 'K3d', 'kind': 'Kind', 'minikube': 'Minikube',
        'helm': 'Helm', 'kustomize': 'Kustomize', 'flux': 'Flux',
        'rancher': 'Rancher', 'openshift': 'OpenShift', 'podman': 'Podman',
        'containerd': 'Containerd', 'buildah': 'Buildah', 'kaniko': 'Kaniko',
        'terraform': 'Terraform', 'opentofu': 'OpenTofu', 'pulumi': 'Pulumi',
        'ansible': 'Ansible', 'chef': 'Chef', 'puppet': 'Puppet',
        'saltstack': 'SaltStack', 'cloudformation': 'CloudFormation',
        'sam': 'SAM', 'cdk': 'CDK', 'bicep': 'Bicep',
        'crossplane': 'Crossplane', 'vagrant': 'Vagrant', 'packer': 'Packer',
        'istio': 'Istio', 'linkerd': 'Linkerd', 'consul': 'Consul',
        'envoy': 'Envoy', 'nginx': 'NGINX', 'traefik': 'Traefik',
        'haproxy': 'HAProxy', 'caddy': 'Caddy', 'kong': 'Kong',
        'tyk': 'Tyk', 'cilium': 'Cilium', 'calico': 'Calico',
        'flannel': 'Flannel',
        'jenkins': 'Jenkins', 'circleci': 'CircleCI', 'teamcity': 'TeamCity',
        'bamboo': 'Bamboo', 'tekton': 'Tekton', 'spinnaker': 'Spinnaker',
        'concourse': 'Concourse', 'harness': 'Harness',
        'codefresh': 'Codefresh', 'buildkite': 'Buildkite',
        'prometheus': 'Prometheus', 'grafana': 'Grafana', 'datadog': 'Datadog',
        'newrelic': 'New Relic', 'dynatrace': 'Dynatrace', 'splunk': 'Splunk',
        'jaeger': 'Jaeger', 'zipkin': 'Zipkin', 'opentelemetry': 'OpenTelemetry',
        'otel': 'OpenTelemetry', 'pagerduty': 'PagerDuty',
        'opsgenie': 'OpsGenie', 'alertmanager': 'AlertManager',
        'honeycomb': 'Honeycomb', 'lightstep': 'Lightstep',
        'instana': 'Instana', 'checkly': 'Checkly', 'pingdom': 'Pingdom',
        'minio': 'MinIO', 'backblaze': 'Backblaze', 'wasabi': 'Wasabi',
        'storj': 'Storj',

        # ── DevOps & Tools ────────────────────────────────────────────
        'git': 'Git', 'github': 'GitHub', 'gitlab': 'GitLab',
        'bitbucket': 'Bitbucket', 'gitea': 'Gitea', 'gogs': 'Gogs',
        'forgejo': 'Forgejo', 'mercurial': 'Mercurial', 'svn': 'SVN',
        'perforce': 'Perforce',
        'jira': 'Jira', 'trello': 'Trello', 'asana': 'Asana',
        'notion': 'Notion', 'linear': 'Linear', 'shortcut': 'Shortcut',
        'clickup': 'ClickUp', 'basecamp': 'Basecamp',
        'confluence': 'Confluence', 'youtrack': 'YouTrack',
        'slack': 'Slack', 'discord': 'Discord', 'zoom': 'Zoom',
        'webex': 'Webex', 'whereby': 'Whereby', 'gather': 'Gather',
        'mattermost': 'Mattermost', 'twist': 'Twist', 'flock': 'Flock',
        'lark': 'Lark', 'dingtalk': 'DingTalk', 'wecom': 'WeCom',
        'intellij': 'IntelliJ', 'eclipse': 'Eclipse', 'vim': 'Vim',
        'neovim': 'Neovim', 'emacs': 'Emacs', 'atom': 'Atom',
        'webstorm': 'WebStorm', 'pycharm': 'PyCharm', 'rider': 'Rider',
        'clion': 'CLion', 'goland': 'GoLand', 'rubymine': 'RubyMine',
        'datagrip': 'DataGrip', 'xcode': 'Xcode', 'cursor': 'Cursor',
        'windsurf': 'Windsurf', 'zed': 'Zed', 'lapce': 'Lapce',
        'helix': 'Helix', 'nova': 'Nova',
        'linux': 'Linux', 'ubuntu': 'Ubuntu', 'debian': 'Debian',
        'centos': 'CentOS', 'rhel': 'RHEL', 'fedora': 'Fedora',
        'nixos': 'NixOS', 'gentoo': 'Gentoo', 'manjaro': 'Manjaro',
        'freebsd': 'FreeBSD', 'openbsd': 'OpenBSD', 'solaris': 'Solaris',
        'macos': 'macOS', 'windows': 'Windows',
        'postman': 'Postman', 'insomnia': 'Insomnia', 'hoppscotch': 'Hoppscotch',
        'bruno': 'Bruno', 'httpie': 'HTTPie', 'curl': 'cURL', 'wget': 'wget',
        'zapier': 'Zapier', 'make': 'Make (Integromat)', 'n8n': 'n8n',
        'pipedream': 'Pipedream', 'workato': 'Workato', 'boomi': 'Boomi',
        'mulesoft': 'MuleSoft', 'wso2': 'WSO2', 'apigee': 'Apigee',
        'junit': 'JUnit', 'testng': 'TestNG', 'pytest': 'pytest',
        'mocha': 'Mocha', 'chai': 'Chai', 'jasmine': 'Jasmine',
        'karma': 'Karma', 'cucumber': 'Cucumber', 'behave': 'Behave',
        'specflow': 'SpecFlow', 'appium': 'Appium', 'webdriverio': 'WebdriverIO',
        'robotframework': 'Robot Framework', 'karate': 'Karate',
        'k6': 'k6', 'locust': 'Locust', 'gatling': 'Gatling',
        'jmeter': 'JMeter', 'artillery': 'Artillery', 'wrk': 'wrk',
        'sonarqube': 'SonarQube', 'sonarcloud': 'SonarCloud',
        'codeclimate': 'Code Climate', 'deepsource': 'DeepSource',
        'codacy': 'Codacy', 'eslint': 'ESLint', 'prettier': 'Prettier',
        'pylint': 'Pylint', 'flake8': 'Flake8', 'ruff': 'Ruff',
        'mypy': 'mypy', 'pyright': 'Pyright', 'black': 'Black',
        'isort': 'isort', 'rubocop': 'RuboCop', 'checkstyle': 'Checkstyle',
        'spotbugs': 'SpotBugs', 'pmd': 'PMD', 'coverity': 'Coverity',
        'veracode': 'Veracode', 'snyk': 'Snyk', 'dependabot': 'Dependabot',
        'renovate': 'Renovate', 'fossa': 'FOSSA', 'trivy': 'Trivy',
        'grype': 'Grype', 'syft': 'Syft', 'checkov': 'Checkov',
        'semgrep': 'Semgrep',
        'logstash': 'Logstash', 'kibana': 'Kibana', 'fluentd': 'Fluentd',
        'fluentbit': 'Fluent Bit', 'loki': 'Loki', 'graylog': 'Graylog',
        'papertrail': 'Papertrail', 'loggly': 'Loggly',
        'npm': 'npm', 'yarn': 'Yarn', 'pnpm': 'pnpm', 'pip': 'pip',
        'pipenv': 'Pipenv', 'poetry': 'Poetry', 'pdm': 'PDM',
        'conda': 'Conda', 'mamba': 'Mamba', 'cargo': 'Cargo',
        'maven': 'Maven', 'gradle': 'Gradle', 'sbt': 'sbt',
        'bazel': 'Bazel', 'buck': 'Buck', 'pants': 'Pants',
        'composer': 'Composer', 'nuget': 'NuGet', 'gem': 'RubyGems',
        'bundler': 'Bundler', 'brew': 'Homebrew', 'apt': 'apt',
        'yum': 'yum', 'dnf': 'dnf', 'pacman': 'pacman', 'nix': 'Nix',
        'markdown': 'Markdown', 'mdx': 'MDX', 'rst': 'reStructuredText',
        'docusaurus': 'Docusaurus', 'mkdocs': 'MkDocs', 'sphinx': 'Sphinx',
        'gitbook': 'GitBook', 'typedoc': 'TypeDoc', 'jsdoc': 'JSDoc',

        # ── Data Science & ML ─────────────────────────────────────────
        'numpy': 'NumPy', 'pandas': 'Pandas', 'scipy': 'SciPy',
        'sympy': 'SymPy', 'statsmodels': 'Statsmodels',
        'matplotlib': 'Matplotlib', 'seaborn': 'Seaborn',
        'plotly': 'Plotly', 'bokeh': 'Bokeh', 'altair': 'Altair',
        'dash': 'Dash', 'streamlit': 'Streamlit', 'gradio': 'Gradio',
        'panel': 'Panel', 'holoviews': 'HoloViews', 'hvplot': 'hvPlot',
        'datashader': 'Datashader', 'folium': 'Folium',
        'geopandas': 'GeoPandas', 'cartopy': 'Cartopy',
        'sklearn': 'Scikit-Learn', 'xgboost': 'XGBoost',
        'lightgbm': 'LightGBM', 'catboost': 'CatBoost',
        'h2o': 'H2O', 'pycaret': 'PyCaret', 'autogluon': 'AutoGluon',
        'optuna': 'Optuna', 'hyperopt': 'Hyperopt', 'nni': 'NNI',
        'tensorflow': 'TensorFlow', 'keras': 'Keras',
        'pytorch': 'PyTorch', 'torch': 'PyTorch', 'jax': 'JAX',
        'flax': 'Flax', 'haiku': 'Haiku', 'equinox': 'Equinox',
        'optax': 'Optax', 'paddle': 'PaddlePaddle', 'mxnet': 'MXNet',
        'onnx': 'ONNX', 'onnxruntime': 'ONNX Runtime',
        'openvino': 'OpenVINO', 'tensorrt': 'TensorRT',
        'tflite': 'TensorFlow Lite', 'coreml': 'CoreML', 'caffe': 'Caffe',
        'spacy': 'spaCy', 'nltk': 'NLTK', 'gensim': 'Gensim',
        'fasttext': 'FastText', 'bert': 'BERT', 'roberta': 'RoBERTa',
        'opencv': 'OpenCV', 'cv2': 'OpenCV', 'pillow': 'Pillow',
        'torchvision': 'TorchVision', 'timm': 'TIMM',
        'detectron2': 'Detectron2', 'yolo': 'YOLO', 'yolov8': 'YOLOv8',
        'ultralytics': 'Ultralytics', 'roboflow': 'Roboflow',
        'albumentations': 'Albumentations', 'kornia': 'Kornia',
        'sam': 'SAM', 'mlflow': 'MLflow', 'kubeflow': 'Kubeflow',
        'metaflow': 'Metaflow', 'wandb': 'W&B', 'neptune': 'Neptune.ai',
        'clearml': 'ClearML', 'dvc': 'DVC', 'bentoml': 'BentoML',
        'seldon': 'Seldon', 'triton': 'Triton', 'zenml': 'ZenML',
        'evidently': 'Evidently', 'feast': 'Feast', 'tecton': 'Tecton',
        'hopsworks': 'Hopsworks',
        'airflow': 'Airflow', 'prefect': 'Prefect', 'dagster': 'Dagster',
        'kedro': 'Kedro', 'luigi': 'Luigi', 'flyte': 'Flyte',
        'mage': 'Mage',
        'pyspark': 'PySpark', 'kafka': 'Kafka', 'flink': 'Flink',
        'hadoop': 'Hadoop', 'hive': 'Hive', 'nifi': 'NiFi',
        'dask': 'Dask', 'ray': 'Ray', 'modin': 'Modin', 'vaex': 'Vaex',
        'polars': 'Polars', 'duckdb': 'DuckDB', 'ibis': 'Ibis',
        'pyarrow': 'PyArrow',
        'dbt': 'dbt', 'fivetran': 'Fivetran', 'airbyte': 'Airbyte',
        'stitch': 'Stitch', 'matillion': 'Matillion', 'talend': 'Talend',
        'informatica': 'Informatica', 'pentaho': 'Pentaho',
        'snowflake': 'Snowflake', 'databricks': 'Databricks',
        'bigquery': 'BigQuery', 'synapse': 'Synapse', 'firebolt': 'Firebolt',
        'dremio': 'Dremio', 'starburst': 'Starburst', 'trino': 'Trino',
        'presto': 'Presto', 'impala': 'Impala',
        'tableau': 'Tableau', 'looker': 'Looker', 'metabase': 'Metabase',
        'qlik': 'Qlik', 'microstrategy': 'MicroStrategy',
        'thoughtspot': 'ThoughtSpot', 'sigma': 'Sigma',
        'jupyter': 'Jupyter', 'kaggle': 'Kaggle', 'deepnote': 'Deepnote',
        'hex': 'Hex', 'observable': 'Observable',

        # ── AI & GenAI ────────────────────────────────────────────────
        'openai': 'OpenAI', 'anthropic': 'Anthropic',
        'gemini': 'Gemini', 'mistral': 'Mistral', 'cohere': 'Cohere',
        'grok': 'Grok', 'groq': 'Groq', 'replicate': 'Replicate',
        'perplexity': 'Perplexity', 'fireworks': 'Fireworks AI',
        'langchain': 'LangChain', 'llamaindex': 'LlamaIndex',
        'haystack': 'Haystack', 'autogen': 'AutoGen', 'crewai': 'CrewAI',
        'dspy': 'DSPy', 'guidance': 'Guidance', 'instructor': 'Instructor',
        'outlines': 'Outlines', 'marvin': 'Marvin', 'langfuse': 'Langfuse',
        'langsmith': 'LangSmith', 'trulens': 'TruLens', 'ragas': 'RAGAS',
        'deepeval': 'DeepEval',
        'midjourney': 'Midjourney', 'flux': 'Flux', 'firefly': 'Firefly',
        'ideogram': 'Ideogram', 'controlnet': 'ControlNet',
        'comfyui': 'ComfyUI', 'fooocus': 'Fooocus',
        'sora': 'Sora', 'runway': 'Runway', 'pika': 'Pika', 'kling': 'Kling',
        'haiper': 'Haiper', 'vidu': 'Vidu', 'veo': 'Veo',
        'whisper': 'Whisper', 'elevenlabs': 'ElevenLabs', 'bark': 'Bark',
        'suno': 'Suno', 'udio': 'Udio', 'musicgen': 'MusicGen',
        'voiceflow': 'Voiceflow', 'deepgram': 'Deepgram', 'gladia': 'Gladia',
        'rag': 'RAG', 'llama': 'LLaMA', 'llama2': 'LLaMA 2',
        'llama3': 'LLaMA 3', 'falcon': 'Falcon', 'phi': 'Phi',
        'qwen': 'Qwen', 'deepseek': 'DeepSeek', 'yi': 'Yi',
        'stablelm': 'StableLM', 'bloom': 'BLOOM', 'vicuna': 'Vicuna',
        'alpaca': 'Alpaca', 'zephyr': 'Zephyr',
        'rlhf': 'RLHF', 'dpo': 'DPO', 'peft': 'PEFT', 'qlora': 'QLoRA',
        'lora': 'LoRA', 'quantization': 'Quantization', 'gguf': 'GGUF',
        'ggml': 'GGML', 'awq': 'AWQ', 'gptq': 'GPTQ',
        'ollama': 'Ollama', 'vllm': 'vLLM',
        'cerebrals': 'Cerebras', 'graphcore': 'Graphcore',

        # ── Cybersecurity ─────────────────────────────────────────────
        'metasploit': 'Metasploit', 'nmap': 'Nmap', 'masscan': 'Masscan',
        'rustscan': 'RustScan', 'gobuster': 'Gobuster', 'ffuf': 'ffuf',
        'nikto': 'Nikto', 'sqlmap': 'SQLMap', 'xsser': 'XSSer',
        'hydra': 'Hydra', 'hashcat': 'Hashcat',
        'aircrack': 'Aircrack-ng', 'wifite': 'Wifite', 'beef': 'BeEF',
        'responder': 'Responder', 'impacket': 'Impacket',
        'bloodhound': 'BloodHound', 'crackmapexec': 'CrackMapExec',
        'sliver': 'Sliver', 'covenant': 'Covenant',
        'wireshark': 'Wireshark', 'tcpdump': 'Tcpdump',
        'zeek': 'Zeek', 'snort': 'Snort', 'suricata': 'Suricata',
        'ossec': 'OSSEC', 'wazuh': 'Wazuh', 'velociraptor': 'Velociraptor',
        'osquery': 'osquery', 'sysmon': 'Sysmon', 'autopsy': 'Autopsy',
        'volatility': 'Volatility', 'foremost': 'Foremost',
        'binwalk': 'Binwalk', 'ghidra': 'Ghidra', 'radare2': 'Radare2',
        'cutter': 'Cutter',
        'nessus': 'Nessus', 'qualys': 'Qualys', 'rapid7': 'Rapid7',
        'tenable': 'Tenable', 'openvas': 'OpenVAS',
        'checkmarx': 'Checkmarx', 'fortify': 'Fortify',
        'bandit': 'Bandit', 'codeql': 'CodeQL',
        'oauth': 'OAuth', 'oidc': 'OIDC', 'saml': 'SAML', 'ldap': 'LDAP',
        'keycloak': 'Keycloak', 'okta': 'Okta', 'auth0': 'Auth0',
        'cognito': 'Cognito', 'cyberark': 'CyberArk', 'vault': 'HashiCorp Vault',
        'ssl': 'SSL', 'tls': 'TLS', 'aes': 'AES', 'rsa': 'RSA',
        'pgp': 'PGP', 'gpg': 'GPG', 'jwt': 'JWT', 'mtls': 'mTLS',
        'pki': 'PKI', 'certbot': 'Certbot', 'hsm': 'HSM',
        'cve': 'CVE', 'cvss': 'CVSS', 'cwe': 'CWE',
        'gdpr': 'GDPR', 'hipaa': 'HIPAA', 'ccpa': 'CCPA',
        'nist': 'NIST', 'fedramp': 'FedRAMP', 'fisma': 'FISMA',
        'cobit': 'COBIT', 'itil': 'ITIL', 'pdpa': 'PDPA',
        'lgpd': 'LGPD', 'pipeda': 'PIPEDA',
        'cspm': 'CSPM', 'cwpp': 'CWPP', 'cnapp': 'CNAPP',
        'casb': 'CASB', 'sspm': 'SSPM', 'ciem': 'CIEM',
        'wiz': 'Wiz', 'lacework': 'Lacework', 'falco': 'Falco',
        'crowdstrike': 'CrowdStrike', 'sentinelone': 'SentinelOne',
        'siem': 'SIEM', 'soar': 'SOAR', 'devsecops': 'DevSecOps',
        'appsec': 'AppSec', 'soc': 'SOC',

        # ── Blockchain ────────────────────────────────────────────────
        'ethereum': 'Ethereum', 'bitcoin': 'Bitcoin', 'solana': 'Solana',
        'polygon': 'Polygon', 'avalanche': 'Avalanche', 'cardano': 'Cardano',
        'polkadot': 'Polkadot', 'cosmos': 'Cosmos', 'near': 'NEAR',
        'tezos': 'Tezos', 'algorand': 'Algorand', 'aptos': 'Aptos',
        'sui': 'Sui', 'sei': 'Sei', 'monad': 'Monad', 'ton': 'TON',
        'tron': 'TRON', 'hedera': 'Hedera', 'stellar': 'Stellar',
        'ripple': 'Ripple',
        'optimism': 'Optimism', 'arbitrum': 'Arbitrum', 'base': 'Base',
        'zksync': 'zkSync', 'starknet': 'StarkNet', 'linea': 'Linea',
        'scroll': 'Scroll', 'mantle': 'Mantle', 'blast': 'Blast',
        'taiko': 'Taiko', 'loopring': 'Loopring',
        'hardhat': 'Hardhat', 'truffle': 'Truffle', 'foundry': 'Foundry',
        'brownie': 'Brownie', 'anchor': 'Anchor',
        'wagmi': 'wagmi', 'viem': 'viem', 'thirdweb': 'thirdweb',
        'moralis': 'Moralis', 'alchemy': 'Alchemy', 'quicknode': 'QuickNode',
        'infura': 'Infura', 'chainstack': 'Chainstack',
        'uniswap': 'Uniswap', 'aave': 'Aave', 'compound': 'Compound',
        'curve': 'Curve', 'balancer': 'Balancer', 'maker': 'MakerDAO',
        'lido': 'Lido', '1inch': '1inch', 'dydx': 'dYdX',
        'gmx': 'GMX', 'hyperliquid': 'Hyperliquid',
        'opensea': 'OpenSea', 'blur': 'Blur', 'zora': 'Zora',
        'metamask': 'MetaMask', 'walletconnect': 'WalletConnect',
        'phantom': 'Phantom', 'ledger': 'Ledger', 'trezor': 'Trezor',
        'chainlink': 'Chainlink', 'pyth': 'Pyth', 'ipfs': 'IPFS',
        'filecoin': 'Filecoin', 'arweave': 'Arweave', 'ceramic': 'Ceramic',
        'defi': 'DeFi', 'nft': 'NFT', 'dao': 'DAO', 'dapp': 'dApp',
        'eigenlayer': 'EigenLayer', 'flashbots': 'Flashbots',
        'mev': 'MEV', 'evm': 'EVM', 'substrate': 'Substrate',

        # ── Mobile ────────────────────────────────────────────────────
        'flutter': 'Flutter', 'xamarin': 'Xamarin', 'maui': 'MAUI',
        'expo': 'Expo', 'ionic': 'Ionic', 'capacitor': 'Capacitor',
        'cordova': 'Cordova', 'nativescript': 'NativeScript',
        'ios': 'iOS', 'swift': 'Swift', 'uikit': 'UIKit', 'xcode': 'Xcode',
        'arkit': 'ARKit', 'realitykit': 'RealityKit', 'scenekit': 'SceneKit',
        'spritekit': 'SpriteKit', 'createml': 'CreateML',
        'healthkit': 'HealthKit', 'homekit': 'HomeKit', 'mapkit': 'MapKit',
        'cloudkit': 'CloudKit', 'storekit': 'StoreKit', 'combine': 'Combine',
        'android': 'Android', 'kotlin': 'Kotlin', 'hilt': 'Hilt',
        'dagger': 'Dagger', 'koin': 'Koin', 'retrofit': 'Retrofit',
        'okhttp': 'OkHttp', 'glide': 'Glide', 'picasso': 'Picasso',
        'coil': 'Coil', 'viewmodel': 'ViewModel', 'livedata': 'LiveData',
        'coroutines': 'Coroutines', 'workmanager': 'WorkManager',
        'firebase': 'Firebase', 'supabase': 'Supabase',
        'appwrite': 'Appwrite', 'back4app': 'Back4App',
        'appsflyer': 'AppsFlyer', 'branch': 'Branch', 'adjust': 'Adjust',
        'braze': 'Braze', 'clevertap': 'CleverTap', 'moengage': 'MoEngage',
        'fastlane': 'Fastlane', 'bitrise': 'Bitrise', 'appcenter': 'AppCenter',
        'testflight': 'TestFlight', 'xctest': 'XCTest', 'espresso': 'Espresso',
        'detox': 'Detox', 'maestro': 'Maestro', 'instabug': 'Instabug',
        'bugsnag': 'Bugsnag', 'sentry': 'Sentry', 'embrace': 'Embrace',
        'razorpay': 'Razorpay', 'paytm': 'Paytm',

        # ── IoT & Embedded ────────────────────────────────────────────
        'arduino': 'Arduino', 'esp32': 'ESP32', 'esp8266': 'ESP8266',
        'stm32': 'STM32', 'risc-v': 'RISC-V',
        'beaglebone': 'BeagleBone',
        'mqtt': 'MQTT', 'coap': 'CoAP', 'amqp': 'AMQP', 'xmpp': 'XMPP',
        'zigbee': 'Zigbee', 'zwave': 'Z-Wave', 'bluetooth': 'Bluetooth',
        'ble': 'Bluetooth LE', 'lorawan': 'LoRaWAN', 'lora': 'LoRa',
        'sigfox': 'Sigfox', 'nbiot': 'NB-IoT',
        'modbus': 'Modbus', 'profibus': 'PROFIBUS', 'profinet': 'PROFINET',
        'ethercat': 'EtherCAT', 'devicenet': 'DeviceNet',
        'matter': 'Matter', 'thread': 'Thread', 'openthread': 'OpenThread',
        'thingsboard': 'ThingsBoard', 'balena': 'Balena', 'particle': 'Particle',
        'tuya': 'Tuya', 'espidf': 'ESP-IDF',
        'freertos': 'FreeRTOS', 'zephyr': 'Zephyr', 'riotos': 'RIOT OS',
        'threadx': 'ThreadX', 'vxworks': 'VxWorks', 'contiki': 'Contiki',
        'mbed': 'Mbed OS', 'nuttx': 'NuttX', 'rtems': 'RTEMS',
        'scada': 'SCADA', 'hmi': 'HMI', 'mes': 'MES',

        # ── Game Development ──────────────────────────────────────────
        'unity': 'Unity', 'godot': 'Godot', 'cryengine': 'CryEngine',
        'cocos2d': 'Cocos2D', 'defold': 'Defold', 'monogame': 'MonoGame',
        'pygame': 'Pygame', 'pyxel': 'Pyxel', 'libgdx': 'libGDX',
        'love2d': 'LÖVE', 'phaser': 'Phaser',
        'playcanvas': 'PlayCanvas', 'rpgmaker': 'RPG Maker',
        'opengl': 'OpenGL', 'vulkan': 'Vulkan', 'directx': 'DirectX',
        'metal': 'Metal', 'webgl': 'WebGL', 'webgpu': 'WebGPU',
        'blender': 'Blender', 'maya': 'Maya', 'houdini': 'Houdini',
        'zbrush': 'ZBrush', 'speedtree': 'SpeedTree', 'modo': 'Modo',
        'fmod': 'FMOD', 'wwise': 'Wwise', 'openal': 'OpenAL',
        'physx': 'PhysX', 'havok': 'Havok', 'box2d': 'Box2D',
        'nakama': 'Nakama', 'colyseus': 'Colyseus', 'fishnet': 'FishNet',
        'steamworks': 'Steamworks', 'playfab': 'PlayFab',
        'lumen': 'Lumen', 'nanite': 'Nanite',
        'admob': 'AdMob', 'applovin': 'AppLovin', 'ironsource': 'IronSource',

        # ── Design ────────────────────────────────────────────────────
        'figma': 'Figma', 'sketch': 'Sketch', 'invision': 'InVision',
        'zeplin': 'Zeplin', 'framer': 'Framer', 'principle': 'Principle',
        'protopie': 'ProtoPie', 'marvel': 'Marvel', 'axure': 'Axure',
        'balsamiq': 'Balsamiq', 'whimsical': 'Whimsical', 'miro': 'Miro',
        'figjam': 'FigJam', 'mural': 'MURAL', 'lucidchart': 'Lucidchart',
        'excalidraw': 'Excalidraw',
        'photoshop': 'Photoshop', 'illustrator': 'Illustrator',
        'canva': 'Canva', 'inkscape': 'Inkscape', 'gimp': 'GIMP',
        'krita': 'Krita', 'procreate': 'Procreate', 'aseprite': 'Aseprite',
        'pixlr': 'Pixlr', 'photopea': 'Photopea',
        'spline': 'Spline', 'rive': 'Rive', 'cavalry': 'Cavalry',
        'webflow': 'Webflow', 'wix': 'Wix', 'squarespace': 'Squarespace',
        'plasmic': 'Plasmic',
        'hotjar': 'Hotjar', 'fullstory': 'FullStory', 'logrocket': 'LogRocket',
        'maze': 'Maze', 'useberry': 'Useberry',
        'accessibility': 'Accessibility', 'wcag': 'WCAG', 'aria': 'ARIA',
        'axe': 'Axe', 'lighthouse': 'Lighthouse', 'nvda': 'NVDA',
        'voiceover': 'VoiceOver', 'talkback': 'TalkBack',

        # ── Networking ────────────────────────────────────────────────
        'dns': 'DNS', 'dnssec': 'DNSSEC', 'doh': 'DoH', 'dhcp': 'DHCP',
        'ftp': 'FTP', 'sftp': 'SFTP', 'ssh': 'SSH', 'smtp': 'SMTP',
        'imap': 'IMAP', 'pop3': 'POP3', 'snmp': 'SNMP', 'ntp': 'NTP',
        'bgp': 'BGP', 'ospf': 'OSPF', 'eigrp': 'EIGRP', 'rip': 'RIP',
        'isis': 'IS-IS', 'mpls': 'MPLS', 'vpn': 'VPN',
        'ipsec': 'IPsec', 'wireguard': 'WireGuard', 'openvpn': 'OpenVPN',
        'gre': 'GRE', 'vxlan': 'VXLAN', 'geneve': 'Geneve',
        'cisco': 'Cisco', 'juniper': 'Juniper', 'arista': 'Arista',
        'hpe': 'HPE', 'aruba': 'Aruba', 'fortinet': 'Fortinet',
        'fortigate': 'FortiGate', 'checkpoint': 'Check Point',
        'pfsense': 'pfSense', 'opnsense': 'OPNsense', 'vyos': 'VyOS',
        'openwrt': 'OpenWrt',
        'sdn': 'SDN', 'openflow': 'OpenFlow', 'onos': 'ONOS',
        'opendaylight': 'OpenDaylight', 'dpdk': 'DPDK', 'nfv': 'NFV',
        'zabbix': 'Zabbix', 'prtg': 'PRTG', 'cacti': 'Cacti',
        'nagios': 'Nagios', 'icinga': 'Icinga', 'librenms': 'LibreNMS',
        'netbox': 'NetBox', 'napalm': 'NAPALM', 'nornir': 'Nornir',
        'netmiko': 'Netmiko', 'scapy': 'Scapy',
        'cdn': 'CDN', 'nat': 'NAT', 'firewall': 'Firewall', 'waf': 'WAF',
        'vlan': 'VLAN', 'vrf': 'VRF', 'qos': 'QoS',
        'ztna': 'ZTNA', 'sase': 'SASE',

        # ── Quantum ───────────────────────────────────────────────────
        'qiskit': 'Qiskit', 'cirq': 'Cirq', 'pennylane': 'PennyLane',
        'quipper': 'Quipper', 'silq': 'Silq', 'openqasm': 'OpenQASM',
        'quil': 'Quil', 'perceval': 'Perceval', 'pulser': 'Pulser',
        'bloqade': 'Bloqade', 'ionq': 'IonQ', 'rigetti': 'Rigetti',
        'quantinuum': 'Quantinuum', 'pasqal': 'Pasqal', 'quera': 'QuEra',
        'qubits': 'Qubits', 'nisq': 'NISQ', 'vqe': 'VQE', 'qaoa': 'QAOA',

        # ── AR/VR ─────────────────────────────────────────────────────
        'visionos': 'visionOS', 'oculus': 'Oculus', 'vive': 'Vive',
        'varjo': 'Varjo', 'xreal': 'XREAL', 'nreal': 'Nreal',
        'vuzix': 'Vuzix', 'arcore': 'ARCore', 'arkit': 'ARKit',
        'arfoundation': 'AR Foundation', 'vuforia': 'Vuforia',
        '8thwall': '8th Wall', 'aframe': 'A-Frame', 'webxr': 'WebXR',
        'decentraland': 'Decentraland', 'sandbox': 'The Sandbox',
        'roblox': 'Roblox', 'vrchat': 'VRChat', 'metaverse': 'Metaverse',
        'nerf': 'NeRF', 'haptics': 'Haptics', 'openxr': 'OpenXR',

        # ── Robotics ──────────────────────────────────────────────────
        'ros': 'ROS', 'ros2': 'ROS 2', 'gazebo': 'Gazebo',
        'webots': 'Webots', 'pybullet': 'PyBullet', 'mujoco': 'MuJoCo',
        'moveit': 'MoveIt', 'nav2': 'Nav2',
        'rospy': 'rospy', 'rclpy': 'rclpy', 'rclcpp': 'rclcpp',
        'lidar': 'LiDAR', 'radar': 'Radar', 'imu': 'IMU',
        'slam': 'SLAM', 'amcl': 'AMCL', 'gmapping': 'GMapping',
        'cartographer': 'Cartographer', 'orb-slam': 'ORB-SLAM',
        'ekf': 'EKF', 'ukf': 'UKF', 'mpc': 'MPC', 'lqr': 'LQR',
        'rrt': 'RRT', 'urdf': 'URDF', 'sdf': 'SDF', 'xacro': 'xacro',
        'waymo': 'Waymo', 'mobileye': 'Mobileye', 'apollo': 'Apollo',
        'autoware': 'Autoware', 'openpilot': 'OpenPilot',
        'carla': 'CARLA', 'sumo': 'SUMO',
        'px4': 'PX4', 'ardupilot': 'ArduPilot', 'betaflight': 'Betaflight',
        'unitree': 'Unitree',

        # ── Methodologies ─────────────────────────────────────────────
        'agile': 'Agile', 'scrum': 'Scrum', 'kanban': 'Kanban',
        'lean': 'Lean', 'safe': 'SAFe', 'sprint': 'Sprint',
        'retrospective': 'Retrospective', 'backlog': 'Backlog',
        'tdd': 'TDD', 'bdd': 'BDD', 'atdd': 'ATDD', 'ddd': 'DDD',
        'solid': 'SOLID', 'dry': 'DRY', 'kiss': 'KISS', 'yagni': 'YAGNI',
        'refactoring': 'Refactoring',
        'microservices': 'Microservices', 'monolith': 'Monolith',
        'monorepo': 'Monorepo', 'polyrepo': 'Polyrepo',
        'serverless': 'Serverless', 'cqrs': 'CQRS',
        'rest': 'REST', 'soap': 'SOAP', 'pact': 'Pact',
        'sre': 'SRE', 'slo': 'SLO', 'sla': 'SLA', 'sli': 'SLI',
        'observability': 'Observability', 'okrs': 'OKRs',
        'waterfall': 'Waterfall', 'pmbok': 'PMBOK', 'pmp': 'PMP',
        'prince2': 'PRINCE2', 'gantt': 'Gantt', 'pert': 'PERT',
        'leadership': 'Leadership', 'mentoring': 'Mentoring',
        'documentation': 'Documentation',

        # ── Fintech ───────────────────────────────────────────────────
        'stripe': 'Stripe', 'braintree': 'Braintree', 'paypal': 'PayPal',
        'square': 'Square', 'adyen': 'Adyen', 'worldpay': 'Worldpay',
        'kyc': 'KYC', 'kyb': 'KYB', 'aml': 'AML',
        'jumio': 'Jumio', 'onfido': 'Onfido', 'persona': 'Persona',
        'sardine': 'Sardine', 'sift': 'Sift', 'riskified': 'Riskified',
        'kount': 'Kount', 'forter': 'Forter',
        'temenos': 'Temenos', 'mambu': 'Mambu',
        'upstart': 'Upstart', 'insurtech': 'InsurTech',
        'lemonade': 'Lemonade', 'guidewire': 'Guidewire',
        'swift': 'SWIFT', 'ach': 'ACH', 'sepa': 'SEPA',
        'neft': 'NEFT', 'rtgs': 'RTGS', 'imps': 'IMPS',
        'emv': 'EMV', 'upi': 'UPI', 'pix': 'PIX',
        'razorpay': 'Razorpay', 'paytm': 'Paytm', 'phonepe': 'PhonePe',
        'cashfree': 'Cashfree', 'billdesk': 'BillDesk',
        'flutterwave': 'Flutterwave', 'paystack': 'Paystack',
        'mpesa': 'M-Pesa', 'klarna': 'Klarna', 'mollie': 'Mollie',
        'sumup': 'SumUp', 'ideal': 'iDEAL', 'sofort': 'Sofort',
        'mercadopago': 'MercadoPago', 'cielo': 'Cielo', 'stone': 'Stone',
        'grab': 'Grab', 'gojek': 'Gojek', 'gcash': 'GCash',
        'xendit': 'Xendit', 'midtrans': 'Midtrans', 'tabby': 'Tabby',
        'tamara': 'Tamara',

        # ── HealthTech ────────────────────────────────────────────────
        'epic': 'Epic', 'cerner': 'Cerner', 'meditech': 'Meditech',
        'allscripts': 'Allscripts', 'athenahealth': 'athenahealth',
        'hl7': 'HL7', 'dicom': 'DICOM', 'loinc': 'LOINC',
        'rxnorm': 'RxNorm', 'openehr': 'openEHR',
        'telemedicine': 'Telemedicine', 'telehealth': 'Telehealth',
        'teladoc': 'Teladoc', 'practo': 'Practo',
        'monai': 'MONAI', 'bioinformatics': 'Bioinformatics',
        'genomics': 'Genomics', 'proteomics': 'Proteomics',
        'biopython': 'BioPython', 'bioconductor': 'Bioconductor',
        'nextflow': 'Nextflow', 'snakemake': 'Snakemake',
        'gatk': 'GATK', 'samtools': 'SAMtools', 'bedtools': 'BEDTools',
        'bowtie2': 'Bowtie2', 'bwa': 'BWA', 'star': 'STAR',
        'deseq2': 'DESeq2', 'seurat': 'Seurat', 'scanpy': 'Scanpy',
        'alphafold': 'AlphaFold', 'rosettafold': 'RoseTTAFold',
        'redcap': 'REDCap', 'hipaa': 'HIPAA', 'hitech': 'HITECH',

        # ── EdTech ────────────────────────────────────────────────────
        'moodle': 'Moodle', 'canvas': 'Canvas LMS', 'blackboard': 'Blackboard',
        'brightspace': 'Brightspace', 'schoology': 'Schoology',
        'scorm': 'SCORM', 'xapi': 'xAPI', 'cmi5': 'cmi5',
        'coursera': 'Coursera', 'udemy': 'Udemy', 'edx': 'edX',
        'pluralsight': 'Pluralsight', 'udacity': 'Udacity',
        'skillshare': 'Skillshare', 'duolingo': 'Duolingo',
        'codecademy': 'Codecademy', 'freecodecamp': 'freeCodeCamp',
        'respondus': 'Respondus', 'proctorio': 'Proctorio',
        'turnitin': 'Turnitin', 'originality': 'Originality.ai',

        # ── MarTech ───────────────────────────────────────────────────
        'hubspot': 'HubSpot', 'marketo': 'Marketo', 'pardot': 'Pardot',
        'eloqua': 'Eloqua', 'mailchimp': 'Mailchimp', 'klaviyo': 'Klaviyo',
        'braze': 'Braze', 'iterable': 'Iterable', 'sendgrid': 'SendGrid',
        'activecampaign': 'ActiveCampaign',
        'salesforce': 'Salesforce', 'pipedrive': 'Pipedrive',
        'zoho': 'Zoho CRM', 'freshsales': 'Freshsales',
        'optimizely': 'Optimizely', 'vwo': 'VWO', 'statsig': 'Statsig',
        'growthbook': 'GrowthBook', 'launchdarkly': 'LaunchDarkly',
        'flagsmith': 'Flagsmith', 'unleash': 'Unleash',
        'mixpanel': 'Mixpanel', 'amplitude': 'Amplitude', 'heap': 'Heap',
        'segment': 'Segment', 'rudderstack': 'RudderStack',
        'snowplow': 'Snowplow', 'posthog': 'PostHog', 'pendo': 'Pendo',
        'semrush': 'SEMrush', 'ahrefs': 'Ahrefs', 'moz': 'Moz',

        # ── OS / Systems ──────────────────────────────────────────────
        'nixos': 'NixOS', 'gentoo': 'Gentoo', 'slackware': 'Slackware',
        'manjaro': 'Manjaro', 'alpine': 'Alpine Linux', 'arch': 'Arch Linux',
        'kali': 'Kali Linux', 'parrot': 'Parrot OS', 'popos': 'Pop!_OS',
        'vmware': 'VMware', 'vsphere': 'vSphere', 'virtualbox': 'VirtualBox',
        'kvm': 'KVM', 'qemu': 'QEMU', 'proxmox': 'Proxmox',
        'xen': 'Xen', 'parallels': 'Parallels',
        'ebpf': 'eBPF', 'xdp': 'XDP', 'cgroups': 'cgroups',
        'systemd': 'systemd', 'grub': 'GRUB', 'uefi': 'UEFI',
        'posix': 'POSIX', 'gnu': 'GNU',

        # ── Regional ──────────────────────────────────────────────────
        'alipay': 'Alipay', 'wechat': 'WeChat', 'dingtalk': 'DingTalk',
        'bytedance': 'ByteDance', 'tencent': 'Tencent', 'alibaba': 'Alibaba',
        'kakao': 'Kakao', 'naver': 'Naver', 'toss': 'Toss',
        'tokopedia': 'Tokopedia', 'shopee': 'Shopee', 'lazada': 'Lazada',
        'gojek': 'Gojek', 'ovo': 'OVO', 'gopay': 'GoPay',
        'opay': 'OPay', 'interswitch': 'Interswitch',
        'bancontact': 'Bancontact', 'giropay': 'giropay',
        'przelewy24': 'Przelewy24',
        'ietf': 'IETF', 'ieee': 'IEEE', 'w3c': 'W3C',
        'gsma': 'GSMA', '3gpp': '3GPP',
    }
    
    # ── Run multi-word matching ────────────────────────────────────────
    text_lower = text.lower()
    
    for pattern, canonical in multi_word_skills.items():
        # Use word-boundary-aware regex for accurate matching
        escaped = re.escape(pattern)
        if re.search(r'(?<![a-z0-9])' + escaped + r'(?![a-z0-9])', text_lower):
            found_skills.append(canonical)
    
    # Check single-word skills
    for word in words:
        if word in self.skill_keywords:
            found_skills.append(word.title())
    
    return list(set(found_skills))
    
    def extract_name(self, text: str) -> Optional[str]:
        """Extract name from text (simple heuristic)."""
        lines = text.strip().split('\n')
        for line in lines[:3]:  # Check first 3 lines
            line = line.strip()
            # Simple heuristic: 2-4 words, capitalized, no numbers
            if 2 <= len(line.split()) <= 4:
                words = line.split()
                if all(word[0].isupper() for word in words if word) and not any(c.isdigit() for c in line):
                    # Exclude common non-name lines
                    exclude = ['resume', 'cv', 'curriculum', 'vitae', 'senior', 'junior', 'lead', 'manager']
                    if not any(exclude.lower() in line.lower() for exclude in exclude):
                        return line
        return None
    
    def parse_all(self, text: str) -> Dict[str, Any]:
        """Parse all entities from text."""
        return {
            'name': self.extract_name(text),
            'email': self.extract_email(text),
            'phone': self.extract_phone(text),
            'linkedin': self.extract_linkedin(text),
            'github': self.extract_github(text),
            'websites': self.extract_websites(text),
            'dates': self.extract_dates(text),
            'years_of_experience': self.extract_years_of_experience(text),
            'skills': self.extract_skills(text)
        }
    
    def detect_domain(self, matched_skills: List[str], matched_role_domain: str = None) -> Dict[str, Any]:
        """
        Detect the primary domain based on matched skills.
        
        Args:
            matched_skills: List of skills extracted from resume
            matched_role_domain: Domain from role validation (if available)
            
        Returns:
            Dictionary with primary_domain, confidence, skill_domain, and role_domain
        """
        # Simple domain detection based on skill keywords
        domain_keywords = {
            'IT': ['python', 'java', 'javascript', 'react', 'angular', 'aws', 'azure', 'docker', 'kubernetes', 'sql', 'nosql', 'html', 'css', 'node.js', 'git', 'agile', 'scrum'],
            'Healthcare': ['nursing', 'medical', 'healthcare', 'clinical', 'patient', 'hospital', 'pharmacy', 'medicine'],
            'Finance': ['accounting', 'finance', 'financial', 'banking', 'investment', 'trading', 'audit', 'tax'],
            'HR': ['recruiting', 'hiring', 'talent', 'hr', 'human resources', 'compensation', 'benefits', 'performance'],
            'Education': ['teaching', 'education', 'learning', 'curriculum', 'instruction', 'training', 'academic'],
            'Sales': ['sales', 'marketing', 'business development', 'revenue', 'customer acquisition', 'leads'],
            'Legal': ['legal', 'law', 'attorney', 'counsel', 'compliance', 'regulatory', 'contract'],
            'Engineering': ['engineering', 'mechanical', 'electrical', 'civil', 'chemical', 'industrial']
        }
        
        # Count skills per domain
        domain_counts = {}
        for skill in matched_skills:
            skill_lower = skill.lower()
            for domain, keywords in domain_keywords.items():
                for keyword in keywords:
                    if keyword.lower() in skill_lower or skill_lower in keyword.lower():
                        domain_counts[domain] = domain_counts.get(domain, 0) + 1
                        break
        
        # Find domain with highest count
        if not domain_counts:
            return {
                "primary_domain": "IT",
                "confidence": 0.5,
                "skill_domain": "IT",
                "role_domain": matched_role_domain,
                "domain_counts": {}
            }
        
        top_domain = max(domain_counts, key=domain_counts.get)
        confidence = min(0.95, 0.5 + (domain_counts[top_domain] / len(matched_skills)))
        
        return {
            "primary_domain": top_domain,
            "confidence": confidence,
            "skill_domain": top_domain,
            "role_domain": matched_role_domain,
            "domain_counts": domain_counts
        }
    
    def extract_licenses(self, text: str) -> List[str]:
        """
        Extract licenses and certifications from text using licenses.py patterns with context guards.
        
        Args:
            text: Resume text
            
        Returns:
            List of license/certification names
        """
        # Import the license patterns from licenses.py
        try:
            from licenses import LICENSE_PATTERNS, CONTEXT_KEYWORDS, HIGH_RISK_PATTERNS
        except ImportError:
            # Fallback to simple patterns if licenses.py not available
            license_patterns = [
                r'\b(?:PMP|CPA|CFA|CISA|CISSP|CEH|AWS|Azure|GCP|Google|Microsoft|Oracle|Cisco)\b',
                r'\b(?:SPHR|GPHR|SHRM|PHR|aPHR)\b',
                r'\b(?:Six\s+Sigma)\b',
                r'\b(?:ITIL|PRINCE2|PMP|CAPM)\b',
            ]
            licenses = []
            for pattern in license_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    license_text = match.strip()
                    if len(license_text) > 2 and license_text not in licenses:
                        licenses.append(license_text)
            return licenses
        
        licenses = []
        
        for license_name, pattern in LICENSE_PATTERNS.items():
            try:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    # For high-risk patterns, check for context keywords
                    if license_name in HIGH_RISK_PATTERNS:
                        # Extract surrounding text (50 chars before and after)
                        start = max(0, match.start() - 50)
                        end = min(len(text), match.end() + 50)
                        context = text[start:end].lower()
                        
                        # Check if context keywords are present
                        has_context = any(keyword in context for keyword in CONTEXT_KEYWORDS)
                        
                        # Additional guard for state abbreviations
                        if license_name in {"PA", "CA"}:
                            if match.start() > 0 and text[match.start()-1] == ',':
                                continue
                            if match.end() < len(text) and text[match.end()] == ',':
                                continue
                        
                        # Only include if context is present for high-risk patterns
                        if not has_context:
                            continue
                    
                    licenses.append(license_name)
            except re.error:
                continue
        
        return licenses
