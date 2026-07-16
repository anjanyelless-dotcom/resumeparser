"""
Job description parser that extracts key information from job postings.
Identifies skills, experience requirements, education levels, and job metadata.
"""

import re
import logging
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict

# Configure logging
logger = logging.getLogger(__name__)


class JobDescriptionParser:
    """
    Parser for extracting structured information from job descriptions.
    Identifies skills, experience requirements, education, and job metadata.
    """
    
    def __init__(self):
        """Initialize the job description parser with patterns and keywords."""
        self.logger = logging.getLogger(__name__)
        
        # Skill-related patterns
        self.skill_patterns = {
            'required': [
                r'(?:required|must have|requirements?|essential|needed)[:\s]*([^\n]*)',
                r'(?:requirements?|qualifications?)[:\s]*([^\n]*)',
                r'(?:must have|required skills?)[:\s]*([^\n]*)',
                r'(?:essential skills?)[:\s]*([^\n]*)',
            ],
            'preferred': [
                r'(?:preferred|nice to have|desired|plus|bonus)[:\s]*([^\n]*)',
                r'(?:nice to have skills?|preferred skills?)[:\s]*([^\n]*)',
                r'(?:desired qualifications?|plus points?)[:\s]*([^\n]*)',
            ]
        }
        
        # Experience patterns
        self.experience_patterns = [
            r'(\d+)\+?\s*[-–to]?\s*(\d+)?\s*years?',
            r'(?:minimum|min|required|at least)\s+(\d+)\s*years?',
            r'(?:up to|max)\s+(\d+)\s*years?',
            r'(\d+)\s*[-–to]\s*(\d+)\s*years?\s*(?:of\s*)?(?:experience|exp)?',
            r'(\d+)\s*\+\s*years?\s*(?:of\s*)?(?:experience|exp)?',
        ]
        
        # Seniority level patterns
        self.seniority_patterns = {
            'Junior': [
                r'junior|entry[-\s]?level|associate|intern|trainee|beginner',
                r'0[-–]?2\s*years?|1[-–]?2\s*years?|less than\s*3\s*years?'
            ],
            'Mid': [
                r'mid[-\s]?level|intermediate|3[-–]?5\s*years?|4[-–]?6\s*years?',
                r'2[-–]?4\s*years?|3[-–]?6\s*years?'
            ],
            'Senior': [
                r'senior|5[-–]?8\s*years?|6[-–]?10\s*years?|experienced',
                r'5\+\s*years?|7[-–]?10\s*years?'
            ],
            'Lead': [
                r'lead|principal|8[-–]?12\s*years?|10\+\s*years?|team lead',
                r'staff|principal engineer|architect'
            ],
            'Manager': [
                r'manager|management|director|head of|team manager|supervisor',
                r'people manager|team lead manager'
            ]
        }
        
        # Education patterns
        self.education_patterns = {
            'PhD': [
                r'phd|doctorate|doctoral|ph\.?d\.?'
            ],
            'Master': [
                r'master|msc|m\.?s\.?|master\'s|graduate degree|ma|m\.?a\.?'
            ],
            'Bachelor': [
                r'bachelor|bsc|b\.?s\.?|bachelor\'s|undergraduate|ba|b\.?a\.?'
            ],
            'Associate': [
                r'associate|diploma|2[-\s]?year degree|technical degree'
            ],
            'Any': [
                r'high school|ged|no degree|degree not required|any education'
            ]
        }
        
        # Employment type patterns
        self.employment_patterns = {
            'full-time': [
                r'full[-\s]?time|permanent|direct hire|employee'
            ],
            'part-time': [
                r'part[-\s]?time|part time'
            ],
            'contract': [
                r'contract|temporary|temp|freelance|consultant'
            ],
            'internship': [
                r'internship|intern|trainee'
            ]
        }
        
        # Common technology keywords for skill extraction
        self.tech_keywords = {
            'programming': [
                # Mainstream General-Purpose
                'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 'go',
                'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'perl', 'r', 'matlab',
                # Functional / Academic
                'haskell', 'erlang', 'elixir', 'clojure', 'f#', 'ocaml', 'lisp',
                'scheme', 'racket', 'prolog', 'coq', 'agda', 'idris', 'purescript',
                'elm', 'standard ml', 'sml', 'hope', 'miranda', 'clean', 'mercury',
                # Systems / Low-Level
                'assembly', 'x86 assembly', 'arm assembly', 'mips assembly',
                'fortran', 'cobol', 'ada', 'pascal', 'delphi', 'zig', 'nim',
                'd language', 'verilog', 'vhdl', 'systemverilog', 'chisel',
                'oberon', 'modula-2', 'simula',
                # Scripting / Shell
                'bash', 'zsh', 'fish', 'ksh', 'csh', 'powershell', 'cmd', 'batch',
                'tcl', 'awk', 'sed', 'gawk', 'lua', 'moonscript', 'wren',
                # Data & Statistics
                'julia', 'sas', 'spss', 'stata', 'q', 'apl', 'j language',
                'wolfram language', 'mathematica', 'maxima', 'octave',
                # Legacy / Enterprise
                'visual basic', 'vb.net', 'vba', 'foxpro', 'groovy', 'coldfusion',
                'abap', 'rpg', 'pl/sql', 't-sql', 'pl/pgsql', 'natural', 'rpg ile',
                'progress openedge', 'uniface', 'powerbuilder', 'clipper',
                # Newer / Emerging 2020s
                'v lang', 'carbon', 'mojo', 'gleam', 'roc', 'grain', 'ballerina',
                'solidity', 'vyper', 'move', 'cairo', 'clarity', 'ink!', 'teal',
                'pkl', 'nickel', 'dhall', 'cue', 'jsonnet',
                # Query / Declarative
                'graphql', 'sparql', 'cypher', 'gremlin', 'flux', 'xquery',
                'xpath', 'xslt', 'regex',
                # Domain-Specific / Scientific
                'cuda', 'opencl', 'hlsl', 'glsl', 'wgsl', 'metal shading', 'ispc',
                'chapel', 'x10', 'upc',
                # Cross-Compile / Multi-Target
                'haxe', 'crystal', 'hack', 'cython', 'jython', 'ironpython',
                'micropython', 'circuitpython', 'tinygo',
     ],

    # ══════════════════════════════════════════════════════════════════
    # 2. WEB — FRONTEND  (200+ entries)
    # ══════════════════════════════════════════════════════════════════
    'web_frontend': [
                # Core Web Technologies
                'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'stylus',
                'postcss', 'css modules', 'css variables', 'css grid', 'css flexbox',
                'web components', 'shadow dom', 'custom elements', 'html templates',
                # JS Frameworks
                'react', 'react 18', 'angular', 'angular 17', 'vue', 'vue 3',
                'svelte', 'solid', 'qwik', 'preact', 'inferno', 'lit', 'stencil',
                'alpine.js', 'stimulus', 'htmx', 'ember.js', 'backbone.js',
                'mithril', 'riot.js', 'aurelia', 'marko', 'hyperapp',
                # Meta-Frameworks / SSR / SSG
                'next.js', 'nuxt', 'sveltekit', 'remix', 'gatsby', 'astro',
                'eleventy', 'jekyll', 'hugo', 'hexo', '11ty', 'docusaurus',
                'vitepress', 'gridsome', 'scully', 'analog', 'fresh', 'lume',
                # CSS Frameworks & UI Libraries
                'tailwind css', 'bootstrap', 'bulma', 'foundation', 'materialize',
                'chakra ui', 'material ui', 'mantine', 'ant design', 'shadcn/ui',
                'daisyui', 'flowbite', 'headlessui', 'radix ui', 'ariakit',
                'react aria', 'nextui', 'tremor', 'park ui', 'catalyst',
                'open props', 'pico css', 'water.css', 'milligram',
                'primer', 'semantic ui', 'spectre.css', 'pure.css',
                # Styling-in-JS
                'styled components', 'emotion', 'vanilla extract', 'stitches',
                'linaria', 'css-in-js', 'twin.macro', 'twind',
                # Build & Bundler Tools
                'webpack', 'webpack 5', 'rollup', 'parcel', 'esbuild', 'vite',
                'turbopack', 'rspack', 'rome', 'oxc', 'babel', 'swc', 'bun',
                'snowpack', 'wmr',
                # State Management
                'redux', 'redux toolkit', 'zustand', 'mobx', 'recoil', 'jotai',
                'xstate', 'nanostores', 'valtio', 'legend state', 'pinia',
                'vuex', 'ngrx', 'ngxs', 'akita', 'elf', 'tanstack query',
                'swr', 'apollo client', 'urql', 'relay',
                # Testing
                'jest', 'vitest', 'cypress', 'playwright', 'puppeteer', 'selenium',
                'webdriverio', 'testing library', 'enzyme', 'storybook', 'chromatic',
                'percy', 'applitools', 'nightwatch', 'testcafe', 'ava',
                # Animation & Graphics
                'gsap', 'framer motion', 'react spring', 'anime.js', 'lottie',
                'three.js', 'babylon.js', 'd3.js', 'chart.js', 'recharts',
                'victory', 'nivo', 'visx', 'highcharts', 'echarts', 'apexcharts',
                'canvas api', 'webgl', 'webgpu', 'pixi.js', 'fabric.js', 'konva',
                # Accessibility & i18n
                'aria', 'wcag', 'a11y', 'axe', 'lighthouse', 'pa11y',
                'i18next', 'react-intl', 'formatjs', 'lingui',
                # PWA & Performance
                'pwa', 'service workers', 'web workers', 'workbox', 'web vitals',
                'core web vitals', 'lazy loading', 'code splitting', 'tree shaking',
                # Micro-Frontend
                'module federation', 'single-spa', 'qiankun', 'bit', 'nx',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 3. WEB — BACKEND  (150+ entries)
    # ══════════════════════════════════════════════════════════════════
    'web_backend': [
                # Node.js Ecosystem
                'nodejs', 'node.js', 'express', 'express.js', 'fastify', 'nestjs',
                'hapi', 'koa', 'adonis', 'strapi', 'keystone', 'directus', 'feathers',
                'loopback', 'sails.js', 'total.js', 'restify', 'polka', 'h3',
                # Python
                'django', 'django rest framework', 'flask', 'fastapi', 'tornado',
                'pyramid', 'sanic', 'starlette', 'litestar', 'aiohttp', 'bottle',
                'falcon', 'cherrypy', 'web2py', 'nameko', 'robyn',
                # Ruby
                'rails', 'ruby on rails', 'sinatra', 'hanami', 'grape', 'roda',
                'camping', 'padrino',
                # PHP
                'laravel', 'symfony', 'codeigniter', 'yii', 'yii2', 'zend',
                'slim', 'lumen', 'phalcon', 'cakephp', 'wordpress', 'drupal',
                'joomla', 'magento', 'prestashop', 'opencart',
                # Java / JVM
                'spring', 'spring boot', 'spring mvc', 'spring webflux', 'quarkus',
                'micronaut', 'vert.x', 'play framework', 'jakarta ee', 'grails',
                'javalin', 'ktor', 'helidon', 'dropwizard', 'jersey', 'resteasy',
                # .NET
                'asp.net', 'asp.net core', '.net 8', '.net 9', 'blazor', 'minimal api',
                'signalr', 'grpc dotnet', 'dapr', 'orleans',
                # Go
                'gin', 'echo', 'fiber', 'chi', 'beego', 'buffalo', 'mux', 'gorilla',
                'iris', 'revel', 'goji', 'httprouter',
                # Rust
                'actix', 'actix-web', 'axum', 'rocket', 'warp', 'poem', 'tide',
                'salvo', 'tower', 'hyper',
                # Elixir / Erlang / Haskell / Scala
                'phoenix', 'elixir phoenix', 'plug', 'cowboy', 'nerves',
                'servant', 'scotty', 'yesod', 'play scala', 'akka http', 'http4s',
                'zio http', 'tapir',
                # API Standards & Protocols
                'rest', 'restful', 'graphql', 'grpc', 'trpc', 'soap', 'odata',
                'json api', 'hal', 'openapi', 'swagger', 'async api',
                'websocket', 'webhook', 'sse', 'long polling',
                # CMS & Headless
                'contentful', 'sanity', 'ghost', 'payload cms', 'hygraph',
                'prismic', 'storyblok', 'contentstack', 'agility cms',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 4. MOBILE DEVELOPMENT  (120+ entries)
    # ══════════════════════════════════════════════════════════════════
    'mobile': [
                # Cross-Platform
                'react native', 'flutter', 'xamarin', 'maui', 'expo', 'ionic',
                'capacitor', 'cordova', 'phonegap', 'nativescript', 'kotlin multiplatform',
                'compose multiplatform', 'tauri mobile', 'qt mobile',
                # iOS Native
                'ios', 'swift', 'swiftui', 'uikit', 'objective-c', 'xcode',
                'core data', 'core ml', 'arkit', 'arkit 6', 'realitykit', 'scenekit',
                'spritekit', 'gameplaykit', 'createml', 'vision framework',
                'healthkit', 'homekit', 'mapkit', 'cloudkit', 'storekit',
                'combine', 'swift concurrency',
                # Android Native
                'android', 'android sdk', 'kotlin', 'jetpack compose',
                'android studio', 'gradle', 'android jetpack', 'room', 'hilt',
                'dagger', 'koin', 'retrofit', 'okhttp', 'glide', 'picasso',
                'coil', 'lottie android', 'navigation component', 'viewmodel',
                'livedata', 'flow', 'coroutines', 'workmanager', 'paging 3',
                # Mobile Backend Services
                'firebase', 'firebase firestore', 'firebase auth', 'firebase fcm',
                'firebase crashlytics', 'firebase remote config',
                'supabase', 'appwrite', 'back4app', 'aws amplify', 'azure mobile',
                # Analytics & Marketing
                'appsflyer', 'branch', 'adjust', 'mixpanel', 'amplitude', 'segment',
                'braze', 'clevertap', 'moengage', 'webengage', 'leanplum', 'airship',
                # DevOps / Distribution
                'fastlane', 'bitrise', 'appcenter', 'testflight', 'diawi',
                'google play console', 'firebase app distribution',
                'browserstack', 'saucelabs', 'xctest', 'espresso', 'detox', 'maestro',
                # Performance & Monitoring
                'new relic mobile', 'datadog mobile', 'instabug', 'bugsnag',
                'sentry mobile', 'embrace',
                # Mobile Payment
                'stripe mobile', 'braintree', 'apple pay', 'google pay',
                'paytm sdk', 'razorpay sdk', 'paypal sdk',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 5. DATABASE & STORAGE  (170+ entries)
    # ══════════════════════════════════════════════════════════════════
    'database': [
                # Relational — Open Source
                'sql', 'mysql', 'mysql 8', 'postgresql', 'postgresql 16', 'sqlite',
                'sqlite3', 'mariadb', 'percona', 'tidb', 'cockroachdb', 'yugabytedb',
                'neon', 'planetscale', 'vitess', 'proxysql', 'pgbouncer',
                # Relational — Commercial
                'oracle', 'oracle db', 'sql server', 'microsoft sql server', 'ibm db2',
                'teradata', 'sybase', 'informix', 'sap hana',
                # NewSQL / HTAP
                'google spanner', 'aurora', 'aurora serverless', 'cosmos db',
                'fauna', 'singlestore', 'supabase', 'turso', 'neon serverless', 'xata',
                # NoSQL — Document
                'mongodb', 'mongodb atlas', 'firestore', 'couchdb', 'couchbase',
                'ravendb', 'documentdb', 'pouchdb', 'realm',
                # NoSQL — Key-Value
                'redis', 'redis stack', 'redis cloud', 'memcached', 'etcd', 'riak',
                'aerospike', 'dragonfly', 'keydb', 'garnet', 'valkey',
                # NoSQL — Wide Column
                'cassandra', 'apache cassandra', 'hbase', 'bigtable', 'scylladb',
                'dynamodb', 'azure table storage', 'astra db',
                # NoSQL — Search
                'elasticsearch', 'opensearch', 'solr', 'meilisearch', 'typesense',
                'algolia', 'zinc search', 'manticore search',
                # NoSQL — Graph
                'neo4j', 'dgraph', 'tigergraph', 'amazon neptune', 'arangodb',
                'janusgraph', 'hugegraph', 'nebula graph', 'age', 'memgraph',
                'terminusdb',
                # Time Series
                'influxdb', 'timescaledb', 'questdb', 'victoriametrics', 'clickhouse',
                'apache druid', 'apache pinot', 'tdengine', 'opentsdb', 'kdb+',
                'griddb', 'm3db',
                # Vector Databases
                'pinecone', 'weaviate', 'qdrant', 'chroma', 'milvus', 'pgvector',
                'faiss', 'annoy', 'hnswlib', 'vald', 'vespa', 'marqo', 'zilliz',
                'turbopuffer', 'lancedb', 'mongodb atlas vector search',
                # ORM / Query Builders
                'sqlalchemy', 'alembic', 'prisma', 'drizzle', 'typeorm', 'sequelize',
                'knex', 'objection', 'mikro-orm', 'bookshelf', 'mongoose', 'eloquent',
                'active record', 'entity framework', 'dapper', 'gorm', 'sqlx',
                'diesel', 'sea-orm', 'hibernate', 'jpa', 'querydsl', 'mybatis',
                # Data Formats
                'json', 'jsonb', 'xml', 'avro', 'parquet', 'orc', 'arrow', 'protobuf',
                'messagepack', 'cbor', 'flatbuffers', 'capn proto',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 6. CLOUD & INFRASTRUCTURE  (220+ entries)
    # ══════════════════════════════════════════════════════════════════
    'cloud': [
                # Hyperscalers
                'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp',
                'google cloud', 'google cloud platform', 'alibaba cloud', 'aliyun',
                'tencent cloud', 'huawei cloud', 'oracle cloud', 'ibm cloud',
                'naver cloud', 'kakao cloud', 'nifcloud', 'sakura cloud',
                # AWS Services
                'ec2', 'lambda', 's3', 'rds', 'dynamodb', 'ecs', 'eks', 'fargate',
                'cloudfront', 'route53', 'vpc', 'iam', 'cloudwatch', 'cloudtrail',
                'sqs', 'sns', 'ses', 'kinesis', 'glue', 'athena', 'redshift',
                'sagemaker', 'bedrock', 'step functions', 'eventbridge', 'appsync',
                'api gateway', 'cognito', 'secrets manager', 'parameter store',
                'elasticache', 'documentdb', 'aurora', 'timestream', 'opensearch',
                'msk', 'emr', 'batch', 'lightsail', 'elastic beanstalk',
                # Azure Services
                'azure vm', 'azure functions', 'azure blob', 'azure sql',
                'azure cosmos', 'azure kubernetes', 'aks', 'azure devops',
                'azure pipelines', 'azure monitor', 'azure sentinel',
                'azure active directory', 'entra id', 'azure openai', 'azure ai',
                'azure cognitive services', 'azure service bus', 'azure event hub',
                'azure data factory', 'azure synapse', 'azure databricks',
                'azure container apps',
                # GCP Services
                'compute engine', 'cloud run', 'gke', 'cloud storage', 'bigquery',
                'cloud sql', 'firestore', 'cloud functions', 'pub/sub', 'dataflow',
                'vertex ai', 'cloud build', 'cloud cdn', 'cloud armor',
                'artifact registry',
                # PaaS / Hosting
                'heroku', 'digitalocean', 'render', 'railway', 'fly.io', 'vercel',
                'netlify', 'cloudflare', 'cloudflare pages', 'cloudflare workers',
                'linode', 'akamai cloud', 'vultr', 'hetzner', 'ovh', 'scaleway',
                'ionos', 'contabo', 'upcloud', 'exoscale', 'cleura', 'infomaniak',
                # Container Technologies
                'docker', 'docker compose', 'docker swarm', 'kubernetes', 'k8s',
                'k3s', 'k3d', 'kind', 'minikube', 'helm', 'kustomize', 'flux',
                'argo cd', 'argocd', 'rancher', 'openshift', 'podman', 'containerd',
                'cri-o', 'buildah', 'skopeo', 'kaniko', 'buildpacks', 'distroless',
                # IaC / Config Management
                'terraform', 'terraform cloud', 'opentofu', 'pulumi', 'ansible',
                'chef', 'puppet', 'saltstack', 'cloudformation', 'sam', 'cdk',
                'bicep', 'arm templates', 'crossplane', 'config connector',
                'vagrant', 'packer',
                # Service Mesh & Proxy
                'istio', 'linkerd', 'consul', 'envoy', 'nginx', 'nginx plus',
                'traefik', 'haproxy', 'caddy', 'kong', 'tyk', 'ambassador',
                'cilium', 'calico', 'flannel', 'weave',
                # Serverless
                'aws lambda', 'azure functions', 'google cloud functions',
                'cloudflare workers', 'vercel edge functions', 'netlify functions',
                'supabase edge functions', 'deno deploy', 'fastly compute',
                'lagon', 'val.town',
                # CI/CD
                'github actions', 'gitlab ci', 'jenkins', 'jenkins x', 'circleci',
                'travis ci', 'bitbucket pipelines', 'teamcity', 'bamboo',
                'argo workflows', 'tekton', 'spinnaker', 'concourse', 'harness',
                'codefresh', 'drone ci', 'woodpecker ci', 'buildkite', 'semaphore ci',
                'azure pipelines', 'aws codepipeline', 'aws codebuild',
                # Monitoring & Observability
                'prometheus', 'grafana', 'grafana loki', 'grafana tempo',
                'datadog', 'new relic', 'dynatrace', 'splunk', 'elastic apm',
                'jaeger', 'zipkin', 'opentelemetry', 'otel', 'pagerduty', 'opsgenie',
                'victorops', 'alertmanager', 'uptime kuma', 'checkly', 'pingdom',
                'statuspage', 'honeycomb', 'lightstep', 'instana',
                # Storage & CDN
                's3', 'azure blob', 'gcs', 'minio', 'backblaze b2', 'cloudflare r2',
                'wasabi', 'storj', 'bunny cdn', 'cloudflare cdn', 'fastly cdn',
                'akamai', 'keycdn',
                # FinOps
                'aws cost explorer', 'infracost', 'kubecost', 'finops',
                'cloud custodian',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 7. DEVOPS & TOOLS  (200+ entries)
    # ══════════════════════════════════════════════════════════════════
    'tools': [
                # Version Control
                'git', 'github', 'gitlab', 'bitbucket', 'gitea', 'gogs', 'forgejo',
                'mercurial', 'svn', 'subversion', 'perforce', 'plastic scm',
                'azure repos', 'codecommit',
                # Project & Task Management
                'jira', 'jira software', 'trello', 'asana', 'notion', 'linear',
                'shortcut', 'clubhouse', 'clickup', 'basecamp', 'monday.com',
                'azure devops', 'confluence', 'youtrack', 'targetprocess',
                'pivotal tracker', 'plane', 'height', 'openproject',
                # Communication
                'slack', 'discord', 'microsoft teams', 'zoom', 'google meet',
                'webex', 'whereby', 'gather', 'mattermost', 'rocket.chat',
                'twist', 'chanty', 'flock', 'lark', 'dingtalk', 'wecom',
                # IDEs & Editors
                'vs code', 'visual studio code', 'intellij idea', 'intellij',
                'eclipse', 'vim', 'neovim', 'emacs', 'sublime text', 'atom',
                'webstorm', 'pycharm', 'rider', 'clion', 'goland', 'rubymine',
                'datagrip', 'android studio', 'xcode', 'cursor', 'windsurf',
                'zed', 'lapce', 'helix', 'nova', 'notepad++',
                'visual studio', 'qt creator', 'code::blocks',
                # Operating Systems
                'linux', 'ubuntu', 'ubuntu 22.04', 'ubuntu 24.04', 'debian',
                'centos', 'centos stream', 'rhel', 'red hat', 'fedora',
                'arch linux', 'manjaro', 'alpine linux', 'gentoo', 'nixos',
                'void linux', 'kali linux', 'parrot os', 'pop os',
                'windows', 'windows 10', 'windows 11', 'windows server',
                'windows server 2022', 'macos', 'macos sonoma', 'freebsd',
                'openbsd', 'solaris',
                # API & Integration Tools
                'postman', 'insomnia', 'hoppscotch', 'bruno', 'httpie', 'curl',
                'wget', 'swagger', 'openapi', 'graphql', 'grpc', 'rest', 'soap',
                'websocket', 'webhooks', 'zapier', 'make', 'integromat', 'n8n',
                'pipedream', 'tray.io', 'workato', 'boomi', 'mulesoft', 'wso2',
                'apigee',
                # Testing Frameworks
                'junit', 'junit 5', 'testng', 'pytest', 'unittest', 'nose2',
                'mocha', 'chai', 'jasmine', 'karma', 'jest', 'vitest', 'ava',
                'tap', 'tape', 'cucumber', 'gherkin', 'behave', 'specflow',
                'selenium', 'appium', 'cypress', 'playwright', 'puppeteer',
                'testcafe', 'robotframework', 'karate', 'rest assured',
                'supertest', 'httpx',
                # Load & Performance Testing
                'k6', 'locust', 'gatling', 'jmeter', 'artillery', 'wrk',
                'vegeta', 'autocannon', 'ab', 'hey',
                # Code Quality & Security
                'sonarqube', 'sonarcloud', 'codeclimate', 'deepsource', 'codacy',
                'eslint', 'prettier', 'pylint', 'flake8', 'ruff', 'mypy',
                'pyright', 'black', 'isort', 'rubocop', 'checkstyle', 'spotbugs',
                'pmd', 'coverity', 'veracode', 'snyk', 'dependabot', 'renovate',
                'fossa', 'trivy', 'grype', 'syft', 'checkov', 'semgrep',
                # Logging
                'elk stack', 'logstash', 'kibana', 'fluentd', 'fluentbit', 'loki',
                'graylog', 'papertrail', 'loggly', 'logdna', 'mezmo', 'betterstack',
                # Package & Dependency Managers
                'npm', 'yarn', 'yarn berry', 'pnpm', 'bun', 'pip', 'pipenv',
                'poetry', 'pdm', 'uv', 'conda', 'mamba', 'cargo', 'maven',
                'gradle', 'sbt', 'bazel', 'buck', 'pants', 'composer',
                'nuget', 'gem', 'bundler', 'brew', 'homebrew', 'apt', 'apt-get',
                'yum', 'dnf', 'pacman', 'zypper', 'nix', 'guix',
                # Documentation
                'markdown', 'mdx', 'rst', 'asciidoc', 'docusaurus', 'mkdocs',
                'sphinx', 'gitbook', 'notion docs', 'confluence', 'readme.io',
                'swagger ui', 'redoc', 'storybook', 'typedoc', 'jsdoc',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 8. DATA SCIENCE & MACHINE LEARNING  (200+ entries)
    # ══════════════════════════════════════════════════════════════════
    'data_science': [
                # Core Scientific Python
                'numpy', 'pandas', 'scipy', 'sympy', 'statsmodels', 'pingouin',
                'pymc', 'pymc3', 'stan', 'pystan',
                # Visualization
                'matplotlib', 'seaborn', 'plotly', 'plotly express', 'bokeh',
                'altair', 'dash', 'streamlit', 'gradio', 'panel', 'holoviews',
                'hvplot', 'datashader', 'kepler.gl', 'deck.gl', 'folium',
                'geopandas', 'cartopy', 'pydeck',
                # Classic ML
                'scikit-learn', 'sklearn', 'xgboost', 'lightgbm', 'catboost',
                'h2o', 'h2o automl', 'pycaret', 'auto-sklearn', 'autogluon',
                'optuna', 'hyperopt', 'ray tune', 'nni',
                # Deep Learning
                'tensorflow', 'tf', 'keras', 'pytorch', 'torch', 'jax', 'flax',
                'haiku', 'equinox', 'optax', 'paddle', 'paddlepaddle', 'mxnet',
                'onnx', 'onnxruntime', 'openvino', 'tensorrt', 'tflite',
                'tensorflow lite', 'coreml', 'caffe', 'caffe2', 'theano', 'chainer',
                # NLP
                'hugging face', 'transformers', 'datasets', 'accelerate', 'peft',
                'trl', 'spacy', 'nltk', 'gensim', 'fasttext', 'word2vec', 'glove',
                'bert', 'roberta', 'gpt', 'gpt-2', 't5', 'bart', 'xlnet',
                'longformer', 'deberta', 'electra', 'albert', 'mpnet',
                'sentence-transformers', 'langchain', 'llamaindex',
                # Computer Vision
                'opencv', 'cv2', 'pillow', 'pil', 'torchvision', 'timm',
                'detectron2', 'mmdetection', 'mmsegmentation', 'mmpose',
                'yolo', 'yolov8', 'yolov9', 'ultralytics', 'roboflow',
                'albumentations', 'imgaug', 'kornia', 'supervision',
                'segmentation models', 'sam', 'segment anything',
                # MLOps & Experiment Tracking
                'mlflow', 'kubeflow', 'metaflow', 'wandb', 'weights and biases',
                'neptune.ai', 'comet ml', 'clearml', 'dvc', 'bentoml', 'seldon',
                'triton inference', 'torchserve', 'ray serve', 'feast', 'tecton',
                'hopsworks', 'zenml', 'evidently', 'great expectations',
                'deepchecks',
                # Orchestration
                'airflow', 'apache airflow', 'prefect', 'dagster', 'kedro', 'luigi',
                'argo workflows', 'metaflow', 'flyte', 'hamilton', 'mage',
                # Data Engineering
                'apache spark', 'pyspark', 'apache flink', 'apache kafka', 'kafka',
                'apache beam', 'apache hadoop', 'apache hive', 'apache pig',
                'apache nifi', 'dask', 'ray', 'modin', 'vaex', 'polars', 'duckdb',
                'ibis', 'arrow', 'pyarrow', 'delta lake', 'apache iceberg',
                'apache hudi', 'apache paimon',
                # Data Transformation
                'dbt', 'dbt core', 'dbt cloud', 'fivetran', 'airbyte', 'stitch',
                'matillion', 'talend', 'informatica', 'pentaho', 'apache camel',
                'mulesoft', 'boomi',
                # Data Warehouses
                'snowflake', 'databricks', 'redshift', 'bigquery', 'synapse',
                'clickhouse', 'apache druid', 'apache pinot', 'firebolt', 'dremio',
                'starburst', 'trino', 'presto', 'hive', 'impala',
                # Feature Store / Data Catalog
                'feast', 'tecton', 'hopsworks', 'apache atlas', 'alation',
                'collibra', 'datahub', 'amundsen',
                # BI & Analytics
                'tableau', 'power bi', 'looker', 'looker studio', 'metabase',
                'apache superset', 'mode analytics', 'sigma', 'thoughtspot',
                'qlik', 'microstrategy', 'sas analytics', 'tibco spotfire',
                'google analytics', 'mixpanel', 'segment', 'amplitude', 'heap',
                # Notebooks
                'jupyter', 'jupyterlab', 'jupyter notebook', 'google colab',
                'kaggle notebooks', 'deepnote', 'hex', 'observable',
                'databricks notebooks', 'sagemaker studio',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 9. AI & GENERATIVE AI  (200+ entries)
    # ══════════════════════════════════════════════════════════════════
    'ai_genai': [
                # LLM APIs & Providers
                'openai', 'anthropic', 'google deepmind', 'google ai', 'meta ai',
                'mistral ai', 'cohere', 'ai21 labs', 'aleph alpha', 'inflection ai',
                'xai', 'grok', 'groq', 'together ai', 'replicate', 'perplexity',
                'fireworks ai', 'anyscale', 'deepinfra', 'novita ai', 'hyperbolic',
                'lepton ai', 'modal', 'baseten', 'banana', 'runpod',
                # Flagship LLM Models
                'gpt-4', 'gpt-4o', 'gpt-4 turbo', 'gpt-3.5', 'chatgpt', 'o1', 'o3',
                'claude', 'claude 3', 'claude 3.5', 'claude opus', 'claude sonnet',
                'claude haiku', 'gemini', 'gemini pro', 'gemini ultra', 'gemini flash',
                'gemma', 'gemma 2',
                # Open Source LLMs
                'llama', 'llama 2', 'llama 3', 'llama 3.1', 'llama 3.2', 'llama 3.3',
                'mistral', 'mistral 7b', 'mixtral', 'mixtral 8x7b',
                'falcon', 'falcon 40b', 'phi', 'phi-3', 'phi-4',
                'qwen', 'qwen 2', 'qwen 2.5',
                'deepseek', 'deepseek v2', 'deepseek v3', 'deepseek r1',
                'yi', 'yi-34b', 'stablelm', 'bloom', 'opt', 'mpt', 'dolly',
                'vicuna', 'alpaca', 'orca', 'openhermes', 'zephyr',
                'command r', 'command r+', 'solar', 'exaone', 'hyperclova',
                'internlm', 'baichuan', 'chatglm', 'ernie', 'wenxin',
                # AI Application Frameworks
                'langchain', 'llamaindex', 'haystack', 'semantic kernel', 'autogen',
                'crewai', 'dspy', 'guidance', 'instructor', 'outlines', 'marvin',
                'pydantic ai', 'openai swarm', 'langfuse', 'langsmith', 'phoenix',
                'arize ai', 'trulens', 'ragas', 'deepeval', 'evals',
                # Image Generation AI
                'stable diffusion', 'sdxl', 'sd3', 'midjourney', 'dall-e',
                'dall-e 3', 'flux', 'flux schnell', 'imagen', 'imagen 3',
                'adobe firefly', 'leonardo ai', 'ideogram', 'playground ai',
                'controlnet', 'ip adapter', 'lora', 'dreambooth',
                'textual inversion', 'comfyui', 'automatic1111', 'invoke ai',
                'fooocus',
                # Video AI
                'sora', 'runway', 'runway gen-3', 'pika', 'pika labs', 'kling',
                'kling ai', 'haiper', 'luma ai', 'dream machine', 'vidu',
                'veo', 'veo 2', 'gen-2', 'stable video diffusion',
                # Audio & Music AI
                'whisper', 'whisper v3', 'elevenlabs', 'bark', 'suno', 'udio',
                'musicgen', 'audiocraft', 'voiceflow', 'deepgram', 'assembly ai',
                'rev ai', 'gladia', 'speechify', 'resemble ai',
                'coqui tts', 'xtts',
                # Embeddings & Retrieval
                'openai embeddings', 'sentence transformers', 'fastembed',
                'cohere embed', 'jina embeddings', 'e5', 'bge', 'nomic embed',
                # AI Techniques & Concepts
                'rag', 'retrieval augmented generation', 'graph rag', 'hybrid search',
                'reranking', 'ai agents', 'agentic ai', 'multi-agent',
                'function calling', 'tool use', 'chain of thought', 'cot',
                'few-shot', 'zero-shot', 'one-shot', 'prompt engineering',
                'system prompt', 'in-context learning', 'fine-tuning', 'rlhf',
                'dpo', 'sft', 'lora', 'qlora', 'peft', 'quantization',
                'gguf', 'ggml', 'awq', 'gptq', 'ollama', 'llama.cpp', 'vllm',
                'text generation inference', 'tgi', 'lm studio', 'jan',
                # AI Safety & Ethics
                'ai safety', 'alignment', 'red teaming', 'jailbreak', 'hallucination',
                'guardrails', 'nemo guardrails', 'constitutional ai',
                # AI Hardware
                'nvidia h100', 'nvidia a100', 'nvidia l40s', 'tpu', 'google tpu',
                'aws trainium', 'aws inferentia', 'intel gaudi',
                'groq lpu', 'cerebras', 'graphcore',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 10. CYBERSECURITY  (160+ entries)
    # ══════════════════════════════════════════════════════════════════
    'cybersecurity': [
                # Core Domains
                'penetration testing', 'pentest', 'ethical hacking', 'red team',
                'blue team', 'purple team', 'vulnerability assessment', 'va/pt',
                'threat intelligence', 'cti', 'soc', 'siem', 'soar',
                'devsecops', 'appsec', 'cloud security', 'network security',
                'endpoint security', 'zero trust', 'identity management', 'iam',
                'privileged access management', 'pam', 'data security',
                'container security', 'runtime security',
                # Offensive Security Tools
                'metasploit', 'metasploit framework', 'burp suite', 'burp pro',
                'nmap', 'masscan', 'rustscan', 'gobuster', 'dirb', 'ffuf',
                'nikto', 'sqlmap', 'xsser', 'hydra', 'hashcat', 'john the ripper',
                'aircrack-ng', 'wifite', 'beef', 'responder', 'impacket',
                'bloodhound', 'crackmapexec', 'evil-winrm', 'covenant', 'sliver',
                'brute ratel', 'cobalt strike',
                # Defensive / DFIR Tools
                'wireshark', 'tcpdump', 'zeek', 'snort', 'suricata', 'ossec',
                'wazuh', 'velociraptor', 'osquery', 'sysmon', 'autopsy',
                'volatility', 'sleuth kit', 'foremost', 'binwalk', 'ghidra',
                'ida pro', 'x64dbg', 'radare2', 'cutter', 'binary ninja',
                # Scanners & SAST/DAST
                'nessus', 'qualys', 'rapid7', 'tenable', 'openvas', 'vulners',
                'sonarqube', 'checkmarx', 'veracode', 'fortify', 'coverity',
                'semgrep', 'bandit', 'safety', 'snyk', 'trivy', 'grype',
                'codeql', 'owasp zap', 'dast', 'sast', 'iast',
                # IAM / SSO
                'oauth 2.0', 'oidc', 'saml', 'ldap', 'ldaps', 'active directory',
                'azure ad', 'entra id', 'keycloak', 'okta', 'auth0', 'ping identity',
                'cognito', 'duo', 'beyond trust', 'cyberark', 'hashicorp vault',
                'aws secrets manager', 'azure key vault', 'google secret manager',
                # Cryptography
                'ssl', 'tls', 'tls 1.3', 'aes', 'aes-256', 'rsa', 'ecc', 'sha',
                'sha-256', 'sha-512', 'pgp', 'gpg', 'jwt', 'jwe', 'jws', 'mtls',
                'pki', 'x.509', 'lets encrypt', 'certbot', 'hsm',
                'homomorphic encryption', 'zero knowledge proof',
                # Threat & Vulnerability Management
                'cve', 'cvss', 'nvd', 'cwe', 'mitre att&ck', 'kill chain',
                'owasp top 10', 'sans top 25', 'exploit db', 'poc', 'cpe',
                'sbom', 'vex', 'csaf',
                # Compliance & Frameworks
                'gdpr', 'hipaa', 'soc 2', 'soc2 type ii', 'iso 27001', 'iso 27002',
                'pci dss', 'ccpa', 'cpra', 'nist', 'nist csf', 'nist 800-53',
                'fedramp', 'fisma', 'cis benchmarks', 'cobit', 'itil',
                'dora regulation', 'nis2', 'pdpa', 'lgpd', 'pipeda',
                # Cloud Security Tools
                'cspm', 'cwpp', 'cnapp', 'casb', 'sspm', 'ciem',
                'prisma cloud', 'wiz', 'orca security', 'lacework', 'aqua security',
                'sysdig', 'falco', 'crowdstrike', 'sentinelone', 'defender',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 11. BLOCKCHAIN & WEB3  (110+ entries)
    # ══════════════════════════════════════════════════════════════════
    'blockchain': [
                # L1 Platforms
                'ethereum', 'bitcoin', 'solana', 'polygon', 'avalanche', 'bnb chain',
                'binance smart chain', 'cardano', 'polkadot', 'cosmos', 'near',
                'tezos', 'algorand', 'aptos', 'sui', 'sei', 'monad', 'ton',
                'tron', 'eos', 'iota', 'hedera', 'stellar', 'ripple', 'xrp',
                # L2 / Scaling
                'optimism', 'arbitrum', 'base', 'polygon zkEVM', 'zksync',
                'starknet', 'linea', 'scroll', 'mantle', 'manta', 'blast',
                'mode', 'taiko', 'loopring',
                # Dev Tools & SDKs
                'solidity', 'vyper', 'ink!', 'move', 'cairo', 'teal',
                'hardhat', 'truffle', 'foundry', 'brownie', 'anchor',
                'web3.js', 'ethers.js', 'viem', 'wagmi', 'thirdweb',
                'moralis', 'alchemy', 'quicknode', 'infura', 'chainstack',
                'nownodes', 'getblock',
                # DeFi Protocols
                'uniswap', 'aave', 'compound', 'curve', 'balancer', 'maker',
                'synthetix', 'yearn', 'convex', 'lido', 'rocket pool',
                '1inch', 'paraswap', 'dydx', 'gmx', 'hyperliquid',
                # NFT & Metaverse
                'erc-721', 'erc-1155', 'opensea', 'blur', 'magic eden',
                'tensor', 'zora', 'foundation', 'manifold',
                # Wallets & Infrastructure
                'metamask', 'walletconnect', 'rainbow wallet', 'phantom',
                'coinbase wallet', 'ledger', 'trezor', 'gnosis safe',
                'chainlink', 'pyth', 'api3', 'band protocol',
                # Decentralized Storage
                'ipfs', 'filecoin', 'arweave', 'storj', 'sia', 'ceramic',
                # Concepts
                'defi', 'nft', 'dao', 'smart contracts', 'dapp', 'layer 2',
                'zk proofs', 'zkp', 'zk-snark', 'zk-stark', 'optimistic rollup',
                'evm', 'solana vm', 'cosmos sdk', 'substrate', 'polkadot parachain',
                'liquid staking', 'restaking', 'eigenlayer', 'account abstraction',
                'eip-4337', 'mev', 'flashbots',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 12. IoT & EMBEDDED SYSTEMS  (110+ entries)
    # ══════════════════════════════════════════════════════════════════
    'iot_embedded': [
                # MCUs & SBCs
                'arduino', 'arduino uno', 'arduino mega', 'raspberry pi',
                'raspberry pi 4', 'raspberry pi 5', 'raspberry pi zero',
                'esp32', 'esp32-s3', 'esp8266', 'stm32', 'stm32f4', 'stm32h7',
                'arm cortex', 'arm cortex-m', 'arm cortex-a', 'risc-v',
                'nvidia jetson', 'jetson nano', 'jetson orin', 'beaglebone',
                'orange pi', 'rock pi', 'banana pi', 'odroid',
                'teensy', 'adafruit feather', 'particle photon', 'particle argon',
                'nordic nrf52', 'nordic nrf9160', 'ti cc2650', 'ti msp430',
                'pic microcontroller', 'avr', 'atmega328',
                # Protocols
                'mqtt', 'mqtt v5', 'coap', 'amqp', 'xmpp', 'dds',
                'zigbee', 'z-wave', 'bluetooth', 'ble', 'bluetooth 5',
                'lorawan', 'lora', 'sigfox', 'nb-iot', 'lte-m', 'cat-m1',
                'modbus', 'modbus rtu', 'modbus tcp', 'can bus', 'canopen',
                'i2c', 'spi', 'uart', 'rs485', 'rs232', 'opc-ua', 'opc-da',
                'profibus', 'profinet', 'ethercat', 'devicenet',
                'matter', 'thread', 'openthread', '6lowpan',
                # IoT Cloud Platforms
                'aws iot', 'aws iot core', 'aws iot greengrass', 'azure iot',
                'azure iot hub', 'azure iot edge', 'google cloud iot',
                'thingsboard', 'thingspeak', 'cayenne', 'ubidots',
                'home assistant', 'node-red', 'balena', 'balenacloud',
                'particle cloud', 'arduino cloud', 'tuya', 'esp-idf',
                # RTOS
                'freertos', 'zephyr', 'zephyr rtos', 'riot os', 'threadx',
                'vxworks', 'contiki', 'mbed os', 'nuttx', 'rtems',
                'micrium ucos', 'chibios', 'liteos',
                # Edge AI / TinyML
                'tensorflow lite', 'tflite micro', 'edge impulse', 'arduino ml',
                'onnx runtime mobile', 'qualcomm ai engine', 'stm32cube ai',
                # Industrial IoT
                'industry 4.0', 'digital twin', 'scada', 'hmi', 'mes',
                'predictive maintenance', 'condition monitoring',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 13. GAME DEVELOPMENT  (130+ entries)
    # ══════════════════════════════════════════════════════════════════
    'game_development': [
                # Game Engines
                'unity', 'unity 6', 'unreal engine', 'unreal engine 5', 'ue5',
                'godot', 'godot 4', 'cryengine', 'o3de', 'amazon o3de',
                'cocos2d', 'cocos2d-x', 'cocos creator', 'defold', 'monogame',
                'xna', 'pygame', 'pyxel', 'libgdx', 'gdx', 'love2d', 'pico-8',
                'tic-80', 'construct', 'gamesalad', 'stencyl', 'rpgmaker',
                'gamemaker', 'gamemaker studio', 'heaps.io',
                # Web Game Engines
                'three.js', 'babylon.js', 'playcanvas', 'phaser', 'phaser 3',
                'pixi.js', 'matter.js', 'impact.js', 'melonjs',
                # 3D APIs / Graphics
                'opengl', 'opengl es', 'vulkan', 'directx', 'directx 12',
                'metal', 'webgl', 'webgl 2', 'webgpu', 'direct3d',
                'ray tracing', 'directx raytracing', 'rtx', 'lumen', 'nanite',
                # 3D / Art Tools
                'blender', 'maya', 'maya 3d', '3ds max', 'cinema 4d',
                'zbrush', 'substance painter', 'substance designer',
                'marvelous designer', 'speedtree', 'houdini', 'modo',
                'marmoset toolbag', 'quixel mixer', 'quixel megascans',
                # Audio
                'fmod', 'wwise', 'unity audio', 'openal', 'xaudio2',
                'audacity', 'reaper',
                # Physics
                'physx', 'bullet physics', 'havok', 'box2d', 'jolt physics',
                'rapier', 'react-three/rapier',
                # Networking / Multiplayer
                'photon engine', 'playfab', 'unity relay', 'unity lobby',
                'epic online services', 'eos', 'steamworks', 'gamesparks',
                'nakama', 'colyseus', 'fishnet', 'mirror networking', 'enet',
                # Game Concepts
                'shader programming', 'hlsl', 'glsl', 'wgsl', 'procedural generation',
                'pathfinding', 'a*', 'navigation mesh', 'navmesh', 'behavior tree',
                'game ai', 'finite state machine', 'fsm', 'ecs',
                'entity component system', 'game loop', 'delta time', 'voxels',
                'terrain generation', 'level design', 'game design patterns',
                # Analytics & Monetization
                'unity analytics', 'gameanalytics', 'in-app purchase', 'iap',
                'ads mediation', 'admob', 'applovin', 'ironsource', 'unity ads',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 14. DESIGN, UX & PRODUCT  (130+ entries)
    # ══════════════════════════════════════════════════════════════════
    'design': [
                # Design Tools
                'figma', 'figma dev mode', 'sketch', 'adobe xd', 'invision',
                'zeplin', 'framer', 'framer motion', 'principle', 'protopie',
                'origami studio', 'marvel', 'axure', 'balsamiq', 'whimsical',
                'miro', 'figjam', 'mural', 'lucidchart', 'draw.io', 'excalidraw',
                # Graphics & Illustration
                'adobe photoshop', 'adobe illustrator', 'adobe after effects',
                'adobe premiere', 'adobe animate', 'adobe indesign',
                'canva', 'affinity designer', 'affinity photo', 'inkscape',
                'gimp', 'krita', 'procreate', 'clip studio paint', 'aseprite',
                'pixlr', 'photopea',
                # 3D & Motion
                'cinema 4d', 'blender', 'spline', 'rive', 'jitter',
                'lottie files', 'cavalry', 'p5.js', 'processing',
                # Webflow & No-Code
                'webflow', 'webflow cms', 'wix', 'squarespace', 'showit',
                'cargo', 'readymag', 'builder.io', 'plasmic',
                # Design Systems
                'material design', 'material design 3', 'apple hig',
                'fluent design', 'fluent 2', 'carbon design', 'atlassian design',
                'polaris', 'lightning design system', 'ant design', 'chakra',
                'primer design', 'spectrum adobe', 'paste twilio',
                # UX Research & Methods
                'user research', 'usability testing', 'a/b testing',
                'user interviews', 'surveys', 'heuristic evaluation',
                'card sorting', 'tree testing', 'eye tracking', 'heat maps',
                'session recording', 'hotjar', 'fullstory', 'logrocket',
                'maze', 'useberry', 'optimal workshop', 'userlytics',
                # UX Concepts
                'ui design', 'ux design', 'product design', 'interaction design',
                'information architecture', 'ia', 'wireframing', 'prototyping',
                'user journey', 'user flow', 'task analysis', 'persona',
                'empathy map', 'jobs to be done', 'jtbd', 'design sprint',
                'double diamond', 'human-centered design', 'hcd',
                'service design', 'content strategy', 'design thinking',
                # Accessibility
                'accessibility', 'a11y', 'wcag', 'wcag 2.1', 'wcag 2.2',
                'wcag 3', 'aria', 'wai-aria', 'section 508', 'en 301 549',
                'axe', 'lighthouse', 'nvda', 'voiceover', 'talkback',
                # Typography & Branding
                'typography', 'font pairing', 'google fonts', 'adobe fonts',
                'variable fonts', 'type scale', 'brand identity', 'logo design',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 15. NETWORKING & INFRASTRUCTURE  (130+ entries)
    # ══════════════════════════════════════════════════════════════════
    'networking': [
                # Core Protocols
                'tcp/ip', 'tcp', 'udp', 'ip', 'ipv4', 'ipv6', 'icmp', 'arp',
                'http', 'https', 'http/1.1', 'http/2', 'http/3', 'quic',
                'dns', 'dnssec', 'doh', 'dot', 'dhcp', 'ftp', 'sftp', 'ftps',
                'ssh', 'telnet', 'smtp', 'imap', 'pop3', 'snmp', 'ntp', 'ptp',
                'bgp', 'ospf', 'eigrp', 'rip', 'isis', 'mpls', 'vpn',
                'ipsec', 'ssl vpn', 'wireguard', 'openvpn', 'l2tp', 'pptp',
                'gre', 'vxlan', 'geneve', 'nsh',
                # Hardware & Vendors
                'cisco', 'cisco ios', 'cisco nx-os', 'cisco aci', 'juniper',
                'junos', 'arista', 'eos', 'hpe', 'aruba', 'extreme networks',
                'fortinet', 'fortigate', 'palo alto', 'checkpoint', 'f5',
                'a10 networks', 'netscaler', 'citrix adc',
                # Software Networking
                'pfsense', 'opnsense', 'vyos', 'openwrt', 'dd-wrt',
                'sdn', 'openflow', 'onos', 'opendaylight', 'p4', 'dpdk',
                'nfv', 'ovs', 'open vswitch', 'contrail', 'tungsten fabric',
                'sd-wan', 'cisco sd-wan', 'vmware velocloud', 'fortinet sdwan',
                # Tools & Monitoring
                'wireshark', 'tcpdump', 'iperf', 'iperf3', 'netflow', 'sflow',
                'ipfix', 'nagios', 'icinga', 'zabbix', 'prtg', 'cacti', 'mrtg',
                'librenms', 'netbox', 'oxidized', 'rancid', 'napalm',
                'nornir', 'netmiko', 'scapy', 'nmap', 'masscan',
                # Load Balancing & Proxy
                'nginx', 'apache', 'haproxy', 'traefik', 'caddy', 'envoy',
                'aws alb', 'aws nlb', 'azure load balancer', 'gcp load balancer',
                'cloudflare', 'fastly', 'akamai', 'bunny cdn', 'keycdn',
                # Concepts
                'cdn', 'load balancer', 'reverse proxy', 'forward proxy',
                'nat', 'pat', 'firewall', 'waf', 'ddos protection',
                'anycast', 'vlan', 'vrf', 'qos', 'traffic shaping',
                'network segmentation', 'microsegmentation', 'zero trust network',
                'ztna', 'sase', 'network automation',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 16. QUANTUM COMPUTING  (65+ entries)
    # ══════════════════════════════════════════════════════════════════
    'quantum': [
                # Frameworks & SDKs
                'qiskit', 'qiskit runtime', 'cirq', 'pennylane', 'amazon braket',
                'azure quantum', 'q#', 'quipper', 'silq', 'scaffold', 'openqasm',
                'openqasm 3', 'qasm', 'quil', 'strawberry fields', 'perceval',
                'cuda quantum', 'cuda-q', 'bloqade', 'pulser',
                # Hardware Providers
                'ibm quantum', 'ibm eagle', 'ibm condor', 'ibm heron',
                'google quantum ai', 'google sycamore', 'google willow',
                'microsoft quantum', 'ionq', 'rigetti', 'quantinuum',
                'pasqal', 'atom computing', 'quera', 'alice&bob', 'd-wave',
                # Technologies
                'superconducting qubits', 'trapped ion', 'photonic quantum',
                'neutral atom', 'topological qubit', 'spin qubit',
                'quantum annealing', 'adiabatic quantum computation',
                # Algorithms & Concepts
                'qubits', 'quantum gates', 'quantum circuit', 'quantum entanglement',
                'quantum superposition', 'quantum teleportation',
                'quantum error correction', 'surface code', 'topological code',
                'quantum advantage', 'quantum supremacy', 'nisq', 'fault tolerant',
                'vqe', 'qaoa', 'quantum phase estimation', 'grover algorithm',
                'shor algorithm', 'hhl algorithm', 'quantum ml', 'qml',
                'quantum simulation', 'quantum chemistry', 'quantum finance',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 17. AR / VR / XR / SPATIAL COMPUTING  (90+ entries)
    # ══════════════════════════════════════════════════════════════════
    'ar_vr_xr': [
                # Headsets & Hardware
                'apple vision pro', 'visionos', 'meta quest', 'meta quest 3',
                'meta quest pro', 'oculus', 'htc vive', 'htc vive pro', 'valve index',
                'playstation vr', 'psvr2', 'microsoft hololens', 'hololens 2',
                'magic leap', 'magic leap 2', 'varjo', 'xreal', 'nreal',
                'vuzix', 'epson moverio', 'google glass enterprise',
                # Platforms & SDKs
                'arcore', 'arkit', 'arkit 6', 'arfoundation', 'vuforia',
                'spark ar', 'snap lens studio', 'tiktok effect house',
                'adobe aero', '8thwall', 'niantic lightship', 'unity xr',
                'unreal xr', 'openxr', 'openxr runtime', 'webxr',
                'webxr device api', 'webvr', 'aframe', 'babylon xr',
                'three.js xr', 'react-xr',
                # Development Concepts
                'spatial computing', 'mixed reality', 'mr', 'extended reality',
                'xr', 'virtual reality', 'vr', 'augmented reality', 'ar',
                'holographic display', 'volumetric capture', 'photogrammetry',
                'gaussian splatting', 'neural radiance fields', 'nerf',
                'hand tracking', 'eye tracking', 'body tracking', 'face tracking',
                'inside-out tracking', 'outside-in tracking', '6dof', '3dof',
                'haptics', 'haptic feedback', 'force feedback',
                # Metaverse & Social XR
                'metaverse', 'decentraland', 'sandbox', 'roblox', 'fortnite creative',
                'vr chat', 'altspace', 'horizon worlds', 'microsoft mesh',
                'nvidia omniverse', 'usd', 'universal scene description',
                'digital twin', 'industrial metaverse',
                # Design for XR
                'spatial ui', 'diegetic ui', '3d ui', 'voice interaction',
                'gaze interaction', 'gesture interaction',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 18. ROBOTICS & AUTONOMOUS SYSTEMS  (90+ entries)
    # ══════════════════════════════════════════════════════════════════
    'robotics': [
                # Middleware & Frameworks
                'ros', 'ros2', 'ros humble', 'ros iron', 'ros jazzy',
                'gazebo', 'ignition gazebo', 'gz sim', 'webots', 'pybullet',
                'mujoco', 'isaac sim', 'isaac gym', 'nvidia isaac',
                'moveit', 'moveit2', 'nav2', 'navigation2', 'slam toolbox',
                'behaviour tree cpp', 'py trees', 'flexbe',
                # Programming
                'rospy', 'rclpy', 'rclcpp', 'roscpp', 'roslaunch',
                'colcon', 'catkin', 'ament',
                # Sensors & Perception
                'lidar', 'velodyne', 'ouster', 'livox', 'robosense',
                'radar', 'camera', 'stereo camera', 'depth camera',
                'intel realsense', 'zed camera', 'oak-d', 'kinect',
                'imu', 'gps', 'gnss', 'ultrasonic', 'infrared',
                # Algorithms
                'slam', 'lidar slam', 'visual slam', 'vslam',
                'gmapping', 'cartographer', 'hector slam', 'orb-slam',
                'kalman filter', 'ekf', 'ukf', 'particle filter', 'amcl',
                'pid controller', 'mpc', 'lqr', 'motion planning', 'rrt',
                'prm', 'a* planner', 'dijkstra', 'dwa', 'teb planner',
                'kinematics', 'inverse kinematics', 'ik', 'urdf', 'sdf', 'xacro',
                # Autonomous Vehicles
                'autonomous vehicles', 'self-driving', 'waymo', 'tesla autopilot',
                'cruise', 'mobileye', 'apollo', 'autoware', 'openpilot',
                'carla', 'sumo', 'lidar perception', 'object detection',
                'lane detection', 'path planning', 'behavior planning', 'hd maps',
                # Drones / UAV
                'drone', 'uav', 'quadcopter', 'px4', 'ardupilot', 'qgroundcontrol',
                'dji sdk', 'parrot', 'betaflight', 'inav', 'cleanflight',
                'swarm robotics',
                # AI for Robotics
                'reinforcement learning robots', 'imitation learning', 'sim2real',
                'robot learning', 'manipulation', 'grasping', 'legged robotics',
                'spot robot', 'atlas robot', 'figure robot', 'unitree',
                'foundation models robotics', 'rt-2',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 19. FINTECH & PAYMENTS  (90+ entries)
    # ══════════════════════════════════════════════════════════════════
    'fintech': [
                # Global Payment APIs
                'stripe', 'stripe api', 'stripe connect', 'braintree', 'paypal',
                'square', 'adyen', 'checkout.com', 'worldpay', 'cybersource',
                'authorize.net', '2checkout', 'paysafe',
                # India Payments
                'razorpay', 'paytm', 'phonepe', 'upi', 'bhim upi',
                'cashfree', 'billdesk', 'ccavenue', 'juspay', 'easebuzz', 'payu',
                # Open Banking & PSD2
                'open banking', 'psd2', 'plaid', 'yodlee', 'tink', 'truelayer',
                'nordigen', 'basiq', 'finicity', 'mx technologies', 'salt edge',
                # Crypto Payments
                'bitcoin lightning', 'coinbase commerce', 'bitpay', 'opennode',
                'strike', 'muun wallet',
                # KYC / AML / Fraud
                'kyc', 'kyb', 'aml', 'jumio', 'onfido', 'persona', 'idnow',
                'sum&substance', 'veriff', 'stripe identity', 'sardine',
                'sift', 'riskified', 'kount', 'signifyd', 'forter',
                # Banking Infrastructure
                'banking as a service', 'baas', 'core banking', 'temenos',
                'mambu', 'thought machine', 'finxact', 'synapse', 'unit',
                'treasury prime', 'moov', 'column', 'stripe treasury',
                # Lending & Credit
                'ocen', 'account aggregator', 'credit scoring', 'alternative data',
                'upstart', 'zest ai',
                # Insurance Tech
                'insurtech', 'lemonade', 'root insurance', 'shift technology',
                'majesco', 'guidewire', 'duck creek',
                # Standards & Protocols
                'iso 20022', 'swift', 'ach', 'sepa', 'fps', 'neft', 'rtgs',
                'imps', 'pci dss', 'emv', '3ds', '3d secure',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 20. HEALTHCARE TECH & BIOINFORMATICS  (90+ entries)
    # ══════════════════════════════════════════════════════════════════
    'healthtech': [
                # EHR / EMR Systems
                'epic', 'cerner', 'meditech', 'allscripts', 'eclinicalworks',
                'drchrono', 'athenahealth', 'nextgen', 'practice fusion', 'kareo',
                # Interoperability Standards
                'hl7', 'hl7 fhir', 'fhir r4', 'fhir r5', 'hl7 v2', 'cda',
                'ccda', 'dicom', 'ihe', 'snomed ct', 'icd-10', 'icd-11',
                'loinc', 'rxnorm', 'cpt codes', 'ndc', 'omop cdm',
                'openehr', 'smart on fhir', 'epic fhir', 'cerner fhir',
                # Telemedicine
                'telemedicine', 'telehealth', 'doxy.me', 'teladoc', 'amwell',
                'doximity', 'mdlive', 'practo', 'apollo 247',
                # Medical Imaging & AI
                'medical imaging', 'radiology ai', 'pathology ai',
                'monai', 'medicalnet', '3d slicer', 'itk', 'vtk',
                'nnunet', 'totalsegmentator',
                # Bioinformatics
                'bioinformatics', 'genomics', 'proteomics', 'metagenomics',
                'biopython', 'bioconductor', 'biojulia', 'galaxy', 'nextflow',
                'snakemake', 'cwl', 'wdl', 'cromwell',
                'gatk', 'samtools', 'bedtools', 'bowtie2', 'bwa', 'star',
                'hisat2', 'deseq2', 'edger', 'seurat', 'scanpy', 'cellranger',
                'alphafold', 'alphafold 2', 'esm', 'rosettafold',
                # Clinical Data & Trials
                'redcap', 'medidata rave', 'oracle clinical', 'veeva vault',
                # Health Compliance
                'hipaa', 'hitech', 'gdpr health', 'iso 13485', 'fda 21 cfr part 11',
                'eu mdr', 'ce marking', 'fda udi',
                # Wearables & Monitoring
                'apple health', 'google health', 'fitbit api', 'garmin api',
                'continuous glucose monitoring', 'cgm', 'ecg wearable',
                'remote patient monitoring', 'rpm',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 21. EDTECH  (55+ entries)
    # ══════════════════════════════════════════════════════════════════
    'edtech': [
                # LMS Platforms
                'moodle', 'canvas lms', 'blackboard', 'brightspace', 'd2l',
                'schoology', 'google classroom', 'microsoft teams education',
                'instructure', 'sakai', 'open edx', 'totara', 'docebo',
                'cornerstone', 'absorb lms', 'litmos', 'lessonly', 'talent lms',
                # E-Learning Standards
                'scorm', 'scorm 1.2', 'scorm 2004', 'xapi', 'tin can api',
                'cmi5', 'aicc', 'lrs', 'qti', 'ims global',
                # Course Platforms
                'coursera', 'udemy', 'edx', 'pluralsight', 'linkedin learning',
                'udacity', 'skillshare', 'domestika', 'khan academy',
                'brilliant', 'duolingo', 'codecademy', 'freecodecamp',
                # Adaptive Learning & AI Ed
                'adaptive learning', 'intelligent tutoring', 'ai tutor',
                'khanmigo', 'socratic', 'chegg', 'wolfram alpha',
                # Assessment & Proctoring
                'respondus', 'proctorio', 'examity', 'honorlock',
                'respondus lockdown browser', 'turnitin', 'unicheck', 'originality.ai',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 22. MARKETING TECH & ANALYTICS  (90+ entries)
    # ══════════════════════════════════════════════════════════════════
    'martech': [
                # Analytics Platforms
                'google analytics', 'ga4', 'google analytics 4',
                'adobe analytics', 'mixpanel', 'amplitude', 'heap', 'segment',
                'rudderstack', 'snowplow', 'june', 'posthog', 'pendo',
                'fullstory', 'hotjar', 'mouseflow', 'clarity', 'logrocket',
                'quantum metric',
                # Marketing Automation
                'hubspot', 'marketo', 'salesforce marketing cloud',
                'pardot', 'eloqua', 'mailchimp', 'klaviyo', 'braze', 'iterable',
                'customer.io', 'sendgrid', 'twilio sendgrid', 'activecampaign',
                'constant contact', 'omnisend', 'drip', 'convertkit',
                # CRM
                'salesforce', 'salesforce crm', 'hubspot crm', 'pipedrive',
                'zoho crm', 'microsoft dynamics', 'freshsales', 'close crm',
                'copper', 'insightly', 'sugar crm',
                # Advertising
                'google ads', 'meta ads', 'facebook ads', 'instagram ads',
                'linkedin ads', 'twitter ads', 'x ads', 'tiktok ads',
                'programmatic advertising', 'dsp', 'ssp', 'the trade desk',
                'dv360', 'amazon dsp', 'criteo', 'taboola', 'outbrain',
                # SEO
                'seo', 'technical seo', 'on-page seo', 'off-page seo',
                'semrush', 'ahrefs', 'moz', 'screaming frog', 'sitebulb',
                'google search console', 'bing webmaster', 'yoast seo',
                'rank math', 'schema markup', 'structured data',
                # Attribution & CDP
                'mparticle', 'tealium', 'treasure data', 'lytics',
                'zeotap', 'bluekai', 'liveramp', 'salesforce cdp',
                'attribution', 'multi-touch attribution', 'media mix modeling',
                # A/B Testing
                'optimizely', 'vwo', 'ab tasty', 'google optimize', 'statsig',
                'growthbook', 'launchdarkly', 'flagsmith', 'unleash', 'split.io',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 23. OS & LOW-LEVEL SYSTEMS  (65+ entries)
    # ══════════════════════════════════════════════════════════════════
    'os_systems': [
                # Linux Distributions
                'linux', 'ubuntu', 'ubuntu server', 'debian', 'debian stable',
                'centos', 'centos stream 9', 'rhel', 'red hat enterprise linux',
                'fedora', 'arch linux', 'manjaro', 'alpine linux', 'gentoo',
                'slackware', 'nixos', 'void linux', 'opensuse', 'opensuse leap',
                'opensuse tumbleweed', 'oracle linux', 'rocky linux', 'almalinux',
                'pop os', 'elementary os', 'mint', 'zorin os', 'kali linux',
                'parrot os',
                # Immutable / Container OS
                'flatcar', 'fedora coreos', 'bottlerocket', 'talos linux', 'kairos',
                # Windows
                'windows', 'windows 10', 'windows 11', 'windows server 2019',
                'windows server 2022', 'wsl', 'wsl2', 'hyper-v', 'powershell',
                'windows terminal',
                # macOS
                'macos', 'macos sonoma', 'macos ventura', 'homebrew', 'rosetta 2',
                'apple silicon', 'm1', 'm2', 'm3', 'm4',
                # BSD / Others
                'freebsd', 'openbsd', 'netbsd', 'dragonflybsd',
                'solaris', 'illumos', 'aix', 'hp-ux', 'z/os',
                # Hypervisors & Virtualization
                'vmware', 'vmware esxi', 'vsphere', 'virtualbox', 'kvm', 'qemu',
                'proxmox', 'xenserver', 'citrix hypervisor', 'hyper-v',
                'parallels', 'utm',
                # Kernel & Systems
                'linux kernel', 'ebpf', 'xdp', 'bpf', 'cgroups', 'namespaces',
                'systemd', 'init', 'udev', 'grub', 'uefi', 'bios',
                'posix', 'unix', 'gnu tools',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 24. AGILE, METHODOLOGIES & ARCHITECTURE  (110+ entries)
    # ══════════════════════════════════════════════════════════════════
    'methodologies': [
                # Agile Frameworks
                'agile', 'scrum', 'kanban', 'lean', 'xp', 'extreme programming',
                'safe', 'scaled agile framework', 'less', 'less huge',
                'spotify model', 'dora metrics', 'flow metrics',
                # Scrum Events & Artifacts
                'sprint', 'sprint planning', 'sprint review', 'retrospective',
                'daily standup', 'daily scrum', 'product backlog', 'sprint backlog',
                'user stories', 'epics', 'story points', 'velocity', 'burndown',
                'definition of done', 'definition of ready',
                # Engineering Practices
                'tdd', 'bdd', 'atdd', 'ddd', 'domain driven design',
                'clean architecture', 'solid', 'solid principles',
                'dry', 'kiss', 'yagni', 'boy scout rule', 'design patterns',
                'gang of four', 'refactoring', 'code review', 'pair programming',
                'mob programming', 'ensemble programming', 'code coverage',
                'mutation testing', 'property-based testing',
                # Architecture Patterns
                'microservices', 'monolith', 'monorepo', 'polyrepo',
                'serverless', 'event-driven', 'event sourcing', 'cqrs',
                'api gateway', 'service mesh', 'sidecar', 'ambassador pattern',
                'hexagonal architecture', 'ports and adapters', 'onion architecture',
                'clean code', 'twelve-factor app', 'cell-based architecture',
                'modular monolith', 'vertical slice architecture',
                'strangler fig', 'anti-corruption layer',
                # API Architecture
                'rest', 'restful', 'graphql', 'grpc', 'trpc', 'soap',
                'api versioning', 'api gateway', 'api security', 'api rate limiting',
                'api contract', 'consumer-driven contracts', 'pact',
                # Observability & SRE
                'sre', 'site reliability engineering', 'slo', 'sla', 'sli',
                'error budget', 'incident management', 'postmortem', 'blameless',
                'observability', 'logs', 'metrics', 'traces', 'opentelemetry',
                'chaos engineering', 'chaos monkey', 'gameday',
                'feature flags', 'feature toggles', 'canary deployment',
                'blue green deployment', 'rolling deployment', 'a/b deployment',
                # Team Topologies
                'team topologies', 'stream aligned team', 'platform team',
                'enabling team', 'complicated subsystem team', 'cognitive load',
                'conways law', 'inverse conway maneuver',
                # Project Management
                'waterfall', 'v-model', 'spiral model', 'rad', 'incremental',
                'rup', 'prince2', 'pmbok', 'pmp', 'critical path', 'gantt',
                'pert', 'earned value management', 'okrs', 'kpis',
                # Soft Skills
                'communication', 'technical communication', 'stakeholder management',
                'teamwork', 'problem solving', 'critical thinking', 'systems thinking',
                'time management', 'leadership', 'mentoring', 'coaching',
                'technical writing', 'documentation', 'adr', 'rfcs',
    ],

    # ══════════════════════════════════════════════════════════════════
    # 25. REGIONAL & GLOBAL TECH ECOSYSTEMS  (110+ entries)
    # ══════════════════════════════════════════════════════════════════
    'regional_tech': [
                # India Tech Stack
                'upi', 'bhim', 'aadhaar api', 'digilocker', 'account aggregator',
                'ondc', 'ocen', 'india stack', 'gstn', 'irctc api', 'razorpay',
                'paytm', 'phonepe', 'juspay', 'cashfree', 'zeta', 'open money',
                # China Tech Stack
                'wechat mini program', 'weixin', 'alipay', 'dingtalk', 'lark',
                'baidu apollo', 'bytedance', 'tencent', 'alibaba', 'jd.com',
                'huawei hms', 'harmony os', 'harmonyos', 'harmonyos next',
                'oppo coloros', 'miui', 'flyme',
                # Japan Tech
                'ntt docomo api', 'line mini app', 'paypay', 'rakuten pay',
                # Korea Tech
                'kakao sdk', 'naver oauth', 'kakaopay', 'naverpay', 'toss',
                # Southeast Asia Tech
                'grab api', 'gojek', 'sea group', 'shopee', 'lazada', 'tokopedia',
                'bukalapak', 'ovo', 'gopay', 'truemoney', 'gcash',
                'maya', 'xendit', 'midtrans', 'flip',
                # Middle East Tech
                'stc pay', 'mada', 'benefit pay', 'noqoody', 'tap payments',
                'tabby', 'tamara', 'postpay',
                # Africa Tech
                'mpesa', 'm-pesa', 'paystack', 'flutterwave', 'mtn mobile money',
                'airtel money', 'opay', 'chipper cash', 'interswitch',
                # Europe Tech
                'sepa', 'open banking europe', 'psd2', 'klarna', 'adyen',
                'checkout.com', 'mollie', 'stripe europe', 'sumup', 'izettle',
                'bancontact', 'ideal', 'sofort', 'giropay', 'eps', 'przelewy24',
                # Brazil / LATAM Tech
                'pix', 'open finance brasil', 'cielo', 'stone', 'pagseguro',
                'mercadopago', 'rede', 'getnet',
                # Global Standards Bodies
                'w3c', 'ietf', 'ieee', 'iso', 'iec', 'ansi', 'din', 'jis',
                'bsi', 'etsi', 'gsma', '3gpp', 'wi-fi alliance', 'bluetooth sig',
                'zigbee alliance', 'z-wave alliance', 'matter standard',
                # Global Cloud Regions (AWS)
                'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1',
                'ap-northeast-1', 'ap-south-1', 'me-south-1', 'af-south-1',
                'sa-east-1',
            ],
        }
        
        # Responsibility indicators
        self.responsibility_indicators = [
            r'[-•*]\s*(.+)',  # Bullet points
            r'responsibilities?[:\s]*(.+)',  # Responsibilities section
            r'what you\'ll do[:\s]*(.+)',  # Modern job descriptions
            r'your role[:\s]*(.+)',  # Role description
            r'duties?[:\s]*(.+)',  # Duties section
        ]
    
    def parse(self, jd_text: str) -> Dict[str, Any]:
        """
        Parse job description and extract structured information.
        
        Args:
            jd_text: Raw job description text
            
        Returns:
            Dictionary with extracted job information
        """
        try:
            self.logger.info("Starting job description parsing")
            
            # Clean and normalize text
            cleaned_text = self._clean_text(jd_text)
            
            # Extract all components
            result = {
                'required_skills': self.extract_required_skills(cleaned_text),
                'preferred_skills': self.extract_preferred_skills(cleaned_text),
                'min_experience_years': None,
                'max_experience_years': None,
                'education_requirement': self.extract_education_requirement(cleaned_text),
                'key_responsibilities': self.extract_key_responsibilities(cleaned_text),
                'employment_type': self.extract_employment_type(cleaned_text),
                'seniority_level': self.detect_seniority(cleaned_text),
                'all_skills_detected': self._extract_all_skills(cleaned_text),
                'salary_range': self._extract_salary_range(cleaned_text),
                'location': self._extract_location(cleaned_text),
                'company': self._extract_company(cleaned_text),
                'job_title': self._extract_job_title(cleaned_text)
            }
            
            # Extract experience requirements
            min_exp, max_exp = self.extract_experience_requirement(cleaned_text)
            result['min_experience_years'] = min_exp
            result['max_experience_years'] = max_exp
            
            # Post-processing and validation
            result = self._post_process_result(result)
            
            self.logger.info(f"Successfully parsed job description: {result['job_title']}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error parsing job description: {e}")
            return self._create_empty_result()
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize job description text."""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize bullet points
        text = re.sub(r'[·•▪▫◦‣⁃]', '-', text)
        
        # Remove special characters but keep important ones
        text = re.sub(r'[^\w\s\-\.\,\;\:\!\?\(\)\[\]/\+\&\@]', ' ', text)
        
        # Convert to lowercase for pattern matching (keep original for some extractions)
        return text.strip()
    
    def extract_required_skills(self, text: str) -> List[str]:
        """Extract required skills from job description."""
        skills = []
        text_lower = text.lower()
        
        # Try pattern-based extraction first
        for pattern in self.skill_patterns['required']:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                extracted = self._extract_skills_from_text(match)
                skills.extend(extracted)
        
        # If no pattern matches, try general skill extraction
        if not skills:
            skills = self._extract_all_skills(text)
        
        # Remove duplicates and sort
        return sorted(list(set(skills)))
    
    def extract_preferred_skills(self, text: str) -> List[str]:
        """Extract preferred skills from job description."""
        skills = []
        text_lower = text.lower()
        
        # Try pattern-based extraction
        for pattern in self.skill_patterns['preferred']:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                extracted = self._extract_skills_from_text(match)
                skills.extend(extracted)
        
        # Remove duplicates and sort
        return sorted(list(set(skills)))
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from a piece of text."""
        skills = []
        text_lower = text.lower()
        
        # Check for tech keywords
        for category, keywords in self.tech_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    skills.append(keyword.title() if keyword.islower() else keyword)
        
        # Extract capitalized words (potential skills)
        capitalized_words = re.findall(r'\b[A-Z][a-zA-Z]+\b', text)
        for word in capitalized_words:
            if len(word) > 2 and word not in skills:
                # Filter out common non-skill words
                if not self._is_common_word(word.lower()):
                    skills.append(word)
        
        return skills
    
    def _extract_all_skills(self, text: str) -> List[str]:
        """Extract all skills from text using various methods."""
        skills = []
        text_lower = text.lower()
        
        # Tech keywords
        for category, keywords in self.tech_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    skills.append(keyword.title() if keyword.islower() else keyword)
        
        # Look for skill sections
        skill_section_patterns = [
            r'(?:skills?|technologies?|stack|tools?)[:\s]*([^\n]*)',
            r'(?:technical skills?|programming languages?)[:\s]*([^\n]*)',
        ]
        
        for pattern in skill_section_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                extracted = self._extract_skills_from_text(match)
                skills.extend(extracted)
        
        return sorted(list(set(skills)))
    
    def _is_common_word(self, word: str) -> bool:
        """Check if a word is a common non-skill word."""
        common_words = {
            'experience', 'required', 'preferred', 'skills', 'ability', 'knowledge',
            'strong', 'excellent', 'good', 'years', 'plus', 'including', 'various',
            'multiple', 'related', 'relevant', 'field', 'industry', 'business',
            'development', 'management', 'support', 'analysis', 'design',
            'quality', 'high', 'level', 'position', 'role', 'team', 'work'
        }
        return word in common_words
    
    def detect_seniority(self, text: str) -> str:
        """Detect seniority level from job description."""
        text_lower = text.lower()
        
        # Score each seniority level
        scores = {}
        
        for level, patterns in self.seniority_patterns.items():
            score = 0
            for pattern in patterns:
                matches = re.findall(pattern, text_lower)
                score += len(matches)
            scores[level] = score
        
        # Return the level with highest score
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        
        return 'Mid'  # Default fallback
    
    def extract_experience_requirement(self, text: str) -> Tuple[Optional[int], Optional[int]]:
        """Extract minimum and maximum experience requirements."""
        text_lower = text.lower()
        
        min_years = None
        max_years = None
        
        for pattern in self.experience_patterns:
            matches = re.findall(pattern, text_lower)
            
            for match in matches:
                if isinstance(match, tuple):
                    # Range pattern (e.g., "3-5 years")
                    first, second = match
                    if first and second:
                        min_exp = int(first)
                        max_exp = int(second)
                        min_years = min(min_years, min_exp) if min_years is not None else min_exp
                        max_years = max(max_years, max_exp) if max_years is not None else max_exp
                    elif first:
                        exp = int(first)
                        if '+' in pattern:
                            max_years = max(max_years, exp) if max_years is not None else exp
                        else:
                            min_years = min(min_years, exp) if min_years is not None else exp
                            max_years = max(max_years, exp) if max_years is not None else exp
                else:
                    # Single number pattern
                    exp = int(match)
                    if '+' in pattern:
                        max_years = max(max_years, exp) if max_years is not None else exp
                    else:
                        min_years = min(min_years, exp) if min_years is not None else exp
                        max_years = max(max_years, exp) if max_years is not None else exp
        
        return min_years, max_years
    
    def extract_education_requirement(self, text: str) -> str:
        """Extract education requirement from job description."""
        text_lower = text.lower()
        
        # Score each education level
        scores = {}
        
        for level, patterns in self.education_patterns.items():
            score = 0
            for pattern in patterns:
                matches = re.findall(pattern, text_lower)
                score += len(matches)
            scores[level] = score
        
        # Return the level with highest score
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        
        return 'Any'  # Default fallback
    
    def extract_key_responsibilities(self, text: str) -> List[str]:
        """Extract key responsibilities from job description."""
        responsibilities = []
        
        # Try different patterns for responsibilities
        for pattern in self.responsibility_indicators:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            
            for match in matches:
                # Clean up the responsibility
                responsibility = match.strip()
                
                # Filter out very short or irrelevant items
                if len(responsibility) > 10 and not self._is_responsibility_noise(responsibility):
                    responsibilities.append(responsibility)
        
        # If no structured responsibilities found, try to extract from bullet points
        if not responsibilities:
            bullet_points = re.findall(r'^[-•*]\s*(.+)$', text, re.MULTILINE)
            for point in bullet_points:
                if len(point.strip()) > 10:
                    responsibilities.append(point.strip())
        
        # Remove duplicates and limit to top 10
        unique_responsibilities = []
        seen = set()
        
        for resp in responsibilities:
            resp_lower = resp.lower()
            if resp_lower not in seen and len(unique_responsibilities) < 10:
                seen.add(resp_lower)
                unique_responsibilities.append(resp)
        
        return unique_responsibilities
    
    def _is_responsibility_noise(self, text: str) -> bool:
        """Check if responsibility text is noise."""
        noise_indicators = [
            'requirements:', 'qualifications:', 'skills:', 'benefits:',
            'about us:', 'company:', 'location:', 'salary:', 'apply now'
        ]
        
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in noise_indicators)
    
    def extract_employment_type(self, text: str) -> str:
        """Extract employment type from job description."""
        text_lower = text.lower()
        
        # Score each employment type
        scores = {}
        
        for emp_type, patterns in self.employment_patterns.items():
            score = 0
            for pattern in patterns:
                matches = re.findall(pattern, text_lower)
                score += len(matches)
            scores[emp_type] = score
        
        # Return the type with highest score
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        
        return 'full-time'  # Default fallback
    
    def _extract_salary_range(self, text: str) -> Optional[str]:
        """Extract salary range from job description."""
        salary_patterns = [
            r'\$[\d,]+[-–]\$?[\d,]+(?:\s*per\s*year)?',
            r'\$[\d,]+\s*[-–to]\s*\$?[\d,]+',
            r'(\d{1,3}[,\d{3}]*)\s*[-–to]\s*(\d{1,3}[,\d{3}]*)\s*k',
            r'(\d{1,3})k\s*[-–to]\s*(\d{1,3})k',
        ]
        
        for pattern in salary_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return None
    
    def _extract_location(self, text: str) -> Optional[str]:
        """Extract location from job description."""
        # Look for common location patterns
        location_patterns = [
            r'location[:\s]*([^\n,]+)',
            r'based in ([^\n,]+)',
            r'([A-Za-z\s]+,\s*[A-Z]{2})',  # City, State pattern
            r'([A-Za-z\s]+,\s*[A-Za-z\s]+)',  # City, Country pattern
        ]
        
        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                if len(location) > 2 and len(location) < 50:
                    return location
        
        return None
    
    def _extract_company(self, text: str) -> Optional[str]:
        """Extract company name from job description."""
        # Look for company patterns
        company_patterns = [
            r'company[:\s]*([^\n,]+)',
            r'about ([^\n,]+)',
            r'at ([A-Z][a-zA-Z\s&]+)',  # "at CompanyName"
        ]
        
        for pattern in company_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                company = match.group(1).strip()
                if len(company) > 2 and len(company) < 50:
                    return company
        
        return None
    
    def _extract_job_title(self, text: str) -> Optional[str]:
        """Extract job title from job description."""
        lines = text.split('\n')
        
        # Job title is usually in the first few lines
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if len(line) > 5 and len(line) < 100:
                # Check if it looks like a title (contains common job keywords)
                job_keywords = [
                    'engineer', 'developer', 'manager', 'analyst', 'designer',
                    'architect', 'consultant', 'specialist', 'coordinator',
                    'director', 'lead', 'senior', 'junior', 'associate'
                ]
                
                line_lower = line.lower()
                if any(keyword in line_lower for keyword in job_keywords):
                    # Remove common prefixes
                    title = re.sub(r'^(job title|position|role)[:\s]*', '', line, re.IGNORECASE)
                    return title.strip()
        
        return None
    
    def _post_process_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Post-process and validate the parsed result."""
        # Ensure experience years are reasonable
        if result['min_experience_years'] is not None:
            result['min_experience_years'] = max(0, min(result['min_experience_years'], 50))
        
        if result['max_experience_years'] is not None:
            result['max_experience_years'] = max(0, min(result['max_experience_years'], 50))
        
        # Ensure min <= max for experience
        if (result['min_experience_years'] is not None and 
            result['max_experience_years'] is not None and
            result['min_experience_years'] > result['max_experience_years']):
            result['min_experience_years'], result['max_experience_years'] = (
                result['max_experience_years'], result['min_experience_years']
            )
        
        # Limit skills to reasonable number
        result['required_skills'] = result['required_skills'][:20]
        result['preferred_skills'] = result['preferred_skills'][:20]
        result['all_skills_detected'] = result['all_skills_detected'][:50]
        
        # Limit responsibilities
        result['key_responsibilities'] = result['key_responsibilities'][:10]
        
        return result
    
    def _create_empty_result(self) -> Dict[str, Any]:
        """Create an empty result structure for error cases."""
        return {
            'required_skills': [],
            'preferred_skills': [],
            'min_experience_years': None,
            'max_experience_years': None,
            'education_requirement': 'Any',
            'key_responsibilities': [],
            'employment_type': 'full-time',
            'seniority_level': 'Mid',
            'all_skills_detected': [],
            'salary_range': None,
            'location': None,
            'company': None,
            'job_title': None
        }


# Example usage and testing
if __name__ == "__main__":
    # Sample job description for testing
    sample_jd = """
    Senior Software Engineer
    
    We are looking for a Senior Software Engineer to join our growing team.
    
    Requirements:
    - 5+ years of experience in software development
    - Strong knowledge of Python, JavaScript, and React
    - Experience with AWS and Docker
    - Bachelor's degree in Computer Science or related field
    
    Responsibilities:
    - Design and develop scalable web applications
    - Lead a team of 3-5 junior developers
    - Collaborate with product managers and stakeholders
    - Write clean, maintainable code
    
    Preferred Skills:
    - Experience with Kubernetes
    - Knowledge of TypeScript
    - Familiarity with Agile methodologies
    
    This is a full-time position based in San Francisco, CA.
    Salary: $120,000 - $160,000 per year
    """
    
    try:
        # Initialize parser
        parser = JobDescriptionParser()
        
        print("🔍 Testing Job Description Parser")
        print("=" * 50)
        
        # Parse the job description
        result = parser.parse(sample_jd)
        
        print("📋 Parsed Job Information:")
        print(f"  Job Title: {result['job_title']}")
        print(f"  Seniority Level: {result['seniority_level']}")
        print(f"  Experience: {result['min_experience_years']}-{result['max_experience_years']} years")
        print(f"  Education: {result['education_requirement']}")
        print(f"  Employment Type: {result['employment_type']}")
        print(f"  Location: {result['location']}")
        print(f"  Salary: {result['salary_range']}")
        
        print(f"\n🛠️  Required Skills ({len(result['required_skills'])}):")
        for skill in result['required_skills']:
            print(f"    • {skill}")
        
        print(f"\n✨ Preferred Skills ({len(result['preferred_skills'])}):")
        for skill in result['preferred_skills']:
            print(f"    • {skill}")
        
        print(f"\n📝 Key Responsibilities ({len(result['key_responsibilities'])}):")
        for i, resp in enumerate(result['key_responsibilities'], 1):
            print(f"    {i}. {resp}")
        
        print(f"\n🔧 All Skills Detected ({len(result['all_skills_detected'])}):")
        for skill in result['all_skills_detected']:
            print(f"    • {skill}")
        
        print("\n✅ Job description parser test completed!")
        
    except Exception as e:
        print(f"❌ Error testing job description parser: {e}")
