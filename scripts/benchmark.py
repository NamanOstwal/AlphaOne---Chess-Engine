"""
AlphaOne Benchmark Suite: Python vs Native C++ Engine
Measures nodes searched, time elapsed, nodes per second, and speedup.
"""

import os
import sys
import time
import subprocess
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

try:
    import chessengine
    import ChessAI
except ImportError as e:
    print(f"Failed to import Python chess engine: {e}")
    sys.exit(1)

def benchmark_python(depth=4):
    print(f"\n[1] Benchmarking Python Engine at Depth {depth}...")
    gs = chessengine.GameState()
    valid_moves = gs.getValidMoves()

    start = time.perf_counter()
    score = ChessAI.findMoveNegaMaxAlphaBeta(gs, valid_moves, depth, -10000, 10000, 1)
    elapsed = time.perf_counter() - start

    elapsed_ms = elapsed * 1000
    print(f"  Python Depth {depth}:")
    print(f"    Elapsed Time: {elapsed_ms:.1f} ms ({elapsed:.2f} s)")
    print(f"    Score: {score}")
    return elapsed_ms

def benchmark_native_cpp(depth=4):
    print(f"\n[2] Benchmarking Native C++ Engine at Depth {depth}...")
    cli_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bin", "alphaone_cli.exe"))
    if not os.path.exists(cli_path):
        cli_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bin", "alphaone_cli"))

    if not os.path.exists(cli_path):
        print(f"  Error: Native CLI binary not found at {cli_path}")
        return None

    proc = subprocess.Popen(
        [cli_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    cmd = f"go {depth}\nquit\n"
    start = time.perf_counter()
    stdout, stderr = proc.communicate(input=cmd)
    elapsed = time.perf_counter() - start
    elapsed_ms = elapsed * 1000

    nodes = None
    nps = None
    score = None
    best_move = None
    for line in stdout.splitlines():
        if "Best move:" in line:
            parts = line.split("Best move:")[1].strip()
            best_move = parts.split()[0]
            if "nodes:" in line:
                nodes = int(line.split("nodes:")[1].split(",")[0].strip())
            if "NPS:" in line:
                nps = int(line.split("NPS:")[1].split(",")[0].strip())
            if "score:" in line:
                score = int(line.split("score:")[1].split(",")[0].strip())

    print(f"  Native C++ Depth {depth}:")
    print(f"    Best Move: {best_move}")
    print(f"    Nodes: {nodes}")
    print(f"    NPS: {nps:,}")
    print(f"    Score: {score}")
    print(f"    Total Process Time: {elapsed_ms:.1f} ms")
    return {
        "elapsed_ms": elapsed_ms,
        "nodes": nodes,
        "nps": nps,
        "best_move": best_move
    }

def main():
    print("==================================================")
    print(" AlphaOne Chess Engine Performance Benchmark")
    print("==================================================")

    # Benchmark at depth 3
    py_time_d3 = benchmark_python(depth=3)
    cpp_res_d3 = benchmark_native_cpp(depth=3)

    if cpp_res_d3 and py_time_d3:
        speedup = py_time_d3 / max(1.0, cpp_res_d3["elapsed_ms"])
        print(f"\n  >> Depth 3 Speedup: {speedup:.1f}x faster in C++!")

    # Benchmark at depth 4
    py_time_d4 = benchmark_python(depth=4)
    cpp_res_d4 = benchmark_native_cpp(depth=4)

    if cpp_res_d4 and py_time_d4:
        speedup = py_time_d4 / max(1.0, cpp_res_d4["elapsed_ms"])
        print(f"\n  >> Depth 4 Speedup: {speedup:.1f}x faster in C++!")

    print("\n==================================================")
    print(" Benchmark Complete")
    print("==================================================")

if __name__ == "__main__":
    main()
