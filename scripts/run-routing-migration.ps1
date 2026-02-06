# PowerShell script to run routing tables migration
# Database: mallyerp
# Password: Mokshith@21

$env:PGPASSWORD = "Mokshith@21"
$sqlFile = "database\migrations\ensure-routing-tables.sql"

Write-Host "🔧 Running routing tables migration..." -ForegroundColor Cyan
Write-Host "Database: mallyerp" -ForegroundColor Yellow
Write-Host "SQL File: $sqlFile" -ForegroundColor Yellow
Write-Host ""

try {
    $result = & psql -h localhost -p 5432 -U postgres -d mallyerp -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host $result
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD
}

Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
