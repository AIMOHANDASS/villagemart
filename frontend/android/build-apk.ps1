param (
    [string]$AppTarget = "consumer-app"
)

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " [START] VillageMart Automated Android APK Builder ($AppTarget)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

$VaultDir = "..\mobile-icons-vault\$AppTarget"
$ResDir = "app\src\main\res"

if (-Not (Test-Path $VaultDir)) {
    Write-Host "[X] Error: Vault directory '$VaultDir' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/3] [CLEAN] Cleaning old default launcher icons..." -ForegroundColor Yellow
$Densities = @("hdpi", "mdpi", "xhdpi", "xxhdpi", "xxxhdpi")

foreach ($density in $Densities) {
    $TargetFolder = "$ResDir\mipmap-$density"
    if (Test-Path $TargetFolder) {
        Remove-Item "$TargetFolder\ic_launcher.png" -ErrorAction SilentlyContinue
        Remove-Item "$TargetFolder\ic_launcher_round.png" -ErrorAction SilentlyContinue
        Remove-Item "$TargetFolder\ic_launcher_foreground.png" -ErrorAction SilentlyContinue
    }
}

Write-Host "[2/3] [COPY] Copying new brand assets from vault..." -ForegroundColor Yellow
Copy-Item -Path "$VaultDir\*" -Destination "$ResDir\" -Recurse -Force

Write-Host "[3/3] [BUILD] Scrubbing Gradle Cache and Assembling Debug APK..." -ForegroundColor Yellow
# Run the Gradle commands directly
.\gradlew clean
if ($LASTEXITCODE -eq 0) {
    .\gradlew assembleDebug
} else {
    Write-Host "[X] Gradle Clean Failed" -ForegroundColor Red
}

Write-Host "`n[OK] Pipeline Completed!" -ForegroundColor Green
