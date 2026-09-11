import { EngineCommand, EngineCommandWithoutId, EngineResponse, EngineState, SearchStats } from '../types/chess';

export class EngineService {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();
  private onStateChangeCallback: ((state: EngineState) => void) | null = null;
  private isReady: boolean = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    // Vite Web Worker syntax
    this.worker = new Worker(new URL('../workers/engine.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (e: MessageEvent<EngineResponse>) => {
      const resp = e.data;

      if (resp.type === 'state') {
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(resp.state);
        }
      } else if (resp.type === 'move_result') {
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(resp.state);
        }
      }

      const pending = this.pendingRequests.get(resp.id);
      if (pending) {
        if (resp.type === 'error') {
          pending.reject(new Error(resp.message));
        } else {
          pending.resolve(resp);
        }
        this.pendingRequests.delete(resp.id);
      }
    };

    this.sendCommand({ type: 'init' }).then(() => {
      this.isReady = true;
    });
  }

  public onStateChange(callback: (state: EngineState) => void) {
    this.onStateChangeCallback = callback;
  }

  private sendCommand<T = any>(command: EngineCommandWithoutId): Promise<T> {
    const id = Math.random().toString(36).substring(2, 9);
    const fullCommand = { ...command, id } as EngineCommand;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker?.postMessage(fullCommand);
    });
  }

  public async newGame(): Promise<EngineState> {
    const res = await this.sendCommand({ type: 'newGame' });
    return res.state;
  }

  public async setPosition(fen: string): Promise<EngineState> {
    const res = await this.sendCommand({ type: 'setPosition', fen });
    return res.state;
  }

  public async makeMove(move: string): Promise<{ success: boolean; state: EngineState }> {
    const res = await this.sendCommand({ type: 'makeMove', move });
    return { success: res.success, state: res.state };
  }

  public async undoMove(): Promise<EngineState> {
    const res = await this.sendCommand({ type: 'undoMove' });
    return res.state;
  }

  public async getLegalMoves(): Promise<string[]> {
    const res = await this.sendCommand({ type: 'getLegalMoves' });
    return res.moves;
  }

  public async getBestMove(timeMs: number, maxDepth: number): Promise<{ bestMove: string; stats: SearchStats }> {
    const res = await this.sendCommand({ type: 'bestMove', timeMs, maxDepth });
    return { bestMove: res.bestMove, stats: res.stats };
  }

  public stopSearch() {
    this.sendCommand({ type: 'stop' });
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const engineService = new EngineService();
