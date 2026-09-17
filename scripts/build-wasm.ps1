# WebAssembly build script for AlphaOne using Emscripten
param(
    [string]$EmsdkDir = "$PSScriptRoot/../emsdk"
)

$ErrorActionPreference = "Stop"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building AlphaOne WebAssembly Module" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check for em++ in PATH or in emsdk locations
$emccCmd = Get-Command em++ -ErrorAction SilentlyContinue
if (-not $emccCmd) {
    $candidateDirs = @($EmsdkDir, "C:/emsdk")
    $found = $false
    foreach ($dir in $candidateDirs) {
        $exeCandidates = @("$dir/upstream/emscripten/em++.exe", "$dir/upstream/emscripten/em++.bat")
        foreach ($cand in $exeCandidates) {
            if (Test-Path $cand) {
                $emccPath = $cand
                $env:PATH = "$dir/upstream/emscripten;$dir/node/24.19.0_64bit;$env:PATH"
                $env:EMSDK = $dir
                $env:EMSDK_NODE = "$dir/node/24.19.0_64bit/node.exe"
                $found = $true
                break
            }
        }
        if ($found) { break }
    }
    if (-not $found) {
        Write-Error "Emscripten compiler (em++) not found. Please verify emsdk installation."
    }
} else {
    $emccPath = $emccCmd.Source
}

Write-Host "Using Emscripten compiler: $emccPath" -ForegroundColor Green

$outDir = "$PSScriptRoot/../frontend/public/wasm"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sources = @(
    "$PSScriptRoot/../src/engine/Board.cpp",
    "$PSScriptRoot/../src/engine/MoveGenerator.cpp",
    "$PSScriptRoot/../src/engine/Evaluation.cpp",
    "$PSScriptRoot/../src/engine/Search.cpp",
    "$PSScriptRoot/../src/engine/TranspositionTable.cpp",
    "$PSScriptRoot/../src/engine/Zobrist.cpp",
    "$PSScriptRoot/../src/engine/Engine.cpp",
    "$PSScriptRoot/../src/wasm/WasmBindings.cpp"
)

Write-Host "Compiling C++ to WebAssembly (alphaone.js + alphaone.wasm)..." -ForegroundColor Yellow

& $emccPath -O3 -std=c++17 --bind `
    -s MODULARIZE=1 `
    -s EXPORT_NAME="AlphaOneModule" `
    -s ALLOW_MEMORY_GROWTH=1 `
    -s NO_EXIT_RUNTIME=1 `
    -s ENVIRONMENT="web,worker,node" `
    -I "$PSScriptRoot/../src/engine" `
    $sources `
    -o "$outDir/alphaone.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host "WASM Build Success!" -ForegroundColor Green
    Write-Host "Output: $outDir/alphaone.js and $outDir/alphaone.wasm"
} else {
    Write-Error "Emscripten build failed with code $LASTEXITCODE"
}
