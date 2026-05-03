'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import toast from 'react-hot-toast';

// Components
import TournamentHeader from '@/components/tournament/TournamentHeader';
import TournamentRegistration from '@/components/tournament/TournamentRegistration';
import TournamentPairings from '@/components/tournament/TournamentPairings';
import TournamentStandings from '@/components/TournamentStandings';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import CommanderSearchModal from '@/components/CommanderSearchModal';
import TournamentDeckModal from '@/components/TournamentDeckModal';

// Hooks
import { useTournamentDetails } from '@/hooks/useTournamentDetails';
import { Z_INDEX_OVERLAY } from '@/lib/constants';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const tournamentId = id as string;

  const {
    tournament,
    participants,
    matches,
    loading,
    activeTab,
    setActiveTab,
    loadData,
    startTournament,
    updateRound,
    addPlayers,
    dropPlayer,
    selectCommander,
    selectDeck
  } = useTournamentDetails({ tournamentId });

  // UI States (Modals, etc.)
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: 'start' | 'next' | 'prev' | 'drop' | 'delete', id?: string } | null>(null);
  
  const [cmdrModalOpen, setCmdrModalOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [activePlayerDecks, setActivePlayerDecks] = useState<any[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch all profiles for the registration modal
  const handleOpenAddPlayer = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_url');
      if (error) throw error;
      
      // Get deck counts for each profile
      const profilesWithCounts = await Promise.all((data || []).map(async (p: any) => {
        const { count } = await supabase.from('decks').select('id', { count: 'exact' }).eq('user_id', p.id);
        return { ...p, deck_count: count || 0 };
      }));

      setAllProfiles(profilesWithCounts);
      setShowPlayerModal(true);
    } catch (err: any) {
      toast.error('Error al cargar jugadores');
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelection = new Set(selectedPlayers);
    if (newSelection.has(playerId)) newSelection.delete(playerId);
    else newSelection.add(playerId);
    setSelectedPlayers(newSelection);
  };

  const handleAddSelectedPlayers = async () => {
    const success = await addPlayers(Array.from(selectedPlayers));
    if (success) {
      setShowPlayerModal(false);
      setSelectedPlayers(new Set());
    }
  };

  const handleDeleteTournament = async () => {
    const loadingToast = toast.loading('Eliminando torneo...');
    try {
        const { data: tmData } = await supabase.from('tournament_matches').select('match_id').eq('tournament_id', tournamentId);
        const matchIds = tmData?.map((row: any) => row.match_id) || [];
        await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);
        await supabase.from('tournament_participants').delete().eq('tournament_id', tournamentId);
        if (matchIds.length > 0) await supabase.from('matches').delete().in('id', matchIds);
        await supabase.from('tournaments').delete().eq('id', tournamentId);
        toast.success('Torneo eliminado', { id: loadingToast });
        router.push('/tournaments');
    } catch (error: any) {
        toast.error('Error al eliminar', { id: loadingToast });
    }
  };

  if (loading || !tournament) return <div className="container" style={{ padding: '4rem', textAlign: 'center', color: '#666' }}>Cargando torneo...</div>;

  const currentRoundMatches = matches.filter(m => m.round_number === tournament.current_round);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      
      <TournamentHeader 
        tournament={tournament}
        onStart={() => setConfirmAction({ type: 'start' })}
        onNextRound={() => setConfirmAction({ type: 'next' })}
        onPrevRound={() => setConfirmAction({ type: 'prev' })}
        onDelete={() => setConfirmAction({ type: 'delete' })}
      />

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
        {tournament.status === 'registration' && (
          <button onClick={() => setActiveTab('registration')} className={`btn-premium ${activeTab === 'registration' ? 'btn-premium-gold' : 'btn-premium-dark'}`} style={{ fontSize: '0.85rem' }}>
            Inscripción ({participants.length})
          </button>
        )}
        <button onClick={() => setActiveTab('pairings')} className={`btn-premium ${activeTab === 'pairings' ? 'btn-premium-gold' : 'btn-premium-dark'}`} style={{ fontSize: '0.85rem' }}>
          Ronda {tournament.current_round}
        </button>
        <button onClick={() => setActiveTab('standings')} className={`btn-premium ${activeTab === 'standings' ? 'btn-premium-gold' : 'btn-premium-dark'}`} style={{ fontSize: '0.85rem' }}>
          Clasificación
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'registration' && (
        <TournamentRegistration 
          participants={participants}
          onAddPlayer={handleOpenAddPlayer}
          onOpenDeckModal={async (p) => {
            setCurrentParticipant(p);
            const { data } = await supabase.from('decks').select('*').eq('user_id', p.player_id).order('created_at', { ascending: false });
            setActivePlayerDecks(data || []);
            setDeckModalOpen(true);
          }}
          onOpenCommanderModal={(pid) => {
            setEditingParticipantId(pid);
            setCmdrModalOpen(true);
          }}
          isOwner={true}
        />
      )}

      {activeTab === 'pairings' && (
        <TournamentPairings 
          tournamentId={tournamentId}
          participants={participants}
          allMatches={matches}
          currentRoundMatches={currentRoundMatches}
          currentRound={tournament.current_round}
          onMatchUpdate={loadData}
          isOwner={true}
        />
      )}

      {activeTab === 'standings' && <TournamentStandings participants={participants} />}

      {/* Modals & Dialogs */}
      {showPlayerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: Z_INDEX_OVERLAY, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }} onClick={() => setShowPlayerModal(false)}>
           <div style={{ background: '#111', padding: '2.5rem', borderRadius: '32px', width: '90%', maxWidth: '550px', maxHeight: '85vh', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
               <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)', fontSize: '1.6rem', fontFamily: 'var(--font-title)' }}>Añadir Jugadores</h3>
               <input type="text" placeholder="Buscar piloto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '1rem' }} autoFocus />
               <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.5rem' }}>
                   {allProfiles.filter(p => !participants.some(pr => pr.player_id === p.id) && p.username?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                       <div key={p.id} onClick={() => togglePlayerSelection(p.id)} style={{ padding: '1rem', background: selectedPlayers.has(p.id) ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.2rem', border: `1px solid ${selectedPlayers.has(p.id) ? 'var(--color-gold)' : 'transparent'}`, transition: 'all 0.2s' }}>
                           <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', background: selectedPlayers.has(p.id) ? 'var(--color-gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               {selectedPlayers.has(p.id) && <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                           </div>
                           {p.avatar_url ? <img src={p.avatar_url} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#222', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '800' }}>{p.username?.charAt(0).toUpperCase()}</div>}
                           <div>
                               <div style={{ fontWeight: '800', color: '#fff' }}>{p.username}</div>
                               <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{p.deck_count || 0} mazos registrados</div>
                           </div>
                       </div>
                   ))}
               </div>
               <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                   <button onClick={() => setShowPlayerModal(false)} className="btn-premium btn-premium-dark" style={{ flex: 1 }}>Cancelar</button>
                   <button onClick={handleAddSelectedPlayers} disabled={selectedPlayers.size === 0} className="btn-premium btn-premium-gold" style={{ flex: 1 }}>Inscribir Seleccionados ({selectedPlayers.size})</button>
               </div>
           </div>
        </div>
      )}

      <CommanderSearchModal isOpen={cmdrModalOpen} onClose={() => setCmdrModalOpen(false)} onSelect={(card) => { if (editingParticipantId) selectCommander(editingParticipantId, card); setCmdrModalOpen(false); }} />
      <TournamentDeckModal isOpen={deckModalOpen} onClose={() => setDeckModalOpen(false)} playerDecks={activePlayerDecks} playerName={currentParticipant?.profiles?.username || ''} onSelect={(deck) => { if (currentParticipant) selectDeck(currentParticipant.id, deck); setDeckModalOpen(false); }} />
      
      <ConfirmationDialog isOpen={confirmAction?.type === 'start'} title="Iniciar Torneo" message="¿Confirmas el inicio del torneo con los jugadores actuales?" onConfirm={() => { setConfirmAction(null); startTournament(); }} onCancel={() => setConfirmAction(null)} confirmText="Empezar" />
      <ConfirmationDialog isOpen={confirmAction?.type === 'next'} title="Siguiente Ronda" message={`¿Finalizar la Ronda ${tournament.current_round} y avanzar?`} onConfirm={() => { setConfirmAction(null); updateRound(tournament.current_round + 1); }} onCancel={() => setConfirmAction(null)} confirmText="Avanzar" />
      <ConfirmationDialog isOpen={confirmAction?.type === 'prev'} title="Revertir Ronda" message={`¿Volver a la Ronda ${tournament.current_round - 1}?`} onConfirm={() => { setConfirmAction(null); updateRound(tournament.current_round - 1); }} onCancel={() => setConfirmAction(null)} confirmText="Volver" />
      <ConfirmationDialog isOpen={confirmAction?.type === 'delete'} title="Eliminar Torneo" message="¿Estás completamente seguro? Esta acción borrará todos los resultados y mesas." onConfirm={() => { setConfirmAction(null); handleDeleteTournament(); }} onCancel={() => setConfirmAction(null)} confirmText="Eliminar" isDestructive={true} />
    </div>
  );
}
