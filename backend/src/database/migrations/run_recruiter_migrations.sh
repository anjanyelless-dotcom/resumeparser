#!/bin/bash

# Database credentials from .env
DB_USER="postgres"
DB_NAME="resume_parser"
DB_HOST="localhost"
DB_PORT="5432"

echo "Running database migrations for recruiter features..."
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Run migrations in order
echo "Running 029_add_job_recruiter_assignments.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 029_add_job_recruiter_assignments.sql
if [ $? -eq 0 ]; then
    echo "✅ 029_add_job_recruiter_assignments.sql completed"
else
    echo "❌ 029_add_job_recruiter_assignments.sql failed"
    exit 1
fi

echo ""
echo "Running 030_add_submissions.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 030_add_submissions.sql
if [ $? -eq 0 ]; then
    echo "✅ 030_add_submissions.sql completed"
else
    echo "❌ 030_add_submissions.sql failed"
    exit 1
fi

echo ""
echo "Running 030_fix_submissions_views.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 030_fix_submissions_views.sql
if [ $? -eq 0 ]; then
    echo "✅ 030_fix_submissions_views.sql completed"
else
    echo "❌ 030_fix_submissions_views.sql failed"
    exit 1
fi

echo ""
echo "Running 031_add_interviews_and_feedback.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 031_add_interviews_and_feedback.sql
if [ $? -eq 0 ]; then
    echo "✅ 031_add_interviews_and_feedback.sql completed"
else
    echo "❌ 031_add_interviews_and_feedback.sql failed"
    exit 1
fi

echo ""
echo "Running 031_fix_interview_feedback.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 031_fix_interview_feedback.sql
if [ $? -eq 0 ]; then
    echo "✅ 031_fix_interview_feedback.sql completed"
else
    echo "❌ 031_fix_interview_feedback.sql failed"
    exit 1
fi

echo ""
echo "Running 032_add_activity_log.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 032_add_activity_log.sql
if [ $? -eq 0 ]; then
    echo "✅ 032_add_activity_log.sql completed"
else
    echo "❌ 032_add_activity_log.sql failed"
    exit 1
fi

echo ""
echo "Running 033_seed_recruiter_permissions.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 033_seed_recruiter_permissions.sql
if [ $? -eq 0 ]; then
    echo "✅ 033_seed_recruiter_permissions.sql completed"
else
    echo "❌ 033_seed_recruiter_permissions.sql failed"
    exit 1
fi

echo ""
echo "Running 034_add_created_by_user_id.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 034_add_created_by_user_id.sql
if [ $? -eq 0 ]; then
    echo "✅ 034_add_created_by_user_id.sql completed"
else
    echo "❌ 034_add_created_by_user_id.sql failed"
    exit 1
fi

echo ""
echo "Running 035_add_submission_permissions.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 035_add_submission_permissions.sql
if [ $? -eq 0 ]; then
    echo "✅ 035_add_submission_permissions.sql completed"
else
    echo "❌ 035_add_submission_permissions.sql failed"
    exit 1
fi

echo ""
echo "🎉 All migrations completed successfully!"
echo "You can now restart the backend server."