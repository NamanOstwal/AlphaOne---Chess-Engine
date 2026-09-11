#include "../src/engine/Board.hpp"
#include "../src/engine/Search.hpp"
#include <iostream>
#include <cassert>

using namespace alphaone;

void testMateInOne() {
    // White can play Qxf7# (f3f7)
    Board board("r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 5");
    Search search;
    SearchStats stats = search.searchBestMove(board, 2);
    std::cout << "Mate in 1: best move = " << stats.best_move_uci << " score = " << stats.score << "\n";
    assert(stats.best_move_uci == "f3f7");
    assert(stats.score >= SCORE_CHECKMATE - 100);
    std::cout << "[PASS] testMateInOne\n";
}

void testInitialPositionSearch() {
    Board board;
    Search search;
    SearchStats stats = search.searchBestMove(board, 4);
    std::cout << "Depth 4 search: best move = " << stats.best_move_uci
              << ", nodes = " << stats.nodes << ", time = " << stats.elapsed_ms
              << "ms, NPS = " << stats.nodes_per_second << ", TT hits = " << stats.transposition_hits << "\n";
    assert(!stats.best_move_uci.empty());
    assert(stats.nodes > 0);
    std::cout << "[PASS] testInitialPositionSearch\n";
}

int main() {
    std::cout << "Running Search Tests...\n";
    testMateInOne();
    testInitialPositionSearch();
    std::cout << "All Search Tests Passed!\n";
    return 0;
}
