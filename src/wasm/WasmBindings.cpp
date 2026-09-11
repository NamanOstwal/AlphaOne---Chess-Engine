#include "../engine/Engine.hpp"
#include <memory>
#include <sstream>
#include <string>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

using namespace emscripten;
using namespace alphaone;

class WasmEngine {
public:
    WasmEngine() : engine_(std::make_unique<Engine>()) {}

    void newGame() { engine_->newGame(); }
    void reset() { engine_->reset(); }
    bool setPosition(std::string fen) { return engine_->setPosition(fen); }
    std::string getPosition() const { return engine_->getPosition(); }

    bool isWhiteToMove() const { return engine_->isWhiteToMove(); }
    bool isCheckmate() const { return engine_->isCheckmate(); }
    bool isStalemate() const { return engine_->isStalemate(); }
    bool isInCheck() const { return engine_->isInCheck(); }
    int moveCount() const { return engine_->moveCount(); }

    std::vector<std::string> getLegalMoves() { return engine_->getLegalMoves(); }
    bool makeMove(std::string uci_move) { return engine_->makeMove(uci_move); }
    bool undoMove() { return engine_->undoMove(); }

    std::string getBestMove(int time_limit_ms, int max_depth) {
        return engine_->getBestMove(time_limit_ms, max_depth);
    }

    int evaluate() const { return engine_->evaluate(); }
    void stopSearch() { engine_->stopSearch(); }

    std::string getSearchStatsJson() const {
        SearchStats s = engine_->getSearchStats();
        std::ostringstream oss;
        oss << "{"
            << "\"bestMove\":\"" << s.best_move_uci << "\","
            << "\"score\":" << s.score << ","
            << "\"depth\":" << s.depth << ","
            << "\"nodes\":" << s.nodes << ","
            << "\"timeMs\":" << s.elapsed_ms << ","
            << "\"nodesPerSecond\":" << s.nodes_per_second << ","
            << "\"ttHits\":" << s.transposition_hits
            << "}";
        return oss.str();
    }

private:
    std::unique_ptr<Engine> engine_;
};

EMSCRIPTEN_BINDINGS(alphaone_module) {
    register_vector<std::string>("StringVector");

    class_<WasmEngine>("WasmEngine")
        .constructor<>()
        .function("newGame", &WasmEngine::newGame)
        .function("reset", &WasmEngine::reset)
        .function("setPosition", &WasmEngine::setPosition)
        .function("getPosition", &WasmEngine::getPosition)
        .function("isWhiteToMove", &WasmEngine::isWhiteToMove)
        .function("isCheckmate", &WasmEngine::isCheckmate)
        .function("isStalemate", &WasmEngine::isStalemate)
        .function("isInCheck", &WasmEngine::isInCheck)
        .function("moveCount", &WasmEngine::moveCount)
        .function("getLegalMoves", &WasmEngine::getLegalMoves)
        .function("makeMove", &WasmEngine::makeMove)
        .function("undoMove", &WasmEngine::undoMove)
        .function("getBestMove", &WasmEngine::getBestMove)
        .function("evaluate", &WasmEngine::evaluate)
        .function("stopSearch", &WasmEngine::stopSearch)
        .function("getSearchStatsJson", &WasmEngine::getSearchStatsJson);
}

#endif
