cmake_minimum_required(VERSION 3.12)
project(AlphaOne VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Common engine sources
set(ENGINE_SOURCES
    src/engine/Board.cpp
    src/engine/MoveGenerator.cpp
    src/engine/Evaluation.cpp
    src/engine/Search.cpp
    src/engine/TranspositionTable.cpp
    src/engine/Zobrist.cpp
    src/engine/Engine.cpp
)

include_directories(src/engine)

# Native engine library
add_library(alphaone_engine STATIC ${ENGINE_SOURCES})

if(EMSCRIPTEN)
    # WebAssembly Build Target
    set(WASM_OUT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/frontend/public/wasm")
    file(MAKE_DIRECTORY ${WASM_OUT_DIR})

    add_executable(alphaone_wasm src/wasm/WasmBindings.cpp)
    target_link_libraries(alphaone_wasm PRIVATE alphaone_engine)

    set_target_properties(alphaone_wasm PROPERTIES
        OUTPUT_NAME "alphaone"
        SUFFIX ".js"
        RUNTIME_OUTPUT_DIRECTORY "${WASM_OUT_DIR}"
    )

    target_compile_options(alphaone_wasm PRIVATE -O3)
    target_link_options(alphaone_wasm PRIVATE
        -O3
        --bind
        -s MODULARIZE=1
        -s EXPORT_NAME="AlphaOneModule"
        -s ALLOW_MEMORY_GROWTH=1
        -s NO_EXIT_RUNTIME=1
        -s ENVIRONMENT="web,worker,node"
    )
else()
    # Native CLI executable
    add_executable(alphaone_cli src/cli/Main.cpp)
    target_link_libraries(alphaone_cli PRIVATE alphaone_engine)

    # Unit & Performance Tests
    enable_testing()

    add_executable(test_board tests/TestBoard.cpp)
    target_link_libraries(test_board PRIVATE alphaone_engine)
    add_test(NAME BoardTests COMMAND test_board)

    add_executable(test_movegen tests/TestMoveGen.cpp)
    target_link_libraries(test_movegen PRIVATE alphaone_engine)
    add_test(NAME MoveGenTests COMMAND test_movegen)

    add_executable(test_perft tests/TestPerft.cpp)
    target_link_libraries(test_perft PRIVATE alphaone_engine)
    add_test(NAME PerftTests COMMAND test_perft)

    add_executable(test_evaluation tests/TestEvaluation.cpp)
    target_link_libraries(test_evaluation PRIVATE alphaone_engine)
    add_test(NAME EvaluationTests COMMAND test_evaluation)

    add_executable(test_search tests/TestSearch.cpp)
    target_link_libraries(test_search PRIVATE alphaone_engine)
    add_test(NAME SearchTests COMMAND test_search)
endif()
