#include "Evaluation.hpp"

namespace alphaone {

// Positional tables matching Python ChessAI.py exactly:
const std::array<std::array<int, 8>, 8> Evaluation::PAWN_SCORES = {{
    {  0,   0,   0,   0,   0,   0,   0,   0},
    { 78,  83,  86,  73, 102,  82,  85,  90},
    {  7,  29,  21,  44,  40,  31,  44,   7},
    {-17,  16,  -2,  15,  14,   0,  15, -13},
    {-26,   3,  10,   9,   6,   1,   0, -23},
    {-22,   9,   5, -11, -10,  -2,   3, -19},
    {-31,   8,  -7, -37, -36, -14,   3, -31},
    {  0,   0,   0,   0,   0,   0,   0,   0}
}};

const std::array<std::array<int, 8>, 8> Evaluation::KNIGHT_SCORES = {{
    {-66, -53, -75, -75, -10, -55, -58, -70},
    { -3,  -6, 100, -36,   4,  62,  -4, -14},
    { 10,  67,   1,  74,  73,  27,  62,  -2},
    { 24,  24,  45,  37,  33,  41,  25,  17},
    { -1,   5,  31,  21,  22,  35,   2,   0},
    {-18,  10,  13,  22,  18,  15,  11, -14},
    {-23, -15,   2,   0,   2,   0, -23, -20},
    {-66, -53, -75, -75, -10, -55, -58, -70}
}};

const std::array<std::array<int, 8>, 8> Evaluation::BISHOP_SCORES = {{
    {-59, -78, -82, -76, -23, -107, -37, -50},
    {-11,  20,  35, -42, -39,   31,   2, -22},
    { -9,  39, -32,  41,  52,  -10,  28, -14},
    { 25,  17,  20,  34,  26,   25,  15,  10},
    { 13,  10,  17,  23,  17,   16,   0,   7},
    { 14,  25,  24,  15,   8,   25,  20,  15},
    { 19,  20,  11,   6,   7,    6,  20,  16},
    { -7,   2, -15, -12, -14,  -15, -10, -10}
}};

const std::array<std::array<int, 8>, 8> Evaluation::ROOK_SCORES = {{
    { 35,  29,  33,   4,  37,  33,  56,  50},
    { 55,  29,  56,  67,  55,  62,  34,  60},
    { 19,  35,  28,  33,  45,  27,  25,  15},
    {  0,   5,  16,  13,  18,  -4,  -9,  -6},
    {-28, -35, -16, -21, -13, -29, -46, -30},
    {-42, -28, -42, -25, -25, -35, -26, -46},
    {-53, -38, -31, -26, -29, -43, -44, -53},
    {-30, -24, -18,   5,  -2, -18, -31, -32}
}};

const std::array<std::array<int, 8>, 8> Evaluation::QUEEN_SCORES = {{
    {  6,   1,  -8, -104,  69,  24,  88,  26},
    { 14,  32,  60,  -10,  20,  76,  57,  24},
    { -2,  43,  32,   60,  72,  63,  43,   2},
    {  1, -16,  22,   17,  25,  20, -13,  -6},
    {-14, -15,  -2,   -5,  -1, -10, -20, -22},
    {-30,  -6, -13,  -11, -16, -11, -16, -27},
    {-36, -18,   0,  -19, -15, -15, -21, -38},
    {-39, -30, -31,  -13, -31, -36, -34, -42}
}};

int Evaluation::pieceValue(PieceType pt) noexcept {
    switch (pt) {
        case PieceType::Pawn:   return SCORE_PAWN;
        case PieceType::Knight: return SCORE_KNIGHT;
        case PieceType::Bishop: return SCORE_BISHOP;
        case PieceType::Rook:   return SCORE_ROOK;
        case PieceType::Queen:  return SCORE_QUEEN;
        case PieceType::King:   return SCORE_KING;
        default:                return 0;
    }
}

int Evaluation::pieceSquareValue(Piece piece, int row, int col) noexcept {
    if (piece == Piece::Empty) return 0;
    PieceType pt = typeOfPiece(piece);
    if (pt == PieceType::King) return 0; // King has no positional table in Python engine

    Color c = colorOfPiece(piece);
    int table_row = (c == Color::White) ? row : (7 - row); // Black mirrors rows: [::-1]

    switch (pt) {
        case PieceType::Pawn:   return PAWN_SCORES[table_row][col];
        case PieceType::Knight: return KNIGHT_SCORES[table_row][col];
        case PieceType::Bishop: return BISHOP_SCORES[table_row][col];
        case PieceType::Rook:   return ROOK_SCORES[table_row][col];
        case PieceType::Queen:  return QUEEN_SCORES[table_row][col];
        default:                return 0;
    }
}

int Evaluation::evaluate(const Board& board) noexcept {
    if (board.isCheckmate()) {
        return board.whiteToMove() ? -SCORE_CHECKMATE : SCORE_CHECKMATE;
    }
    if (board.isStalemate()) {
        return SCORE_STALEMATE;
    }

    int score = 0;
    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            Piece piece = board.pieceAt(r, c);
            if (piece != Piece::Empty) {
                PieceType pt = typeOfPiece(piece);
                int mat = pieceValue(pt);
                int pos = pieceSquareValue(piece, r, c);
                if (colorOfPiece(piece) == Color::White) {
                    score += (mat + pos);
                } else {
                    score -= (mat + pos);
                }
            }
        }
    }
    return score;
}

} // namespace alphaone
