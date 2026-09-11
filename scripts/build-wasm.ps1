# WebAssembly build script for AlphaOne using Emscripten
param(
    [string]$EmsdkDir = "$PSScriptRoot/../emsdk"
)

$ErrorActionPreference = "Stop"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building AlphaOne WebAssembly Module" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check for em++ in PATH or in local emsdk
$emccCmd = Get-Command em++ -ErrorAction SilentlyContinue
if (-not $emccCmd) {
    if (Test-Path "$EmsdkDir/upstream/emscripten/em++.bat") {
        $emccPath = "$EmsdkDir/upstream/emscripten/em++.bat"
        # Temporarily add to PATH
        $env:PATH = "$EmsdkDir/upstream/emscripten;$EmsdkDir/node;$env:PATH"
    } elseif (Test-Path "$EmsdkDir/emsdk.bat") {
        Write-Host "Activating emsdk environment..." -ForegroundColor Yellow
        & "$EmsdkDir/emsdk.bat" activate latest
        $emccPath = "$EmsdkDir/upstream/emscripten/em++.bat"
    } else {
        Write-Error "Emscripten compiler (em++) not found. Please run 'python emsdk/emsdk.py install latest && python emsdk/emsdk.py activate latest'."
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
