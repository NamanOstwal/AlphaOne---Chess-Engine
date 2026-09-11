#pragma once

#include <cstdint>
#include <string>
#if __has_include(<string_view>)
#include <string_view>
#elif __has_include(<experimental/string_view>)
#include <experimental/string_view>
namespace std {
    using string_view = std::experimental::string_view;
}
#endif
#include <array>
#include <ostream>

namespace alphaone {

// Color representation
enum class Color : uint8_t {
    White = 0,
    Black = 1,
    None  = 2
};

inline constexpr Color opponentColor(Color c) noexcept {
    return (c == Color::White) ? Color::Black : ((c == Color::Black) ? Color::White : Color::None);
}

// Piece Type representation
enum class PieceType : uint8_t {
    None   = 0,
    Pawn   = 1,
    Knight = 2,
    Bishop = 3,
    Rook   = 4,
    Queen  = 5,
    King   = 6
};

// Full Piece enum: lower 3 bits = PieceType, 4th bit = Black color (0 for White, 8 for Black)
enum class Piece : uint8_t {
    Empty       = 0,
    WhitePawn   = 1,
    WhiteKnight = 2,
    WhiteBishop = 3,
    WhiteRook   = 4,
    WhiteQueen  = 5,
    WhiteKing   = 6,

    BlackPawn   = 9,
    BlackKnight = 10,
    BlackBishop = 11,
    BlackRook   = 12,
    BlackQueen  = 13,
    BlackKing   = 14
};

inline constexpr Piece makePiece(Color c, PieceType pt) noexcept {
    if (pt == PieceType::None || c == Color::None) return Piece::Empty;
    return static_cast<Piece>((c == Color::Black ? 8 : 0) | static_cast<uint8_t>(pt));
}

inline constexpr PieceType typeOfPiece(Piece p) noexcept {
    return static_cast<PieceType>(static_cast<uint8_t>(p) & 0x07);
}

inline constexpr Color colorOfPiece(Piece p) noexcept {
    if (p == Piece::Empty) return Color::None;
    return (static_cast<uint8_t>(p) & 0x08) ? Color::Black : Color::White;
}

// Castling Rights Bitmask
struct CastleRights {
    static constexpr uint8_t None = 0;
    static constexpr uint8_t WhiteKingSide  = 1 << 0; // 1
    static constexpr uint8_t WhiteQueenSide = 1 << 1; // 2
    static constexpr uint8_t BlackKingSide  = 1 << 2; // 4
    static constexpr uint8_t BlackQueenSide = 1 << 3; // 8
    static constexpr uint8_t All = WhiteKingSide | WhiteQueenSide | BlackKingSide | BlackQueenSide; // 15
};

// Board indexing:
// row 0 = rank 8 (Black side), row 7 = rank 1 (White side)
// col 0 = file a, col 7 = file h
// square = row * 8 + col (0 .. 63)
inline constexpr int makeSquare(int row, int col) noexcept {
    return row * 8 + col;
}

inline constexpr int squareRow(int sq) noexcept {
    return sq / 8;
}

inline constexpr int squareCol(int sq) noexcept {
    return sq % 8;
}

inline constexpr bool isValidSquare(int row, int col) noexcept {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

inline constexpr bool isValidSquare(int sq) noexcept {
    return sq >= 0 && sq < 64;
}

// String conversions compatible with Python ("wp", "bK", "--")
inline std::string pieceToPythonString(Piece p) {
    switch (p) {
        case Piece::WhitePawn:   return "wp";
        case Piece::WhiteKnight: return "wN";
        case Piece::WhiteBishop: return "wB";
        case Piece::WhiteRook:   return "wR";
        case Piece::WhiteQueen:  return "wQ";
        case Piece::WhiteKing:   return "wK";
        case Piece::BlackPawn:   return "bp";
        case Piece::BlackKnight: return "bN";
        case Piece::BlackBishop: return "bB";
        case Piece::BlackRook:   return "bR";
        case Piece::BlackQueen:  return "bQ";
        case Piece::BlackKing:   return "bK";
        default:                 return "--";
    }
}

inline Piece pieceFromPythonString(std::string_view s) {
    if (s.size() < 2 || s == "--") return Piece::Empty;
    Color c = (s[0] == 'w') ? Color::White : (s[0] == 'b' ? Color::Black : Color::None);
    PieceType pt = PieceType::None;
    switch (s[1]) {
        case 'p': pt = PieceType::Pawn; break;
        case 'N': pt = PieceType::Knight; break;
        case 'B': pt = PieceType::Bishop; break;
        case 'R': pt = PieceType::Rook; break;
        case 'Q': pt = PieceType::Queen; break;
        case 'K': pt = PieceType::King; break;
        default: break;
    }
    return makePiece(c, pt);
}

// Square string conversion (e.g. 52 -> "e2", 0 -> "a8")
inline std::string squareToAlgebraic(int sq) {
    if (!isValidSquare(sq)) return "-";
    int row = squareRow(sq);
    int col = squareCol(sq);
    char file = static_cast<char>('a' + col);
    char rank = static_cast<char>('8' - row);
    return {file, rank};
}

inline int algebraicToSquare(std::string_view alg) {
    if (alg.size() < 2) return -1;
    int col = alg[0] - 'a';
    int row = '8' - alg[1];
    if (!isValidSquare(row, col)) return -1;
    return makeSquare(row, col);
}

// Direction offsets for (row, col)
struct Direction {
    int d_row;
    int d_col;
};

// 8 ray directions: 4 orthogonal, 4 diagonal
static constexpr std::array<Direction, 8> DIRECTIONS = {{
    {-1, 0}, {0, -1}, {1, 0}, {0, 1},       // Up, Left, Down, Right (0..3)
    {-1, -1}, {-1, 1}, {1, -1}, {1, 1}      // UpLeft, UpRight, DownLeft, DownRight (4..7)
}};

// 8 knight offsets matching Python:
// ((-2, -1), (-2, 1), (-1, 2), (1, 2), (2, -1), (2, 1), (-1, -2), (1, -2))
static constexpr std::array<Direction, 8> KNIGHT_MOVES = {{
    {-2, -1}, {-2, 1}, {-1, 2}, {1, 2},
    {2, -1}, {2, 1}, {-1, -2}, {1, -2}
}};

// King adjacent moves matching Python:
// row_moves = (-1, -1, -1, 0, 0, 1, 1, 1)
// col_moves = (-1, 0, 1, -1, 1, -1, 0, 1)
static constexpr std::array<Direction, 8> KING_MOVES = {{
    {-1, -1}, {-1, 0}, {-1, 1},
    {0, -1},           {0, 1},
    {1, -1},  {1, 0},  {1, 1}
}};

// Material evaluation constants matching Python's piece_score:
// piece_score = {"K": 6000, "Q": 929, "R": 512, "B": 320, "N": 280, "p": 100}
constexpr int SCORE_PAWN   = 100;
constexpr int SCORE_KNIGHT = 280;
constexpr int SCORE_BISHOP = 320;
constexpr int SCORE_ROOK   = 512;
constexpr int SCORE_QUEEN  = 929;
constexpr int SCORE_KING   = 6000;

constexpr int SCORE_CHECKMATE = 10000;
constexpr int SCORE_STALEMATE = 0;

} // namespace alphaone
