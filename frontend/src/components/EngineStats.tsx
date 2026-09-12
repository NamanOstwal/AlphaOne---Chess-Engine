import React from 'react';
import { SearchStats } from '../types/chess';
import { Cpu, Zap, Database, Clock, Layers, Target } from 'lucide-react';

interface EngineStatsProps {
  stats: SearchStats | null;
  isThinking: boolean;
}

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}> = ({ icon, label, value, accent }) => (
  <div className="stat-tile">
    <div className="stat-label">
      {icon}
      <span>{label}</span>
    </div>
    <div className="stat-value" style={{ color: accent }}>
      {value}
    </div>
  </div>
);

export const EngineStats: React.FC<EngineStatsProps> = ({ stats, isThinking }) => {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
            <path d="M14.83 9.17a4 4 0 0 1 0 5.66"/>
            <path d="M9.17 9.17a4 4 0 0 0 0 5.66"/>
          </svg>
          Engine Analysis
        </div>

        {/* Status badge */}
        {isThinking ? (
          <div className="badge badge-cyan">
            <div className="badge-dot" style={{ animation: 'glow-pulse 1s ease-in-out infinite' }} />
            <span>THINKING</span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginLeft: 2 }}>
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          </div>
        ) : (
          <div className="badge badge-green">
            <div className="badge-dot" />
            READY
          </div>
        )}
      </div>

      <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatTile
          icon={<Layers size={11} />}
          label="DEPTH"
          value={String(stats?.depth ?? '—')}
        />
        <StatTile
          icon={<Cpu size={11} />}
          label="NODES"
          value={stats?.nodes ? (stats.nodes >= 1_000_000
            ? `${(stats.nodes / 1_000_000).toFixed(1)}M`
            : stats.nodes >= 1_000
            ? `${(stats.nodes / 1_000).toFixed(0)}K`
            : String(stats.nodes)) : '—'}
        />
        <StatTile
          icon={<Zap size={11} />}
          label="NPS"
          value={stats?.nodesPerSecond
            ? stats.nodesPerSecond >= 1_000_000
              ? `${(stats.nodesPerSecond / 1_000_000).toFixed(1)}M`
              : `${(stats.nodesPerSecond / 1_000).toFixed(0)}K`
            : '—'}
          accent="var(--accent-amber)"
        />
        <StatTile
          icon={<Database size={11} />}
          label="TT HITS"
          value={stats?.ttHits ? (stats.ttHits >= 1_000
            ? `${(stats.ttHits / 1_000).toFixed(0)}K`
            : String(stats.ttHits)) : '—'}
        />
        <StatTile
          icon={<Clock size={11} />}
          label="TIME"
          value={stats?.timeMs ? `${stats.timeMs}ms` : '—'}
        />
        <StatTile
          icon={<Target size={11} />}
          label="BEST"
          value={stats?.bestMove || '—'}
          accent="var(--accent-cyan)"
        />
      </div>

      {/* Score meter */}
      {stats && (
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{
            height: 3,
            borderRadius: 99,
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, 50 + (stats.score / 800) * 50))}%`,
              background: stats.score > 0
                ? 'linear-gradient(90deg, var(--accent-emerald), #34d399)'
                : 'linear-gradient(90deg, var(--accent-rose), #fb7185)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 10,
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
          }}>
            <span>♟ Black</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              {stats.score > 0 ? '+' : ''}{(stats.score / 100).toFixed(2)} cp
            </span>
            <span>White ♙</span>
          </div>
        </div>
      )}
    </div>
  );
};
