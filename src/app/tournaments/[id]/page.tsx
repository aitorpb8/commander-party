'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { searchCards, ScryfallCard } from '@/lib/scryfall';
import TournamentStandings from '@/components/TournamentStandings';
import TournamentPairings from '@/components/TournamentPairings';
import TournamentTimer from '@/components/TournamentTimer';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import CommanderSearchModal from '@/components/CommanderSearchModal';
import TournamentDeckModal from '@/components/TournamentDeckModal';
import toast from 'react-hot-toast';
import { calculateStandings, TournamentPlayer, TournamentMatchInfo } from '@/lib/tournamentUtils';
import { Z_INDEX_OVERLAY } from '@/lib/constants';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<TournamentPlayer[]>([]);
  const [matches, setMatches] = useState<TournamentMatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'standings' | 'pairings' | 'registration'>('registration');
  
  // Player Selection States
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  // Confirmations
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<{ type: 'start' | 'next' | 'prev' | 'drop' | 'delete', id?: string, customMessage?: string } | null>(null);

  // Commander Modal
  const [cmdrModalOpen, setCmdrModalOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  
  // Deck Selection Modal
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [activePlayerDecks, setActivePlayerDecks] = useState<any[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<any>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    // 1. Tournament Info
    const { data: tData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tData) {
      setTournament(tData);
      // Auto-switch tab based on status
      if (tData.status === 'registration' && activeTab !== 'registration' && activeTab === 'pairings') {
         setActiveTab('registration');
      } else if (tData.status === 'active' && activeTab === 'registration') {
         setActiveTab('pairings');
      }
    }

    // 2. Matches (Order matters: load matches first to calc stats)
    const { data: mData } = await supabase
      .from('tournament_matches')
      .select('*, matches(*)')
      .eq('tournament_id', id);
    
    const allMatches = (mData || []) as unknown as TournamentMatchInfo[];
    setMatches(allMatches);

    const { data: pData, error: pError } = await supabase
      .from('tournament_participants')
      .select('*, profiles(username, avatar_url), decks(name, commander, image_url)')
      .eq('tournament_id', id);

    if (pError) {
        console.error('Error loading participants:', pError);
        toast.error('Error al cargar participantes: ' + pError.message);
        setParticipants([]);
    } else if (pData) {
        console.log('PARTICIPANTS DATA FROM DB:', pData);
        // Calculate standings (OMW%)
        const typedParticipants = pData as unknown as TournamentPlayer[];
        const stats = calculateStandings(typedParticipants, allMatches);
        setParticipants(stats);
    } else {
        setParticipants([]);
    }

    setLoading(false);
  };

  const handleOpenAddPlayer = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          username, 
          avatar_url
        `);
      
      if (error) throw error;
      
      // Fetch deck counts and default deck name separately to be safe
      const profilesWithCounts = await Promise.all((data || []).map(async (p: any) => {
        const { data: userDecks, count } = await supabase
          .from('decks')
          .select('name', { count: 'exact' })
          .eq('user_id', p.id)
          .order('created_at', { ascending: false });
        
        return { 
            ...p, 
            deck_count: count || 0,
            default_deck_name: userDecks?.[0]?.name || null
        };
      }));

      setAllProfiles(profilesWithCounts);
      setSearchTerm('');
      setSelectedPlayers(new Set()); 
      setShowPlayerModal(true);
    } catch (err: any) {
      console.error('Error fetching players:', err);
      toast.error('Error al cargar jugadores: ' + err.message);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
      const newSelection = new Set(selectedPlayers);
      if (newSelection.has(playerId)) newSelection.delete(playerId);
      else newSelection.add(playerId);
      setSelectedPlayers(newSelection);
  };

  const handleAddSelectedPlayers = async () => {
    if (selectedPlayers.size === 0) return;

    const loadingToast = toast.loading('Inscribiendo jugadores...');
    
    try {
      const inserts = await Promise.all(Array.from(selectedPlayers).map(async pid => {
        // Fetch the profile name for better logging
        const profile = allProfiles.find(p => p.id === pid);
        
        const { data: userDecks, error: deckError } = await supabase
          .from('decks')
          .select('id, name, commander, image_url')
          .eq('user_id', pid)
          .order('created_at', { ascending: false })
          .limit(1);

        if (deckError) {
          console.error(`Error fetching decks for ${profile?.username || pid}:`, deckError);
        }

        const defaultDeck = userDecks?.[0];
        if (!defaultDeck) {
          console.warn(`Player ${profile?.username || pid} has no decks registered.`);
        } else {
          console.log(`Assigning default deck "${defaultDeck.name}" to ${profile?.username || pid}`);
        }
        
        return {
          tournament_id: id,
          player_id: pid,
          deck_id: defaultDeck?.id || null,
          commander_name: defaultDeck?.commander || null,
          commander_image_url: defaultDeck?.image_url || null
        };
      }));

      console.log('INSERTING TO tournament_participants:', inserts);
      const { error } = await supabase
        .from('tournament_participants')
        .insert(inserts);

      if (error) throw error;

      // Create a better success message
      const assignedDecks = inserts
        .map(i => {
           const p = allProfiles.find(profile => profile.id === i.player_id);
           return i.commander_name ? `${p?.username} (${i.commander_name})` : `${p?.username} (Sin mazo)`;
        })
        .join(', ');

      toast.success(`Inscritos: ${assignedDecks}`, { id: loadingToast, duration: 5000 });
      
      loadData();
      setShowPlayerModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Error al añadir jugadores: ' + error.message, { id: loadingToast });
    }
  };

  const handleStartTournament = async () => {
    const { error } = await supabase
      .from('tournaments')
      .update({ 
        status: 'active', 
        current_round: 1,
        current_round_start_time: new Date().toISOString()
      })
      .eq('id', id);

    if (error) toast.error('Error al iniciar');
    else {
        toast.success('¡Torneo iniciado! A jugar.');
        setActiveTab('pairings');
        loadData();
    }
  };

  const handlePreviousRound = async () => {
    const prevRound = Math.max((tournament.current_round || 1) - 1, 1);
    const { error } = await supabase
        .from('tournaments')
        .update({ 
          current_round: prevRound,
          current_round_start_time: new Date().toISOString() 
        })
        .eq('id', id);

    if (error) toast.error('Error al revertir ronda');
    else {
      toast.success(`Regresado a Ronda ${prevRound}`);
      loadData();
    }
  };

  const handleNextRound = async () => {
    const nextRound = (tournament.current_round || 0) + 1;
    const { error } = await supabase
        .from('tournaments')
        .update({ 
          current_round: nextRound,
          current_round_start_time: new Date().toISOString()
        })
        .eq('id', id);

    if (error) toast.error('Error al avanzar ronda');
    else {
      toast.success(`Ronda ${nextRound} iniciada`);
      loadData();
    }
  };

  const handleDropPlayer = async () => {
    if (!confirmAction?.id) return;
    const participantId = confirmAction.id;
    setConfirmAction(null);

    const { error } = await supabase
      .from('tournament_participants')
      .update({ is_dropped: true })
      .eq('id', participantId);
    
    if (error) toast.error('Error al retirar jugador');
    else {
        toast.success('Jugador retirado');
        loadData();
    }
  };

  const checkDropPlayer = (participant: TournamentPlayer) => {
      const currentRoundMatches = matches.filter(m => m.round_number === tournament.current_round);
      const activeMatch = currentRoundMatches.find(m => 
          !m.matches.winner_id && m.matches.players.includes(participant.player_id)
      );

      if (activeMatch) {
          setConfirmAction({ 
              type: 'drop', 
              id: participant.id, 
              customMessage: `⚠️ Este jugador está en una partida activa (Mesa ${activeMatch.table_number}). Si lo retiras ahora, esa mesa quedará con un jugador menos. ¿Continuar?` 
          });
      } else {
          setConfirmAction({ type: 'drop', id: participant.id });
      }
  };

  const openCommanderModal = (pid: string) => {
      setEditingParticipantId(pid);
      setCmdrModalOpen(true);
  };

  const handleSelectCommander = async (card: ScryfallCard) => {
    if (!editingParticipantId) return;
    const participantId = editingParticipantId;
    setEditingParticipantId(null);
    setCmdrModalOpen(false);

    const image = (card.image_uris as any)?.art_crop || card.image_uris?.normal || '';
    
    const loadingToast = toast.loading('Asignando comandante...');
    const { error } = await supabase
      .from('tournament_participants')
      .update({ 
          commander_name: card.name,
          commander_image_url: image
      })
      .eq('id', participantId);

    if (error) toast.error('Error al asignar', { id: loadingToast });
    else {
        toast.success(`Comandante asignado: ${card.name}`, { id: loadingToast });
        loadData();
    }
  };

  const openDeckModal = async (participant: any) => {
    setCurrentParticipant(participant);
    setLoading(true);
    const { data } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', participant.player_id)
      .order('created_at', { ascending: false });
    
    setActivePlayerDecks(data || []);
    setLoading(false);
    setDeckModalOpen(true);
  };

  const handleSelectDeck = async (deck: any) => {
    if (!currentParticipant) return;
    setDeckModalOpen(false);
    const loadingToast = toast.loading(`Cambiando mazo a: ${deck.name}...`);

    const { error } = await supabase
      .from('tournament_participants')
      .update({
        deck_id: deck.id,
        commander_name: deck.commander,
        commander_image_url: deck.image_url
      })
      .eq('id', currentParticipant.id);

    if (error) {
      toast.error('Error al cambiar mazo', { id: loadingToast });
    } else {
      toast.success('Mazo actualizado', { id: loadingToast });
      loadData();
    }
  };

  const handleDeleteTournament = async () => {
    const loadingToast = toast.loading('Eliminando torneo y datos asociados...');

    try {
        const { data: tmData, error: tmFetchError } = await supabase
            .from('tournament_matches')
            .select('match_id')
            .eq('tournament_id', id);

        if (tmFetchError) throw tmFetchError;
        
        const matchIds = tmData?.map((row: any) => row.match_id) || [];

        const { error: tmDeleteError } = await supabase
            .from('tournament_matches')
            .delete()
            .eq('tournament_id', id);

        if (tmDeleteError) throw tmDeleteError;

        const { error: tpDeleteError } = await supabase
            .from('tournament_participants')
            .delete()
            .eq('tournament_id', id);

        if (tpDeleteError) throw tpDeleteError;

        if (matchIds.length > 0) {
            const { error: matchesDeleteError } = await supabase
                .from('matches')
                .delete()
                .in('id', matchIds);
            
            if (matchesDeleteError) throw matchesDeleteError;
        }

        const { error: tDeleteError } = await supabase
            .from('tournaments')
            .delete()
            .eq('id', id);

        if (tDeleteError) throw tDeleteError;

        toast.success('Torneo eliminado completamente', { id: loadingToast });
        router.push('/tournaments');

    } catch (error: any) {
        console.error('Delete error:', error);
        toast.error('Error al eliminar: ' + error.message, { id: loadingToast });
    }
  };

  if (loading || !tournament) return <div className="container" style={{ paddingTop: '2rem' }}>Cargando torneo...</div>;
  
  const currentRoundMatches = matches.filter(m => m.round_number === tournament.current_round);
  
  const registeredIds = new Set(participants.map(p => p.player_id));
  const availablePlayers = allProfiles.filter(p => 
      !registeredIds.has(p.id) && 
      p.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
       <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
         <Link href="/tournaments" style={{ color: '#888', textDecoration: 'none' }}>Torneos</Link>
         <span style={{ margin: '0 0.5rem', color: '#444' }}>/</span>
         <span style={{ color: 'var(--color-gold)' }}>{tournament.name}</span>
       </div>

       <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
           <h1 style={{ color: '#fff', marginBottom: '0.5rem' }}>{tournament.name}</h1>
           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <span style={{ 
               fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', 
               background: tournament.status === 'active' ? 'var(--color-gold)' : '#333',
               color: tournament.status === 'active' ? '#000' : '#888',
               fontWeight: 'bold', textTransform: 'uppercase'
             }}>
               {tournament.status === 'registration' ? 'Inscripción Abierta' : 
                tournament.status === 'active' ? 'En Curso' : 'Finalizado'}
             </span>
             <span style={{ color: '#888' }}>Ronda {tournament.current_round} / {tournament.rounds_total}</span>
           </div>
         </div>
         
         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {tournament.status === 'active' && tournament.current_round_start_time && (
               <TournamentTimer 
                  startTime={tournament.current_round_start_time} 
                  durationMinutes={tournament.round_timer_minutes || 50} 
               />
            )}
            
            {tournament.status === 'registration' && (
                <button onClick={() => setConfirmAction({ type: 'start' })} className="btn-premium btn-premium-gold">
                    Comenzar Torneo
                </button>
            )}
            {tournament.status === 'active' && (
                <>
                    {tournament.current_round > 1 && (
                        <button onClick={() => setConfirmAction({ type: 'prev' })} className="btn-premium btn-premium-dark" style={{ marginRight: '0.5rem' }}>
                            ← Anterior Ronda
                        </button>
                    )}
                    <button onClick={() => setConfirmAction({ type: 'next' })} className="btn-premium btn-premium-gold">
                        Siguiente Ronda →
                    </button>
                </>
            )}
            <button 
                onClick={() => setConfirmAction({ type: 'delete' })} 
                className="btn-premium btn-premium-red" 
                style={{ marginLeft: '0.5rem' }}
                title="Eliminar Torneo"
             >
                🗑️
             </button>
         </div>
       </header>

       <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
         {(tournament.status === 'registration') && (
            <button 
                onClick={() => setActiveTab('registration')}
                className={`btn-premium ${activeTab === 'registration' ? 'btn-premium-gold' : 'btn-premium-dark'}`}
                style={{
                    padding: '0.6rem 1.5rem',
                    fontSize: '0.9rem',
                    border: 'none',
                    boxShadow: activeTab === 'registration' ? '0 4px 12px rgba(212, 175, 55, 0.2)' : 'none'
                }}
            >
                Inscripción ({participants.length})
            </button>
         )}
         <button 
            onClick={() => setActiveTab('pairings')}
            className={`btn-premium ${activeTab === 'pairings' ? 'btn-premium-gold' : 'btn-premium-dark'}`}
            style={{
                padding: '0.6rem 1.5rem',
                fontSize: '0.9rem',
                border: 'none',
                boxShadow: activeTab === 'pairings' ? '0 4px 12px rgba(212, 175, 55, 0.2)' : 'none'
            }}
         >
            Ronda {tournament.current_round}
         </button>
         <button 
            onClick={() => setActiveTab('standings')}
            className={`btn-premium ${activeTab === 'standings' ? 'btn-premium-gold' : 'btn-premium-dark'}`}
            style={{
                padding: '0.6rem 1.5rem',
                fontSize: '0.9rem',
                border: 'none',
                boxShadow: activeTab === 'standings' ? '0 4px 12px rgba(212, 175, 55, 0.2)' : 'none'
            }}
         >
            Clasificación
         </button>
       </div>

       {activeTab === 'registration' && tournament.status === 'registration' && (
         <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Jugadores Inscritos</h3>
                <button onClick={handleOpenAddPlayer} className="btn-premium btn-premium-gold" style={{ gap: '4px' }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Añadir Jugador
                </button>
            </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {participants.map(p => (
                    <div key={p.id} style={{ 
                        background: p.is_dropped ? 'rgba(255, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)', 
                        padding: '1.25rem', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem',
                        border: p.is_dropped ? '1px solid rgba(255, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                        opacity: p.is_dropped ? 0.7 : 1,
                        transition: 'all 0.3s ease',
                        position: 'relative'
                    }} className="participant-card-premium">
                       <div style={{ position: 'relative', flexShrink: 0 }}>
                           {p.profiles?.avatar_url ? (
                               <img src={p.profiles.avatar_url} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                           ) : (
                               <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                   {p.profiles?.username?.charAt(0)}
                               </div>
                           )}
                           {(p as any).commander_image_url && (
                               <img 
                                 src={(p as any).commander_image_url} 
                                 style={{ 
                                     position: 'absolute', bottom: -2, right: -2, 
                                     width: '28px', height: '28px', borderRadius: '50%', 
                                     border: '2px solid #111', objectFit: 'cover',
                                     boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                                 }} 
                                 title={(p as any).commander_name}
                               />
                           )}
                       </div>
                       
                       <div style={{ flex: 1, minWidth: 0 }}>
                           <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.profiles?.username}</div>
                           {p.is_dropped && <div style={{ fontSize: '0.7rem', color: '#ff6666', fontWeight: 'bold', letterSpacing: '0.5px' }}>RETIRADO</div>}
                           <div style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                               {(p as any).decks?.name || (p as any).commander_name || 'Sin mazo'}
                           </div>
                       </div>

                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                           <button 
                               onClick={() => openDeckModal(p)}
                               className="btn-premium btn-premium-gold btn-premium-sm"
                               style={{ width: '100%', minWidth: '70px' }}
                           >
                               Mazo
                           </button>
                           <button 
                               onClick={() => openCommanderModal(p.id)}
                               className="btn-premium btn-premium-dark btn-premium-sm"
                               style={{ width: '100%' }}
                           >
                               Cmdr
                           </button>
                           {!p.is_dropped && (
                               <button 
                                   onClick={() => checkDropPlayer(p)}
                                   className="btn-premium btn-premium-red btn-premium-sm"
                                   style={{ width: '100%' }}
                               >
                                   Drop
                               </button>
                           )}
                       </div>
                    </div>
                ))}
             </div>
          </div>
       )}

       {activeTab === 'pairings' && (
          <TournamentPairings 
             tournamentId={id as string}
             participants={participants}
             allMatches={matches}
             currentRoundMatches={currentRoundMatches}
             currentRound={tournament.current_round}
             onMatchUpdate={loadData}
             isOwner={true}
          />
       )}

       {activeTab === 'standings' && (
          <TournamentStandings participants={participants} />
       )}

       {/* Player Selection Modal */}
       {showPlayerModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', zIndex: Z_INDEX_OVERLAY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
            }} onClick={() => setShowPlayerModal(false)}>
               <div style={{
                   background: '#1a1a1a', padding: '2rem', borderRadius: '12px',
                   width: '90%', maxWidth: '500px', maxHeight: '80vh', border: '1px solid #333',
                   display: 'flex', flexDirection: 'column'
               }} onClick={e => e.stopPropagation()}>
                   <h3 style={{ marginBottom: '1rem', color: 'var(--color-gold)' }}>Seleccionar Jugador</h3>
                   
                   <input 
                       type="text" 
                       placeholder="Buscar por nombre..."
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       style={{ 
                           width: '100%', padding: '0.8rem', background: '#222', 
                           border: '1px solid #444', color: '#fff', borderRadius: '4px',
                           marginBottom: '1rem'
                       }}
                       autoFocus
                   />

                   <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       {availablePlayers.map(p => {
                           const isSelected = selectedPlayers.has(p.id);
                           return (
                               <div 
                                   key={p.id}
                                   onClick={() => togglePlayerSelection(p.id)}
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
                                   {p.avatar_url ? (
                                       <img src={p.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                   ) : (
                                       <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#444', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                           {p.username?.charAt(0)}
                                       </div>
                                   )}
                                   <div style={{ flex: 1 }}>
                                       <div style={{ fontWeight: 'bold' }}>{p.username}</div>
                                       <div style={{ fontSize: '0.7rem', color: '#666' }}>
                                            {p.deck_count || 0} mazos {p.default_deck_name ? `• ${p.default_deck_name}` : ""}
                                       </div>
                                   </div>
                               </div>
                           );
                       })}
                       {availablePlayers.length === 0 && (
                           <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                               No se encontraron jugadores.
                           </div>
                       )}
                   </div>
                   
                   <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                       <button 
                           onClick={() => setShowPlayerModal(false)}
                           className="btn-premium btn-premium-dark"
                           style={{ flex: 1 }}
                       >
                           Cancelar
                       </button>
                       <button 
                           onClick={handleAddSelectedPlayers}
                           disabled={selectedPlayers.size === 0}
                           className="btn-premium btn-premium-gold"
                           style={{ flex: 1 }}
                       >
                           Añadir Seleccionados ({selectedPlayers.size})
                       </button>
                   </div>
               </div>
           </div>
       )}

       <CommanderSearchModal 
          isOpen={cmdrModalOpen}
          onClose={() => setCmdrModalOpen(false)}
          onSelect={handleSelectCommander}
       />

       <TournamentDeckModal 
          isOpen={deckModalOpen}
          onClose={() => setDeckModalOpen(false)}
          playerDecks={activePlayerDecks}
          playerName={currentParticipant?.profiles?.username || ''}
          onSelect={handleSelectDeck}
       />

       <ConfirmationDialog 
          isOpen={confirmAction?.type === 'start'}
          title="Iniciar Torneo"
          message="¿Seguro que quieres iniciar el torneo? Se cerrarán las inscripciones y comenzará la Ronda 1."
          onConfirm={() => { setConfirmAction(null); handleStartTournament(); }}
          onCancel={() => setConfirmAction(null)}
          confirmText="Iniciar Torneo"
       />

       <ConfirmationDialog 
          isOpen={confirmAction?.type === 'next'}
          title="Siguiente Ronda"
          message="¿Avanzar a la siguiente ronda? Asegúrate de que todas las partidas han terminado."
          onConfirm={() => { setConfirmAction(null); handleNextRound(); }}
          onCancel={() => setConfirmAction(null)}
          confirmText="Avanzar"
       />

       <ConfirmationDialog 
          isOpen={confirmAction?.type === 'prev'}
          title="Revertir Ronda"
          message="¿Volver a la ronda anterior? Ten en cuenta que las partidas de la ronda actual NO se borrarán, solo cambiará el indicador de ronda activa."
          onConfirm={() => { setConfirmAction(null); handlePreviousRound(); }}
          onCancel={() => setConfirmAction(null)}
          confirmText="Revertir"
       />

       <ConfirmationDialog 
          isOpen={confirmAction?.type === 'drop'}
          title="Retirar Jugador"
          message={confirmAction?.customMessage || "¿Seguro que quieres retirar a este jugador? Ya no será emparejado en futuras rondas."}
          onConfirm={handleDropPlayer}
          onCancel={() => setConfirmAction(null)}
          confirmText="Retirar"
          isDestructive={true}
        />

        <ConfirmationDialog 
           isOpen={confirmAction?.type === 'delete'}
           title="Eliminar Torneo"
           message="¿ESTÁS SEGURO? Esta acción borrará el torneo y TODOS sus resultados permanentemente. No se puede deshacer."
           onConfirm={() => { setConfirmAction(null); handleDeleteTournament(); }}
           onCancel={() => setConfirmAction(null)}
           confirmText="Eliminar Definitivamente"
           isDestructive={true}
        />

    </div>
  );
}
