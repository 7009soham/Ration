# ============================================================================
# DATABASE RESET SCRIPT FOR RATION TDS
# ============================================================================
# This script will reset your database with the new anti-tampering schema
# 
# REQUIREMENTS:
# - MySQL installed and running
# - MySQL credentials (root user)
# ============================================================================

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  RATION TDS DATABASE RESET" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will DELETE all existing data!" -ForegroundColor Yellow
Write-Host ""

# Get MySQL credentials
$mysqlUser = Read-Host "Enter MySQL username (default: root)"
if ([string]::IsNullOrWhiteSpace($mysqlUser)) {
    $mysqlUser = "root"
}

$mysqlPassword = Read-Host "Enter MySQL password" -AsSecureString
$mysqlPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword)
)

Write-Host ""
Write-Host "📋 Steps that will be performed:" -ForegroundColor Yellow
Write-Host "  1. Drop existing 'ration_tds' database"
Write-Host "  2. Create new 'ration_tds' database"
Write-Host "  3. Execute schema.sql to create tables and insert sample data"
Write-Host ""

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Aborted." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🔄 Resetting database..." -ForegroundColor Green

# Create temporary SQL commands file
$tempSql = @"
DROP DATABASE IF EXISTS ration_tds;
CREATE DATABASE ration_tds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ration_tds;
SOURCE schema.sql;
"@

$tempSqlFile = Join-Path $PSScriptRoot "temp_reset.sql"
$tempSql | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    # Execute MySQL commands
    $schemaPath = Join-Path $PSScriptRoot "schema.sql"
    
    Write-Host "📂 Dropping old database..." -ForegroundColor Yellow
    $dropCmd = "DROP DATABASE IF EXISTS ration_tds;"
    $dropCmd | mysql -u $mysqlUser -p"$mysqlPasswordPlain" 2>&1 | Out-Null
    
    Write-Host "✅ Old database dropped" -ForegroundColor Green
    
    Write-Host "📂 Creating new database..." -ForegroundColor Yellow
    $createCmd = "CREATE DATABASE ration_tds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    $createCmd | mysql -u $mysqlUser -p"$mysqlPasswordPlain" 2>&1 | Out-Null
    
    Write-Host "✅ New database created" -ForegroundColor Green
    
    Write-Host "📂 Executing schema.sql..." -ForegroundColor Yellow
    Get-Content $schemaPath | mysql -u $mysqlUser -p"$mysqlPasswordPlain" ration_tds 2>&1 | Out-Null
    
    Write-Host "✅ Schema executed successfully" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "=============================================================" -ForegroundColor Cyan
    Write-Host "  DATABASE RESET COMPLETE!" -ForegroundColor Green
    Write-Host "=============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Verification:" -ForegroundColor Yellow
    
    # Verify tables
    $verifyTables = "USE ration_tds; SHOW TABLES;"
    Write-Host ""
    Write-Host "Tables created:" -ForegroundColor Cyan
    $verifyTables | mysql -u $mysqlUser -p"$mysqlPasswordPlain" -N
    
    # Verify users count
    $verifyUsers = "USE ration_tds; SELECT COUNT(*) as total_users FROM users;"
    Write-Host ""
    Write-Host "Total users:" -ForegroundColor Cyan
    $verifyUsers | mysql -u $mysqlUser -p"$mysqlPasswordPlain" -N
    
    # Verify roles
    $verifyRoles = "USE ration_tds; SELECT role, COUNT(*) as count FROM users GROUP BY role;"
    Write-Host ""
    Write-Host "Users by role:" -ForegroundColor Cyan
    $verifyRoles | mysql -u $mysqlUser -p"$mysqlPasswordPlain"
    
    Write-Host ""
    Write-Host "✅ Next step: Restart your backend server!" -ForegroundColor Green
    Write-Host "   cd backend" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Error occurred: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Manual steps:" -ForegroundColor Yellow
    Write-Host "   1. Open MySQL Workbench"
    Write-Host "   2. Run: DROP DATABASE IF EXISTS ration_tds;"
    Write-Host "   3. Run: CREATE DATABASE ration_tds CHARACTER SET utf8mb4;"
    Write-Host "   4. Run: USE ration_tds;"
    Write-Host "   5. Click the lightning bolt icon and select schema.sql"
    Write-Host ""
} finally {
    # Clean up temp file
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force
    }
}
