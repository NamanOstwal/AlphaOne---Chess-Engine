#include "Search.hpp"
#include "Evaluation.hpp"
#include "MoveGenerator.hpp"
#include <algorithm>
#include <iostream>

namespace alphaone {

Search::Search(const SearchConfig& config)
    : config_(config), tt_(config.tt_size_mb) {}

bool Search::shouldStop() noexcept {
    if (stop_flag_.load(std::memory_order_relaxed)) {
        return true;
    }
    if (effective_time_limit_ms_ > 0 && (stats_.nodes % 1024 == 0)) {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - start_time_).count();
        if (elapsed >= effective_time_limit_ms_) {
            stop_flag_.store(true, std::memory_order_relaxed);
            return true;
        }
    }
    return false;
}

int Search::negamax(Board& board, int depth, int alpha, int beta, int turn_multiplier, bool is_root) {
    stats_.nodes++;

    if (shouldStop()) {
        return 0;
    }

    uint64_t hash_key = board.zobristHash();
    int alpha_orig = alpha;
    Move tt_move{};

    // Transposition Table probe
    if (config_.use_tt) {
        int tt_score = 0;
        if (tt_.probe(hash_key, depth, alpha, beta, tt_score, tt_move)) {
            if (!is_root) {
                return tt_score;
            }
        }
    }

    // Leaf evaluation
    if (depth <= 0 || board.isCheckmate() || board.isStalemate()) {
        return turn_multiplier * Evaluation::evaluate(board);
    }

    auto valid_moves = MoveGenerator::generateLegalMoves(board);
    if (valid_moves.empty()) {
        return turn_multiplier * Evaluation::evaluate(board);
    }

    // Move ordering (TT move first, then captures by victim, then quiet by positional table)
    MoveGenerator::orderMoves(valid_moves, board, tt_move);

    int max_score = -SCORE_CHECKMATE;
    Move best_move_this_node = valid_moves[0];

    for (const auto& move : valid_moves) {
        board.makeMove(move);
        int score = -negamax(board, depth - 1, -beta, -alpha, -turn_multiplier, false);
        board.undoMove();

        if (shouldStop()) {
            return 0;
        }

        if (score > max_score) {
            max_score = score;
            best_move_this_node = move;
            if (is_root) {
                root_best_move_ = move;
            }
        }

        alpha = std::max(alpha, score);
        if (alpha >= beta) {
            break; // Beta cutoff / fail-high
        }
    }

    // Transposition Table store
    if (config_.use_tt && !shouldStop()) {
        BoundType bound = BoundType::Exact;
        if (max_score <= alpha_orig) {
            bound = BoundType::UpperBound; // Fail-low
        } else if (max_score >= beta) {
            bound = BoundType::LowerBound; // Fail-high
        }
        tt_.store(hash_key, depth, max_score, bound, best_move_this_node);
    }

    return max_score;
}

SearchStats Search::searchBestMove(Board& board, int target_depth, int time_limit_ms) {
    if (target_depth <= 0) target_depth = config_.max_depth;
    effective_time_limit_ms_ = (time_limit_ms > 0) ? time_limit_ms : config_.time_limit_ms;

    stop_flag_.store(false, std::memory_order_relaxed);
    start_time_ = std::chrono::steady_clock::now();

    stats_ = SearchStats{};
    tt_.resetStats();

    auto legal_moves = MoveGenerator::generateLegalMoves(board);
    if (legal_moves.empty()) {
        stats_.score = Evaluation::evaluate(board);
        return stats_;
    }

    root_best_move_ = legal_moves[0];
    Move best_completed_move = root_best_move_;
    int best_completed_score = 0;
    int completed_depth = 0;

    int turn_multiplier = board.whiteToMove() ? 1 : -1;

    // Iterative deepening from depth 1 to target_depth
    for (int d = 1; d <= target_depth; ++d) {
        root_best_move_ = best_completed_move;
        int score = negamax(board, d, -SCORE_CHECKMATE, SCORE_CHECKMATE, turn_multiplier, true);

        if (stop_flag_.load(std::memory_order_relaxed) && d > 1) {
            // Search was aborted during iteration d, keep results of previous completed depth
            break;
        }

        completed_depth = d;
        best_completed_score = score;
        best_completed_move = root_best_move_;

        // Stop early if checkmate was found
        if (std::abs(score) >= SCORE_CHECKMATE - 100) {
            break;
        }

        if (shouldStop()) {
            break;
        }
    }

    auto end_time = std::chrono::steady_clock::now();
    int elapsed = static_cast<int>(std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time_).count());

    stats_.depth = completed_depth;
    stats_.score = best_completed_score;
    stats_.best_move = best_completed_move;
    stats_.best_move_uci = best_completed_move.toUci();
    stats_.elapsed_ms = elapsed;
    stats_.nodes_per_second = (elapsed > 0) ? ((stats_.nodes * 1000) / elapsed) : (stats_.nodes * 1000);
    stats_.transposition_hits = tt_.hits();

    return stats_;
}

} // namespace alphaone
