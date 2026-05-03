'use client'

import React, { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import toast from 'react-hot-toast';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import ManualPairingModal from '@/components/ManualPairingModal';
import { generatePairings, TournamentPlayer, TournamentMatchInfo } from '@/lib/tournamentUtils';

interface TournamentPairingsProps {
  tournamentId: string;
  participants: TournamentPlayer[];
  allMatches: TournamentMatchInfo[];
  currentRoundMatches: TournamentMatchInfo[];
  currentRound: number;
  onMatchUpdate: () => void;
  isOwner?: boolean;
}

export default function TournamentPairings({ 
  tournamentId, 
  participants, 
  allMatches,
  currentRoundMatches, 
  currentRound, 
  onMatchUpdate,
  isOwner = false
}: TournamentPairingsProps) {
  const [generating, setGenerating] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const getPlayerName = (pid: string) => {
    const p = participants.find(part => part.player_id === pid);
    return p?.profiles?.username || 'Desconocido';
  };

  const getAvailablePlayers = () => {
    const playersInMatches = new Set<string>();
    currentRoundMatches.forEach(tm => {
        tm.matches.players.forEach(pid => playersInMatches.add(pid));
    });
    return participants.filter(p => !playersInMatches.has(p.player_id) && !p.is_dropped);
  };

  const executeGeneratePairings = async () => {
    setShowGenerateConfirm(false);
    setGenerating(true);
    const loadingToast = toast.loading('Calculando emparejamientos inteligentes...');
    try {
      const playersInMatches = new Set<string>();
      currentRoundMatches.forEach(tm => {
          tm.matches.players.forEach(pid => playersInMatches.add(pid));
      });
      
      const availablePlayers = participants.filter(p => !p.is_dropped && !playersInMatches.has(p.player_id));

      if (availablePlayers.length < 2) {
        toast.error('No hay suficientes jugadores disponibles.', { id: loadingToast });
        return;
      }

      const pods = generatePairings(availablePlayers, allMatches, currentRound);

      for (let i = 0; i < pods.length; i++) {
        const podPlayers = pods[i];
        const tableNum = currentRoundMatches.length + i + 1;

        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .insert({
            players: podPlayers,
            description: `Torneo Ronda ${currentRound} - Mesa ${tableNum}`,
          })
          .select()
          .single();

        if (matchError) throw matchError;

        const { error: tmError } = await supabase
          .from('tournament_matches')
          .insert({
            tournament_id: tournamentId,
            match_id: matchData.id,
            round_number: currentRound,
            table_number: tableNum
          });

        if (tmError) throw tmError;
      }

      onMatchUpdate();
      toast.success(`Se han generado ${pods.length} nuevas mesas`, { id: loadingToast });
    } catch (err: any) {
      console.error('Error generating pairings:', err);
      toast.error(`Error: ${err.message}`, { id: loadingToast });
    } finally {
      setGenerating(false);
    }
  };

  const reportWinner = async (matchId: string, winnerId: string, playerIds: string[]) => {
    if (!isOwner) return;
    try {
        const { error } = await supabase.rpc('report_match_result', {
            p_match_id: matchId,
            p_winner_id: winnerId,
            p_player_ids: playerIds
        });

        if (error) throw error;
        
        onMatchUpdate(); 
        toast.success('Resultado registrado correctamente');
    } catch (err: any) {
        console.error('Error reporting result:', err);
        toast.error('Error al reportar: ' + err.message);
    }
  };

  const handleCreateManualMatch = async (selectedPlayerIds: string[]) => {
      const tableNum = currentRoundMatches.length + 1;
      try {
          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert({
              players: selectedPlayerIds,
              description: `Torneo Ronda ${currentRound} - Mesa ${tableNum}`,
            })
            .select()
            .single();

          if (matchError) throw matchError;

          const { error: tmError } = await supabase
            .from('tournament_matches')
            .insert({
              tournament_id: tournamentId,
              match_id: matchData.id,
              round_number: currentRound,
              table_number: tableNum
            });

          if (tmError) throw tmError;

          onMatchUpdate();
          setShowManualModal(false);
          toast.success('Mesa manual creada');
      } catch (err: any) {
          console.error(err);
          toast.error('Error creando mesa: ' + err.message);
      }
  };

  const executeDeleteMatch = async () => {
    if (!matchToDelete) return;
    const matchId = matchToDelete;
    setMatchToDelete(null);
    const loadingToast = toast.loading('Eliminando mesa...');
    try {
        await supabase.from('tournament_matches').delete().eq('match_id', matchId);
        await supabase.from('matches').delete().eq('id', matchId);
        onMatchUpdate();
        toast.success('Mesa eliminada', { id: loadingToast });
    } catch (err: any) {
        console.error('Error deleting match:', err);
        toast.error('Error al eliminar: ' + err.message, { id: loadingToast });
    }
  };

  return (
    <div className="pairings-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚔️</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>Emparejamientos</h3>
        </div>
        {isOwner && (
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowManualModal(true)} className="btn-premium btn-premium-dark" style={{ fontSize: '0.85rem' }}>+ Mesa Manual</button>
                <button onClick={() => setShowGenerateConfirm(true)} disabled={generating} className="btn-premium btn-premium-gold" style={{ fontSize: '0.85rem' }}>
                    {generating ? 'Generando...' : 'Autogenerar Resto'}
                </button>
            </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 450px), 1fr))', gap: '1.5rem' }}>
        {currentRoundMatches.map((tm) => (
          <div key={tm.id} style={{ 
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(10px)',
              borderRadius: '24px',
              border: `1px solid ${tm.matches.winner_id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(212, 175, 55, 0.15)'}`,
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative',
              transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '900', color: tm.matches.winner_id ? '#22c55e' : 'var(--color-gold)', fontFamily: 'monospace' }}>MESA {tm.table_number}</span>
                  <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', background: tm.matches.winner_id ? 'rgba(34, 197, 94, 0.1)' : 'rgba(212, 175, 55, 0.1)', color: tm.matches.winner_id ? '#22c55e' : 'var(--color-gold)', fontWeight: '800', textTransform: 'uppercase' }}>
                      {tm.matches.winner_id ? 'Finalizada' : 'En Juego'}
                  </span>
              </div>
              {isOwner && !tm.matches.winner_id && (
                  <button onClick={() => setMatchToDelete(tm.match_id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Eliminar Mesa">🗑</button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {tm.matches.players.map(pid => (
                  <button 
                    key={pid} 
                    onClick={() => reportWinner(tm.matches.id, pid, tm.matches.players)}
                    disabled={!isOwner}
                    style={{ 
                      background: pid === tm.matches.winner_id ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${pid === tm.matches.winner_id ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'}`,
                      padding: '1rem',
                      borderRadius: '16px',
                      color: pid === tm.matches.winner_id ? '#22c55e' : '#fff',
                      fontWeight: pid === tm.matches.winner_id ? '900' : '600',
                      cursor: isOwner ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem',
                      position: 'relative'
                    }}>
                    <span style={{ fontSize: '0.9rem' }}>{getPlayerName(pid)}</span>
                    {pid === tm.matches.winner_id && <span style={{ fontSize: '0.7rem', color: '#22c55e', opacity: 0.8 }}>GANADOR 🏆</span>}
                  </button>
                ))}
            </div>
          </div>
        ))}

        {currentRoundMatches.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '24px', color: '#444' }}>
            No hay partidas activas en esta ronda.
          </div>
        )}
      </div>
      
      <ManualPairingModal 
         isOpen={showManualModal}
         onClose={() => setShowManualModal(false)}
         availablePlayers={getAvailablePlayers()}
         onCreate={handleCreateManualMatch}
      />

     <ConfirmationDialog 
       isOpen={showGenerateConfirm}
       title="Generar Emparejamientos"
       message="¿Generar emparejamientos para el resto de jugadores? Se crearán las mesas automáticamente evitando enfrentamientos repetidos."
       onConfirm={executeGeneratePairings}
       onCancel={() => setShowGenerateConfirm(false)}
       confirmText="Generar"
     />

     <ConfirmationDialog 
       isOpen={!!matchToDelete}
       title="Eliminar Mesa"
       message="¿Seguro que quieres eliminar esta mesa? Los jugadores volverán a estar disponibles y podrás reasignarlos."
       onConfirm={executeDeleteMatch}
       onCancel={() => setMatchToDelete(null)}
       confirmText="Eliminar"
       isDestructive={true}
     />
    </div>
  );
}
