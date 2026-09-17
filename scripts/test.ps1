# Run all tests for AlphaOne
$ErrorActionPreference = "Stop"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Running AlphaOne Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$tests = @(
    "bin/test_board.exe",
    "bin/test_movegen.exe",
    "bin/test_perft.exe",
    "bin/test_evaluation.exe",
    "bin/test_search.exe"
)

foreach ($test in $tests) {
    if (Test-Path $test) {
        Write-Host "Executing $test..." -ForegroundColor Yellow
        & ".\$test"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Test $test failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Warning "$test not found. Run scripts/build-native.ps1 first."
    }
}

Write-Host "All native C++ test suites passed successfully!" -ForegroundColor Green
