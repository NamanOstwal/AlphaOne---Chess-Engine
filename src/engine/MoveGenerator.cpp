#include "MoveGenerator.hpp"
#include "Evaluation.hpp"
#include <algorithm>
#include <cmath>

namespace alphaone {

std::tuple<bool, std::vector<PinInfo>, std::vector<CheckInfo>>
MoveGenerator::checkForPinsAndChecks(const Board& board) {
    std::vector<PinInfo> pins;
    std::vector<CheckInfo> checks;
    bool in_check = false;

    Color ally_color = board.whiteToMove() ? Color::White : Color::Black;
    Color enemy_color = opponentColor(ally_color);

    int king_sq = board.kingSquare(ally_color);
    if (!isValidSquare(king_sq)) {
        return {false, pins, checks};
    }

    int start_row = squareRow(king_sq);
    int start_col = squareCol(king_sq);

    // 8 ray directions matching Python:
    // ((-1, 0), (0, -1), (1, 0), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
    for (size_t j = 0; j < DIRECTIONS.size(); ++j) {
        Direction dir = DIRECTIONS[j];
        PinInfo possible_pin{-1, -1, 0, 0};

        for (int i = 1; i < 8; ++i) {
            int end_row = start_row + dir.d_row * i;
            int end_col = start_col + dir.d_col * i;
            if (!isValidSquare(end_row, end_col)) break;

            Piece end_piece = board.pieceAt(end_row, end_col);
            if (end_piece == Piece::Empty) continue;

            Color piece_color = colorOfPiece(end_piece);
            PieceType piece_type = typeOfPiece(end_piece);

            if (piece_color == ally_color && piece_type != PieceType::King) {
                if (possible_pin.row == -1) {
                    possible_pin = {end_row, end_col, dir.d_row, dir.d_col};
                } else {
                    // Second allied piece in line, no check or pin from this direction
                    break;
                }
            } else if (piece_color == enemy_color) {
                // 5 check possibilities in Python:
                // 1.) Orthogonal rook (j in 0..3)
                // 2.) Diagonal bishop (j in 4..7)
                // 3.) Pawn 1 square away diagonally
                // 4.) Queen in any direction
                // 5.) King 1 square away
                bool is_attacking =
                    (j <= 3 && piece_type == PieceType::Rook) ||
                    (j >= 4 && piece_type == PieceType::Bishop) ||
                    (i == 1 && piece_type == PieceType::Pawn && (
                        (enemy_color == Color::White && (j == 6 || j == 7)) ||
                        (enemy_color == Color::Black && (j == 4 || j == 5))
                    )) ||
                    (piece_type == PieceType::Queen) ||
                    (i == 1 && piece_type == PieceType::King);

                if (is_attacking) {
                    if (possible_pin.row == -1) {
                        in_check = true;
                        checks.push_back({end_row, end_col, dir.d_row, dir.d_col});
                        break;
                    } else {
                        pins.push_back(possible_pin);
                        break;
                    }
                } else {
                    break; // Enemy piece cannot attack from this angle
                }
            }
        }
    }

    // Knight checks matching Python:
    for (const auto& km : KNIGHT_MOVES) {
        int end_row = start_row + km.d_row;
        int end_col = start_col + km.d_col;
        if (isValidSquare(end_row, end_col)) {
            Piece p = board.pieceAt(end_row, end_col);
            if (colorOfPiece(p) == enemy_color && typeOfPiece(p) == PieceType::Knight) {
                in_check = true;
                checks.push_back({end_row, end_col, km.d_row, km.d_col});
            }
        }
    }

    return {in_check, pins, checks};
}

bool MoveGenerator::isSquareUnderAttack(const Board& board, int row, int col) {
    Color enemy_color = board.whiteToMove() ? Color::Black : Color::White;

    // 1. Orthogonal rays (Rook / Queen)
    for (int j = 0; j < 4; ++j) {
        Direction dir = DIRECTIONS[j];
        for (int i = 1; i < 8; ++i) {
            int r = row + dir.d_row * i;
            int c = col + dir.d_col * i;
            if (!isValidSquare(r, c)) break;
            Piece p = board.pieceAt(r, c);
            if (p != Piece::Empty) {
                if (colorOfPiece(p) == enemy_color) {
                    PieceType pt = typeOfPiece(p);
                    if (pt == PieceType::Rook || pt == PieceType::Queen || (i == 1 && pt == PieceType::King)) {
                        return true;
                    }
                }
                break;
            }
        }
    }

    // 2. Diagonal rays (Bishop / Queen / Pawn)
    for (int j = 4; j < 8; ++j) {
        Direction dir = DIRECTIONS[j];
        for (int i = 1; i < 8; ++i) {
            int r = row + dir.d_row * i;
            int c = col + dir.d_col * i;
            if (!isValidSquare(r, c)) break;
            Piece p = board.pieceAt(r, c);
            if (p != Piece::Empty) {
                if (colorOfPiece(p) == enemy_color) {
                    PieceType pt = typeOfPiece(p);
                    if (pt == PieceType::Bishop || pt == PieceType::Queen || (i == 1 && pt == PieceType::King)) {
                        return true;
                    }
                    if (i == 1 && pt == PieceType::Pawn) {
                        if (enemy_color == Color::White && (j == 6 || j == 7)) return true;
                        if (enemy_color == Color::Black && (j == 4 || j == 5)) return true;
                    }
                }
                break;
            }
        }
    }

    // 3. Knight attacks
    for (const auto& km : KNIGHT_MOVES) {
        int r = row + km.d_row;
        int c = col + km.d_col;
        if (isValidSquare(r, c)) {
            Piece p = board.pieceAt(r, c);
            if (colorOfPiece(p) == enemy_color && typeOfPiece(p) == PieceType::Knight) {
                return true;
            }
        }
    }

    return false;
}

void MoveGenerator::getPawnMoves(const Board& board, int row, int col,
                                std::vector<PinInfo>& pins, std::vector<Move>& moves) {
    bool piece_pinned = false;
    Direction pin_dir{0, 0};

    for (auto it = pins.begin(); it != pins.end(); ++it) {
        if (it->row == row && it->col == col) {
            piece_pinned = true;
            pin_dir = {it->d_row, it->d_col};
            pins.erase(it);
            break;
        }
    }

    bool white = board.whiteToMove();
    int move_amount = white ? -1 : 1;
    int start_row = white ? 6 : 1;
    Color enemy_color = white ? Color::Black : Color::White;
    int king_sq = board.kingSquare(white ? Color::White : Color::Black);
    int king_row = squareRow(king_sq);
    int king_col = squareCol(king_sq);

    Piece piece_moved = board.pieceAt(row, col);
    uint8_t from_sq = static_cast<uint8_t>(makeSquare(row, col));

    // 1-square push
    int next_row = row + move_amount;
    if (isValidSquare(next_row, col) && board.pieceAt(next_row, col) == Piece::Empty) {
        if (!piece_pinned || (pin_dir.d_row == move_amount && pin_dir.d_col == 0)) {
            uint8_t to_sq = static_cast<uint8_t>(makeSquare(next_row, col));
            bool is_promo = (white && next_row == 0) || (!white && next_row == 7);
            if (is_promo) {
                moves.push_back(Move::makePromotion(from_sq, to_sq, piece_moved, Piece::Empty, PieceType::Queen));
            } else {
                moves.push_back(Move::makeQuiet(from_sq, to_sq, piece_moved));
            }

            // 2-square push
            if (row == start_row) {
                int two_step_row = row + 2 * move_amount;
                if (board.pieceAt(two_step_row, col) == Piece::Empty) {
                    uint8_t to_sq2 = static_cast<uint8_t>(makeSquare(two_step_row, col));
                    moves.push_back(Move::makeQuiet(from_sq, to_sq2, piece_moved));
                }
            }
        }
    }

    // Left capture (col - 1)
    if (col - 1 >= 0) {
        int target_col = col - 1;
        if (!piece_pinned || (pin_dir.d_row == move_amount && pin_dir.d_col == -1)) {
            Piece target_piece = board.pieceAt(next_row, target_col);
            uint8_t to_sq = static_cast<uint8_t>(makeSquare(next_row, target_col));

            // Standard capture
            if (colorOfPiece(target_piece) == enemy_color) {
                bool is_promo = (white && next_row == 0) || (!white && next_row == 7);
                if (is_promo) {
                    moves.push_back(Move::makePromotion(from_sq, to_sq, piece_moved, target_piece, PieceType::Queen));
                } else {
                    moves.push_back(Move::makeCapture(from_sq, to_sq, piece_moved, target_piece));
                }
            }

            // En passant capture
            if (board.enPassantSquare() != -1 &&
                board.enPassantSquare() == makeSquare(next_row, target_col)) {
                bool attacking_piece = false;
                bool blocking_piece = false;

                if (king_row == row) {
                    if (king_col < col) {
                        for (int c = king_col + 1; c < col - 1; ++c) {
                            if (board.pieceAt(row, c) != Piece::Empty) blocking_piece = true;
                        }
                        for (int c = col + 1; c < 8; ++c) {
                            Piece sq_p = board.pieceAt(row, c);
                            if (colorOfPiece(sq_p) == enemy_color &&
                                (typeOfPiece(sq_p) == PieceType::Rook || typeOfPiece(sq_p) == PieceType::Queen)) {
                                attacking_piece = true;
                            } else if (sq_p != Piece::Empty) {
                                blocking_piece = true;
                            }
                        }
                    } else {
                        for (int c = king_col - 1; c > col; --c) {
                            if (board.pieceAt(row, c) != Piece::Empty) blocking_piece = true;
                        }
                        for (int c = col - 2; c >= 0; --c) {
                            Piece sq_p = board.pieceAt(row, c);
                            if (colorOfPiece(sq_p) == enemy_color &&
                                (typeOfPiece(sq_p) == PieceType::Rook || typeOfPiece(sq_p) == PieceType::Queen)) {
                                attacking_piece = true;
                            } else if (sq_p != Piece::Empty) {
                                blocking_piece = true;
                            }
                        }
                    }
                }

                if (!attacking_piece || blocking_piece) {
                    Piece ep_captured = white ? Piece::BlackPawn : Piece::WhitePawn;
                    moves.push_back(Move::makeEnPassant(from_sq, to_sq, piece_moved, ep_captured));
                }
            }
        }
    }

    // Right capture (col + 1)
    if (col + 1 <= 7) {
        int target_col = col + 1;
        if (!piece_pinned || (pin_dir.d_row == move_amount && pin_dir.d_col == 1)) {
            Piece target_piece = board.pieceAt(next_row, target_col);
            uint8_t to_sq = static_cast<uint8_t>(makeSquare(next_row, target_col));

            // Standard capture
            if (colorOfPiece(target_piece) == enemy_color) {
                bool is_promo = (white && next_row == 0) || (!white && next_row == 7);
                if (is_promo) {
                    moves.push_back(Move::makePromotion(from_sq, to_sq, piece_moved, target_piece, PieceType::Queen));
                } else {
                    moves.push_back(Move::makeCapture(from_sq, to_sq, piece_moved, target_piece));
                }
            }

            // En passant capture
            if (board.enPassantSquare() != -1 &&
                board.enPassantSquare() == makeSquare(next_row, target_col)) {
                bool attacking_piece = false;
                bool blocking_piece = false;

                if (king_row == row) {
                    if (king_col < col) {
                        for (int c = king_col + 1; c < col; ++c) {
                            if (board.pieceAt(row, c) != Piece::Empty) blocking_piece = true;
                        }
                        for (int c = col + 2; c < 8; ++c) {
                            Piece sq_p = board.pieceAt(row, c);
                            if (colorOfPiece(sq_p) == enemy_color &&
                                (typeOfPiece(sq_p) == PieceType::Rook || typeOfPiece(sq_p) == PieceType::Queen)) {
                                attacking_piece = true;
                            } else if (sq_p != Piece::Empty) {
                                blocking_piece = true;
                            }
                        }
                    } else {
                        for (int c = king_col - 1; c > col + 1; --c) {
                            if (board.pieceAt(row, c) != Piece::Empty) blocking_piece = true;
                        }
                        for (int c = col - 1; c >= 0; --c) {
                            Piece sq_p = board.pieceAt(row, c);
                            if (colorOfPiece(sq_p) == enemy_color &&
                                (typeOfPiece(sq_p) == PieceType::Rook || typeOfPiece(sq_p) == PieceType::Queen)) {
                                attacking_piece = true;
                            } else if (sq_p != Piece::Empty) {
                                blocking_piece = true;
                            }
                        }
                    }
                }

                if (!attacking_piece || blocking_piece) {
                    Piece ep_captured = white ? Piece::BlackPawn : Piece::WhitePawn;
                    moves.push_back(Move::makeEnPassant(from_sq, to_sq, piece_moved, ep_captured));
                }
            }
        }
    }
}

void MoveGenerator::getRookMoves(const Board& board, int row, int col,
                                std::vector<PinInfo>& pins, std::vector<Move>& moves) {
    bool piece_pinned = false;
    Direction pin_dir{0, 0};

    for (auto it = pins.begin(); it != pins.end(); ++it) {
        if (it->row == row && it->col == col) {
            piece_pinned = true;
            pin_dir = {it->d_row, it->d_col};
            if (typeOfPiece(board.pieceAt(row, col)) != PieceType::Queen) {
                pins.erase(it);
            }
            break;
        }
    }

    Piece piece_moved = board.pieceAt(row, col);
    uint8_t from_sq = static_cast<uint8_t>(makeSquare(row, col));
    Color enemy_color = board.whiteToMove() ? Color::Black : Color::White;

    for (int j = 0; j < 4; ++j) {
        Direction dir = DIRECTIONS[j];
        if (!piece_pinned ||
            (pin_dir.d_row == dir.d_row && pin_dir.d_col == dir.d_col) ||
            (pin_dir.d_row == -dir.d_row && pin_dir.d_col == -dir.d_col)) {
            for (int i = 1; i < 8; ++i) {
                int end_row = row + dir.d_row * i;
                int end_col = col + dir.d_col * i;
                if (!isValidSquare(end_row, end_col)) break;

                Piece end_piece = board.pieceAt(end_row, end_col);
                uint8_t to_sq = static_cast<uint8_t>(makeSquare(end_row, end_col));

                if (end_piece == Piece::Empty) {
                    moves.push_back(Move::makeQuiet(from_sq, to_sq, piece_moved));
                } else if (colorOfPiece(end_piece) == enemy_color) {
                    moves.push_back(Move::makeCapture(from_sq, to_sq, piece_moved, end_piece));
                    break;
                } else {
                    break; // Friendly piece
                }
            }
        }
    }
}

void MoveGenerator::getKnightMoves(const Board& board, int row, int col,
                                  std::vector<PinInfo>& pins, std::vector<Move>& moves) {
    bool piece_pinned = false;
    for (auto it = pins.begin(); it != pins.end(); ++it) {
        if (it->row == row && it->col == col) {
            piece_pinned = true;
            pins.erase(it);
            break;
        }
    }
    if (piece_pinned) return; // Pinned knights cannot move

    Piece piece_moved = board.pieceAt(row, col);
    uint8_t from_sq = static_cast<uint8_t>(makeSquare(row, col));
    Color ally_color = board.whiteToMove() ? Color::White : Color::Black;

    for (const auto& km : KNIGHT_MOVES) {
        int end_row = row + km.d_row;
        int end_col = col + km.d_col;
        if (isValidSquare(end_row, end_col)) {
            Piece end_piece = board.pieceAt(end_row, end_col);
            if (colorOfPiece(end_piece) != ally_color) {
                uint8_t to_sq = static_cast<uint8_t>(makeSquare(end_row, end_col));
                if (end_piece == Piece::Empty) {
                    moves.push_back(Move::makeQuiet(from_sq, to_sq, piece_moved));
                } else {
                    moves.push_back(Move::makeCapture(from_sq, to_sq, piece_moved, end_piece));
                }
            }
        }
    }
}

void MoveGenerator::getBishopMoves(const Board& board, int row, int col,
                                  std::vector<PinInfo>& pins, std::vector<Move>& moves) {
    bool piece_pinned = false;
    Direction pin_dir{0, 0};

    for (auto it = pins.begin(); it != pins.end(); ++it) {
        if (it->row == row && it->col == col) {
            piece_pinned = true;
            pin_dir = {it->d_row, it->d_col};
            pins.erase(it);
            break;
        }
    }

    Piece piece_moved = board.pieceAt(row, col);
    uint8_t from_sq = static_cast<uint8_t>(makeSquare(row, col));
    Color enemy_color = board.whiteToMove() ? Color::Black : Color::White;

    for (int j = 4; j < 8; ++j) {
        Direction dir = DIRECTIONS[j];
        if (!piece_pinned ||
            (pin_dir.d_row == dir.d_row && pin_dir.d_col == dir.d_col) ||
            (pin_dir.d_row == -dir.d_row && pin_dir.d_col == -dir.d_col)) {
            for (int i = 1; i < 8; ++i) {
                int end_row = row + dir.d_row * i;
                int end_col = col + dir.d_col * i;
                if (!isValidSquare(end_row, end_col)) break;

                Piece end_piece = board.pieceAt(end_row, end_col);
                uint8_t to_sq = static_cast<uint8_t>(makeSquare(end_row, end_col));

                if (end_piece == Piece::Empty) {
                    moves.push_back(Move::makeQuiet(from_sq, to_sq, piece_moved));
                } else if (colorOfPiece(end_piece) == enemy_color) {
                    moves.push_back(Move::makeCapture(from_sq, to_sq, piece_moved, end_piece));
                    break;
                } else {
                    break;
                }
            }
        }
    }
}

void MoveGenerator::getQueenMoves(const Board& board, int row, int col,
                                 std::vector<PinInfo>& pins, std::vector<Move>& moves) {
    getBishopMoves(board, row, col, pins, moves);
    getRookMoves(board, row, col, pins, moves);
}

void MoveGenerator::getKingMoves(Board& board, int row, int col, std::vector<Move>& moves) {
    Color ally_color = board.whiteToMove() ? Color::White : Color::Black;
    Piece piece_moved = board.pieceAt(row, col);
    uint8_t from_sq = static_cast<uint8_t>(makeSquare(row, col));

    for (const auto& km : KING_MOVES) {
        int end_row = row + km.d_row;
        int end_col = col + km.d_col;
        if (isValidSquare(end_row, end_col)) {
            Piece end_piece = board.pieceAt(end_row, end_col);
            if (colorOfPiece(end_piece) != ally_color) {
                uint8_t to_sq = static_cast<uint8_t>(makeSquare(end_row, end_col));

                // Tentatively move king to test for checks (matching Python)
                board.setPiece(row, col, Piece::Empty);
                board.setPiece(end_row, end_col, piece_moved);

                auto pc_result = checkForPinsAndChecks(board);
                bool in_check = std::get<0>(pc_result);

                // Restore king
                board.setPiece(end_row, end_col, end_piece);
                board.setPiece(row, col, piece_moved);

                if (!in_check) {
                    if (end_piece == Piece::Empty) {
                        moves.push_back(Move::makeQuiet(from_sq, to_sq, piece_moved));
                    } else {
                        moves.push_back(Move::makeCapture(from_sq, to_sq, piece_moved, end_piece));
                    }
                }
            }
        }
    }
}

void MoveGenerator::getCastleMoves(const Board& board, int row, int col, std::vector<Move>& moves) {
    if (isSquareUnderAttack(board, row, col)) return; // Cannot castle out of check

    bool white = board.whiteToMove();
    uint8_t rights = board.castlingRights();
    Piece piece_moved = board.pieceAt(row, col);
    uint8_t from_sq = static_cast<uint8_t>(makeSquare(row, col));

    // Kingside castle
    bool ks_right = white ? (rights & CastleRights::WhiteKingSide) : (rights & CastleRights::BlackKingSide);
    if (ks_right) {
        if (board.pieceAt(row, col + 1) == Piece::Empty &&
            board.pieceAt(row, col + 2) == Piece::Empty) {
            if (!isSquareUnderAttack(board, row, col + 1) &&
                !isSquareUnderAttack(board, row, col + 2)) {
                uint8_t to_sq = static_cast<uint8_t>(makeSquare(row, col + 2));
                moves.push_back(Move::makeCastle(from_sq, to_sq, piece_moved));
            }
        }
    }

    // Queenside castle
    bool qs_right = white ? (rights & CastleRights::WhiteQueenSide) : (rights & CastleRights::BlackQueenSide);
    if (qs_right) {
        if (board.pieceAt(row, col - 1) == Piece::Empty &&
            board.pieceAt(row, col - 2) == Piece::Empty &&
            board.pieceAt(row, col - 3) == Piece::Empty) {
            if (!isSquareUnderAttack(board, row, col - 1) &&
                !isSquareUnderAttack(board, row, col - 2)) {
                uint8_t to_sq = static_cast<uint8_t>(makeSquare(row, col - 2));
                moves.push_back(Move::makeCastle(from_sq, to_sq, piece_moved));
            }
        }
    }
}

void MoveGenerator::generateAllPossibleMoves(const Board& board, std::vector<Move>& moves) {
    auto pc_result = checkForPinsAndChecks(board);
    bool in_check = std::get<0>(pc_result);
    auto pins = std::get<1>(pc_result);
    auto checks = std::get<2>(pc_result);
    (void)in_check; (void)checks;
    Color turn_color = board.whiteToMove() ? Color::White : Color::Black;

    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            Piece piece = board.pieceAt(r, c);
            if (piece != Piece::Empty && colorOfPiece(piece) == turn_color) {
                switch (typeOfPiece(piece)) {
                    case PieceType::Pawn:
                        getPawnMoves(board, r, c, pins, moves);
                        break;
                    case PieceType::Rook:
                        getRookMoves(board, r, c, pins, moves);
                        break;
                    case PieceType::Knight:
                        getKnightMoves(board, r, c, pins, moves);
                        break;
                    case PieceType::Bishop:
                        getBishopMoves(board, r, c, pins, moves);
                        break;
                    case PieceType::Queen:
                        getQueenMoves(board, r, c, pins, moves);
                        break;
                    case PieceType::King: {
                        Board& mutable_board = const_cast<Board&>(board);
                        getKingMoves(mutable_board, r, c, moves);
                        break;
                    }
                    default:
                        break;
                }
            }
        }
    }
}

std::vector<Move> MoveGenerator::generateLegalMoves(Board& board) {
    std::vector<Move> moves;
    auto pc_result = checkForPinsAndChecks(board);
    bool in_check = std::get<0>(pc_result);
    auto pins = std::get<1>(pc_result);
    auto checks = std::get<2>(pc_result);

    Color ally = board.whiteToMove() ? Color::White : Color::Black;
    int king_sq = board.kingSquare(ally);
    int king_row = squareRow(king_sq);
    int king_col = squareCol(king_sq);

    if (in_check) {
        if (checks.size() == 1) {
            // Single check: generate all piece moves, filter to squares that block or capture
            std::vector<Move> candidate_moves;
            generateAllPossibleMoves(board, candidate_moves);

            CheckInfo check = checks[0];
            Piece checking_piece = board.pieceAt(check.row, check.col);

            std::vector<std::pair<int, int>> valid_squares;
            if (typeOfPiece(checking_piece) == PieceType::Knight) {
                valid_squares.push_back({check.row, check.col});
            } else {
                for (int i = 1; i < 8; ++i) {
                    int vr = king_row + check.d_row * i;
                    int vc = king_col + check.d_col * i;
                    valid_squares.push_back({vr, vc});
                    if (vr == check.row && vc == check.col) break;
                }
            }

            for (const auto& m : candidate_moves) {
                if (typeOfPiece(m.piece_moved) == PieceType::King) {
                    moves.push_back(m);
                } else {
                    bool valid = false;
                    for (const auto& vs : valid_squares) {
                        if (m.endRow() == vs.first && m.endCol() == vs.second) {
                            valid = true;
                            break;
                        }
                    }
                    if (valid) moves.push_back(m);
                }
            }
        } else {
            // Double check: only king moves are legal
            getKingMoves(board, king_row, king_col, moves);
        }
    } else {
        generateAllPossibleMoves(board, moves);
        getCastleMoves(board, king_row, king_col, moves);
    }

    // Update board status flags
    bool checkmate = false;
    bool stalemate = false;
    if (moves.empty()) {
        if (in_check) checkmate = true;
        else stalemate = true;
    }
    board.setStatus(in_check, checkmate, stalemate);

    return moves;
}

void MoveGenerator::orderMoves(std::vector<Move>& moves, const Board& board, const Move& tt_move) {
    // 1. Separate capture moves and quiet moves matching Python orderMoves():
    // capture_moves = [move for move in moves if game_state.board[move.end_row][move.end_col] != "--"]
    // quiet_moves = [move for move in moves if move not in capture_moves]
    std::vector<Move> capture_moves;
    std::vector<Move> quiet_moves;

    for (const auto& m : moves) {
        if (board.pieceAt(m.to) != Piece::Empty) {
            capture_moves.push_back(m);
        } else {
            quiet_moves.push_back(m);
        }
    }

    // 2. Sort capture moves descending by victim piece score
    std::stable_sort(capture_moves.begin(), capture_moves.end(), [&](const Move& a, const Move& b) {
        int val_a = Evaluation::pieceValue(typeOfPiece(board.pieceAt(a.to)));
        int val_b = Evaluation::pieceValue(typeOfPiece(board.pieceAt(b.to)));
        return val_a > val_b;
    });

    // 3. Sort quiet moves descending by positional score of destination square
    std::stable_sort(quiet_moves.begin(), quiet_moves.end(), [&](const Move& a, const Move& b) {
        int pos_a = Evaluation::pieceSquareValue(a.piece_moved, a.endRow(), a.endCol());
        int pos_b = Evaluation::pieceSquareValue(b.piece_moved, b.endRow(), b.endCol());
        return pos_a > pos_b;
    });

    moves.clear();

    // If TT move is available, place it first
    if (!tt_move.isNull()) {
        moves.push_back(tt_move);
    }

    for (const auto& m : capture_moves) {
        if (m != tt_move) moves.push_back(m);
    }
    for (const auto& m : quiet_moves) {
        if (m != tt_move) moves.push_back(m);
    }
}

} // namespace alphaone
