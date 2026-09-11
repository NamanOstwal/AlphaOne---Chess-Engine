import React from 'react';
import { SearchStats } from '../types/chess';
import { Cpu, Zap, Database, Clock, Layers } from 'lucide-react';

interface EngineStatsProps {
  stats: SearchStats | null;
  isThinking: boolean;
  engineName?: string;
}

export const EngineStats: React.FC<EngineStatsProps> = ({
  stats,
  isThinking,
  engineName = 'AlphaOne WebAssembly'
}) => {
  return (
    <div className="glass-panel" style={{ padding: '20px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isThinking ? 'var(--accent-cyan)' : '#10b981',
              boxShadow: isThinking ? '0 0 10px var(--accent-cyan)' : '0 0 8px #10b981',
            }}
            className={isThinking ? 'ai-thinking-pulse' : ''}
          />
          <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.3px' }}>{engineName}</span>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: isThinking ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isThinking ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          {isThinking ? 'THINKING' : 'IDLE'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {/* Depth */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <Layers size={13} />
            <span>DEPTH</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats?.depth ?? 4}
          </div>
        </div>

        {/* Nodes */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <Cpu size={13} />
            <span>NODES</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats?.nodes ? stats.nodes.toLocaleString() : '0'}
          </div>
        </div>

        {/* NPS */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <Zap size={13} color="var(--accent-gold)" />
            <span>NPS</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--accent-gold)' }}>
            {stats?.nodesPerSecond ? stats.nodesPerSecond.toLocaleString() : '-'}
          </div>
        </div>

        {/* TT Hits */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <Database size={13} />
            <span>TT HITS</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats?.ttHits ? stats.ttHits.toLocaleString() : '0'}
          </div>
        </div>

        {/* Elapsed Time */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <Clock size={13} />
            <span>TIME</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats?.timeMs ? `${stats.timeMs}ms` : '0ms'}
          </div>
        </div>

        {/* Best Move */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
            <span>BEST MOVE</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {stats?.bestMove || '-'}
          </div>
        </div>
      </div>
    </div>
  );
};
