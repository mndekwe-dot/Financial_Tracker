import React from 'react';

export function Skeleton({ width, height, borderRadius, className = '', style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
        borderRadius: borderRadius || 'var(--radius-sm, 8px)',
        ...style,
      }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <Skeleton height="140px" borderRadius="var(--radius-lg, 18px)" style={{ marginBottom: '1.2rem' }} />
      <div className="summary-cards" style={{ marginBottom: '1.2rem' }}>
        <Skeleton height="90px" borderRadius="var(--radius-md, 12px)" />
        <Skeleton height="90px" borderRadius="var(--radius-md, 12px)" />
        <Skeleton height="90px" borderRadius="var(--radius-md, 12px)" />
      </div>
      <div className="stat-cards" style={{ marginBottom: '1.2rem' }}>
        <Skeleton height="80px" borderRadius="var(--radius-md, 12px)" />
        <Skeleton height="80px" borderRadius="var(--radius-md, 12px)" />
        <Skeleton height="80px" borderRadius="var(--radius-md, 12px)" />
      </div>
      <div className="charts-grid">
        <Skeleton height="300px" borderRadius="var(--radius-lg, 18px)" />
        <Skeleton height="300px" borderRadius="var(--radius-lg, 18px)" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="48px" borderRadius="var(--radius-sm, 8px)" />
      ))}
    </div>
  );
}

export default Skeleton;

