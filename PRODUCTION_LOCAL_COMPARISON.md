# Production vs Local Database Comparison Report

## Environment Details
- **Production Server**: 165.232.182.65
- **Production Database**: PostgreSQL 16.14 (Ubuntu)
- **Production Commit**: 7d4f7f123d40a285321f01950445173284854afc
- **Production User**: resume_user
- **Local Database**: PostgreSQL (local)
- **Local User**: anjanyelle
- **Local Commit**: 7d4f7f123d40a285321f01950445173284854afc (synchronized)

## Table Count Comparison
- **Production Tables**: 33
- **Local Tables**: 57
- **Difference**: Local has 24 additional tables

## Production Tables (33)
```
activity_log
audit_logs
candidate_skills
candidates
certifications
client_communications
client_contacts
client_pipeline_history
clients
companies
company_contacts
company_jobs
duplicate_candidates
education
interview_feedback
interviews
job_descriptions
job_recruiter_assignments
job_skills
labeled_data
match_scores
parsing_jobs
permissions
placements
role_permissions
roles
scrape_jobs
skills
submissions
system_settings
users
work_experience
work_history
```

## Local Tables (57)
```
activity_log
activity_stats
alembic_version
api_keys
audit_logs
candidate_achievements
candidate_skills
candidates
certifications
client_communication_stats
client_communications
client_contacts
client_pipeline_history
clients
companies
company_contacts
company_jobs
correction_patterns
correction_stats
corrections
daily_activity_summary
duplicate_candidates
education
evaluation_confidence_scores
evaluation_debug_logs
evaluation_error_logs
evaluation_performance_metrics
evaluation_summary
evaluation_test_cases
evaluation_test_results
evaluation_test_suites
jd_match_results
job_descriptions
job_recruiter_assignments
job_skills
jobs
labeled_data
labeling_statistics
match_scores
parsing_jobs
permissions
revoked_tokens
role_permissions
roles
schema_migrations
scrape_jobs
skill_suggestions
skills
submission_stats
submissions
system_settings
users
v_accuracy_trends
v_error_analysis
v_parsing_job_performance
work_experience
work_history
```

## Tables Missing in Local (0)
All production tables exist locally.

## Extra Tables in Local (24)
```
activity_stats
alembic_version
api_keys
candidate_achievements
client_communication_stats
correction_patterns
correction_stats
corrections
daily_activity_summary
evaluation_confidence_scores
evaluation_debug_logs
evaluation_error_logs
evaluation_performance_metrics
evaluation_summary
evaluation_test_cases
evaluation_test_results
evaluation_test_suites
jd_match_results
jobs
labeling_statistics
revoked_tokens
schema_migrations
skill_suggestions
submission_stats
v_accuracy_trends
v_error_analysis
v_parsing_job_performance
```

## Analysis
1. **Local has many development/testing tables** that are not present in production
2. **Local has alembic_version table** indicating migration tracking
3. **Local has evaluation-related tables** for testing/development
4. **Local has view tables** (v_*) that are not in production
5. **Local has statistics tables** for development analytics

## Recommendations
1. **Drop extra local tables** to match production exactly
2. **Use production schema dump** to rebuild local database
3. **Ensure migration consistency** between environments
4. **Remove development/testing artifacts** from local

## Next Steps
1. Export local schema for comparison
2. Generate SQL script to drop extra tables
3. Apply production schema to local database
4. Validate synchronization results
