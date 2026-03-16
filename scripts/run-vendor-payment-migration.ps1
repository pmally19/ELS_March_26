# PowerShell script to run vendor payment migration
# Usage: .\scripts\run-vendor-payment-migration.ps1

$env:PGPASSWORD = "Mokshith@21"

# Run migration
psql -U postgres -d mallyerp -f database/migrations/008_create_vendor_payments_table.sql

# Check if migration was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

# Verify table was created
psql -U postgres -d mallyerp -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'vendor_payments';"

Write-Host "`n📝 Next steps:"
Write-Host "1. Verify vendor_payments table exists"
Write-Host "2. Test vendor payment API: POST /api/purchase/vendor-payments"
Write-Host "3. Verify GL accounts are set up correctly"
Write-Host "4. Test payment validation: POST /api/purchase/vendor-payments/validate"

