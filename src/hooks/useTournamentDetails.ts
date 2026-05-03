import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'react-hot-toast';
import { calculateStandings, TournamentPlayer, TournamentMatchInfo } from '@/lib/tournamentUtils';
import { ScryfallCard } from '@/lib/scryfall';

interface UseTournamentDetailsProps {
  tournamentId: string;
}

export function useTournamentDetails({ tournamentId }: UseTournamentDetailsProps) {
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<TournamentPlayer[]>([]);
  const [matches, setMatches] = useState<TournamentMatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'standings' | 'pairings' | 'registration'>('registration');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Tournament Info
      const { data: tData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tData) {
        setTournament(tData);
        // Auto-switch tab logic (simplified)
        if (tData.status === 'active' && activeTab === 'registration') {
          setActiveTab('pairings');
        }
      }

      // 2. Matches
      const { data: mData } = await supabase
        .from('tournament_matches')
        .select('*, matches(*)')
        .eq('tournament_id', tournamentId);
      
      const allMatches = (mData || []) as unknown as TournamentMatchInfo[];
      setMatches(allMatches);

      // 3. Participants
      const { data: pData } = await supabase
        .from('tournament_participants')
        .select('*, profiles(username, avatar_url), decks(name, commander, image_url, budget_spent, created_at)')
        .eq('tournament_id', tournamentId);

      if (pData) {
        const typedParticipants = pData as unknown as TournamentPlayer[];
        const stats = calculateStandings(typedParticipants, allMatches);
        setParticipants(stats);
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
      toast.error('Error al cargar datos del torneo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) loadData();
  }, [tournamentId]);

  const startTournament = async () => {
    const { error } = await supabase
      .from('tournaments')
      .update({ 
        status: 'active', 
        current_round: 1,
        current_round_start_time: new Date().toISOString()
      })
      .eq('id', tournamentId);

    if (!error) {
      toast.success('¡Torneo iniciado!');
      loadData();
      return true;
    }
    toast.error('Error al iniciar torneo');
    return false;
  };

  const updateRound = async (nextRound: number) => {
    const { error } = await supabase
      .from('tournaments')
      .update({ 
        current_round: nextRound,
        current_round_start_time: new Date().toISOString()
      })
      .eq('id', tournamentId);

    if (!error) {
      toast.success(`Ronda ${nextRound} iniciada`);
      loadData();
      return true;
    }
    toast.error('Error al cambiar de ronda');
    return false;
  };

  const addPlayers = async (playerIds: string[]) => {
    const inserts = await Promise.all(playerIds.map(async pid => {
      const { data: userDecks } = await supabase
        .from('decks')
        .select('id, name, commander, image_url')
        .eq('user_id', pid)
        .order('created_at', { ascending: false })
        .limit(1);

      const defaultDeck = userDecks?.[0];
      return {
        tournament_id: tournamentId,
        player_id: pid,
        deck_id: defaultDeck?.id || null,
        commander_name: defaultDeck?.commander || null,
        commander_image_url: defaultDeck?.image_url || null
      };
    }));

    const { error } = await supabase
      .from('tournament_participants')
      .insert(inserts);

    if (!error) {
      toast.success(`Añadidos ${inserts.length} jugadores`);
      loadData();
      return true;
    }
    toast.error('Error al añadir jugadores');
    return false;
  };

  const dropPlayer = async (participantId: string) => {
    const { error } = await supabase
      .from('tournament_participants')
      .update({ is_dropped: true })
      .eq('id', participantId);
    
    if (!error) {
      toast.success('Jugador retirado');
      loadData();
      return true;
    }
    toast.error('Error al retirar jugador');
    return false;
  };

  const selectCommander = async (participantId: string, card: ScryfallCard) => {
    const image = (card.image_uris as any)?.art_crop || card.image_uris?.normal || '';
    const { error } = await supabase
      .from('tournament_participants')
      .update({ 
          commander_name: card.name,
          commander_image_url: image
      })
      .eq('id', participantId);

    if (!error) {
      toast.success(`Comandante asignado: ${card.name}`);
      loadData();
      return true;
    }
    toast.error('Error al asignar comandante');
    return false;
  };

  const selectDeck = async (participantId: string, deck: any) => {
    const { error } = await supabase
      .from('tournament_participants')
      .update({
        deck_id: deck.id,
        commander_name: deck.commander,
        commander_image_url: deck.image_url
      })
      .eq('id', participantId);

    if (!error) {
      toast.success('Mazo actualizado');
      loadData();
      return true;
    }
    toast.error('Error al actualizar mazo');
    return false;
  };

  return {
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
  };
}
