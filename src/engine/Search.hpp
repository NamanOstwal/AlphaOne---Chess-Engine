#pragma once

#include "Board.hpp"
#include "Move.hpp"
#include "TranspositionTable.hpp"
#include <cstdint>
#include <chrono>
#include <atomic>
#include <string>

namespace alphaone {

struct SearchStats {
    int depth = 0;
    uint64_t nodes = 0;
    int score = 0;
    int elapsed_ms = 0;
    uint64_t nodes_per_second = 0;
    size_t transposition_hits = 0;
    Move best_move{};
    std::string best_move_uci{};
};

struct SearchConfig {
    int max_depth = 4;
    int time_limit_ms = 0; // 0 = no time limit (search to max_depth)
    size_t tt_size_mb = 16;
    bool use_tt = true;
};

class Search {
public:
    explicit Search(const SearchConfig& config = SearchConfig{});

    // Run search and return statistics and best move
    SearchStats searchBestMove(Board& board, int depth = -1, int time_limit_ms = -1);

    // Stop current search prematurely (thread-safe for Web Workers / browser UI)
    void stop() noexcept { stop_flag_ = true; }

    TranspositionTable& transpositionTable() noexcept { return tt_; }
    const SearchStats& lastStats() const noexcept { return stats_; }

private:
    int negamax(Board& board, int depth, int alpha, int beta, int turn_multiplier, bool is_root = false);
    bool shouldStop() noexcept;

    SearchConfig config_;
    TranspositionTable tt_;
    SearchStats stats_;

    std::atomic<bool> stop_flag_{false};
    std::chrono::steady_clock::time_point start_time_;
    int effective_time_limit_ms_ = 0;
    Move root_best_move_{};
};

} // namespace alphaone
