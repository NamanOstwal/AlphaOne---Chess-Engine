#pragma once

#include "Move.hpp"
#include <cstdint>
#include <vector>
#include <cstddef>

namespace alphaone {

enum class BoundType : uint8_t {
    Exact = 0,
    LowerBound = 1, // Alpha cutoff (fail-high)
    UpperBound = 2  // Beta cutoff (fail-low)
};

struct TTEntry {
    uint64_t key = 0ULL;
    int16_t score = 0;
    int8_t depth = -1;
    BoundType bound = BoundType::Exact;
    Move best_move{};
};

class TranspositionTable {
public:
    explicit TranspositionTable(size_t size_mb = 16);

    void resize(size_t size_mb);
    void clear();

    bool probe(uint64_t key, int depth, int alpha, int beta, int& out_score, Move& out_best_move) const;
    void store(uint64_t key, int depth, int score, BoundType bound, const Move& best_move);

    bool getBestMove(uint64_t key, Move& out_best_move) const;

    size_t hits() const noexcept { return hits_; }
    size_t lookups() const noexcept { return lookups_; }
    void resetStats() noexcept { hits_ = 0; lookups_ = 0; }

private:
    std::vector<TTEntry> table_;
    size_t mask_ = 0;
    mutable size_t hits_ = 0;
    mutable size_t lookups_ = 0;
};

} // namespace alphaone
