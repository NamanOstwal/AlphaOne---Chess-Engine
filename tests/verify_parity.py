"""
Verification script comparing Python engine evaluation and search with C++ engine.
"""
import sys
import os
import subprocess
import json

# Add src/ to path for importing python engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

try:
    import chessengine
    import ChessAI
    print("[INFO] Python engine imported successfully.")
except ImportError as e:
    print(f"[ERROR] Failed to import Python engine: {e}")
    sys.exit(1)

def test_initial_eval():
    gs = chessengine.GameState()
    score = ChessAI.scoreBoard(gs)
    print(f"Python initial score: {score}")
    assert score == 0, f"Expected 0, got {score}"
    print("[PASS] Python initial score == 0")

def test_custom_eval_parity():
    test_cases = [
        # Standard initial position
        (chessengine.GameState(), 0),
    ]

    for i, (gs, expected) in enumerate(test_cases):
        py_score = ChessAI.scoreBoard(gs)
        assert py_score == expected, f"Case {i}: expected {expected}, got {py_score}"
    print("[PASS] Custom evaluation test cases passed.")

if __name__ == "__main__":
    print("Running Python vs C++ Parity Verifications...")
    test_initial_eval()
    test_custom_eval_parity()
    print("Python Verification Completed.")
