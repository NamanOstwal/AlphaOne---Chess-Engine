#include "Engine.hpp"

namespace alphaone {

Engine::Engine(const SearchConfig& config)
    : config_(config), search_(std::make_unique<Search>(config)) {
    newGame();
}

void Engine::newGame() {
    board_.resetToInitialPosition();
    search_->transpositionTable().clear();
}

void Engine::reset() {
    newGame();
}

bool Engine::setPosition(std::string_view fen) {
    bool ok = board_.setFromFen(fen);
    if (ok) {
        search_->transpositionTable().clear();
    }
    return ok;
}

std::string Engine::getPosition() const {
    return board_.toFen();
}

std::vector<std::string> Engine::getLegalMoves() {
    auto moves = MoveGenerator::generateLegalMoves(board_);
    std::vector<std::string> uci_list;
    uci_list.reserve(moves.size());
    for (const auto& m : moves) {
        uci_list.push_back(m.toUci());
    }
    return uci_list;
}

bool Engine::makeMove(std::string_view uci_move) {
    auto legal_moves = MoveGenerator::generateLegalMoves(board_);
    for (const auto& m : legal_moves) {
        if (m.toUci() == uci_move) {
            board_.makeMove(m);
            // Recompute status for new position
            MoveGenerator::generateLegalMoves(board_);
            return true;
        }
    }
    return false;
}

bool Engine::undoMove() {
    if (board_.moveCount() == 0) return false;
    board_.undoMove();
    // Recompute status
    MoveGenerator::generateLegalMoves(board_);
    return true;
}

std::string Engine::getBestMove(int time_limit_ms, int max_depth) {
    if (max_depth <= 0) max_depth = config_.max_depth;
    SearchStats stats = search_->searchBestMove(board_, max_depth, time_limit_ms);
    return stats.best_move_uci;
}

} // namespace alphaone
