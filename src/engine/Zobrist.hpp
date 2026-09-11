#pragma once

#include "Types.hpp"
#include <cstdint>
#include <array>

namespace alphaone {

class Zobrist {
public:
    static void init() noexcept;

    // Piece on square hash (sq: 0..63, piece: 0..15)
    static uint64_t pieceSquare(int sq, Piece p) noexcept {
        return piece_square_table_[sq][static_cast<uint8_t>(p)];
    }

    // Black to move key
    static uint64_t sideToMove() noexcept {
        return side_to_move_key_;
    }

    // Castling rights key (0..15)
    static uint64_t castling(uint8_t rights) noexcept {
        return castling_keys_[rights & 0x0F];
    }

    // En passant file key (col: 0..7, or -1 for none)
    static uint64_t enPassant(int col) noexcept {
        if (col < 0 || col >= 8) return 0ULL;
        return en_passant_keys_[col];
    }

private:
    static bool initialized_;
    static std::array<std::array<uint64_t, 16>, 64> piece_square_table_;
    static uint64_t side_to_move_key_;
    static std::array<uint64_t, 16> castling_keys_;
    static std::array<uint64_t, 8> en_passant_keys_;
};

} // namespace alphaone
