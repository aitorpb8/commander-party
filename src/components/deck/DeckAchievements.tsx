import React from 'react';
import { Badge, BADGES } from '@/lib/achievements';

interface DeckAchievementsProps {
  earnedBadges: Badge[];
}

export default function DeckAchievements({ earnedBadges }: DeckAchievementsProps) {
  if (earnedBadges.length === 0) return null;

  return (
    <div className="achievements-section" style={{ marginTop: '2rem' }}>
      <h3 style={{ 
        color: 'var(--color-gold)', 
        fontSize: '1.2rem', 
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{ fontSize: '1.4rem' }}>🏆</span> Logros del Jugador
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '1rem' 
      }}>
        {earnedBadges.map(badge => (
          <div 
            key={badge.id}
            className="glass-panel"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '1rem', 
              borderRadius: '16px',
              border: `1px solid ${badge.color}44`,
              background: `linear-gradient(135deg, ${badge.color}11, transparent)`,
              transition: 'all 0.3s ease',
              cursor: 'help'
            }}
            title={badge.description}
          >
            <div style={{ 
              fontSize: '2rem', 
              width: '50px', 
              height: '50px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: `${badge.color}22`,
              borderRadius: '12px',
              border: `1px solid ${badge.color}33`
            }}>
              {badge.icon}
            </div>
            <div>
              <div style={{ 
                fontWeight: '900', 
                color: badge.color, 
                fontSize: '0.95rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {badge.name}
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#888',
                marginTop: '2px',
                lineHeight: '1.3'
              }}>
                {badge.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .glass-panel:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.4);
          filter: brightness(1.2);
        }
      `}</style>
    </div>
  );
}
