#pragma once

#include "Board.hpp"
#include "Move.hpp"
#include <vector>
#include <tuple>

namespace alphaone {

struct PinInfo {
    int row;
    int col;
    int d_row;
    int d_col;
};

struct CheckInfo {
    int row;
    int col;
    int d_row;
    int d_col;
};

class MoveGenerator {
public:
    // Generate all legal moves matching Python getValidMoves()
    static std::vector<Move> generateLegalMoves(Board& board);

    // Generate pseudo-legal moves matching Python getAllPossibleMoves()
    static void generateAllPossibleMoves(const Board& board, std::vector<Move>& moves);

    // Check detection and pins
    static std::tuple<bool, std::vector<PinInfo>, std::vector<CheckInfo>>
    checkForPinsAndChecks(const Board& board);

    // Square attack test matching Python squareUnderAttack()
    static bool isSquareUnderAttack(const Board& board, int row, int col);

    // Move ordering matching Python orderMoves()
    static void orderMoves(std::vector<Move>& moves, const Board& board, const Move& tt_move = Move{});

private:
    static void getPawnMoves(const Board& board, int row, int col,
                             std::vector<PinInfo>& pins, std::vector<Move>& moves);
    static void getRookMoves(const Board& board, int row, int col,
                             std::vector<PinInfo>& pins, std::vector<Move>& moves);
    static void getKnightMoves(const Board& board, int row, int col,
                               std::vector<PinInfo>& pins, std::vector<Move>& moves);
    static void getBishopMoves(const Board& board, int row, int col,
                               std::vector<PinInfo>& pins, std::vector<Move>& moves);
    static void getQueenMoves(const Board& board, int row, int col,
                              std::vector<PinInfo>& pins, std::vector<Move>& moves);
    static void getKingMoves(Board& board, int row, int col, std::vector<Move>& moves);
    static void getCastleMoves(const Board& board, int row, int col, std::vector<Move>& moves);
};

} // namespace alphaone
