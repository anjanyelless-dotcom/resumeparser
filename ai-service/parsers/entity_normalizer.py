import re

class EntityNormalizer:

    # Skill normalization rules — maps variant -> canonical form
    SKILL_NORMALIZATIONS = {
        # ─── JavaScript / Frontend ───────────────────────────────────────────────
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'es6': 'JavaScript',
        'es2015': 'JavaScript',
        'es2016': 'JavaScript',
        'es2017': 'JavaScript',
        'es2018': 'JavaScript',
        'es2019': 'JavaScript',
        'es2020': 'JavaScript',
        'es2021': 'JavaScript',
        'es2022': 'JavaScript',
        'ecmascript': 'JavaScript',
        'vanilla js': 'JavaScript',
        'vanillajs': 'JavaScript',

        # Node.js
        'node': 'Node.js',
        'nodejs': 'Node.js',
        'node.js': 'Node.js',
        'node js': 'Node.js',

        # React
        'react': 'React',
        'reactjs': 'React',
        'react.js': 'React',
        'react js': 'React',
        'react native': 'React Native',
        'reactnative': 'React Native',

        # Vue
        'vue': 'Vue.js',
        'vuejs': 'Vue.js',
        'vue.js': 'Vue.js',
        'vue js': 'Vue.js',
        'vue3': 'Vue.js',
        'vue2': 'Vue.js',
        'vue 3': 'Vue.js',
        'vue 2': 'Vue.js',

        # Angular
        'angular': 'Angular',
        'angularjs': 'Angular',
        'angular.js': 'Angular',
        'angular js': 'Angular',
        'angular2': 'Angular',
        'angular 2': 'Angular',

        # Next.js
        'next': 'Next.js',
        'nextjs': 'Next.js',
        'next.js': 'Next.js',
        'next js': 'Next.js',

        # Nuxt.js
        'nuxt': 'Nuxt.js',
        'nuxtjs': 'Nuxt.js',
        'nuxt.js': 'Nuxt.js',

        # Svelte
        'svelte': 'Svelte',
        'sveltejs': 'Svelte',
        'sveltekit': 'SvelteKit',
        'svelte kit': 'SvelteKit',

        # jQuery
        'jquery': 'jQuery',
        'jquery.js': 'jQuery',

        # ─── TypeScript ──────────────────────────────────────────────────────────
        'ts': 'TypeScript',
        'typescript': 'TypeScript',
        'type script': 'TypeScript',

        # ─── Python ──────────────────────────────────────────────────────────────
        'python': 'Python',
        'python3': 'Python',
        'python 3': 'Python',
        'python2': 'Python',
        'python 2': 'Python',
        'py': 'Python',
        'python3.x': 'Python',
        'cpython': 'Python',

        # Python Frameworks
        'django': 'Django',
        'flask': 'Flask',
        'fastapi': 'FastAPI',
        'fast api': 'FastAPI',
        'tornado': 'Tornado',
        'aiohttp': 'aiohttp',
        'starlette': 'Starlette',
        'pyramid': 'Pyramid',

        # ─── Java ────────────────────────────────────────────────────────────────
        'java': 'Java',
        'java8': 'Java',
        'java 8': 'Java',
        'java11': 'Java',
        'java 11': 'Java',
        'java17': 'Java',
        'java 17': 'Java',
        'jvm': 'Java',
        'spring': 'Spring',
        'spring boot': 'Spring Boot',
        'springboot': 'Spring Boot',

        # ─── Kotlin ──────────────────────────────────────────────────────────────
        'kotlin': 'Kotlin',
        'kt': 'Kotlin',

        # ─── C / C++ ─────────────────────────────────────────────────────────────
        'c++': 'C++',
        'cpp': 'C++',
        'cplusplus': 'C++',
        'c plus plus': 'C++',
        'c lang': 'C',
        'clang': 'C',   # context-dependent; can also mean the compiler
        'c language': 'C',

        # ─── C# / .NET ───────────────────────────────────────────────────────────
        'c#': 'C#',
        'csharp': 'C#',
        'c sharp': 'C#',
        '.net': '.NET',
        'dotnet': '.NET',
        'dot net': '.NET',
        'asp.net': 'ASP.NET',
        'aspnet': 'ASP.NET',
        'asp net': 'ASP.NET',
        '.net core': '.NET Core',
        'dotnet core': '.NET Core',

        # ─── Go ──────────────────────────────────────────────────────────────────
        'go': 'Go',
        'golang': 'Go',
        'go lang': 'Go',

        # ─── Rust ────────────────────────────────────────────────────────────────
        'rust': 'Rust',
        'rust lang': 'Rust',
        'rustlang': 'Rust',

        # ─── Ruby ────────────────────────────────────────────────────────────────
        'ruby': 'Ruby',
        'rb': 'Ruby',
        'rails': 'Ruby on Rails',
        'ruby on rails': 'Ruby on Rails',
        'ror': 'Ruby on Rails',

        # ─── PHP ─────────────────────────────────────────────────────────────────
        'php': 'PHP',
        'php7': 'PHP',
        'php8': 'PHP',
        'php 7': 'PHP',
        'php 8': 'PHP',
        'laravel': 'Laravel',
        'symfony': 'Symfony',
        'codeigniter': 'CodeIgniter',

        # ─── Swift ───────────────────────────────────────────────────────────────
        'swift': 'Swift',
        'swiftui': 'SwiftUI',
        'swift ui': 'SwiftUI',
        'objective-c': 'Objective-C',
        'objc': 'Objective-C',
        'objective c': 'Objective-C',

        # ─── Dart / Flutter ──────────────────────────────────────────────────────
        'dart': 'Dart',
        'flutter': 'Flutter',

        # ─── Scala ───────────────────────────────────────────────────────────────
        'scala': 'Scala',

        # ─── R ───────────────────────────────────────────────────────────────────
        'r': 'R',
        'rlang': 'R',
        'r language': 'R',
        'r programming': 'R',

        # ─── Shell / Scripting ───────────────────────────────────────────────────
        'bash': 'Bash',
        'shell': 'Shell Scripting',
        'shell script': 'Shell Scripting',
        'shellscript': 'Shell Scripting',
        'sh': 'Shell Scripting',
        'zsh': 'Zsh',
        'powershell': 'PowerShell',
        'ps1': 'PowerShell',

        # ─── Databases — Relational ──────────────────────────────────────────────
        'sql': 'SQL',
        'mysql': 'MySQL',
        'my sql': 'MySQL',
        'postgres': 'PostgreSQL',
        'postgresql': 'PostgreSQL',
        'postgre sql': 'PostgreSQL',
        'pg': 'PostgreSQL',
        'sqlite': 'SQLite',
        'sqlite3': 'SQLite',
        'mssql': 'SQL Server',
        'ms sql': 'SQL Server',
        'sql server': 'SQL Server',
        'microsoft sql server': 'SQL Server',
        'oracle': 'Oracle DB',
        'oracle db': 'Oracle DB',
        'oracledb': 'Oracle DB',
        'mariadb': 'MariaDB',
        'maria db': 'MariaDB',

        # ─── Databases — NoSQL ───────────────────────────────────────────────────
        'mongo': 'MongoDB',
        'mongodb': 'MongoDB',
        'mongo db': 'MongoDB',
        'redis': 'Redis',
        'cassandra': 'Cassandra',
        'apache cassandra': 'Cassandra',
        'couchdb': 'CouchDB',
        'couch db': 'CouchDB',
        'dynamodb': 'DynamoDB',
        'dynamo db': 'DynamoDB',
        'dynamo': 'DynamoDB',
        'firestore': 'Firestore',
        'firebase': 'Firebase',
        'elasticsearch': 'Elasticsearch',
        'elastic search': 'Elasticsearch',
        'elastic': 'Elasticsearch',
        'neo4j': 'Neo4j',
        'neo 4j': 'Neo4j',
        'couchbase': 'Couchbase',
        'hbase': 'HBase',

        # ─── Cloud Providers ─────────────────────────────────────────────────────
        'aws': 'AWS',
        'amazon web services': 'AWS',
        'amazon aws': 'AWS',
        'gcp': 'GCP',
        'google cloud': 'GCP',
        'google cloud platform': 'GCP',
        'azure': 'Azure',
        'microsoft azure': 'Azure',
        'ms azure': 'Azure',
        'alibaba cloud': 'Alibaba Cloud',
        'aliyun': 'Alibaba Cloud',
        'digitalocean': 'DigitalOcean',
        'digital ocean': 'DigitalOcean',
        'heroku': 'Heroku',
        'linode': 'Linode',
        'akamai cloud': 'Linode',   # Linode rebranded under Akamai
        'vultr': 'Vultr',
        'cloudflare': 'Cloudflare',
        'vercel': 'Vercel',
        'netlify': 'Netlify',
        'render': 'Render',
        'fly.io': 'Fly.io',
        'flyio': 'Fly.io',

        # ─── DevOps / Containers ─────────────────────────────────────────────────
        'docker': 'Docker',
        'k8s': 'Kubernetes',
        'kubernetes': 'Kubernetes',
        'kube': 'Kubernetes',
        'helm': 'Helm',
        'terraform': 'Terraform',
        'tf': 'Terraform',
        'ansible': 'Ansible',
        'puppet': 'Puppet',
        'chef': 'Chef',
        'vagrant': 'Vagrant',
        'packer': 'Packer',
        'jenkins': 'Jenkins',
        'gitlab ci': 'GitLab CI',
        'gitlab-ci': 'GitLab CI',
        'github actions': 'GitHub Actions',
        'gh actions': 'GitHub Actions',
        'circleci': 'CircleCI',
        'circle ci': 'CircleCI',
        'travis ci': 'Travis CI',
        'travisci': 'Travis CI',
        'drone ci': 'Drone CI',
        'argo': 'Argo CD',
        'argocd': 'Argo CD',
        'argo cd': 'Argo CD',
        'spinnaker': 'Spinnaker',
        'tekton': 'Tekton',
        'ci/cd': 'CI/CD',
        'cicd': 'CI/CD',
        'ci cd': 'CI/CD',

        # ─── Monitoring / Observability ──────────────────────────────────────────
        'prometheus': 'Prometheus',
        'grafana': 'Grafana',
        'datadog': 'Datadog',
        'data dog': 'Datadog',
        'splunk': 'Splunk',
        'newrelic': 'New Relic',
        'new relic': 'New Relic',
        'pagerduty': 'PagerDuty',
        'page duty': 'PagerDuty',
        'elk': 'ELK Stack',
        'elk stack': 'ELK Stack',
        'logstash': 'Logstash',
        'kibana': 'Kibana',
        'jaeger': 'Jaeger',
        'zipkin': 'Zipkin',
        'opentelemetry': 'OpenTelemetry',
        'otel': 'OpenTelemetry',

        # ─── Message Queues / Streaming ──────────────────────────────────────────
        'kafka': 'Apache Kafka',
        'apache kafka': 'Apache Kafka',
        'rabbitmq': 'RabbitMQ',
        'rabbit mq': 'RabbitMQ',
        'rabbit': 'RabbitMQ',
        'sqs': 'Amazon SQS',
        'amazon sqs': 'Amazon SQS',
        'sns': 'Amazon SNS',
        'amazon sns': 'Amazon SNS',
        'nats': 'NATS',
        'pubsub': 'Pub/Sub',
        'google pubsub': 'Pub/Sub',
        'activemq': 'ActiveMQ',
        'celery': 'Celery',

        # ─── API / Architecture ──────────────────────────────────────────────────
        'rest': 'REST APIs',
        'rest api': 'REST APIs',
        'restful': 'REST APIs',
        'restful api': 'REST APIs',
        'graphql': 'GraphQL',
        'graph ql': 'GraphQL',
        'grpc': 'gRPC',
        'g rpc': 'gRPC',
        'websocket': 'WebSockets',
        'websockets': 'WebSockets',
        'web socket': 'WebSockets',
        'openapi': 'OpenAPI',
        'open api': 'OpenAPI',
        'swagger': 'Swagger',
        'soap': 'SOAP',
        'trpc': 'tRPC',

        # ─── ML / AI / Data Science ──────────────────────────────────────────────
        'ml': 'Machine Learning',
        'machine learning': 'Machine Learning',
        'ai': 'Artificial Intelligence',
        'artificial intelligence': 'Artificial Intelligence',
        'dl': 'Deep Learning',
        'deep learning': 'Deep Learning',
        'nlp': 'NLP',
        'natural language processing': 'NLP',
        'cv': 'Computer Vision',
        'computer vision': 'Computer Vision',
        'tensorflow': 'TensorFlow',
        'tf2': 'TensorFlow',
        'pytorch': 'PyTorch',
        'torch': 'PyTorch',
        'keras': 'Keras',
        'scikit-learn': 'Scikit-learn',
        'sklearn': 'Scikit-learn',
        'scikit learn': 'Scikit-learn',
        'huggingface': 'Hugging Face',
        'hugging face': 'Hugging Face',
        'hf': 'Hugging Face',
        'xgboost': 'XGBoost',
        'xgb': 'XGBoost',
        'lightgbm': 'LightGBM',
        'lgbm': 'LightGBM',
        'catboost': 'CatBoost',
        'langchain': 'LangChain',
        'lang chain': 'LangChain',
        'openai': 'OpenAI API',
        'open ai': 'OpenAI API',
        'llm': 'LLMs',
        'llms': 'LLMs',
        'large language model': 'LLMs',
        'large language models': 'LLMs',
        'rag': 'RAG',
        'retrieval augmented generation': 'RAG',
        'mlops': 'MLOps',
        'ml ops': 'MLOps',

        # ─── Data Engineering ────────────────────────────────────────────────────
        'spark': 'Apache Spark',
        'apache spark': 'Apache Spark',
        'pyspark': 'PySpark',
        'hadoop': 'Hadoop',
        'apache hadoop': 'Hadoop',
        'hive': 'Apache Hive',
        'apache hive': 'Apache Hive',
        'airflow': 'Apache Airflow',
        'apache airflow': 'Apache Airflow',
        'dbt': 'dbt',
        'data build tool': 'dbt',
        'flink': 'Apache Flink',
        'apache flink': 'Apache Flink',
        'snowflake': 'Snowflake',
        'bigquery': 'BigQuery',
        'big query': 'BigQuery',
        'redshift': 'Amazon Redshift',
        'amazon redshift': 'Amazon Redshift',
        'databricks': 'Databricks',
        'pandas': 'Pandas',
        'numpy': 'NumPy',
        'polars': 'Polars',
        'dask': 'Dask',

        # ─── Data Visualization ──────────────────────────────────────────────────
        'matplotlib': 'Matplotlib',
        'seaborn': 'Seaborn',
        'plotly': 'Plotly',
        'tableau': 'Tableau',
        'power bi': 'Power BI',
        'powerbi': 'Power BI',
        'looker': 'Looker',
        'd3': 'D3.js',
        'd3.js': 'D3.js',
        'highcharts': 'Highcharts',
        'metabase': 'Metabase',

        # ─── Version Control ─────────────────────────────────────────────────────
        'git': 'Git',
        'github': 'GitHub',
        'gitlab': 'GitLab',
        'bitbucket': 'Bitbucket',
        'svn': 'SVN',
        'subversion': 'SVN',
        'mercurial': 'Mercurial',
        'hg': 'Mercurial',

        # ─── Testing ─────────────────────────────────────────────────────────────
        'jest': 'Jest',
        'mocha': 'Mocha',
        'jasmine': 'Jasmine',
        'cypress': 'Cypress',
        'playwright': 'Playwright',
        'selenium': 'Selenium',
        'pytest': 'pytest',
        'unittest': 'unittest',
        'junit': 'JUnit',
        'testng': 'TestNG',
        'rspec': 'RSpec',
        'vitest': 'Vitest',

        # ─── Security ────────────────────────────────────────────────────────────
        'oauth': 'OAuth',
        'oauth2': 'OAuth 2.0',
        'oauth 2': 'OAuth 2.0',
        'jwt': 'JWT',
        'json web token': 'JWT',
        'ssl': 'SSL/TLS',
        'tls': 'SSL/TLS',
        'ssl/tls': 'SSL/TLS',
        'saml': 'SAML',
        'sso': 'SSO',
        'single sign-on': 'SSO',
        'penetration testing': 'Penetration Testing',
        'pen testing': 'Penetration Testing',
        'pentest': 'Penetration Testing',
        'devsecops': 'DevSecOps',
        'dev sec ops': 'DevSecOps',

        # ─── Mobile ──────────────────────────────────────────────────────────────
        'android': 'Android',
        'ios': 'iOS',
        'xamarin': 'Xamarin',
        'cordova': 'Apache Cordova',
        'apache cordova': 'Apache Cordova',
        'ionic': 'Ionic',
        'expo': 'Expo',

        # ─── Architecture / Patterns ─────────────────────────────────────────────
        'microservices': 'Microservices',
        'micro services': 'Microservices',
        'serverless': 'Serverless',
        'event driven': 'Event-Driven Architecture',
        'event-driven': 'Event-Driven Architecture',
        'eda': 'Event-Driven Architecture',
        'ddd': 'Domain-Driven Design',
        'domain driven design': 'Domain-Driven Design',
        'tdd': 'TDD',
        'test driven development': 'TDD',
        'bdd': 'BDD',
        'behavior driven development': 'BDD',
        'solid': 'SOLID Principles',
        'design patterns': 'Design Patterns',

        # ─── Web Technologies ────────────────────────────────────────────────────
        'html': 'HTML',
        'html5': 'HTML',
        'css': 'CSS',
        'css3': 'CSS',
        'scss': 'SCSS',
        'sass': 'Sass',
        'less': 'Less',
        'tailwind': 'Tailwind CSS',
        'tailwindcss': 'Tailwind CSS',
        'tailwind css': 'Tailwind CSS',
        'bootstrap': 'Bootstrap',
        'material ui': 'Material UI',
        'materialui': 'Material UI',
        'mui': 'Material UI',
        'chakra ui': 'Chakra UI',
        'chakraui': 'Chakra UI',
        'antd': 'Ant Design',
        'ant design': 'Ant Design',
        'webpack': 'Webpack',
        'vite': 'Vite',
        'babel': 'Babel',
        'rollup': 'Rollup',
        'esbuild': 'esbuild',

        # ─── CMS / E-commerce ────────────────────────────────────────────────────
        'wordpress': 'WordPress',
        'wp': 'WordPress',
        'drupal': 'Drupal',
        'joomla': 'Joomla',
        'contentful': 'Contentful',
        'strapi': 'Strapi',
        'sanity': 'Sanity',
        'shopify': 'Shopify',
        'magento': 'Magento',
        'woocommerce': 'WooCommerce',
        'woo commerce': 'WooCommerce',

        # ─── Collaboration / Project Tools ───────────────────────────────────────
        'jira': 'Jira',
        'confluence': 'Confluence',
        'notion': 'Notion',
        'trello': 'Trello',
        'asana': 'Asana',
        'linear': 'Linear',
        'slack': 'Slack',
        'figma': 'Figma',

        # ─── Miscellaneous ───────────────────────────────────────────────────────
        'linux': 'Linux',
        'unix': 'Unix',
        'ubuntu': 'Ubuntu',
        'centos': 'CentOS',
        'rhel': 'RHEL',
        'red hat': 'RHEL',
        'nginx': 'Nginx',
        'apache': 'Apache HTTP Server',
        'apache http': 'Apache HTTP Server',
        'apache httpd': 'Apache HTTP Server',
        'haproxy': 'HAProxy',
        'envoy': 'Envoy',
        'istio': 'Istio',
        'rabbitmq': 'RabbitMQ',
        'memcached': 'Memcached',
        'agile': 'Agile',
        'scrum': 'Scrum',
        'kanban': 'Kanban',
        'oop': 'OOP',
        'object oriented': 'OOP',
        'object-oriented': 'OOP',
        'functional programming': 'Functional Programming',
        'fp': 'Functional Programming',
        'concurrency': 'Concurrent Programming',
        'multithreading': 'Multithreading',
        'multi threading': 'Multithreading',
        'async': 'Asynchronous Programming',
        'asynchronous': 'Asynchronous Programming',
        'async/await': 'Asynchronous Programming',
    }

    # Company name cleanup patterns
    COMPANY_SUFFIXES = [
        r'\bLLC\b', r'\bInc\b', r'\bInc\.\b', r'\bCorp\b',
        r'\bCorp\.\b', r'\bLtd\b', r'\bLtd\.\b', r'\bLimited\b',
        r'\bPvt\b', r'\bPvt\.\b', r'\bCo\.\b'
    ]

    def normalize_skill(self, skill: str) -> str:
        """Normalize a skill name to canonical form."""
        cleaned = skill.strip()
        # Remove version numbers: "Python 3.9.1" -> "Python"
        cleaned = re.sub(r'\s+\d+[\.\d]*$', '', cleaned)
        # Check normalization map (case-insensitive)
        lower = cleaned.lower()
        if lower in self.SKILL_NORMALIZATIONS:
            return self.SKILL_NORMALIZATIONS[lower]
        # Return with proper capitalization if not in map
        return cleaned

    def normalize_company(self, company: str) -> str:
        """Remove legal suffixes from company names."""
        cleaned = company.strip()
        for suffix_pattern in self.COMPANY_SUFFIXES:
            cleaned = re.sub(suffix_pattern, '', cleaned).strip()
        # Remove trailing punctuation
        cleaned = cleaned.rstrip('.,;')
        return cleaned.strip()

    def normalize_skills_list(self, skills: list) -> list:
        """Normalize and deduplicate a list of skills."""
        normalized = {}
        for skill in skills:
            norm = self.normalize_skill(skill)
            key = norm.lower()
            if key not in normalized:
                normalized[key] = norm
        return sorted(list(normalized.values()))

    def normalize_location(self, location: str) -> str:
        """Normalize common location abbreviations."""
        location_map = {
            'sf': 'San Francisco, CA',
            'nyc': 'New York, NY',
            'la': 'Los Angeles, CA',
            'dc': 'Washington, DC',
            'remote': 'Remote',
        }
        lower = location.lower().strip()
        return location_map.get(lower, location)
