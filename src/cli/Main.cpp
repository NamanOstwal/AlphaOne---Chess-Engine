#include "../engine/Engine.hpp"
#include <iostream>
#include <string>
#include <sstream>

using namespace alphaone;

int main(int argc, char* argv[]) {
    std::cout << "AlphaOne Chess Engine (C++17 Native)\n";
    std::cout << "Type 'help' for available commands.\n\n";

    Engine engine;
    std::string line;

    while (true) {
        std::cout << "AlphaOne> ";
        if (!std::getline(std::cin, line)) break;
        if (line.empty()) continue;

        std::istringstream iss(line);
        std::string cmd;
        iss >> cmd;

        if (cmd == "quit" || cmd == "exit") {
            break;
        } else if (cmd == "help") {
            std::cout << "Commands:\n"
                      << "  d                     - display board\n"
                      << "  moves                 - list legal moves (UCI)\n"
                      << "  move <uci>            - make a move (e.g. move e2e4)\n"
                      << "  undo                  - undo last move\n"
                      << "  go [depth] [timeMs]   - find best move (default depth 4)\n"
                      << "  eval                  - show current evaluation\n"
                      << "  fen [fen_string]      - show or set FEN\n"
                      << "  new                   - start a new game\n"
                      << "  quit                  - exit\n";
        } else if (cmd == "d" || cmd == "display") {
            engine.getBoard().print();
        } else if (cmd == "moves") {
            auto moves = engine.getLegalMoves();
            std::cout << "Legal moves (" << moves.size() << "): ";
            for (const auto& m : moves) std::cout << m << " ";
            std::cout << "\n";
        } else if (cmd == "move") {
            std::string uci;
            if (iss >> uci) {
                if (engine.makeMove(uci)) {
                    std::cout << "Move made: " << uci << "\n";
                    engine.getBoard().print();
                } else {
                    std::cout << "Illegal move: " << uci << "\n";
                }
            } else {
                std::cout << "Usage: move <uci>\n";
            }
        } else if (cmd == "undo") {
            if (engine.undoMove()) {
                std::cout << "Move undone.\n";
                engine.getBoard().print();
            } else {
                std::cout << "No moves to undo.\n";
            }
        } else if (cmd == "go") {
            int depth = 4;
            int time_ms = 0;
            if (iss >> depth) {
                iss >> time_ms;
            }
            std::cout << "Thinking (depth " << depth << ")...\n";
            std::string best = engine.getBestMove(time_ms, depth);
            SearchStats s = engine.getSearchStats();
            std::cout << "Best move: " << best << " (score: " << s.score
                      << ", nodes: " << s.nodes << ", time: " << s.elapsed_ms << "ms, NPS: "
                      << s.nodes_per_second << ", TT hits: " << s.transposition_hits << ")\n";
        } else if (cmd == "eval") {
            std::cout << "Evaluation: " << engine.evaluate() << " centipawns\n";
        } else if (cmd == "fen") {
            std::string remaining;
            std::getline(iss, remaining);
            if (remaining.empty() || remaining.find_first_not_of(" \t") == std::string::npos) {
                std::cout << "FEN: " << engine.getPosition() << "\n";
            } else {
                size_t start = remaining.find_first_not_of(" \t");
                std::string fen = remaining.substr(start);
                if (engine.setPosition(fen)) {
                    std::cout << "Position set.\n";
                    engine.getBoard().print();
                } else {
                    std::cout << "Invalid FEN: " << fen << "\n";
                }
            }
        } else if (cmd == "new") {
            engine.newGame();
            std::cout << "New game started.\n";
            engine.getBoard().print();
        } else {
            std::cout << "Unknown command: " << cmd << ". Type 'help' for commands.\n";
        }
    }

    return 0;
}
