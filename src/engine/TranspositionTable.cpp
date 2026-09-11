#include "TranspositionTable.hpp"
#include <algorithm>

namespace alphaone {

TranspositionTable::TranspositionTable(size_t size_mb) {
    resize(size_mb);
}

void TranspositionTable::resize(size_t size_mb) {
    if (size_mb == 0) size_mb = 1;
    size_t num_entries = (size_mb * 1024 * 1024) / sizeof(TTEntry);

    // Round down to power of 2 for fast bitmask indexing
    size_t capacity = 1;
    while (capacity * 2 <= num_entries) {
        capacity *= 2;
    }
    table_.resize(capacity);
    mask_ = capacity - 1;
    clear();
}

void TranspositionTable::clear() {
    std::fill(table_.begin(), table_.end(), TTEntry{});
    hits_ = 0;
    lookups_ = 0;
}

bool TranspositionTable::probe(uint64_t key, int depth, int alpha, int beta, int& out_score, Move& out_best_move) const {
    lookups_++;
    size_t index = key & mask_;
    const TTEntry& entry = table_[index];

    if (entry.key == key) {
        out_best_move = entry.best_move;
        if (entry.depth >= depth) {
            hits_++;
            if (entry.bound == BoundType::Exact) {
                out_score = entry.score;
                return true;
            }
            if (entry.bound == BoundType::LowerBound && entry.score >= beta) {
                out_score = entry.score;
                return true;
            }
            if (entry.bound == BoundType::UpperBound && entry.score <= alpha) {
                out_score = entry.score;
                return true;
            }
        }
    }
    return false;
}

bool TranspositionTable::getBestMove(uint64_t key, Move& out_best_move) const {
    size_t index = key & mask_;
    const TTEntry& entry = table_[index];
    if (entry.key == key && !entry.best_move.isNull()) {
        out_best_move = entry.best_move;
        return true;
    }
    return false;
}

void TranspositionTable::store(uint64_t key, int depth, int score, BoundType bound, const Move& best_move) {
    size_t index = key & mask_;
    TTEntry& entry = table_[index];

    // Always replace if empty, same key with equal/deeper depth, or older key
    if (entry.key == 0ULL || entry.key == key || depth >= entry.depth) {
        entry.key = key;
        entry.depth = static_cast<int8_t>(depth);
        entry.score = static_cast<int16_t>(score);
        entry.bound = bound;
        if (!best_move.isNull()) {
            entry.best_move = best_move;
        }
    }
}

} // namespace alphaone
