#!/usr/bin/env bash
set -e

echo "=========================================="
echo " AlphaOne Native C++ Engine Build (POSIX)"
echo "=========================================="

CXX=${CXX:-g++}
AR=${AR:-ar}

mkdir -p bin

SOURCES=(
    "src/engine/Board.cpp"
    "src/engine/MoveGenerator.cpp"
    "src/engine/Evaluation.cpp"
    "src/engine/Search.cpp"
    "src/engine/TranspositionTable.cpp"
    "src/engine/Zobrist.cpp"
    "src/engine/Engine.cpp"
)

echo "Compiling engine sources with $CXX..."
OBJ_FILES=()
for src in "${SOURCES[@]}"; do
    base=$(basename "$src" .cpp)
    obj="bin/$base.o"
    OBJ_FILES+=("$obj")
    echo "  -> $src"
    $CXX -std=c++17 -O3 -I src/engine -c "$src" -o "$obj"
done

echo "Creating static library bin/libalphaone.a..."
$AR rcs bin/libalphaone.a "${OBJ_FILES[@]}"

echo "Compiling CLI and Tests..."
$CXX -std=c++17 -O3 -I src/engine src/cli/Main.cpp bin/libalphaone.a -o bin/alphaone_cli
$CXX -std=c++17 -O3 -I src/engine tests/TestBoard.cpp bin/libalphaone.a -o bin/test_board
$CXX -std=c++17 -O3 -I src/engine tests/TestMoveGen.cpp bin/libalphaone.a -o bin/test_movegen
$CXX -std=c++17 -O3 -I src/engine tests/TestPerft.cpp bin/libalphaone.a -o bin/test_perft
$CXX -std=c++17 -O3 -I src/engine tests/TestEvaluation.cpp bin/libalphaone.a -o bin/test_evaluation
$CXX -std=c++17 -O3 -I src/engine tests/TestSearch.cpp bin/libalphaone.a -o bin/test_search

echo "Native build completed successfully!"
