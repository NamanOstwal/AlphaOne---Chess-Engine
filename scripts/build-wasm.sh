#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Building AlphaOne WebAssembly Module (POSIX)"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EMSDK_DIR="${SCRIPT_DIR}/../emsdk"

if ! command -v em++ &> /dev/null; then
    if [ -f "${EMSDK_DIR}/upstream/emscripten/em++" ]; then
        export PATH="${EMSDK_DIR}/upstream/emscripten:${PATH}"
    elif [ -f "${EMSDK_DIR}/emsdk_env.sh" ]; then
        source "${EMSDK_DIR}/emsdk_env.sh"
    else
        echo "Error: em++ not found. Please activate emsdk."
        exit 1
    fi
fi

OUT_DIR="${SCRIPT_DIR}/../frontend/public/wasm"
mkdir -p "${OUT_DIR}"

SOURCES=(
    "${SCRIPT_DIR}/../src/engine/Board.cpp"
    "${SCRIPT_DIR}/../src/engine/MoveGenerator.cpp"
    "${SCRIPT_DIR}/../src/engine/Evaluation.cpp"
    "${SCRIPT_DIR}/../src/engine/Search.cpp"
    "${SCRIPT_DIR}/../src/engine/TranspositionTable.cpp"
    "${SCRIPT_DIR}/../src/engine/Zobrist.cpp"
    "${SCRIPT_DIR}/../src/engine/Engine.cpp"
    "${SCRIPT_DIR}/../src/wasm/WasmBindings.cpp"
)

echo "Compiling C++ to WebAssembly with em++..."
em++ -O3 -std=c++17 --bind \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="AlphaOneModule" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s NO_EXIT_RUNTIME=1 \
    -s ENVIRONMENT="web,worker,node" \
    -I "${SCRIPT_DIR}/../src/engine" \
    "${SOURCES[@]}" \
    -o "${OUT_DIR}/alphaone.js"

echo "WASM Build Success!"
echo "Output: ${OUT_DIR}/alphaone.js and ${OUT_DIR}/alphaone.wasm"
