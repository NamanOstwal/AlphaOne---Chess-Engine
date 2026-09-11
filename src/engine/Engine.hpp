#pragma once

#include "Board.hpp"
#include "Move.hpp"
#include "MoveGenerator.hpp"
#include "Evaluation.hpp"
#include "Search.hpp"
#include <string>
#include <vector>
#include <memory>

namespace alphaone {

class Engine {
public:
    explicit Engine(const SearchConfig& config = SearchConfig{});

    // Game lifecycle
    void newGame();
    void reset();
    bool setPosition(std::string_view fen);
    std::string getPosition() const;

    // Board queries
    bool isWhiteToMove() const noexcept { return board_.whiteToMove(); }
    bool isCheckmate() const noexcept { return board_.isCheckmate(); }
    bool isStalemate() const noexcept { return board_.isStalemate(); }
    bool isInCheck() const noexcept { return board_.isInCheck(); }
    int moveCount() const noexcept { return static_cast<int>(board_.moveCount()); }

    // Moves
    std::vector<std::string> getLegalMoves();
    bool makeMove(std::string_view uci_move);
    bool undoMove();

    // AI & Search
    std::string getBestMove(int time_limit_ms, int max_depth);
    SearchStats getSearchStats() const noexcept { return search_->lastStats(); }
    void stopSearch() noexcept { search_->stop(); }
    int evaluate() const noexcept { return Evaluation::evaluate(board_); }

    // Direct board access
    Board& getBoard() noexcept { return board_; }
    const Board& getBoard() const noexcept { return board_; }

private:
    Board board_;
    SearchConfig config_;
    std::unique_ptr<Search> search_;
};

} // namespace alphaone
