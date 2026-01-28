import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TournamentPlayer } from '@/lib/tournamentUtils';

interface ManualPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: TournamentPlayer[];
  onCreate: (selectedPlayerIds: string[]) => void;
}

export default function ManualPairingModal({ 
  isOpen, 
  onClose, 
  availablePlayers, 
  onCreate 
}: ManualPairingModalProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset selection when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedPlayers(new Set());
    }
  }, [isOpen]);

  const togglePlayer = (playerId: string) => {
    const newSet = new Set(selectedPlayers);
    if (newSet.has(playerId)) newSet.delete(playerId);
    else newSet.add(playerId);
    setSelectedPlayers(newSet);
  };

  const handleCreate = () => {
    onCreate(Array.from(selectedPlayers));
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
        <div style={{
            background: '#1a1a1a', padding: '2rem', borderRadius: '12px',
            width: '90%', maxWidth: '500px', maxHeight: '80vh', border: '1px solid #333',
            display: 'flex', flexDirection: 'column'
        }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-gold)' }}>Crear Mesa Manual</h3>
            
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {availablePlayers.length === 0 && <p style={{ color: '#888' }}>No hay jugadores disponibles.</p>}
                
                {availablePlayers.map(p => {
                    const isSelected = selectedPlayers.has(p.player_id);
                    return (
                        <div 
                            key={p.player_id}
                            onClick={() => togglePlayer(p.player_id)}
                            style={{
                                padding: '0.8rem', 
                                background: isSelected ? 'rgba(212, 175, 55, 0.2)' : '#222', 
                                borderRadius: '8px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
                                border: isSelected ? '1px solid var(--color-gold)' : '1px solid transparent', 
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #666',
                                background: isSelected ? 'var(--color-gold)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {isSelected && <span style={{ color: '#000', fontSize: '10px' }}>✓</span>}
                            </div>
                            
                            {/* Avatar or Initial */}
                            {p.profiles?.avatar_url ? (
                                <img src={p.profiles.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                            ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#444', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem' }}>
                                    {p.profiles?.username?.charAt(0) || '?'}
                                </div>
                            )}

                            <span>{p.profiles?.username}</span>
                        </div>
                    );
                })}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={onClose} className="btn" style={{ flex: 1, background: '#333' }}>Cancelar</button>
                <button 
                  onClick={handleCreate} 
                  className="btn btn-gold" 
                  style={{ flex: 1 }} 
                  disabled={selectedPlayers.size < 2}
                >
                  Crear Mesa
                </button>
            </div>
        </div>
    </div>,
    document.body
  );
}
