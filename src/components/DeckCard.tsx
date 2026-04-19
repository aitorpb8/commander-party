import Image from 'next/image';

interface DeckCardProps {
  playerName: string;
  playerAvatar?: string;
  deckName: string;
  commanderName: string;
  spent: number;
  budget: number; // monthly limit (usually from MONTHLY_ALLOWANCE)

  imageUrl: string;
  colors: string[]; // e.g. ['R', 'U']
}

export default function DeckCard({ playerName, playerAvatar, deckName, commanderName, spent, budget, imageUrl }: DeckCardProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);
  
  const getStatusColor = () => {
    if (spent > budget + 1) return 'var(--color-red)';
    if (spent > budget) return '#ff9800'; 
    return 'var(--color-green)';
  };

  const statusColor = getStatusColor();

  return (
    <div 
      className="card deck-card glass-panel premium-border deck-card-premium" 
      style={{ 
        padding: '0', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        minHeight: '350px', // Less height
        maxWidth: '380px', // Slightly wider
        margin: '0 auto', 
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)'
      }}
    >
      {/* 1. Header Banner Image (Art Crop) */}
      <div style={{ position: 'relative', overflow: 'hidden', height: '170px', flexShrink: 0, width: '100%' }}>
        <Image 
          src={imageUrl} 
          alt={commanderName} 
          fill
          sizes="(max-width: 380px) 100vw, 380px"
          style={{ 
            objectFit: 'cover',
            objectPosition: 'center 20%',
            transition: 'transform 0.8s ease',
          }}
          className="deck-card-image"
          priority={false}
        />
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.95) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '1rem'
        }}>
          <h3 style={{ 
            margin: 0, 
            color: '#fff', 
            fontSize: '1.2rem', 
            fontWeight: '900', 
            fontFamily: 'var(--font-title)', 
            textShadow: '0 2px 10px rgba(0,0,0,0.9)', 
            letterSpacing: '0.05em',
            lineHeight: '1.1'
          }}>
            {deckName.toUpperCase()}
          </h3>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-gold)', fontWeight: 'bold', letterSpacing: '1px', marginTop: '0.25rem', opacity: 0.8 }}>
            {commanderName}
          </div>
        </div>
      </div>
      
      {/* 2. Unified Info Area (Less padding for tighter fit) */}
      <div style={{ padding: '1rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
        
        {/* Player Line (Tighter gap with header) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            {playerAvatar ? (
              <Image 
                src={playerAvatar} 
                alt={playerName} 
                width={42} 
                height={42} 
                style={{ borderRadius: '50%', border: `2px solid ${statusColor}`, objectFit: 'cover' }} 
                unoptimized
              />
            ) : (
              <div style={{ 
                width: '42px', height: '42px', borderRadius: '50%', 
                background: `linear-gradient(135deg, ${statusColor === 'var(--color-green)' ? '#22c55e' : (statusColor === 'var(--color-red)' ? '#ef4444' : '#ff9800')}, #1a1a1b)`, 
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '1rem', fontWeight: '900'
              }}>
                {playerName[0].toUpperCase()}
              </div>
            )}
            <div style={{ 
                position: 'absolute', bottom: -1, right: -1, 
                width: '12px', height: '12px', borderRadius: '50%', 
                background: statusColor === 'var(--color-green)' ? '#22c55e' : (statusColor === 'var(--color-red)' ? '#ef4444' : '#ff9800'), 
                border: '2.5px solid #000'
            }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>PILOTO</span>
            <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>{playerName}</span>
          </div>
        </div>

        {/* Budget HUD (Reduced gaps) */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.75rem', borderRadius: '8px', borderLeft: `3px solid ${spent > budget ? '#ef4444' : '#22c55e'}` }}>
              <span style={{ display: 'block', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>GASTO REAL</span>
              <span style={{ fontSize: '1.15rem', color: spent > budget ? '#ff4444' : '#fff', fontWeight: '900' }}>{spent.toFixed(2)}€</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.75rem', borderRadius: '8px', borderRight: '3px solid var(--color-gold)', textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>CUPO MENSUAL</span>
              <span style={{ fontSize: '1.15rem', color: 'var(--color-gold)', fontWeight: '900' }}>{budget.toFixed(2)}€</span>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.04)', 
            height: '10px', 
            borderRadius: '20px', 
            overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative'
          }}>
            <div style={{ 
              width: `${Math.max(3, Math.min(100, percentage))}%`, 
              height: '100%', 
              backgroundColor: statusColor === 'var(--color-green)' ? '#22c55e' : (statusColor === 'var(--color-red)' ? '#ef4444' : '#ff9800'),
              background: `linear-gradient(90deg, ${statusColor === 'var(--color-green)' ? '#22c55e' : (statusColor === 'var(--color-red)' ? '#ef4444' : '#ff9800')}, #fff4 100%)`,
              transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              borderRadius: 'inherit'
            }} />
          </div>
        </div>

        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: '50%',
          height: '50%',
          background: `radial-gradient(circle, ${statusColor}11 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: -1
        }}></div>
      </div>
    </div>
  );
}
