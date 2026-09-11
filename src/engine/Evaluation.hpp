#pragma once

#include "Board.hpp"
#include "Types.hpp"
#include <array>

namespace alphaone {

class Evaluation {
public:
    static int evaluate(const Board& board) noexcept;
    static int pieceValue(PieceType pt) noexcept;
    static int pieceSquareValue(Piece piece, int row, int col) noexcept;

    // Positional score tables (exact Python values)
    static const std::array<std::array<int, 8>, 8> PAWN_SCORES;
    static const std::array<std::array<int, 8>, 8> KNIGHT_SCORES;
    static const std::array<std::array<int, 8>, 8> BISHOP_SCORES;
    static const std::array<std::array<int, 8>, 8> ROOK_SCORES;
    static const std::array<std::array<int, 8>, 8> QUEEN_SCORES;
};

} // namespace alphaone
