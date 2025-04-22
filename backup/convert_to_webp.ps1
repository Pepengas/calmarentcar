# PowerShell script to convert JPG images to WebP format using local cwebp.exe

# Define paths
$sourceDir = ".\images"
$targetDir = ".\images\webp"
$cwebpPath = ".\webp-tools\libwebp-1.3.2-windows-x64\bin\cwebp.exe"

# Create target directory if it doesn't exist
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force
}

# Check if cwebp is available
if (-not (Test-Path $cwebpPath)) {
    Write-Host "cwebp not found at $cwebpPath. Please ensure the WebP tools are extracted correctly." -ForegroundColor Red
    exit 1
}

Write-Host "cwebp found at: $cwebpPath" -ForegroundColor Green

# Get all JPG files in source directory
$jpgFiles = Get-ChildItem -Path $sourceDir -Filter "*.jpg"

# Convert each file
foreach ($file in $jpgFiles) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $outputPath = Join-Path -Path $targetDir -ChildPath "$baseName.webp"
    
    Write-Host "Converting $($file.Name) to WebP format..."
    
    # Execute cwebp with quality option of 80 (adjust as needed)
    & $cwebpPath -q 80 $file.FullName -o $outputPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Converted $($file.Name) to $outputPath" -ForegroundColor Green
        
        # Get file sizes for comparison
        $originalSize = $file.Length
        $webpSize = (Get-Item $outputPath).Length
        $savingsPercent = [math]::Round(100 - ($webpSize / $originalSize * 100), 2)
        
        Write-Host "Original: $([math]::Round($originalSize / 1KB, 2)) KB, WebP: $([math]::Round($webpSize / 1KB, 2)) KB, Savings: $savingsPercent%" -ForegroundColor Cyan
    } else {
        Write-Host "Failed to convert $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "Conversion complete!" -ForegroundColor Green 