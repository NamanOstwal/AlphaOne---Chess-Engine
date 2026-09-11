#include "../src/engine/Board.hpp"
#include <iostream>
#include <cassert>

using namespace alphaone;

void testInitialBoard() {
    Board board;
    assert(board.whiteToMove() == true);
    assert(board.whiteKingSquare() == makeSquare(7, 4));
    assert(board.blackKingSquare() == makeSquare(0, 4));
    assert(board.castlingRights() == CastleRights::All);
    assert(board.enPassantSquare() == -1);

    // Check corners
    assert(board.pieceAt(7, 0) == Piece::WhiteRook);
    assert(board.pieceAt(7, 7) == Piece::WhiteRook);
    assert(board.pieceAt(0, 0) == Piece::BlackRook);
    assert(board.pieceAt(0, 7) == Piece::BlackRook);

    // Check pawns
    for (int c = 0; c < 8; ++c) {
        assert(board.pieceAt(6, c) == Piece::WhitePawn);
        assert(board.pieceAt(1, c) == Piece::BlackPawn);
    }
    std::cout << "[PASS] testInitialBoard\n";
}

void testMakeUndo() {
    Board board;
    uint64_t initial_hash = board.zobristHash();

    // Make e2-e4: (6, 4) -> (4, 4)
    Move e2e4 = Move::makeQuiet(makeSquare(6, 4), makeSquare(4, 4), Piece::WhitePawn);
    board.makeMove(e2e4);

    assert(board.pieceAt(6, 4) == Piece::Empty);
    assert(board.pieceAt(4, 4) == Piece::WhitePawn);
    assert(board.whiteToMove() == false);
    assert(board.enPassantSquare() == makeSquare(5, 4)); // e3
    assert(board.zobristHash() != initial_hash);

    // Undo e2-e4
    board.undoMove();
    assert(board.pieceAt(6, 4) == Piece::WhitePawn);
    assert(board.pieceAt(4, 4) == Piece::Empty);
    assert(board.whiteToMove() == true);
    assert(board.enPassantSquare() == -1);
    assert(board.zobristHash() == initial_hash);

    std::cout << "[PASS] testMakeUndo\n";
}

void testFen() {
    Board board;
    std::string start_fen = board.toFen();
    assert(start_fen.find("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") != std::string::npos);

    // Set custom FEN
    std::string custom_fen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
    bool ok = board.setFromFen(custom_fen);
    assert(ok);
    assert(board.whiteToMove() == true);
    assert(board.pieceAt(5, 5) == Piece::WhiteKnight); // f3 = row 5, col 5
    assert(board.pieceAt(4, 4) == Piece::WhitePawn);   // e4 = row 4, col 4
    assert(board.pieceAt(3, 4) == Piece::BlackPawn);   // e5 = row 3, col 4
    assert(board.pieceAt(2, 2) == Piece::BlackKnight); // c6 = row 2, col 2

    std::cout << "[PASS] testFen\n";
}

int main() {
    std::cout << "Running Board Tests...\n";
    testInitialBoard();
    testMakeUndo();
    testFen();
    std::cout << "All Board Tests Passed!\n";
    return 0;
}
