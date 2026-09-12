import { EngineCommand, EngineCommandWithoutId, EngineResponse, EngineState, SearchStats } from '../types/chess';

export class EngineService {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private onStateChangeCallback: ((state: EngineState) => void) | null = null;
  private lastState: EngineState | null = null;

  constructor() {
    this.ensureWorker();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    this.worker = new Worker(new URL('../workers/engine.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = (e: MessageEvent<EngineResponse>) => {
      const resp = e.data;

      // ── Broadcast state updates to listener ──
      if (resp.type === 'state' || resp.type === 'move_result') {
        const state = (resp as any).state as EngineState | undefined;
        if (state) {
          this.lastState = state;
          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(state);
          }
        }
      }

      // ── Resolve pending promise for this message id ──
      const pending = this.pendingRequests.get(resp.id);
      if (pending) {
        if (resp.type === 'error') {
          pending.reject(new Error((resp as any).message));
        } else {
          pending.resolve(resp);
        }
        this.pendingRequests.delete(resp.id);
      }
    };

    this.worker.onerror = (err) => {
      console.error('[EngineService] Worker error:', err);
    };

    // Send initial ping to worker
    this.sendCommand({ type: 'init' }).catch(() => {});
    return this.worker;
  }

  public onStateChange(callback: (state: EngineState) => void) {
    this.onStateChangeCallback = callback;
    if (this.lastState) {
      callback(this.lastState);
    }
  }

  private sendCommand<T = any>(command: EngineCommandWithoutId): Promise<T> {
    const worker = this.ensureWorker();
    const id = Math.random().toString(36).substring(2, 9);
    const fullCommand = { ...command, id } as EngineCommand;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      worker.postMessage(fullCommand);
    });
  }

  public async newGame(): Promise<EngineState> {
    const res = await this.sendCommand<{ state: EngineState }>({ type: 'newGame' });
    return res.state;
  }

  public async setPosition(fen: string): Promise<EngineState> {
    const res = await this.sendCommand<{ state: EngineState }>({ type: 'setPosition', fen });
    return res.state;
  }

  public async makeMove(move: string): Promise<{ success: boolean; state: EngineState }> {
    const res = await this.sendCommand<{ success: boolean; state: EngineState }>({ type: 'makeMove', move });
    return { success: res.success, state: res.state };
  }

  public async undoMove(): Promise<EngineState> {
    const res = await this.sendCommand<{ state: EngineState }>({ type: 'undoMove' });
    return res.state;
  }

  public async getLegalMoves(): Promise<string[]> {
    const res = await this.sendCommand<{ moves: string[] }>({ type: 'getLegalMoves' });
    return res.moves;
  }

  public async getBestMove(timeMs: number, maxDepth: number): Promise<{ bestMove: string; stats: SearchStats }> {
    const res = await this.sendCommand<{ bestMove: string; stats: SearchStats }>({
      type: 'bestMove', timeMs, maxDepth,
    });
    return { bestMove: res.bestMove, stats: res.stats };
  }

  public stopSearch() {
    // Fire-and-forget: don't await, no pending request needed
    const id = Math.random().toString(36).substring(2, 9);
    this.worker?.postMessage({ type: 'stop', id });
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.pendingRequests.clear();
  }
}

export const engineService = new EngineService();
