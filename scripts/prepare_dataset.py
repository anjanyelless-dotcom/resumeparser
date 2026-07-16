from __future__ import annotations

import json
import random
from pathlib import Path


def build_examples() -> list[dict[str, str]]:
    examples: list[dict[str, str]] = []

    examples.append(
        {
            "input": (
                "MICHELLE CARTER\n"
                "Seattle, WA | michelle.carter@email.com | (206) 555-0198\n"
                "LinkedIn: linkedin.com/in/mcarter-data\n"
                "Work Authorization: US Citizen\n"
                "\n"
                "SUMMARY\n"
                "Senior Data Engineer with 12+ years of experience in data platforms, "
                "streaming pipelines, and cloud analytics. Expert in AWS, Spark, "
                "Airflow, and SQL.\n"
                "\n"
                "EXPERIENCE\n"
                "Amazon - Principal Data Engineer (2019 - Present) - Seattle, WA\n"
                "Built real-time Kafka pipelines and a lakehouse on S3/Glue/Athena.\n"
                "Led migration from on-prem Hadoop to AWS EMR and Spark.\n"
                "\n"
                "Target - Senior Data Engineer (2014 - 2019) - Minneapolis, MN\n"
                "Designed data models and ETL workflows using Airflow and Redshift.\n"
                "\n"
                "EDUCATION\n"
                "M.S. Computer Science, University of Washington, 2012\n"
                "B.S. Computer Science, Oregon State University, 2010\n"
                "\n"
                "CERTIFICATIONS\n"
                "AWS Certified Data Analytics - Specialty\n"
                "\n"
                "SKILLS\n"
                "Python, SQL, Spark, Kafka, Airflow, AWS, Redshift, Glue, Terraform\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Michelle Carter",
                        "email": "michelle.carter@email.com",
                        "phone": "(206) 555-0198",
                        "location": "Seattle, WA",
                        "work_authorization": "US Citizen",
                    },
                    "experience_summary": {
                        "total_years": 12,
                        "current_company": "Amazon",
                        "current_role": "Principal Data Engineer",
                    },
                    "skills": {
                        "primary_skills": [
                            "Data Engineering",
                            "AWS",
                            "Spark",
                            "Kafka",
                            "Airflow",
                        ],
                        "all_skills_normalized": [
                            "python",
                            "sql",
                            "spark",
                            "kafka",
                            "airflow",
                            "aws",
                            "redshift",
                            "glue",
                            "terraform",
                        ],
                    },
                    "education": {
                        "degree": "M.S. Computer Science",
                        "institution": "University of Washington",
                        "graduation_year": 2012,
                        "score": None,
                    },
                    "certifications": [
                        "AWS Certified Data Analytics - Specialty"
                    ],
                    "projects": [
                        {
                            "name": "Realtime Retail Lakehouse",
                            "summary": "Kafka to S3/Glue/Athena platform for analytics.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "DAVID NGUYEN\n"
                "San Jose, CA | david.nguyen@proton.me | +1 408 555 4477\n"
                "LinkedIn: linkedin.com/in/davidnguyen-sre\n"
                "US Work Authorization: H1B\n"
                "\n"
                "PROFILE\n"
                "Senior DevOps Engineer (11 years) specializing in Kubernetes, "
                "CI/CD, and reliability engineering on GCP and Azure.\n"
                "\n"
                "PROFESSIONAL EXPERIENCE\n"
                "Google - Senior DevOps Engineer (2018 - Present) - Mountain View, CA\n"
                "Built multi-cluster GKE deployments and automated IaC with Terraform.\n"
                "\n"
                "Cisco - DevOps Engineer (2013 - 2018) - San Jose, CA\n"
                "Implemented Jenkins pipelines and monitoring with Prometheus/Grafana.\n"
                "\n"
                "EDUCATION\n"
                "B.Tech, Information Technology, NIT Trichy, 2013\n"
                "\n"
                "SKILLS\n"
                "Kubernetes, Docker, Terraform, Jenkins, GCP, Azure, Prometheus, Grafana\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "David Nguyen",
                        "email": "david.nguyen@proton.me",
                        "phone": "+1 408 555 4477",
                        "location": "San Jose, CA",
                        "work_authorization": "H1B",
                    },
                    "experience_summary": {
                        "total_years": 11,
                        "current_company": "Google",
                        "current_role": "Senior DevOps Engineer",
                    },
                    "skills": {
                        "primary_skills": [
                            "DevOps",
                            "Kubernetes",
                            "CI/CD",
                            "Terraform",
                        ],
                        "all_skills_normalized": [
                            "kubernetes",
                            "docker",
                            "terraform",
                            "jenkins",
                            "gcp",
                            "azure",
                            "prometheus",
                            "grafana",
                        ],
                    },
                    "education": {
                        "degree": "B.Tech, Information Technology",
                        "institution": "NIT Trichy",
                        "graduation_year": 2013,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Multi-cluster GKE Platform",
                            "summary": "GKE fleet with Terraform and automated releases.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "ALISON RODRIGUEZ\n"
                "Austin, TX | alison.rodriguez@gmail.com | 512-555-7781\n"
                "\n"
                "SUMMARY\n"
                "Full Stack Developer with 5 years of experience building React and "
                "Node.js applications. Experienced with PostgreSQL and AWS.\n"
                "\n"
                "EXPERIENCE\n"
                "BigCommerce - Full Stack Developer (2021 - Present) - Austin, TX\n"
                "Built customer analytics dashboards and REST APIs.\n"
                "\n"
                "Dell - Software Engineer (2019 - 2021) - Austin, TX\n"
                "Maintained React UI and Python services.\n"
                "\n"
                "EDUCATION\n"
                "B.S. Software Engineering, UT Austin, 2019\n"
                "\n"
                "TECHNICAL SKILLS\n"
                "React.js, Node.js, TypeScript, PostgreSQL, AWS, Docker\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Alison Rodriguez",
                        "email": "alison.rodriguez@gmail.com",
                        "phone": "512-555-7781",
                        "location": "Austin, TX",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 5,
                        "current_company": "BigCommerce",
                        "current_role": "Full Stack Developer",
                    },
                    "skills": {
                        "primary_skills": [
                            "React",
                            "Node.js",
                            "TypeScript",
                        ],
                        "all_skills_normalized": [
                            "react",
                            "node.js",
                            "typescript",
                            "postgresql",
                            "aws",
                            "docker",
                        ],
                    },
                    "education": {
                        "degree": "B.S. Software Engineering",
                        "institution": "UT Austin",
                        "graduation_year": 2019,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Customer Analytics Dashboard",
                            "summary": "React/Node analytics platform for ecommerce.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "RAVI SINGH\n"
                "Toronto, ON | ravi.singh@outlook.com | +1-647-555-9333\n"
                "LinkedIn: linkedin.com/in/ravisingh-dev\n"
                "\n"
                "PROFESSIONAL SUMMARY\n"
                "Backend developer with 4 years of experience in Java and Spring Boot. "
                "Built APIs for fintech clients using PostgreSQL and Redis.\n"
                "\n"
                "WORK HISTORY\n"
                "ClearPay - Backend Developer (2020 - Present) - Toronto, ON\n"
                "Built payment APIs and fraud detection services.\n"
                "\n"
                "KPMG - Software Engineer (2019 - 2020) - Toronto, ON\n"
                "Developed batch ETL jobs in Java.\n"
                "\n"
                "EDUCATION\n"
                "B.Sc. Computer Science, University of Toronto, 2019\n"
                "\n"
                "SKILLS\n"
                "Java, Spring Boot, PostgreSQL, Redis, Kafka, Docker\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Ravi Singh",
                        "email": "ravi.singh@outlook.com",
                        "phone": "+1-647-555-9333",
                        "location": "Toronto, ON",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 4,
                        "current_company": "ClearPay",
                        "current_role": "Backend Developer",
                    },
                    "skills": {
                        "primary_skills": [
                            "Java",
                            "Spring Boot",
                            "PostgreSQL",
                        ],
                        "all_skills_normalized": [
                            "java",
                            "spring boot",
                            "postgresql",
                            "redis",
                            "kafka",
                            "docker",
                        ],
                    },
                    "education": {
                        "degree": "B.Sc. Computer Science",
                        "institution": "University of Toronto",
                        "graduation_year": 2019,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Payment API Platform",
                            "summary": "Spring Boot microservices for payments.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "ANJALI SHARMA\n"
                "Hyderabad, India | anjali.sharma@gmail.com | +91-98765-12345\n"
                "\n"
                "OBJECTIVE\n"
                "Entry-level software engineer seeking a backend role. "
                "Strong in Python and SQL.\n"
                "\n"
                "INTERNSHIP\n"
                "Infosys - Software Intern (Jan 2024 - Jun 2024)\n"
                "Built a Flask app to track employee onboarding.\n"
                "\n"
                "EDUCATION\n"
                "B.Tech Computer Science, JNTU, 2024\n"
                "CGPA: 8.6\n"
                "\n"
                "SKILLS\n"
                "Python, Flask, SQL, Git\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Anjali Sharma",
                        "email": "anjali.sharma@gmail.com",
                        "phone": "+91-98765-12345",
                        "location": "Hyderabad, India",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 0,
                        "current_company": None,
                        "current_role": "Software Intern",
                    },
                    "skills": {
                        "primary_skills": ["Python", "SQL", "Flask"],
                        "all_skills_normalized": [
                            "python",
                            "flask",
                            "sql",
                            "git",
                        ],
                    },
                    "education": {
                        "degree": "B.Tech Computer Science",
                        "institution": "JNTU",
                        "graduation_year": 2024,
                        "score": "8.6",
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Employee Onboarding Tracker",
                            "summary": "Flask app for onboarding workflow.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "JASON MILLER\n"
                "Boston, MA | jason.miller@outlook.com | (617) 555-2311\n"
                "LinkedIn: linkedin.com/in/jmiller-java\n"
                "GitHub: github.com/jmiller\n"
                "Work Authorization: Green Card\n"
                "\n"
                "SUMMARY\n"
                "Senior Software Engineer with 8+ years in Java, Spring Boot, and "
                "microservices.\n"
                "\n"
                "EXPERIENCE\n"
                "Fidelity Investments - Senior Software Engineer (06/2018 - Present)\n"
                "Owned microservices for trading analytics; improved latency 30%.\n"
                "\n"
                "Wayfair - Software Engineer (07/2016 - 05/2018)\n"
                "Built order APIs with Spring MVC and PostgreSQL.\n"
                "\n"
                "EDUCATION\n"
                "M.S. Software Engineering, Northeastern University, 2016\n"
                "\n"
                "CERTIFICATIONS\n"
                "Oracle Certified Professional, Java SE 11\n"
                "\n"
                "SKILLS\n"
                "Java, Spring Boot, Spring MVC, REST, PostgreSQL, Redis, Kafka, Docker, AWS\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Jason Miller",
                        "email": "jason.miller@outlook.com",
                        "phone": "(617) 555-2311",
                        "location": "Boston, MA",
                        "work_authorization": "Green Card",
                    },
                    "experience_summary": {
                        "total_years": 8,
                        "current_company": "Fidelity Investments",
                        "current_role": "Senior Software Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Java", "Spring Boot", "Microservices"],
                        "all_skills_normalized": [
                            "java",
                            "spring boot",
                            "spring mvc",
                            "rest",
                            "postgresql",
                            "redis",
                            "kafka",
                            "docker",
                            "aws",
                        ],
                    },
                    "education": {
                        "degree": "M.S. Software Engineering",
                        "institution": "Northeastern University",
                        "graduation_year": 2016,
                        "score": None,
                    },
                    "certifications": ["Oracle Certified Professional, Java SE 11"],
                    "projects": [
                        {
                            "name": "Trading Analytics Services",
                            "summary": "Spring Boot microservices for trading insights.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "NORA HANSEN\n"
                "Berlin, Germany | nora.hansen@mail.de | +49 30 5555 1223\n"
                "\n"
                "PROFILE\n"
                ".NET Engineer with 6 years of experience in C#, ASP.NET Core, and Azure.\n"
                "\n"
                "WORK EXPERIENCE\n"
                "Zalando - Software Engineer (2019-2024)\n"
                "Modernized payment APIs using .NET 6 and Azure Functions.\n"
                "\n"
                "EDUCATION\n"
                "B.Sc. Computer Engineering, TU Berlin, 2018\n"
                "\n"
                "TECH SKILLS\n"
                "C#, .NET Core, ASP.NET, Azure, SQL Server, Redis, Terraform, Git\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Nora Hansen",
                        "email": "nora.hansen@mail.de",
                        "phone": "+49 30 5555 1223",
                        "location": "Berlin, Germany",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 6,
                        "current_company": "Zalando",
                        "current_role": "Software Engineer",
                    },
                    "skills": {
                        "primary_skills": [".NET", "C#", "Azure"],
                        "all_skills_normalized": [
                            "c#",
                            ".net core",
                            "asp.net",
                            "azure",
                            "sql server",
                            "redis",
                            "terraform",
                            "git",
                        ],
                    },
                    "education": {
                        "degree": "B.Sc. Computer Engineering",
                        "institution": "TU Berlin",
                        "graduation_year": 2018,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Payment API Modernization",
                            "summary": "ASP.NET Core APIs on Azure Functions.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "PRANAV GUPTA\n"
                "Pune, India | pranav.gupta@gmail.com | +91 98220 11223\n"
                "GitHub: github.com/pranavgupta\n"
                "\n"
                "SUMMARY\n"
                "Python backend developer with 3 years of experience in Django and REST.\n"
                "\n"
                "EXPERIENCE\n"
                "Persistent Systems - Software Engineer (Feb 2021 - Present)\n"
                "Built internal APIs and async jobs with Celery.\n"
                "\n"
                "EDUCATION\n"
                "B.Tech IT, VIT Pune, 2020\n"
                "\n"
                "SKILLS\n"
                "Python, Django, DRF, Celery, PostgreSQL, Redis, AWS, Git\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Pranav Gupta",
                        "email": "pranav.gupta@gmail.com",
                        "phone": "+91 98220 11223",
                        "location": "Pune, India",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 3,
                        "current_company": "Persistent Systems",
                        "current_role": "Software Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Python", "Django", "REST"],
                        "all_skills_normalized": [
                            "python",
                            "django",
                            "drf",
                            "celery",
                            "postgresql",
                            "redis",
                            "aws",
                            "git",
                        ],
                    },
                    "education": {
                        "degree": "B.Tech IT",
                        "institution": "VIT Pune",
                        "graduation_year": 2020,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Internal Workflow APIs",
                            "summary": "Django services with Celery for async tasks.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "OLIVER BROWN\n"
                "London, UK | oliver.brown@fastmail.com | +44 20 7946 3321\n"
                "LinkedIn: linkedin.com/in/oliverbrown\n"
                "\n"
                "PROFILE\n"
                "Full Stack Engineer (7 years) focused on Node.js, React, and AWS.\n"
                "\n"
                "EMPLOYMENT\n"
                "Deliveroo - Full Stack Engineer (03/2020 - Present)\n"
                "Owned ordering microservices and React web apps.\n"
                "\n"
                "Skyscanner - Software Engineer (2017-2020)\n"
                "Built Node.js APIs and CI pipelines.\n"
                "\n"
                "EDUCATION\n"
                "M.Sc. Computer Science, University of Edinburgh, 2017\n"
                "\n"
                "SKILLS\n"
                "Node.js, React, TypeScript, AWS, DynamoDB, Redis, Docker, GitHub Actions\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Oliver Brown",
                        "email": "oliver.brown@fastmail.com",
                        "phone": "+44 20 7946 3321",
                        "location": "London, UK",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 7,
                        "current_company": "Deliveroo",
                        "current_role": "Full Stack Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Node.js", "React", "AWS"],
                        "all_skills_normalized": [
                            "node.js",
                            "react",
                            "typescript",
                            "aws",
                            "dynamodb",
                            "redis",
                            "docker",
                            "github actions",
                        ],
                    },
                    "education": {
                        "degree": "M.Sc. Computer Science",
                        "institution": "University of Edinburgh",
                        "graduation_year": 2017,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Ordering Platform",
                            "summary": "Node.js microservices and React UI.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "MEGAN PARK\n"
                "Denver, CO | megan.park@icloud.com | 720-555-8891\n"
                "Work Authorization: US Citizen\n"
                "\n"
                "SUMMARY\n"
                "DevOps Engineer with 9 years of experience in AWS, Kubernetes, "
                "and infrastructure automation.\n"
                "\n"
                "EXPERIENCE\n"
                "GE Digital - DevOps Engineer (08/2019 - Present)\n"
                "Built EKS clusters and Terraform modules; reduced deployments by 40%.\n"
                "\n"
                "Oracle - Systems Engineer (2015 - 2019)\n"
                "Dockerized legacy services and implemented CI/CD with Jenkins.\n"
                "\n"
                "EDUCATION\n"
                "B.S. Computer Science, Colorado State University, 2015\n"
                "\n"
                "CERTIFICATIONS\n"
                "AWS Certified Solutions Architect - Associate\n"
                "\n"
                "SKILLS\n"
                "AWS, Kubernetes, Docker, Terraform, Jenkins, Prometheus, Grafana, Helm\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Megan Park",
                        "email": "megan.park@icloud.com",
                        "phone": "720-555-8891",
                        "location": "Denver, CO",
                        "work_authorization": "US Citizen",
                    },
                    "experience_summary": {
                        "total_years": 9,
                        "current_company": "GE Digital",
                        "current_role": "DevOps Engineer",
                    },
                    "skills": {
                        "primary_skills": ["AWS", "Kubernetes", "Terraform"],
                        "all_skills_normalized": [
                            "aws",
                            "kubernetes",
                            "docker",
                            "terraform",
                            "jenkins",
                            "prometheus",
                            "grafana",
                            "helm",
                        ],
                    },
                    "education": {
                        "degree": "B.S. Computer Science",
                        "institution": "Colorado State University",
                        "graduation_year": 2015,
                        "score": None,
                    },
                    "certifications": [
                        "AWS Certified Solutions Architect - Associate"
                    ],
                    "projects": [
                        {
                            "name": "EKS Automation",
                            "summary": "Terraform and Helm modules for AWS EKS.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "SNEHA IYER\n"
                "Bangalore, India | sneha.iyer@yahoo.com | +91 99022 44556\n"
                "\n"
                "PROFILE\n"
                "DevOps Engineer (4 years) specializing in Docker, Kubernetes, and CI/CD.\n"
                "\n"
                "WORK\n"
                "Flipkart - DevOps Engineer (2022/01 - Present)\n"
                "Managed AKS clusters and GitLab CI pipelines.\n"
                "\n"
                "TCS - Cloud Engineer (2020/06 - 2021/12)\n"
                "Built monitoring dashboards using Grafana and Prometheus.\n"
                "\n"
                "EDUCATION\n"
                "M.Tech Cloud Computing, IISc Bangalore, 2020\n"
                "\n"
                "SKILLS\n"
                "Docker, Kubernetes, GitLab CI, Azure, Terraform, Grafana, Prometheus\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Sneha Iyer",
                        "email": "sneha.iyer@yahoo.com",
                        "phone": "+91 99022 44556",
                        "location": "Bangalore, India",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 4,
                        "current_company": "Flipkart",
                        "current_role": "DevOps Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Docker", "Kubernetes", "CI/CD"],
                        "all_skills_normalized": [
                            "docker",
                            "kubernetes",
                            "gitlab ci",
                            "azure",
                            "terraform",
                            "grafana",
                            "prometheus",
                        ],
                    },
                    "education": {
                        "degree": "M.Tech Cloud Computing",
                        "institution": "IISc Bangalore",
                        "graduation_year": 2020,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "CI/CD Modernization",
                            "summary": "GitLab CI pipelines for container deployments.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "SARAH COLLINS\n"
                "Chicago, IL | sarah.collins@gmail.com | (312) 555-9081\n"
                "LinkedIn: linkedin.com/in/sarahqae\n"
                "\n"
                "SUMMARY\n"
                "QA Automation Engineer with 6 years of experience in Selenium, "
                "Cypress, and CI testing.\n"
                "\n"
                "EXPERIENCE\n"
                "United Airlines - QA Engineer (2019 - Present)\n"
                "Automated regression suites in Java + Selenium Grid.\n"
                "\n"
                "Accenture - QA Analyst (2016 - 2019)\n"
                "Built test plans and API test automation.\n"
                "\n"
                "EDUCATION\n"
                "B.S. Information Systems, DePaul University, 2016\n"
                "\n"
                "SKILLS\n"
                "Selenium, Cypress, Java, TestNG, Postman, Jenkins, JIRA\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Sarah Collins",
                        "email": "sarah.collins@gmail.com",
                        "phone": "(312) 555-9081",
                        "location": "Chicago, IL",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 6,
                        "current_company": "United Airlines",
                        "current_role": "QA Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Selenium", "Automation", "Cypress"],
                        "all_skills_normalized": [
                            "selenium",
                            "cypress",
                            "java",
                            "testng",
                            "postman",
                            "jenkins",
                            "jira",
                        ],
                    },
                    "education": {
                        "degree": "B.S. Information Systems",
                        "institution": "DePaul University",
                        "graduation_year": 2016,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Regression Automation",
                            "summary": "Selenium Grid test automation for airline apps.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "AMIT RAO\n"
                "Chennai, India | amit.rao@rediffmail.com | +91 98877 55661\n"
                "\n"
                "PROFILE\n"
                "QA Automation Engineer with 2.5 years of experience in Selenium and "
                "Python test frameworks.\n"
                "\n"
                "EXPERIENCE\n"
                "Infosys - QA Engineer (2022-2024)\n"
                "Created Selenium scripts for web apps and REST API tests.\n"
                "\n"
                "EDUCATION\n"
                "B.Tech Mechanical Engineering, SRM University, 2021\n"
                "\n"
                "SKILLS\n"
                "Selenium, Python, PyTest, Postman, SQL, Git\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Amit Rao",
                        "email": "amit.rao@rediffmail.com",
                        "phone": "+91 98877 55661",
                        "location": "Chennai, India",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 2,
                        "current_company": "Infosys",
                        "current_role": "QA Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Selenium", "Python", "Automation"],
                        "all_skills_normalized": [
                            "selenium",
                            "python",
                            "pytest",
                            "postman",
                            "sql",
                            "git",
                        ],
                    },
                    "education": {
                        "degree": "B.Tech Mechanical Engineering",
                        "institution": "SRM University",
                        "graduation_year": 2021,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Web Test Suite",
                            "summary": "Selenium automation for enterprise portals.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "BRIAN KELLY\n"
                "New York, NY | brian.kelly@columbia.edu | (917) 555-3332\n"
                "\n"
                "SUMMARY\n"
                "Data Scientist with 5 years of experience in ML, NLP, and analytics. "
                "Strong in Python, SQL, and TensorFlow.\n"
                "\n"
                "EXPERIENCE\n"
                "Bloomberg - Data Scientist (2021 - Present)\n"
                "Built NLP models for news classification.\n"
                "\n"
                "Moody's - Data Analyst (2019 - 2021)\n"
                "Created churn models and dashboards.\n"
                "\n"
                "EDUCATION\n"
                "M.S. Data Science, Columbia University, 2019\n"
                "\n"
                "SKILLS\n"
                "Python, SQL, TensorFlow, PyTorch, Pandas, NumPy, Scikit-learn\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Brian Kelly",
                        "email": "brian.kelly@columbia.edu",
                        "phone": "(917) 555-3332",
                        "location": "New York, NY",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 5,
                        "current_company": "Bloomberg",
                        "current_role": "Data Scientist",
                    },
                    "skills": {
                        "primary_skills": ["Python", "Machine Learning", "SQL"],
                        "all_skills_normalized": [
                            "python",
                            "sql",
                            "tensorflow",
                            "pytorch",
                            "pandas",
                            "numpy",
                            "scikit-learn",
                        ],
                    },
                    "education": {
                        "degree": "M.S. Data Science",
                        "institution": "Columbia University",
                        "graduation_year": 2019,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "News Classification",
                            "summary": "NLP classifiers for financial news streams.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "LUCIA ROMANO\n"
                "Milan, Italy | lucia.romano@mail.it | +39 02 1234 7788\n"
                "\n"
                "PROFILE\n"
                "Data Scientist (10 years) focusing on ML pipelines and forecasting.\n"
                "\n"
                "EXPERIENCE\n"
                "Enel - Lead Data Scientist (2018 - Present)\n"
                "Built ML pipelines using Spark and MLflow.\n"
                "\n"
                "Accenture - Data Scientist (2014 - 2018)\n"
                "Developed predictive models for energy demand.\n"
                "\n"
                "EDUCATION\n"
                "PhD Computer Science, Politecnico di Milano, 2014\n"
                "\n"
                "CERTIFICATIONS\n"
                "Google Cloud Professional Data Engineer\n"
                "\n"
                "SKILLS\n"
                "Python, Spark, MLflow, SQL, GCP, Airflow, XGBoost, Tableau\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Lucia Romano",
                        "email": "lucia.romano@mail.it",
                        "phone": "+39 02 1234 7788",
                        "location": "Milan, Italy",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 10,
                        "current_company": "Enel",
                        "current_role": "Lead Data Scientist",
                    },
                    "skills": {
                        "primary_skills": ["Machine Learning", "Python", "Spark"],
                        "all_skills_normalized": [
                            "python",
                            "spark",
                            "mlflow",
                            "sql",
                            "gcp",
                            "airflow",
                            "xgboost",
                            "tableau",
                        ],
                    },
                    "education": {
                        "degree": "PhD Computer Science",
                        "institution": "Politecnico di Milano",
                        "graduation_year": 2014,
                        "score": None,
                    },
                    "certifications": [
                        "Google Cloud Professional Data Engineer"
                    ],
                    "projects": [
                        {
                            "name": "Energy Forecasting",
                            "summary": "Spark + MLflow pipelines for demand forecasting.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "EMILY CHEN\n"
                "San Diego, CA | emily.chen@gmail.com | 858-555-1209\n"
                "GitHub: github.com/emdchen\n"
                "\n"
                "SUMMARY\n"
                "Frontend Developer with 4 years experience in React and TypeScript.\n"
                "\n"
                "EXPERIENCE\n"
                "ServiceNow - Frontend Developer (2021/07 - Present)\n"
                "Built UI components and design system in React.\n"
                "\n"
                "Cognizant - UI Developer (2019/06 - 2021/06)\n"
                "Developed Angular modules and unit tests.\n"
                "\n"
                "EDUCATION\n"
                "B.S. Information Technology, UC San Diego, 2019\n"
                "\n"
                "SKILLS\n"
                "React, TypeScript, Redux, HTML, CSS, Jest, Storybook\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Emily Chen",
                        "email": "emily.chen@gmail.com",
                        "phone": "858-555-1209",
                        "location": "San Diego, CA",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 4,
                        "current_company": "ServiceNow",
                        "current_role": "Frontend Developer",
                    },
                    "skills": {
                        "primary_skills": ["React", "TypeScript", "Frontend"],
                        "all_skills_normalized": [
                            "react",
                            "typescript",
                            "redux",
                            "html",
                            "css",
                            "jest",
                            "storybook",
                        ],
                    },
                    "education": {
                        "degree": "B.S. Information Technology",
                        "institution": "UC San Diego",
                        "graduation_year": 2019,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Design System UI",
                            "summary": "Reusable React UI components with Storybook.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "KARTHIK REDDY\n"
                "Hyderabad, India | karthik.reddy@gmail.com | +91 98450 11290\n"
                "LinkedIn: linkedin.com/in/karthikreddy\n"
                "\n"
                "PROFILE\n"
                "Frontend Engineer (5 years) focused on Angular and enterprise UI.\n"
                "\n"
                "EXPERIENCE\n"
                "Wipro - Angular Developer (2019 - Present)\n"
                "Built dashboards and role-based UI with Angular 12.\n"
                "\n"
                "EDUCATION\n"
                "B.Tech Computer Science, JNTU, 2018\n"
                "\n"
                "SKILLS\n"
                "Angular, TypeScript, RxJS, NgRx, HTML5, CSS3, Jasmine, Karma\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Karthik Reddy",
                        "email": "karthik.reddy@gmail.com",
                        "phone": "+91 98450 11290",
                        "location": "Hyderabad, India",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 5,
                        "current_company": "Wipro",
                        "current_role": "Angular Developer",
                    },
                    "skills": {
                        "primary_skills": ["Angular", "TypeScript", "Frontend"],
                        "all_skills_normalized": [
                            "angular",
                            "typescript",
                            "rxjs",
                            "ngrx",
                            "html5",
                            "css3",
                            "jasmine",
                            "karma",
                        ],
                    },
                    "education": {
                        "degree": "B.Tech Computer Science",
                        "institution": "JNTU",
                        "graduation_year": 2018,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Role-based UI",
                            "summary": "Angular dashboards with NgRx state management.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "EVA NOVAK\n"
                "Prague, Czechia | eva.novak@seznam.cz | +420 222 123 987\n"
                "\n"
                "SUMMARY\n"
                "Frontend Developer with 2 years of experience in Vue.js and Nuxt.\n"
                "\n"
                "EXPERIENCE\n"
                "Seznam - Frontend Developer (2022/09 - Present)\n"
                "Built responsive UI with Vue 3 and Tailwind.\n"
                "\n"
                "EDUCATION\n"
                "B.Sc. Information Systems, Charles University, 2022\n"
                "\n"
                "SKILLS\n"
                "Vue.js, Nuxt, JavaScript, Tailwind, Vite, Cypress\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Eva Novak",
                        "email": "eva.novak@seznam.cz",
                        "phone": "+420 222 123 987",
                        "location": "Prague, Czechia",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 2,
                        "current_company": "Seznam",
                        "current_role": "Frontend Developer",
                    },
                    "skills": {
                        "primary_skills": ["Vue", "JavaScript", "Frontend"],
                        "all_skills_normalized": [
                            "vue",
                            "nuxt",
                            "javascript",
                            "tailwind",
                            "vite",
                            "cypress",
                        ],
                    },
                    "education": {
                        "degree": "B.Sc. Information Systems",
                        "institution": "Charles University",
                        "graduation_year": 2022,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "UI Modernization",
                            "summary": "Vue 3 + Tailwind responsive redesign.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "DEEPAK NAIR\n"
                "Dallas, TX | deepak.nair@gmail.com | (214) 555-3388\n"
                "Work Authorization: H1B\n"
                "\n"
                "SUMMARY\n"
                "Software Engineer with 10 years of experience in Python, Node.js, "
                "and distributed systems.\n"
                "\n"
                "EXPERIENCE\n"
                "American Airlines - Software Engineer (2018 - Present)\n"
                "Designed Node.js services for booking flows.\n"
                "\n"
                "Capgemini - Software Engineer (2014 - 2018)\n"
                "Built Python ETL and REST services.\n"
                "\n"
                "EDUCATION\n"
                "M.Tech Computer Science, IIT Madras, 2014\n"
                "\n"
                "SKILLS\n"
                "Python, Node.js, FastAPI, Express, PostgreSQL, MongoDB, Redis, AWS, Docker\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Deepak Nair",
                        "email": "deepak.nair@gmail.com",
                        "phone": "(214) 555-3388",
                        "location": "Dallas, TX",
                        "work_authorization": "H1B",
                    },
                    "experience_summary": {
                        "total_years": 10,
                        "current_company": "American Airlines",
                        "current_role": "Software Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Python", "Node.js", "Distributed Systems"],
                        "all_skills_normalized": [
                            "python",
                            "node.js",
                            "fastapi",
                            "express",
                            "postgresql",
                            "mongodb",
                            "redis",
                            "aws",
                            "docker",
                        ],
                    },
                    "education": {
                        "degree": "M.Tech Computer Science",
                        "institution": "IIT Madras",
                        "graduation_year": 2014,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Booking Platform",
                            "summary": "Node.js services for airline booking flows.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "LINDA MARTINEZ\n"
                "Miami, FL | linda.martinez@aol.com | 305-555-0144\n"
                "\n"
                "SUMMARY\n"
                "Software Engineer with 15 years experience in .NET, C#, and SQL Server.\n"
                "\n"
                "EXPERIENCE\n"
                "Carnival - Lead Software Engineer (2015 - Present)\n"
                "Led modernization of booking engine and APIs.\n"
                "\n"
                "HSBC - Software Engineer (2010 - 2015)\n"
                "Built financial reporting systems in .NET.\n"
                "\n"
                "EDUCATION\n"
                "B.S. Computer Science, University of Miami, 2010\n"
                "\n"
                "CERTIFICATIONS\n"
                "Microsoft Certified: Azure Developer Associate\n"
                "\n"
                "SKILLS\n"
                "C#, .NET, ASP.NET, SQL Server, Azure, RabbitMQ, Jenkins, Git\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Linda Martinez",
                        "email": "linda.martinez@aol.com",
                        "phone": "305-555-0144",
                        "location": "Miami, FL",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 15,
                        "current_company": "Carnival",
                        "current_role": "Lead Software Engineer",
                    },
                    "skills": {
                        "primary_skills": [".NET", "C#", "SQL Server"],
                        "all_skills_normalized": [
                            "c#",
                            ".net",
                            "asp.net",
                            "sql server",
                            "azure",
                            "rabbitmq",
                            "jenkins",
                            "git",
                        ],
                    },
                    "education": {
                        "degree": "B.S. Computer Science",
                        "institution": "University of Miami",
                        "graduation_year": 2010,
                        "score": None,
                    },
                    "certifications": [
                        "Microsoft Certified: Azure Developer Associate"
                    ],
                    "projects": [
                        {
                            "name": "Booking Engine Modernization",
                            "summary": ".NET APIs for cruise booking platform.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "ZOE FISCHER\n"
                "Amsterdam, Netherlands | zoe.fischer@pm.me | +31 20 555 0099\n"
                "\n"
                "SUMMARY\n"
                "QA Automation Engineer with 7 years in Selenium and API testing.\n"
                "\n"
                "EXPERIENCE\n"
                "ING - QA Engineer (2020 - Present)\n"
                "Automated web and API tests in Java + REST-assured.\n"
                "\n"
                "Philips - QA Analyst (2017 - 2020)\n"
                "Maintained regression suite and performance tests.\n"
                "\n"
                "EDUCATION\n"
                "M.S. Information Systems, Vrije Universiteit, 2017\n"
                "\n"
                "SKILLS\n"
                "Selenium, REST-assured, Java, JMeter, Postman, Jenkins, GitLab\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Zoe Fischer",
                        "email": "zoe.fischer@pm.me",
                        "phone": "+31 20 555 0099",
                        "location": "Amsterdam, Netherlands",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 7,
                        "current_company": "ING",
                        "current_role": "QA Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Selenium", "Automation", "API Testing"],
                        "all_skills_normalized": [
                            "selenium",
                            "rest-assured",
                            "java",
                            "jmeter",
                            "postman",
                            "jenkins",
                            "gitlab",
                        ],
                    },
                    "education": {
                        "degree": "M.S. Information Systems",
                        "institution": "Vrije Universiteit",
                        "graduation_year": 2017,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "API Automation Suite",
                            "summary": "REST-assured regression suite for banking APIs.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "ANA LOPEZ\n"
                "Madrid, Spain | ana.lopez@gmail.com | +34 91 555 7812\n"
                "\n"
                "PROFILE\n"
                "Data Scientist with 3 years in ML and analytics (Python, SQL).\n"
                "\n"
                "EXPERIENCE\n"
                "BBVA - Data Scientist (2021 - Present)\n"
                "Built fraud detection models and features pipelines.\n"
                "\n"
                "EDUCATION\n"
                "M.S. Statistics, Universidad Complutense de Madrid, 2021\n"
                "\n"
                "SKILLS\n"
                "Python, SQL, Scikit-learn, XGBoost, Airflow, Snowflake, Power BI\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Ana Lopez",
                        "email": "ana.lopez@gmail.com",
                        "phone": "+34 91 555 7812",
                        "location": "Madrid, Spain",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 3,
                        "current_company": "BBVA",
                        "current_role": "Data Scientist",
                    },
                    "skills": {
                        "primary_skills": ["Python", "Machine Learning", "SQL"],
                        "all_skills_normalized": [
                            "python",
                            "sql",
                            "scikit-learn",
                            "xgboost",
                            "airflow",
                            "snowflake",
                            "power bi",
                        ],
                    },
                    "education": {
                        "degree": "M.S. Statistics",
                        "institution": "Universidad Complutense de Madrid",
                        "graduation_year": 2021,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Fraud Detection",
                            "summary": "ML models and feature pipelines for fraud.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "RYAN PATEL\n"
                "Phoenix, AZ | ryan.patel@gmail.com | (480) 555-5519\n"
                "LinkedIn: linkedin.com/in/ryanpatel\n"
                "\n"
                "SUMMARY\n"
                "Software Engineer with 1 year of experience in Python and React.\n"
                "\n"
                "EXPERIENCE\n"
                "PayPal - Software Engineer (2023-2024)\n"
                "Built internal tools for customer support teams.\n"
                "\n"
                "EDUCATION\n"
                "B.S. Computer Science, Arizona State University, 2023\n"
                "\n"
                "SKILLS\n"
                "Python, React, Flask, PostgreSQL, Git, Jira\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Ryan Patel",
                        "email": "ryan.patel@gmail.com",
                        "phone": "(480) 555-5519",
                        "location": "Phoenix, AZ",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 1,
                        "current_company": "PayPal",
                        "current_role": "Software Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Python", "React", "Flask"],
                        "all_skills_normalized": [
                            "python",
                            "react",
                            "flask",
                            "postgresql",
                            "git",
                            "jira",
                        ],
                    },
                    "education": {
                        "degree": "B.S. Computer Science",
                        "institution": "Arizona State University",
                        "graduation_year": 2023,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Support Tools",
                            "summary": "Internal tools for support workflows.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "HANNAH O'BRIEN\n"
                "Dublin, Ireland | hannah.obrien@mail.ie | +353 1 555 2121\n"
                "\n"
                "PROFILE\n"
                "Senior Software Engineer with 20 years in Java and distributed systems.\n"
                "\n"
                "EXPERIENCE\n"
                "Stripe - Staff Engineer (2016 - Present)\n"
                "Led design of multi-region payment services.\n"
                "\n"
                "IBM - Senior Engineer (2004 - 2016)\n"
                "Built middleware for enterprise banking clients.\n"
                "\n"
                "EDUCATION\n"
                "M.S. Computer Science, Trinity College Dublin, 2004\n"
                "\n"
                "SKILLS\n"
                "Java, Scala, Kafka, Cassandra, Kubernetes, AWS, Terraform, gRPC, Prometheus\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Hannah O'Brien",
                        "email": "hannah.obrien@mail.ie",
                        "phone": "+353 1 555 2121",
                        "location": "Dublin, Ireland",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 20,
                        "current_company": "Stripe",
                        "current_role": "Staff Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Java", "Distributed Systems", "Kafka"],
                        "all_skills_normalized": [
                            "java",
                            "scala",
                            "kafka",
                            "cassandra",
                            "kubernetes",
                            "aws",
                            "terraform",
                            "grpc",
                            "prometheus",
                        ],
                    },
                    "education": {
                        "degree": "M.S. Computer Science",
                        "institution": "Trinity College Dublin",
                        "graduation_year": 2004,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Multi-region Payments",
                            "summary": "High-availability payment services across regions.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "VIVEK SHAH\n"
                "Seattle, WA | vivek.shah@gmail.com | (425) 555-9191\n"
                "Work Authorization: H1B\n"
                "\n"
                "SUMMARY\n"
                "Software Engineer with 6 years of experience in Node.js and .NET Core.\n"
                "\n"
                "EXPERIENCE\n"
                "Expedia - Software Engineer (2020/02 - Present)\n"
                "Built booking APIs using Node.js and .NET Core.\n"
                "\n"
                "Infosys - Software Engineer (2018/07 - 2020/01)\n"
                "Developed REST services and CI pipelines.\n"
                "\n"
                "EDUCATION\n"
                "B.Tech Computer Science, NIT Surat, 2018\n"
                "\n"
                "SKILLS\n"
                "Node.js, .NET Core, C#, SQL Server, AWS, Docker, Git, Jenkins\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Vivek Shah",
                        "email": "vivek.shah@gmail.com",
                        "phone": "(425) 555-9191",
                        "location": "Seattle, WA",
                        "work_authorization": "H1B",
                    },
                    "experience_summary": {
                        "total_years": 6,
                        "current_company": "Expedia",
                        "current_role": "Software Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Node.js", ".NET Core", "C#"],
                        "all_skills_normalized": [
                            "node.js",
                            ".net core",
                            "c#",
                            "sql server",
                            "aws",
                            "docker",
                            "git",
                            "jenkins",
                        ],
                    },
                    "education": {
                        "degree": "B.Tech Computer Science",
                        "institution": "NIT Surat",
                        "graduation_year": 2018,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Booking APIs",
                            "summary": "Node.js and .NET Core booking services.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "PRIYA MENON\n"
                "Kochi, India | priyamenon@gmail.com | +91 98761 33220\n"
                "\n"
                "PROFILE\n"
                "Software Engineer with 3.5 years of experience in Java and Spring Boot.\n"
                "\n"
                "EXPERIENCE\n"
                "UST Global - Software Engineer (2021-2024)\n"
                "Built microservices for insurance processing.\n"
                "\n"
                "EDUCATION\n"
                "B.Tech Computer Science, CUSAT, 2020\n"
                "\n"
                "SKILLS\n"
                "Java, Spring Boot, MySQL, Redis, Docker, Git, REST, JUnit\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Priya Menon",
                        "email": "priyamenon@gmail.com",
                        "phone": "+91 98761 33220",
                        "location": "Kochi, India",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 3,
                        "current_company": "UST Global",
                        "current_role": "Software Engineer",
                    },
                    "skills": {
                        "primary_skills": ["Java", "Spring Boot", "Microservices"],
                        "all_skills_normalized": [
                            "java",
                            "spring boot",
                            "mysql",
                            "redis",
                            "docker",
                            "git",
                            "rest",
                            "junit",
                        ],
                    },
                    "education": {
                        "degree": "B.Tech Computer Science",
                        "institution": "CUSAT",
                        "graduation_year": 2020,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Insurance Microservices",
                            "summary": "Spring Boot services for claim processing.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "ANIKA KAPOOR\n"
                "Gurgaon, India | anika.kapoor@gmail.com | +91 98111 44556\n"
                "\n"
                "SUMMARY\n"
                "Data Scientist with 0.5 years of experience and strong ML coursework.\n"
                "\n"
                "INTERNSHIP\n"
                "ZS Associates - Data Science Intern (May 2023 - Dec 2023)\n"
                "Built churn models and A/B testing dashboards.\n"
                "\n"
                "EDUCATION\n"
                "M.Tech Data Science, IIIT Delhi, 2023\n"
                "\n"
                "SKILLS\n"
                "Python, SQL, Pandas, NumPy, Scikit-learn, Power BI\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Anika Kapoor",
                        "email": "anika.kapoor@gmail.com",
                        "phone": "+91 98111 44556",
                        "location": "Gurgaon, India",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 0,
                        "current_company": "ZS Associates",
                        "current_role": "Data Science Intern",
                    },
                    "skills": {
                        "primary_skills": ["Python", "Machine Learning", "SQL"],
                        "all_skills_normalized": [
                            "python",
                            "sql",
                            "pandas",
                            "numpy",
                            "scikit-learn",
                            "power bi",
                        ],
                    },
                    "education": {
                        "degree": "M.Tech Data Science",
                        "institution": "IIIT Delhi",
                        "graduation_year": 2023,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "Churn Prediction",
                            "summary": "ML churn model with A/B test reporting.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    examples.append(
        {
            "input": (
                "KYLE JOHNSON\n"
                "Raleigh, NC | kyle.johnson@gmail.com | (919) 555-7744\n"
                "\n"
                "SUMMARY\n"
                "QA Engineer with 9 years of experience in automation and performance.\n"
                "\n"
                "EXPERIENCE\n"
                "SAS - QA Lead (2017 - Present)\n"
                "Owned Selenium + Cypress automation suite and load testing.\n"
                "\n"
                "IBM - QA Engineer (2013 - 2017)\n"
                "Created API test harnesses and regression packs.\n"
                "\n"
                "EDUCATION\n"
                "B.S. Computer Science, NC State University, 2013\n"
                "\n"
                "SKILLS\n"
                "Selenium, Cypress, JMeter, Java, Python, Jenkins, Git, TestRail\n"
            ),
            "output": json.dumps(
                {
                    "personal": {
                        "name": "Kyle Johnson",
                        "email": "kyle.johnson@gmail.com",
                        "phone": "(919) 555-7744",
                        "location": "Raleigh, NC",
                        "work_authorization": None,
                    },
                    "experience_summary": {
                        "total_years": 9,
                        "current_company": "SAS",
                        "current_role": "QA Lead",
                    },
                    "skills": {
                        "primary_skills": ["Selenium", "Automation", "Performance Testing"],
                        "all_skills_normalized": [
                            "selenium",
                            "cypress",
                            "jmeter",
                            "java",
                            "python",
                            "jenkins",
                            "git",
                            "testrail",
                        ],
                    },
                    "education": {
                        "degree": "B.S. Computer Science",
                        "institution": "NC State University",
                        "graduation_year": 2013,
                        "score": None,
                    },
                    "certifications": [],
                    "projects": [
                        {
                            "name": "QA Automation Platform",
                            "summary": "Enterprise automation framework and load tests.",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
        }
    )

    return examples


def write_jsonl(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    examples = build_examples()
    random.seed(42)
    random.shuffle(examples)

    split_index = int(len(examples) * 0.8)
    train_rows = examples[:split_index]
    val_rows = examples[split_index:]

    write_jsonl(Path("data/train.jsonl"), train_rows)
    write_jsonl(Path("data/val.jsonl"), val_rows)

    print(f"Wrote {len(train_rows)} training examples")
    print(f"Wrote {len(val_rows)} validation examples")


if __name__ == "__main__":
    main()
