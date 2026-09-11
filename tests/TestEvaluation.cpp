#include "../src/engine/Board.hpp"
#include "../src/engine/Evaluation.hpp"
#include <iostream>
#include <cassert>

using namespace alphaone;

void testInitialEvaluation() {
    Board board;
    int eval = Evaluation::evaluate(board);
    // Initial chess position is completely symmetric: evaluation must be 0
    std::cout << "Initial position evaluation: " << eval << "\n";
    assert(eval == 0);
    std::cout << "[PASS] testInitialEvaluation: Exactly 0\n";
}

void testMaterialDeltas() {
    Board board;
    // Remove Black Queen at (0, 3)
    board.setPiece(0, 3, Piece::Empty);
    int eval = Evaluation::evaluate(board);
    // White has queen advantage (+929 + queen positional score on d8)
    std::cout << "White +Q advantage eval: " << eval << "\n";
    assert(eval > 900);
    std::cout << "[PASS] testMaterialDeltas\n";
}

void testTerminalEvaluations() {
    // Checkmate position
    Board board;
    board.setStatus(true, true, false); // in checkmate, White to move
    int eval_white_mated = Evaluation::evaluate(board);
    assert(eval_white_mated == -SCORE_CHECKMATE);

    // Stalemate position
    board.setStatus(false, false, true); // stalemate
    int eval_stalemate = Evaluation::evaluate(board);
    assert(eval_stalemate == SCORE_STALEMATE);

    std::cout << "[PASS] testTerminalEvaluations\n";
}

int main() {
    std::cout << "Running Evaluation Tests...\n";
    testInitialEvaluation();
    testMaterialDeltas();
    testTerminalEvaluations();
    std::cout << "All Evaluation Tests Passed!\n";
    return 0;
}
