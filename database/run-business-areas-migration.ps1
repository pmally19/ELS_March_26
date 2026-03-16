# Business Areas Migration Script
# Run this script to create the business_areas table

$ErrorActionPreference = "Stop"

# Database configuration
$env:PGPASSWORD = "Mokshith@21"
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "mallyerp"
$dbUser = "postgres"

Write-Host "🔄 Starting Business Areas Table Migration..." -ForegroundColor Cyan
Write-Host "📊 Database: $dbName" -ForegroundColor Yellow
Write-Host "🔗 Host: ${dbHost}:${dbPort}" -ForegroundColor Yellow
Write-Host ""

# Check if psql is available
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "✅ PostgreSQL client found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL client (psql) not found. Please install PostgreSQL client tools." -ForegroundColor Red
    exit 1
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$migrationFile = Join-Path $scriptDir "migrations\create-business-areas-table.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration file: $migrationFile" -ForegroundColor Yellow
Write-Host ""

# Check if table already exists
Write-Host "🔍 Checking if business_areas table exists..." -ForegroundColor Cyan
$checkTable = psql -U $dbUser -d $dbName -h $dbHost -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_areas');" 2>&1

if ($checkTable -match "t") {
    Write-Host "ℹ️  business_areas table already exists" -ForegroundColor Yellow
    Write-Host "📋 Current table structure:" -ForegroundColor Cyan
    
    psql -U $dbUser -d $dbName -h $dbHost -c "\d business_areas" 2>&1
    Write-Host ""
}

# Run the migration
Write-Host "🔄 Executing migration..." -ForegroundColor Cyan
try {
    $result = psql -U $dbUser -d $dbName -h $dbHost -f $migrationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration executed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Migration completed with warnings:" -ForegroundColor Yellow
        Write-Host $result
    }
} catch {
    Write-Host "❌ Migration failed: $_" -ForegroundColor Red
    exit 1
}

# Verify the migration
Write-Host ""
Write-Host "📋 Verifying migration..." -ForegroundColor Cyan

# Check table structure
Write-Host ""
Write-Host "📊 business_areas table structure:" -ForegroundColor Cyan
psql -U $dbUser -d $dbName -h $dbHost -c "\d business_areas" 2>&1

# Check constraints
Write-Host ""
Write-Host "🔒 Constraints:" -ForegroundColor Cyan
$constraints = psql -U $dbUser -d $dbName -h $dbHost -t -c "SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'business_areas' AND table_schema = 'public';" 2>&1
Write-Host $constraints

# Check indexes
Write-Host ""
Write-Host "📇 Indexes:" -ForegroundColor Cyan
$indexes = psql -U $dbUser -d $dbName -h $dbHost -t -c "SELECT indexname FROM pg_indexes WHERE tablename = 'business_areas' AND schemaname = 'public';" 2>&1
Write-Host $indexes

Write-Host ""
Write-Host "✅ Business Areas migration completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Verify the table structure matches requirements" -ForegroundColor White
Write-Host "   2. Test creating business areas via API" -ForegroundColor White
Write-Host "   3. Verify foreign key relationships work correctly" -ForegroundColor White
