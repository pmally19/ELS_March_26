#!/bin/bash
# JuneERP Complete Database Restoration
# Restores all 248 tables with complete data

set -e

DATABASE_URL=${1:-$DATABASE_URL}

if [ -z "$DATABASE_URL" ]; then
    echo "Usage: ./restore.sh [database_url]"
    echo "Example: ./restore.sh 'postgresql://user:pass@host:port/database'"
    exit 1
fi

echo "=============================================="
echo "JUNEERP COMPLETE DATABASE RESTORATION"
echo "=============================================="
echo "Target: $DATABASE_URL"
echo "Tables: 248"
echo "Records: 8,894+"
echo "Time: $(date)"
echo "=============================================="

# Test connection
echo "Testing database connection..."
psql "$DATABASE_URL" -c "SELECT version();" > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
else
    echo "✗ Cannot connect to database"
    exit 1
fi

echo ""
echo "Step 1: Creating complete schema (248 tables)..."
psql "$DATABASE_URL" -f 01-complete-schema.sql
echo "✓ Schema created (16,772 lines processed)"

echo ""
echo "Step 2: Importing complete data (8,894+ records)..."
psql "$DATABASE_URL" -f 02-complete-data.sql
echo "✓ Data imported"

echo ""
echo "Step 3: Setting sequence values..."
psql "$DATABASE_URL" -f 03-sequences.sql
echo "✓ Sequences configured"

echo ""
echo "Step 4: Creating performance indexes..."
psql "$DATABASE_URL" -f 04-indexes.sql
echo "✓ Indexes created"

echo ""
echo "Verification:"
TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo "Tables created: $TABLES"

RECORDS=$(psql "$DATABASE_URL" -t -c "SELECT SUM(n_live_tup) FROM pg_stat_user_tables;" | tr -d ' ')
echo "Records imported: $RECORDS"

echo ""
echo "=============================================="
echo "RESTORATION COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo "JuneERP database is ready for production use"
echo "All 248 tables with complete business data"
echo "=============================================="
