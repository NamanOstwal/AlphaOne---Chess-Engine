"""
AlphaOne Native C++ Chess Engine Benchmark Suite
Measures nodes searched, search time, nodes per second (NPS), and TT hits across depths.
"""

import os
import sys
import time
import subprocess

def find_cli_path():
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bin", "alphaone_cli.exe")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bin", "alphaone_cli")),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

def benchmark_depth(cli_path, depth):
    cmd = f"go {depth}\nquit\n"
    start = time.perf_counter()
    proc = subprocess.Popen(
        [cli_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = proc.communicate(input=cmd)
    elapsed_total_ms = (time.perf_counter() - start) * 1000

    best_move = None
    nodes = 0
    nps = 0
    score = 0
    search_ms = 0
    tt_hits = 0

    for line in stdout.splitlines():
        if "Best move:" in line:
            # Format: Best move: g1f3 (score: 0, nodes: 2032, time: 4ms, NPS: 508000, TT hits: 65)
            try:
                parts = line.split("Best move:")[1].strip()
                best_move = parts.split()[0]
                if "score:" in line:
                    score = int(line.split("score:")[1].split(",")[0].strip())
                if "nodes:" in line:
                    nodes = int(line.split("nodes:")[1].split(",")[0].strip())
                if "time:" in line:
                    search_ms = int(line.split("time:")[1].split("ms")[0].strip())
                if "NPS:" in line:
                    nps = int(line.split("NPS:")[1].split(",")[0].strip())
                if "TT hits:" in line:
                    tt_hits = int(line.split("TT hits:")[1].split(")")[0].strip())
            except Exception:
                pass

    return {
        "depth": depth,
        "best_move": best_move,
        "nodes": nodes,
        "nps": nps,
        "score": score,
        "search_ms": search_ms,
        "total_ms": elapsed_total_ms,
        "tt_hits": tt_hits
    }

def main():
    print("==================================================================")
    print("        AlphaOne Modern C++ Chess Engine Benchmark")
    print("==================================================================")

    cli_path = find_cli_path()
    if not cli_path:
        print("Error: Native CLI binary not found. Please run scripts/build-native.ps1 first.")
        sys.exit(1)

    print(f"Using binary: {cli_path}\n")
    print(f"{'Depth':<7} | {'Best Move':<10} | {'Score':<7} | {'Nodes':<10} | {'Search Time':<12} | {'NPS':<12} | {'TT Hits':<8}")
    print("-" * 75)

    for depth in range(1, 6):
        res = benchmark_depth(cli_path, depth)
        print(f"{res['depth']:<7} | {str(res['best_move']):<10} | {res['score']:<7} | {res['nodes']:<10} | {res['search_ms']:>6} ms     | {res['nps']:>9,}  | {res['tt_hits']:<8}")

    print("==================================================================")
    print(" Benchmark Complete - 100% C++ Engine Backend")
    print("==================================================================")

if __name__ == "__main__":
    main()
