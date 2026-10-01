# Package script for PrepPilot
param(
    [string]$OutputFile = "preppilot.zip"
)

$baseDir = (Get-Location).Path
$outPath = Join-Path $baseDir $OutputFile

if (Test-Path $outPath) {
    Remove-Item -Force $outPath
}

$excludePatterns = @(
    '*\node_modules*',
    '*\.next*',
    '*\.git*',
    '*\.env',
    '*\.env.local',
    '*\.env.*.local',
    '*\lint*.txt',
    '*\lint*.json',
    '*\scratch*',
    '*preppilot.zip',
    '*\tsconfig.tsbuildinfo'
)

$stagingDir = Join-Path $env:TEMP ("preppilot_pkg_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

try {
    Write-Host "Collecting files from $baseDir..."
    $allItems = Get-ChildItem -LiteralPath $baseDir -Recurse -Force

    foreach ($item in $allItems) {
        $relPath = $item.FullName.Substring($baseDir.Length).TrimStart('\', '/')
        
        $skip = $false
        foreach ($pat in $excludePatterns) {
            if ($item.FullName -like $pat -or $relPath -like $pat) {
                $skip = $true
                break
            }
        }
        
        if (-not $skip) {
            $destPath = Join-Path $stagingDir $relPath
            if ($item.PSIsContainer) {
                if (-not (Test-Path $destPath)) {
                    New-Item -ItemType Directory -Path $destPath -Force | Out-Null
                }
            } else {
                $destParent = Split-Path -Parent $destPath
                if (-not (Test-Path $destParent)) {
                    New-Item -ItemType Directory -Path $destParent -Force | Out-Null
                }
                Copy-Item -LiteralPath $item.FullName -Destination $destPath -Force
            }
        }
    }

    Write-Host "Creating zip archive at $outPath..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $stagingDir,
        $outPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    $zipItem = Get-Item $outPath
    Write-Host ("Zip file created: {0} ({1:N2} MB)" -f $zipItem.FullName, ($zipItem.Length / 1MB))
}
finally {
    if (Test-Path $stagingDir) {
        Remove-Item -LiteralPath $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
