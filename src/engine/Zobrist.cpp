#include "Zobrist.hpp"

namespace alphaone {

bool Zobrist::initialized_ = false;
std::array<std::array<uint64_t, 16>, 64> Zobrist::piece_square_table_{};
uint64_t Zobrist::side_to_move_key_ = 0ULL;
std::array<uint64_t, 16> Zobrist::castling_keys_{};
std::array<uint64_t, 8> Zobrist::en_passant_keys_{};

// Deterministic 64-bit pseudo-random generator (SplitMix64)
static uint64_t splitmix64(uint64_t& state) noexcept {
    state += 0x9E3779B97F4A7C15ULL;
    uint64_t z = state;
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}

void Zobrist::init() noexcept {
    if (initialized_) return;

    uint64_t seed = 0x123456789ABCDEF0ULL;

    for (int sq = 0; sq < 64; ++sq) {
        for (int p = 0; p < 16; ++p) {
            piece_square_table_[sq][p] = splitmix64(seed);
        }
    }

    side_to_move_key_ = splitmix64(seed);

    for (int i = 0; i < 16; ++i) {
        castling_keys_[i] = splitmix64(seed);
    }

    for (int i = 0; i < 8; ++i) {
        en_passant_keys_[i] = splitmix64(seed);
    }

    initialized_ = true;
}

} // namespace alphaone
