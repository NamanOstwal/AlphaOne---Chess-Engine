#include "Board.hpp"
#include <iostream>
#include <sstream>
#include <cctype>

namespace alphaone {

Board::Board() {
    Zobrist::init();
    resetToInitialPosition();
}

Board::Board(std::string_view fen) {
    Zobrist::init();
    if (!setFromFen(fen)) {
        resetToInitialPosition();
    }
}

void Board::resetToInitialPosition() {
    board_.fill(Piece::Empty);

    // Black pieces (row 0 = rank 8)
    board_[makeSquare(0, 0)] = Piece::BlackRook;
    board_[makeSquare(0, 1)] = Piece::BlackKnight;
    board_[makeSquare(0, 2)] = Piece::BlackBishop;
    board_[makeSquare(0, 3)] = Piece::BlackQueen;
    board_[makeSquare(0, 4)] = Piece::BlackKing;
    board_[makeSquare(0, 5)] = Piece::BlackBishop;
    board_[makeSquare(0, 6)] = Piece::BlackKnight;
    board_[makeSquare(0, 7)] = Piece::BlackRook;

    // Black pawns (row 1 = rank 7)
    for (int c = 0; c < 8; ++c) {
        board_[makeSquare(1, c)] = Piece::BlackPawn;
    }

    // White pawns (row 6 = rank 2)
    for (int c = 0; c < 8; ++c) {
        board_[makeSquare(6, c)] = Piece::WhitePawn;
    }

    // White pieces (row 7 = rank 1)
    board_[makeSquare(7, 0)] = Piece::WhiteRook;
    board_[makeSquare(7, 1)] = Piece::WhiteKnight;
    board_[makeSquare(7, 2)] = Piece::WhiteBishop;
    board_[makeSquare(7, 3)] = Piece::WhiteQueen;
    board_[makeSquare(7, 4)] = Piece::WhiteKing;
    board_[makeSquare(7, 5)] = Piece::WhiteBishop;
    board_[makeSquare(7, 6)] = Piece::WhiteKnight;
    board_[makeSquare(7, 7)] = Piece::WhiteRook;

    white_to_move_ = true;
    castling_rights_ = CastleRights::All;
    enpassant_square_ = -1;
    white_king_sq_ = makeSquare(7, 4);
    black_king_sq_ = makeSquare(0, 4);
    move_counter_ = 0;
    halfmove_clock_ = 0;
    in_check_ = false;
    checkmate_ = false;
    stalemate_ = false;

    move_log_.clear();
    undo_stack_.clear();
    zobrist_hash_ = computeZobristHash();
}

void Board::setPiece(int sq, Piece p) noexcept {
    if (!isValidSquare(sq)) return;
    board_[sq] = p;
    if (p == Piece::WhiteKing) white_king_sq_ = sq;
    else if (p == Piece::BlackKing) black_king_sq_ = sq;
    zobrist_hash_ = computeZobristHash();
}

uint64_t Board::computeZobristHash() const noexcept {
    uint64_t h = 0ULL;
    for (int sq = 0; sq < 64; ++sq) {
        Piece p = board_[sq];
        if (p != Piece::Empty) {
            h ^= Zobrist::pieceSquare(sq, p);
        }
    }
    if (!white_to_move_) {
        h ^= Zobrist::sideToMove();
    }
    h ^= Zobrist::castling(castling_rights_);
    if (enpassant_square_ != -1) {
        h ^= Zobrist::enPassant(squareCol(enpassant_square_));
    }
    return h;
}

void Board::updateCastleRights(const Move& move) noexcept {
    // Check captures of rooks
    if (move.piece_captured == Piece::WhiteRook) {
        if (move.endCol() == 0 && move.endRow() == 7) castling_rights_ &= ~CastleRights::WhiteQueenSide;
        else if (move.endCol() == 7 && move.endRow() == 7) castling_rights_ &= ~CastleRights::WhiteKingSide;
    } else if (move.piece_captured == Piece::BlackRook) {
        if (move.endCol() == 0 && move.endRow() == 0) castling_rights_ &= ~CastleRights::BlackQueenSide;
        else if (move.endCol() == 7 && move.endRow() == 0) castling_rights_ &= ~CastleRights::BlackKingSide;
    }

    // Check movement of King
    if (move.piece_moved == Piece::WhiteKing) {
        castling_rights_ &= ~(CastleRights::WhiteKingSide | CastleRights::WhiteQueenSide);
    } else if (move.piece_moved == Piece::BlackKing) {
        castling_rights_ &= ~(CastleRights::BlackKingSide | CastleRights::BlackQueenSide);
    }
    // Check movement of Rook
    else if (move.piece_moved == Piece::WhiteRook) {
        if (move.startRow() == 7) {
            if (move.startCol() == 0) castling_rights_ &= ~CastleRights::WhiteQueenSide;
            else if (move.startCol() == 7) castling_rights_ &= ~CastleRights::WhiteKingSide;
        }
    } else if (move.piece_moved == Piece::BlackRook) {
        if (move.startRow() == 0) {
            if (move.startCol() == 0) castling_rights_ &= ~CastleRights::BlackQueenSide;
            else if (move.startCol() == 7) castling_rights_ &= ~CastleRights::BlackKingSide;
        }
    }
}

void Board::makeMove(const Move& move) {
    UndoState undo;
    undo.move = move;
    undo.piece_captured = move.piece_captured;
    undo.castling_rights = castling_rights_;
    undo.enpassant_square = enpassant_square_;
    undo.halfmove_clock = halfmove_clock_;
    undo.zobrist_hash = zobrist_hash_;
    undo.white_king_sq = white_king_sq_;
    undo.black_king_sq = black_king_sq_;
    undo.in_check = in_check_;
    undo.checkmate = checkmate_;
    undo.stalemate = stalemate_;

    // 1. Clear start square
    board_[move.from] = Piece::Empty;

    // 2. Place piece on destination square (accounting for promotion)
    if (move.isPromotion()) {
        Color c = colorOfPiece(move.piece_moved);
        PieceType pt = (move.promotion_type != PieceType::None) ? move.promotion_type : PieceType::Queen;
        board_[move.to] = makePiece(c, pt);
    } else {
        board_[move.to] = move.piece_moved;
    }

    // 3. Update King location
    if (move.piece_moved == Piece::WhiteKing) {
        white_king_sq_ = move.to;
    } else if (move.piece_moved == Piece::BlackKing) {
        black_king_sq_ = move.to;
    }

    // 4. En-passant capture removal
    if (move.isEnPassant()) {
        int captured_sq = makeSquare(move.startRow(), move.endCol());
        board_[captured_sq] = Piece::Empty;
    }

    // 5. Castle rook movement
    if (move.isCastle()) {
        int r = move.startRow();
        if (move.endCol() - move.startCol() == 2) {
            // Kingside: Rook at col 7 moves to col 5
            int rook_from = makeSquare(r, move.endCol() + 1);
            int rook_to = makeSquare(r, move.endCol() - 1);
            board_[rook_to] = board_[rook_from];
            board_[rook_from] = Piece::Empty;
        } else {
            // Queenside: Rook at col 0 moves to col 3
            int rook_from = makeSquare(r, move.endCol() - 2);
            int rook_to = makeSquare(r, move.endCol() + 1);
            board_[rook_to] = board_[rook_from];
            board_[rook_from] = Piece::Empty;
        }
    }

    // 6. Update en-passant square for double pawn push
    if (typeOfPiece(move.piece_moved) == PieceType::Pawn &&
        std::abs(move.startRow() - move.endRow()) == 2) {
        enpassant_square_ = makeSquare((move.startRow() + move.endRow()) / 2, move.startCol());
    } else {
        enpassant_square_ = -1;
    }

    // 7. Update castling rights
    updateCastleRights(move);

    // 8. Update clocks and side to move
    if (typeOfPiece(move.piece_moved) == PieceType::Pawn || move.isCapture()) {
        halfmove_clock_ = 0;
    } else {
        halfmove_clock_++;
    }

    move_counter_++;
    white_to_move_ = !white_to_move_;

    // Reset status flags (evaluated by move generator)
    in_check_ = false;
    checkmate_ = false;
    stalemate_ = false;

    // Push state & history
    undo_stack_.push_back(undo);
    move_log_.push_back(move);

    // Recompute Zobrist hash
    zobrist_hash_ = computeZobristHash();
}

void Board::undoMove() {
    if (undo_stack_.empty() || move_log_.empty()) return;

    UndoState undo = undo_stack_.back();
    undo_stack_.pop_back();
    Move move = move_log_.back();
    move_log_.pop_back();

    // 1. Restore start square piece
    board_[move.from] = move.piece_moved;

    // 2. Restore destination square piece
    board_[move.to] = undo.piece_captured;

    // 3. Restore en passant captured pawn
    if (move.isEnPassant()) {
        board_[move.to] = Piece::Empty;
        int captured_sq = makeSquare(move.startRow(), move.endCol());
        board_[captured_sq] = undo.piece_captured;
    }

    // 4. Restore castling rook
    if (move.isCastle()) {
        int r = move.startRow();
        if (move.endCol() - move.startCol() == 2) {
            // Kingside: Rook at col 5 moves back to col 7
            int rook_from = makeSquare(r, move.endCol() - 1);
            int rook_to = makeSquare(r, move.endCol() + 1);
            board_[rook_to] = board_[rook_from];
            board_[rook_from] = Piece::Empty;
        } else {
            // Queenside: Rook at col 3 moves back to col 0
            int rook_from = makeSquare(r, move.endCol() + 1);
            int rook_to = makeSquare(r, move.endCol() - 2);
            board_[rook_to] = board_[rook_from];
            board_[rook_from] = Piece::Empty;
        }
    }

    // 5. Restore scalar states
    white_to_move_ = !white_to_move_;
    castling_rights_ = undo.castling_rights;
    enpassant_square_ = undo.enpassant_square;
    white_king_sq_ = undo.white_king_sq;
    black_king_sq_ = undo.black_king_sq;
    halfmove_clock_ = undo.halfmove_clock;
    move_counter_--;
    zobrist_hash_ = undo.zobrist_hash;
    in_check_ = undo.in_check;
    checkmate_ = undo.checkmate;
    stalemate_ = undo.stalemate;
}

void Board::setFromPythonMatrix(const std::vector<std::vector<std::string>>& matrix, bool white_to_move) {
    board_.fill(Piece::Empty);
    for (int r = 0; r < 8 && r < static_cast<int>(matrix.size()); ++r) {
        for (int c = 0; c < 8 && c < static_cast<int>(matrix[r].size()); ++c) {
            Piece p = pieceFromPythonString(matrix[r][c]);
            setPiece(r, c, p);
        }
    }
    white_to_move_ = white_to_move;
    castling_rights_ = CastleRights::All;
    enpassant_square_ = -1;
    move_log_.clear();
    undo_stack_.clear();
    zobrist_hash_ = computeZobristHash();
}

std::vector<std::vector<std::string>> Board::toPythonMatrix() const {
    std::vector<std::vector<std::string>> matrix(8, std::vector<std::string>(8));
    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            matrix[r][c] = pieceToPythonString(pieceAt(r, c));
        }
    }
    return matrix;
}

std::string Board::getPythonHashKey() const {
    // Equivalent to str(self.board) in Python
    std::ostringstream oss;
    oss << "[";
    for (int r = 0; r < 8; ++r) {
        oss << "[";
        for (int c = 0; c < 8; ++c) {
            oss << "'" << pieceToPythonString(pieceAt(r, c)) << "'";
            if (c < 7) oss << ", ";
        }
        oss << "]";
        if (r < 7) oss << ", ";
    }
    oss << "]";
    return oss.str();
}

bool Board::setFromFen(std::string_view fen) {
    board_.fill(Piece::Empty);
    white_king_sq_ = -1;
    black_king_sq_ = -1;
    castling_rights_ = CastleRights::None;
    enpassant_square_ = -1;
    halfmove_clock_ = 0;
    move_counter_ = 0;
    move_log_.clear();
    undo_stack_.clear();

    std::string fen_str(fen);
    std::istringstream iss(fen_str);
    std::string piece_placement, active_color, castling, en_passant;
    int halfmove = 0, fullmove = 1;

    if (!(iss >> piece_placement)) return false;

    // Parse piece placement
    int row = 0;
    int col = 0;
    for (char ch : piece_placement) {
        if (ch == '/') {
            row++;
            col = 0;
            if (row >= 8) break;
        } else if (std::isdigit(ch)) {
            col += (ch - '0');
        } else {
            Color c = std::isupper(ch) ? Color::White : Color::Black;
            PieceType pt = PieceType::None;
            char lower = static_cast<char>(std::tolower(ch));
            switch (lower) {
                case 'p': pt = PieceType::Pawn; break;
                case 'n': pt = PieceType::Knight; break;
                case 'b': pt = PieceType::Bishop; break;
                case 'r': pt = PieceType::Rook; break;
                case 'q': pt = PieceType::Queen; break;
                case 'k': pt = PieceType::King; break;
                default: break;
            }
            if (pt != PieceType::None && isValidSquare(row, col)) {
                Piece p = makePiece(c, pt);
                board_[makeSquare(row, col)] = p;
                if (p == Piece::WhiteKing) white_king_sq_ = makeSquare(row, col);
                else if (p == Piece::BlackKing) black_king_sq_ = makeSquare(row, col);
            }
            col++;
        }
    }

    // Side to move
    if (iss >> active_color) {
        white_to_move_ = (active_color != "b");
    } else {
        white_to_move_ = true;
    }

    // Castling rights
    if (iss >> castling) {
        if (castling.find('K') != std::string::npos) castling_rights_ |= CastleRights::WhiteKingSide;
        if (castling.find('Q') != std::string::npos) castling_rights_ |= CastleRights::WhiteQueenSide;
        if (castling.find('k') != std::string::npos) castling_rights_ |= CastleRights::BlackKingSide;
        if (castling.find('q') != std::string::npos) castling_rights_ |= CastleRights::BlackQueenSide;
    }

    // En passant square
    if (iss >> en_passant) {
        if (en_passant != "-") {
            enpassant_square_ = algebraicToSquare(en_passant);
        }
    }

    // Clocks
    if (iss >> halfmove) halfmove_clock_ = halfmove;
    if (iss >> fullmove) move_counter_ = (fullmove - 1) * 2 + (white_to_move_ ? 0 : 1);

    zobrist_hash_ = computeZobristHash();
    return true;
}

std::string Board::toFen() const {
    std::ostringstream oss;
    // 1. Piece placement
    for (int r = 0; r < 8; ++r) {
        int empty_count = 0;
        for (int c = 0; c < 8; ++c) {
            Piece p = pieceAt(r, c);
            if (p == Piece::Empty) {
                empty_count++;
            } else {
                if (empty_count > 0) {
                    oss << empty_count;
                    empty_count = 0;
                }
                char ch = '?';
                switch (typeOfPiece(p)) {
                    case PieceType::Pawn:   ch = 'p'; break;
                    case PieceType::Knight: ch = 'n'; break;
                    case PieceType::Bishop: ch = 'b'; break;
                    case PieceType::Rook:   ch = 'r'; break;
                    case PieceType::Queen:  ch = 'q'; break;
                    case PieceType::King:   ch = 'k'; break;
                    default: break;
                }
                if (colorOfPiece(p) == Color::White) ch = static_cast<char>(std::toupper(ch));
                oss << ch;
            }
        }
        if (empty_count > 0) oss << empty_count;
        if (r < 7) oss << '/';
    }

    // 2. Side to move
    oss << (white_to_move_ ? " w " : " b ");

    // 3. Castling rights
    std::string castling;
    if (castling_rights_ & CastleRights::WhiteKingSide) castling += 'K';
    if (castling_rights_ & CastleRights::WhiteQueenSide) castling += 'Q';
    if (castling_rights_ & CastleRights::BlackKingSide) castling += 'k';
    if (castling_rights_ & CastleRights::BlackQueenSide) castling += 'q';
    if (castling.empty()) castling = "-";
    oss << castling << " ";

    // 4. En passant
    if (enpassant_square_ != -1) {
        oss << squareToAlgebraic(enpassant_square_) << " ";
    } else {
        oss << "- ";
    }

    // 5. Clocks
    oss << halfmove_clock_ << " " << (move_counter_ / 2 + 1);

    return oss.str();
}

std::string Board::toString() const {
    std::ostringstream oss;
    oss << "  +-----------------+\n";
    for (int r = 0; r < 8; ++r) {
        oss << (8 - r) << " | ";
        for (int c = 0; c < 8; ++c) {
            Piece p = pieceAt(r, c);
            oss << pieceToPythonString(p) << " ";
        }
        oss << "|\n";
    }
    oss << "  +-----------------+\n";
    oss << "    a  b  c  d  e  f  g  h\n";
    oss << "Side to move: " << (white_to_move_ ? "White" : "Black") << "\n";
    oss << "FEN: " << toFen() << "\n";
    return oss.str();
}

void Board::print() const {
    std::cout << toString() << std::endl;
}

} // namespace alphaone
