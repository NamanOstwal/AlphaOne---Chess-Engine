#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Running AlphaOne Test Suite (POSIX)"
echo "=========================================="

TESTS=(
    "bin/test_board"
    "bin/test_movegen"
    "bin/test_perft"
    "bin/test_evaluation"
    "bin/test_search"
)

for t in "${TESTS[@]}"; do
    if [ -f "$t" ]; then
        echo "Executing $t..."
        ./"$t"
    fi
done

echo "Running Python Parity Verification..."
python3 tests/verify_parity.py

echo "All tests passed successfully!"
