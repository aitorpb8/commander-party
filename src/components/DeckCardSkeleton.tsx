import React from 'react';

export default function DeckCardSkeleton() {
  return (
    <div 
      className="card glass-panel premium-border" 
      style={{ 
        padding: '0', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        minHeight: '350px',
        maxWidth: '380px',
        margin: '0 auto', 
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. Header Skeleton */}
      <div style={{ height: '170px', width: '100%', background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
          <div className="skeleton-pulse" style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }}></div>
          <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
              <div style={{ height: '1.2rem', width: '70%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
              <div style={{ height: '0.65rem', width: '40%', background: 'rgba(212,175,55,0.1)', borderRadius: '4px' }}></div>
          </div>
      </div>
      
      {/* 2. Info Area Skeleton */}
      <div style={{ padding: '1rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Player Line Skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ height: '0.55rem', width: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}></div>
            <div style={{ height: '1rem', width: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
          </div>
        </div>

        {/* Budget HUD Skeleton */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.75rem', borderRadius: '8px', height: '50px' }}></div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.75rem', borderRadius: '8px', height: '50px' }}></div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.04)', height: '10px', borderRadius: '20px' }} className="skeleton-pulse"></div>
        </div>
      </div>
    </div>
  );
}
