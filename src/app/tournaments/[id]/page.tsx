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
import { calculateDeckBudget } from '@/lib/budgetUtils';

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
      .select('*, profiles(username, avatar_url), decks(name, commander, image_url, budget_spent, created_at)')
      .eq('tournament_id', id);

    if (pError) {
        console.error('Error loading participants:', pError);
        toast.error('Error al cargar participantes: ' + pError.message);
        setParticipants([]);
    } else if (pData) {
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
        const { data: userDecks } = await supabase
          .from('decks')
          .select('id, name, commander, image_url')
          .eq('user_id', pid)
          .order('created_at', { ascending: false })
          .limit(1);

        const defaultDeck = userDecks?.[0];
        
        return {
          tournament_id: id,
          player_id: pid,
          deck_id: defaultDeck?.id || null,
          commander_name: defaultDeck?.commander || null,
          commander_image_url: defaultDeck?.image_url || null
        };
      }));

      const { error } = await supabase
        .from('tournament_participants')
        .insert(inserts);

      if (error) throw error;

      toast.success(`Inscritos: ${inserts.length} jugadores`, { id: loadingToast });
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
    const loadingToast = toast.loading('Eliminando torneo...');
    try {
        const { data: tmData } = await supabase
            .from('tournament_matches')
            .select('match_id')
            .eq('tournament_id', id);

        const matchIds = tmData?.map((row: any) => row.match_id) || [];
        await supabase.from('tournament_matches').delete().eq('tournament_id', id);
        await supabase.from('tournament_participants').delete().eq('tournament_id', id);
        if (matchIds.length > 0) {
            await supabase.from('matches').delete().in('id', matchIds);
        }
        await supabase.from('tournaments').delete().eq('id', id);

        toast.success('Torneo eliminado', { id: loadingToast });
        router.push('/tournaments');
    } catch (error: any) {
        toast.error('Error al eliminar: ' + error.message, { id: loadingToast });
    }
  };

  if (loading || !tournament) return <div className="container" style={{ paddingTop: '2rem' }}>Cargando torneo...</div>;
  
  const currentRoundMatches = matches.filter(m => m.round_number === tournament.current_round);
  const registeredIds = new Set(participants.map(p => p.player_id));
  const availablePlayersFiltered = allProfiles.filter(p => 
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
            <button onClick={() => setConfirmAction({ type: 'delete' })} className="btn-premium btn-premium-red" style={{ marginLeft: '0.5rem' }}>🗑️</button>
         </div>
       </header>

       <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
         {tournament.status === 'registration' && (
            <button onClick={() => setActiveTab('registration')} className={`btn-premium ${activeTab === 'registration' ? 'btn-premium-gold' : 'btn-premium-dark'}`}>
                Inscripción ({participants.length})
            </button>
         )}
         <button onClick={() => setActiveTab('pairings')} className={`btn-premium ${activeTab === 'pairings' ? 'btn-premium-gold' : 'btn-premium-dark'}`}>
            Ronda {tournament.current_round}
         </button>
         <button onClick={() => setActiveTab('standings')} className={`btn-premium ${activeTab === 'standings' ? 'btn-premium-gold' : 'btn-premium-dark'}`}>
            Clasificación
         </button>
       </div>

       {activeTab === 'registration' && tournament.status === 'registration' && (
         <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Jugadores Inscritos</h3>
                <button onClick={handleOpenAddPlayer} className="btn-premium btn-premium-gold">+ Añadir Jugador</button>
            </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
                {participants.map(p => {
                    const deck = (p as any).decks || {};
                    const { dynamicLimit, totalSpent } = (deck.created_at) 
                        ? calculateDeckBudget(deck.created_at, (p as any).decks?.budget_spent || 0)
                        : { dynamicLimit: 0, totalSpent: 0 };
                    
                    return (
                        <div key={p.id} className="card glass-panel premium-border deck-card-premium" style={{ 
                            padding: '0', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            minHeight: '350px',
                            maxWidth: '380px', 
                            margin: '0 auto',
                            opacity: p.is_dropped ? 0.6 : 1, 
                            transition: 'all 0.3s ease', 
                            overflow: 'hidden', 
                            position: 'relative'
                        }}>
                           {/* Banner Image */}
                           <div style={{ height: '170px', position: 'relative', overflow: 'hidden', flexShrink: 0, width: '100%' }}>
                               <img 
                                 src={(p as any).commander_image_url || 'https://via.placeholder.com/600x150?text=No+Commander'} 
                                 style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} 
                               />
                               <div style={{ 
                                 position: 'absolute', inset: 0, 
                                 background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.95) 100%)', 
                                 display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1rem' 
                               }}>
                                   <h4 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.05em', lineHeight: '1.1' }}>
                                       {((p as any).decks?.name || (p as any).commander_name || 'Sin mazo').toUpperCase()}
                                   </h4>
                                   <div style={{ fontSize: '0.65rem', color: 'var(--color-gold)', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '0.2rem' }}>
                                       {(p as any).commander_name}
                                   </div>
                               </div>
                               {p.is_dropped && <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--color-red)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold' }}>DROPPED</div>}
                           </div>

                           <div style={{ padding: '0.75rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        {p.profiles?.avatar_url ? (
                                            <img src={p.profiles.avatar_url} style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />
                                        ) : (
                                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem' }}>
                                                {p.profiles?.username?.charAt(0)}
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: -1, right: -1, width: '12px', height: '12px', borderRadius: '50%', background: p.is_dropped ? 'var(--color-red)' : 'var(--color-green)', border: '2px solid #111' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>PILOTO</span>
                                        <div style={{ fontWeight: '800', fontSize: '1rem', color: '#fff' }}>{p.profiles?.username}</div>
                                    </div>
                               </div>

                               <div style={{ marginTop: 'auto' }}>
                                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                       <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '8px', borderLeft: `3px solid ${totalSpent > dynamicLimit ? '#ef4444' : '#22c55e'}` }}>
                                           <span style={{ display: 'block', fontSize: '0.5rem', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>GASTO REAL</span>
                                           <span style={{ fontSize: '1.1rem', color: totalSpent > dynamicLimit ? '#ff4444' : '#fff', fontWeight: '900' }}>{totalSpent.toFixed(2)}€</span>
                                       </div>
                                       <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '8px', borderRight: '3px solid var(--color-gold)', textAlign: 'right' }}>
                                           <span style={{ display: 'block', fontSize: '0.5rem', color: '#555', textTransform: 'uppercase', marginBottom: '2px' }}>CUPO TOTAL</span>
                                           <span style={{ fontSize: '1.1rem', color: 'var(--color-gold)', fontWeight: '900' }}>{dynamicLimit.toFixed(2)}€</span>
                                       </div>
                                   </div>
                               </div>

                               <div style={{ display: 'flex', gap: '0.4rem' }}>
                                   <button onClick={() => openDeckModal(p)} className="btn-premium btn-premium-sm btn-premium-dark" style={{ flex: 1, fontSize: '0.7rem' }}>MAZO</button>
                                   <button onClick={() => openCommanderModal(p.id)} className="btn-premium btn-premium-sm btn-premium-gold" style={{ flex: 1, fontSize: '0.7rem' }}>CMDR</button>
                               </div>
                           </div>
                        </div>
                    );
                })}
             </div>
          </div>
       )}

       {activeTab === 'pairings' && (
          <TournamentPairings tournamentId={id as string} participants={participants} allMatches={matches} currentRoundMatches={currentRoundMatches} currentRound={tournament.current_round} onMatchUpdate={loadData} isOwner={true} />
       )}

       {activeTab === 'standings' && <TournamentStandings participants={participants} />}

       {showPlayerModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: Z_INDEX_OVERLAY, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowPlayerModal(false)}>
               <div style={{ background: '#1a1a1a', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '80vh', border: '1px solid #333', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                   <h3 style={{ marginBottom: '1rem', color: 'var(--color-gold)' }}>Seleccionar Jugador</h3>
                   <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', marginBottom: '1rem' }} autoFocus />
                   <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       {availablePlayersFiltered.map(p => (
                           <div key={p.id} onClick={() => togglePlayerSelection(p.id)} style={{ padding: '0.8rem', background: selectedPlayers.has(p.id) ? 'rgba(212, 175, 55, 0.2)' : '#222', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', border: selectedPlayers.has(p.id) ? '1px solid var(--color-gold)' : '1px solid transparent' }}>
                               <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #666', background: selectedPlayers.has(p.id) ? 'var(--color-gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   {selectedPlayers.has(p.id) && <span style={{ color: '#000', fontSize: '10px' }}>✓</span>}
                               </div>
                               {p.avatar_url ? <img src={p.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} /> : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#444', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{p.username?.charAt(0)}</div>}
                               <div>
                                   <div style={{ fontWeight: 'bold' }}>{p.username}</div>
                                   <div style={{ fontSize: '0.7rem', color: '#666' }}>{p.deck_count || 0} mazos</div>
                               </div>
                           </div>
                       ))}
                   </div>
                   <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                       <button onClick={() => setShowPlayerModal(false)} className="btn-premium btn-premium-dark" style={{ flex: 1 }}>Cancelar</button>
                       <button onClick={handleAddSelectedPlayers} disabled={selectedPlayers.size === 0} className="btn-premium btn-premium-gold" style={{ flex: 1 }}>Añadir Seleccionados ({selectedPlayers.size})</button>
                   </div>
               </div>
            </div>
       )}

       <CommanderSearchModal isOpen={cmdrModalOpen} onClose={() => setCmdrModalOpen(false)} onSelect={handleSelectCommander} />
       <TournamentDeckModal isOpen={deckModalOpen} onClose={() => setDeckModalOpen(false)} playerDecks={activePlayerDecks} playerName={currentParticipant?.profiles?.username || ''} onSelect={handleSelectDeck} />
       <ConfirmationDialog isOpen={confirmAction?.type === 'start'} title="Iniciar Torneo" message="¿Seguro?" onConfirm={() => { setConfirmAction(null); handleStartTournament(); }} onCancel={() => setConfirmAction(null)} confirmText="Iniciar" />
       <ConfirmationDialog isOpen={confirmAction?.type === 'next'} title="Siguiente Ronda" message="¿Avanzar?" onConfirm={() => { setConfirmAction(null); handleNextRound(); }} onCancel={() => setConfirmAction(null)} confirmText="Siguiente" />
       <ConfirmationDialog isOpen={confirmAction?.type === 'prev'} title="Revertir Ronda" message="¿Volver?" onConfirm={() => { setConfirmAction(null); handlePreviousRound(); }} onCancel={() => setConfirmAction(null)} confirmText="Volver" />
       <ConfirmationDialog isOpen={confirmAction?.type === 'drop'} title="Retirar Jugador" message={confirmAction?.customMessage || "¿Retirar?"} onConfirm={handleDropPlayer} onCancel={() => setConfirmAction(null)} confirmText="Retirar" isDestructive={true} />
       <ConfirmationDialog isOpen={confirmAction?.type === 'delete'} title="Eliminar" message="¿Eliminar definitivamente?" onConfirm={() => { setConfirmAction(null); handleDeleteTournament(); }} onCancel={() => setConfirmAction(null)} confirmText="Eliminar" isDestructive={true} />
    </div>
  );
}
