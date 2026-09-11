#pragma once

#include "Types.hpp"
#include <string>
#include <tuple>

namespace alphaone {

class Move {
public:
    enum Flags : uint8_t {
        None        = 0,
        Capture     = 1 << 0,
        EnPassant   = 1 << 1,
        Castle      = 1 << 2,
        Promotion   = 1 << 3
    };

    uint8_t from = 0;
    uint8_t to = 0;
    Piece piece_moved = Piece::Empty;
    Piece piece_captured = Piece::Empty;
    PieceType promotion_type = PieceType::None;
    uint8_t flags = None;

    constexpr Move() noexcept = default;

    constexpr Move(uint8_t from_sq, uint8_t to_sq, Piece moved, Piece captured = Piece::Empty,
                   uint8_t move_flags = None, PieceType promo = PieceType::None) noexcept
        : from(from_sq), to(to_sq), piece_moved(moved), piece_captured(captured),
          promotion_type(promo), flags(move_flags) {}

    // Convenience constructors
    static constexpr Move makeQuiet(uint8_t from_sq, uint8_t to_sq, Piece moved) noexcept {
        return Move(from_sq, to_sq, moved, Piece::Empty, None, PieceType::None);
    }

    static constexpr Move makeCapture(uint8_t from_sq, uint8_t to_sq, Piece moved, Piece captured) noexcept {
        return Move(from_sq, to_sq, moved, captured, Capture, PieceType::None);
    }

    static constexpr Move makeEnPassant(uint8_t from_sq, uint8_t to_sq, Piece moved, Piece captured) noexcept {
        return Move(from_sq, to_sq, moved, captured, EnPassant | Capture, PieceType::None);
    }

    static constexpr Move makeCastle(uint8_t from_sq, uint8_t to_sq, Piece moved) noexcept {
        return Move(from_sq, to_sq, moved, Piece::Empty, Castle, PieceType::None);
    }

    static constexpr Move makePromotion(uint8_t from_sq, uint8_t to_sq, Piece moved, Piece captured, PieceType promo) noexcept {
        uint8_t f = Promotion;
        if (captured != Piece::Empty) f |= Capture;
        return Move(from_sq, to_sq, moved, captured, f, promo);
    }

    constexpr bool isNull() const noexcept {
        return from == 0 && to == 0 && piece_moved == Piece::Empty;
    }

    constexpr bool isCapture() const noexcept {
        return (flags & Capture) != 0 || piece_captured != Piece::Empty;
    }

    constexpr bool isEnPassant() const noexcept {
        return (flags & EnPassant) != 0;
    }

    constexpr bool isCastle() const noexcept {
        return (flags & Castle) != 0;
    }

    constexpr bool isPromotion() const noexcept {
        return (flags & Promotion) != 0 || promotion_type != PieceType::None;
    }

    constexpr int startRow() const noexcept { return squareRow(from); }
    constexpr int startCol() const noexcept { return squareCol(from); }
    constexpr int endRow() const noexcept { return squareRow(to); }
    constexpr int endCol() const noexcept { return squareCol(to); }

    // Python-compatible moveID: start_row * 1000 + start_col * 100 + end_row * 10 + end_col
    constexpr int moveID() const noexcept {
        return startRow() * 1000 + startCol() * 100 + endRow() * 10 + endCol();
    }

    constexpr bool operator==(const Move& other) const noexcept {
        return from == other.from && to == other.to && promotion_type == other.promotion_type;
    }

    constexpr bool operator!=(const Move& other) const noexcept {
        return !(*this == other);
    }

    // Standard UCI string format: "e2e4", "e7e8q"
    std::string toUci() const {
        std::string s = squareToAlgebraic(from) + squareToAlgebraic(to);
        if (isPromotion()) {
            switch (promotion_type) {
                case PieceType::Queen:  s += 'q'; break;
                case PieceType::Rook:   s += 'r'; break;
                case PieceType::Bishop: s += 'b'; break;
                case PieceType::Knight: s += 'n'; break;
                default:                s += 'q'; break;
            }
        }
        return s;
    }

    // Format matching Python getChessNotation()
    std::string getChessNotation() const {
        if (isPromotion()) {
            return squareToAlgebraic(to) + "Q";
        }
        if (isCastle()) {
            return (endCol() == 1 || endCol() == 2) ? "0-0-0" : "0-0";
        }
        if (isEnPassant()) {
            std::string from_alg = squareToAlgebraic(from);
            std::string to_alg = squareToAlgebraic(to);
            return std::string(1, from_alg[0]) + "x" + to_alg + " e.p.";
        }
        if (isCapture()) {
            PieceType pt = typeOfPiece(piece_moved);
            if (pt == PieceType::Pawn) {
                return std::string(1, squareToAlgebraic(from)[0]) + "x" + squareToAlgebraic(to);
            } else {
                std::string piece_str = pieceToPythonString(piece_moved);
                return std::string(1, piece_str[1]) + "x" + squareToAlgebraic(to);
            }
        } else {
            PieceType pt = typeOfPiece(piece_moved);
            if (pt == PieceType::Pawn) {
                return squareToAlgebraic(to);
            } else {
                std::string piece_str = pieceToPythonString(piece_moved);
                return std::string(1, piece_str[1]) + squareToAlgebraic(to);
            }
        }
    }
};

} // namespace alphaone
