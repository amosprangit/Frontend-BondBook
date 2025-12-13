# PowerShell script to run EAS build without Git requirement
# Set environment variable to bypass Git
$env:EAS_NO_VCS = "1"

Write-Host "EAS_NO_VCS is set. Running EAS build..." -ForegroundColor Green
Write-Host "Note: You'll be prompted to generate an Android Keystore if needed." -ForegroundColor Yellow

# Run the build command
eas build --platform android --profile preview

