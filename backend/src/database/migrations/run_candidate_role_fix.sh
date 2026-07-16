#!/bin/bash

# Database credentials
DB_USER="postgres"
DB_NAME="resume_parser"
DB_HOST="localhost"
DB_PORT="5432"

echo "🔧 Running candidate role constraint fix..."
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

echo "Running 036_update_users_role_constraint.sql..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f 036_update_users_role_constraint.sql
if [ $? -eq 0 ]; then
    echo "✅ 036_update_users_role_constraint.sql completed"
    echo ""
    echo "🎉 Candidate role constraint fix completed successfully!"
    echo "📝 Candidate registration should now work from /apply page"
    echo ""
    echo "🧪 To test, run:"
    echo "   cd /Users/anjanyelle/Desktop/untitled\\ folder\\ 3"
    echo "   node TEST_CANDIDATE_REGISTRATION.js"
else
    echo "❌ 036_update_users_role_constraint.sql failed"
    echo "💡 You may need to enter the PostgreSQL password when prompted"
    exit 1
fi
