# Native C++ build script for AlphaOne (PowerShell / Windows)
param(
    [string]$Compiler = "C:\MinGW\bin\g++.exe",
    [string]$Archiver = "C:\MinGW\bin\ar.exe"
)

$ErrorActionPreference = "Stop"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " AlphaOne Native C++ Engine Build" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (-not (Test-Path $Compiler)) {
    $found = Get-Command g++ -ErrorAction SilentlyContinue
    if ($found) { $Compiler = $found.Source }
    else {
        Write-Error "g++ compiler not found at $Compiler. Please install MinGW or specify -Compiler path."
    }
}

New-Item -ItemType Directory -Force -Path bin | Out-Null

$sources = @(
    "src/engine/Board.cpp",
    "src/engine/MoveGenerator.cpp",
    "src/engine/Evaluation.cpp",
    "src/engine/Search.cpp",
    "src/engine/TranspositionTable.cpp",
    "src/engine/Zobrist.cpp",
    "src/engine/Engine.cpp"
)

Write-Host "Compiling engine sources..." -ForegroundColor Yellow
$objFiles = @()
foreach ($src in $sources) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($src)
    $obj = "bin/$base.o"
    $objFiles += $obj
    Write-Host "  -> $src"
    & $Compiler -std=c++1z -O3 -I src/engine -c $src -o $obj
}

Write-Host "Creating static library bin/libalphaone.a..." -ForegroundColor Yellow
& $Archiver rcs bin/libalphaone.a $objFiles

Write-Host "Compiling CLI and Tests..." -ForegroundColor Yellow
& $Compiler -std=c++1z -O3 -I src/engine src/cli/Main.cpp bin/libalphaone.a -o bin/alphaone_cli.exe
& $Compiler -std=c++1z -O3 -I src/engine tests/TestBoard.cpp bin/libalphaone.a -o bin/test_board.exe
& $Compiler -std=c++1z -O3 -I src/engine tests/TestMoveGen.cpp bin/libalphaone.a -o bin/test_movegen.exe
& $Compiler -std=c++1z -O3 -I src/engine tests/TestPerft.cpp bin/libalphaone.a -o bin/test_perft.exe
& $Compiler -std=c++1z -O3 -I src/engine tests/TestEvaluation.cpp bin/libalphaone.a -o bin/test_evaluation.exe
& $Compiler -std=c++1z -O3 -I src/engine tests/TestSearch.cpp bin/libalphaone.a -o bin/test_search.exe

Write-Host "Native build completed successfully!" -ForegroundColor Green
Write-Host "Binaries located in bin/ folder."
