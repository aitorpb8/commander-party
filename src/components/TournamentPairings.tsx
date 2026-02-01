'use client'

import React, { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import ManualPairingModal from '@/components/ManualPairingModal';
import { generatePairings, TournamentPlayer, TournamentMatchInfo } from '@/lib/tournamentUtils';

// Note: Reusing types from utils, keeping props aligned

interface TournamentPairingsProps {
  tournamentId: string;
  participants: TournamentPlayer[];
  allMatches: TournamentMatchInfo[]; // Added for history
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
  onMatchUpdate 
}: TournamentPairingsProps) {
  const [generating, setGenerating] = useState(false);

  
  // Manual Pairing State
  const [showManualModal, setShowManualModal] = useState(false);

  // Confirmation States
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);

  const supabase = createClient();

  // Helper to get player name by ID
  const getPlayerName = (pid: string) => {
    const p = participants.find(part => part.player_id === pid);
    return p?.profiles?.username || 'Desconocido';
  };

  // Helper to get available players
  const getAvailablePlayers = () => {
    const playersInMatches = new Set<string>();
    currentRoundMatches.forEach(tm => {
        tm.matches.players.forEach(pid => playersInMatches.add(pid));
    });
    return participants.filter(p => !playersInMatches.has(p.player_id) && !p.is_dropped);
  };

  // Triggered by Modal
  const executeGeneratePairings = async () => {
    setShowGenerateConfirm(false);
    setGenerating(true);
    const loadingToast = toast.loading('Calculando emparejamientos inteligentes...');
    try {
      // 1. Identify players available (not dropped, not already playing this round)
      const playersInMatches = new Set<string>();
      currentRoundMatches.forEach(tm => {
          tm.matches.players.forEach(pid => playersInMatches.add(pid));
      });
      // We pass ALL participants to generatePairings, but loop logic inside utils handles drops/filtering
      // BUT our utils expect to pair everyone who is active.
      // If some people are already manually paired, we should Exclude them.
      
      const availablePlayers = participants.filter(p => !p.is_dropped && !playersInMatches.has(p.player_id));

      if (availablePlayers.length < 2) {
        toast.error('No hay suficientes jugadores disponibles.', { id: loadingToast });
        setGenerating(false);
        return;
      }

      // 2. Use Smart Pairings from Utils
      // We pass availablePlayers as the "universe" to pair
      const pods = generatePairings(availablePlayers, allMatches, currentRound);

      // 3. Create Matches in DB
      for (let i = 0; i < pods.length; i++) {
        const podPlayers = pods[i];
        const tableNum = currentRoundMatches.length + i + 1;

        // A. Create Match
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .insert({
            players: podPlayers,
            description: `Torneo Ronda ${currentRound} - Mesa ${tableNum}`,
            // winner_id left null
          })
          .select()
          .single();

        if (matchError) throw matchError;

        // B. Link to Tournament
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
    try {
        const { error } = await supabase.rpc('report_match_result', {
            p_match_id: matchId,
            p_winner_id: winnerId,
            p_player_ids: playerIds
        });

        if (error) throw error;
        
        onMatchUpdate(); 
        onMatchUpdate(); 
        toast.success('Resultado registrado correctamente');
    } catch (err: any) {
        console.error('Error reporting result:', err);
        toast.error('Error al reportar: ' + err.message);
    }
  };

  const handleCreateManualMatch = async (selectedPlayerIds: string[]) => {
      if (selectedPlayerIds.length < 2) return toast.error('Selecciona al menos 2 jugadores');
      
      const tableNum = currentRoundMatches.length + 1;

      try {
          // A. Create Match
          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert({
              players: selectedPlayerIds,
              description: `Torneo Ronda ${currentRound} - Mesa ${tableNum}`,
            })
            .select()
            .single();

          if (matchError) throw matchError;

          // B. Link to Tournament
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

  // Triggered by Modal
  const executeDeleteMatch = async () => {
    if (!matchToDelete) return;
    const matchId = matchToDelete;
    setMatchToDelete(null);

    const loadingToast = toast.loading('Eliminando mesa...');

    try {
        // 1. Unlink from tournament
        const { error: tmError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('match_id', matchId);
        
        if (tmError) throw tmError;

        // 2. Delete the match itself
        const { error: mError } = await supabase
            .from('matches')
            .delete()
            .eq('id', matchId);
        
        if (mError) throw mError;

        onMatchUpdate();
        toast.success('Mesa eliminada', { id: loadingToast });
    } catch (err: any) {
        console.error('Error deleting match:', err);
        toast.error('Error al eliminar: ' + err.message, { id: loadingToast });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Ronda {currentRound}</h3>
        <button 
          onClick={() => setShowGenerateConfirm(true)} 
          disabled={generating}
          className="btn btn-gold"
          style={{ fontSize: '0.9rem' }}
        >
          {generating ? 'Generando...' : 'Autogenerar Resto'}
        </button>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button 
              onClick={() => {
                  setShowManualModal(true);
              }}
              className="btn" 
              style={{ background: '#333', fontSize: '0.8rem' }}
          >
              + Crear Mesa Manual
          </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {currentRoundMatches.map((tm) => (
          <div key={tm.id} className="card" style={{ padding: '1rem', borderLeft: tm.matches.winner_id ? '4px solid #4CAF50' : '4px solid #888' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>Mesa {tm.table_number}</span>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {tm.matches.winner_id ? (
                    <span style={{ color: '#4CAF50', fontSize: '0.8rem', fontWeight: 'bold' }}>FINALIZADA</span>
                  ) : (
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>EN JUEGO</span>
                  )}
                  {!tm.matches.winner_id && (
                      <button 
                          onClick={() => setMatchToDelete(tm.match_id)}
                          style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                          title="Eliminar Mesa"
                      >
                          🗑
                      </button>
                  )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
               {tm.matches.players.map(pid => (
                 <button 
                   key={pid} 
                   onClick={() => reportWinner(tm.matches.id, pid, tm.matches.players)}
                   disabled={false} // Always enabled to allow changing winner
                   style={{ 
                   background: pid === tm.matches.winner_id ? 'rgba(76, 175, 80, 0.2)' : '#222',
                   border: pid === tm.matches.winner_id ? '1px solid #4CAF50' : '1px solid #333',
                   padding: '0.5rem',
                   borderRadius: '8px',
                   textAlign: 'center',
                   fontSize: '0.9rem',
                   color: '#fff',
                   cursor: 'pointer',
                   width: '100%',
                   transition: 'all 0.2s',
                   // Hover effect logic usually needs CSS or a wrapper, using simple button behavior here
                 }}>
                   {getPlayerName(pid)}
                   {pid === tm.matches.winner_id && ' 🏆'}
                 </button>
               ))}
            </div>
          </div>
        ))}

        {currentRoundMatches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666', border: '1px dashed #444', borderRadius: '12px' }}>
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
