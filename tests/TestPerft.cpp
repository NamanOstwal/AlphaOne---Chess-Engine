#include "../src/engine/Board.hpp"
#include "../src/engine/MoveGenerator.hpp"
#include <iostream>
#include <chrono>
#include <cassert>

using namespace alphaone;

uint64_t perft(Board& board, int depth) {
    if (depth == 0) return 1ULL;
    auto moves = MoveGenerator::generateLegalMoves(board);
    if (depth == 1) return moves.size();

    uint64_t nodes = 0;
    for (const auto& m : moves) {
        board.makeMove(m);
        nodes += perft(board, depth - 1);
        board.undoMove();
    }
    return nodes;
}

int main() {
    std::cout << "Running Perft Tests (Starting Position)...\n";
    Board board;

    // Perft Depth 1: 20
    uint64_t p1 = perft(board, 1);
    std::cout << "Perft(1) = " << p1 << " (expected 20)\n";
    assert(p1 == 20);

    // Perft Depth 2: 400
    uint64_t p2 = perft(board, 2);
    std::cout << "Perft(2) = " << p2 << " (expected 400)\n";
    assert(p2 == 400);

    // Perft Depth 3: 8902
    auto t0 = std::chrono::steady_clock::now();
    uint64_t p3 = perft(board, 3);
    auto t1 = std::chrono::steady_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count();
    std::cout << "Perft(3) = " << p3 << " in " << ms << "ms (expected 8902)\n";
    assert(p3 == 8902);

    // Perft Depth 4: 197281
    t0 = std::chrono::steady_clock::now();
    uint64_t p4 = perft(board, 4);
    t1 = std::chrono::steady_clock::now();
    ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count();
    std::cout << "Perft(4) = " << p4 << " in " << ms << "ms (expected 197281)\n";
    assert(p4 == 197281);

    std::cout << "All Perft Tests Passed Successfully!\n";
    return 0;
}
