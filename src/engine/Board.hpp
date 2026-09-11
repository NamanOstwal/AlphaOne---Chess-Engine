#pragma once

#include "Types.hpp"
#include "Move.hpp"
#include "Zobrist.hpp"
#include <array>
#include <vector>
#include <string>

namespace alphaone {

struct UndoState {
    Move move;
    Piece piece_captured = Piece::Empty;
    uint8_t castling_rights = CastleRights::None;
    int8_t enpassant_square = -1;
    int halfmove_clock = 0;
    uint64_t zobrist_hash = 0ULL;
    int white_king_sq = -1;
    int black_king_sq = -1;
    bool checkmate = false;
    bool stalemate = false;
    bool in_check = false;
};

class Board {
public:
    Board();
    explicit Board(std::string_view fen);

    // Position setup
    void resetToInitialPosition();
    bool setFromFen(std::string_view fen);
    std::string toFen() const;

    // Python matrix conversion for exact parity testing
    void setFromPythonMatrix(const std::vector<std::vector<std::string>>& matrix, bool white_to_move = true);
    std::vector<std::vector<std::string>> toPythonMatrix() const;
    std::string getPythonHashKey() const;

    // Piece access
    Piece pieceAt(int sq) const noexcept { return board_[sq]; }
    Piece pieceAt(int row, int col) const noexcept { return board_[makeSquare(row, col)]; }
    void setPiece(int sq, Piece p) noexcept;
    void setPiece(int row, int col, Piece p) noexcept { setPiece(makeSquare(row, col), p); }

    // State queries
    bool whiteToMove() const noexcept { return white_to_move_; }
    Color sideToMove() const noexcept { return white_to_move_ ? Color::White : Color::Black; }
    uint8_t castlingRights() const noexcept { return castling_rights_; }
    int enPassantSquare() const noexcept { return enpassant_square_; }
    int whiteKingSquare() const noexcept { return white_king_sq_; }
    int blackKingSquare() const noexcept { return black_king_sq_; }
    int kingSquare(Color c) const noexcept { return (c == Color::White) ? white_king_sq_ : black_king_sq_; }
    int moveCounter() const noexcept { return move_counter_; }
    int halfmoveClock() const noexcept { return halfmove_clock_; }
    uint64_t zobristHash() const noexcept { return zobrist_hash_; }

    bool isCheckmate() const noexcept { return checkmate_; }
    bool isStalemate() const noexcept { return stalemate_; }
    bool isInCheck() const noexcept { return in_check_; }

    void setStatus(bool in_check, bool checkmate, bool stalemate) noexcept {
        in_check_ = in_check;
        checkmate_ = checkmate;
        stalemate_ = stalemate;
    }

    // Move execution
    void makeMove(const Move& move);
    void undoMove();

    const std::vector<Move>& moveLog() const noexcept { return move_log_; }
    size_t moveCount() const noexcept { return move_log_.size(); }

    // Hash computation from scratch
    uint64_t computeZobristHash() const noexcept;

    // Pretty printing for debugging
    void print() const;
    std::string toString() const;

private:
    void updateCastleRights(const Move& move) noexcept;

    std::array<Piece, 64> board_{};
    bool white_to_move_ = true;
    uint8_t castling_rights_ = CastleRights::All;
    int8_t enpassant_square_ = -1; // square index where en-passant capture can land, or -1
    int white_king_sq_ = makeSquare(7, 4); // e1 = 60
    int black_king_sq_ = makeSquare(0, 4); // e8 = 4
    int move_counter_ = 0;
    int halfmove_clock_ = 0;
    uint64_t zobrist_hash_ = 0ULL;

    bool in_check_ = false;
    bool checkmate_ = false;
    bool stalemate_ = false;

    std::vector<Move> move_log_;
    std::vector<UndoState> undo_stack_;
};

} // namespace alphaone
