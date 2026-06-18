-- Function to report match result and update stats transactionally
-- This runs with SECURITY DEFINER to bypass RLS on the participants table
-- ensuring that the reporter (if authorized) can update stats for all players.

CREATE OR REPLACE FUNCTION report_match_result(
  p_match_id UUID,
  p_winner_id UUID,
  p_player_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament_id UUID;
  v_player_id UUID;
  v_is_winner BOOLEAN;
BEGIN
  -- 1. Update the match winner
  UPDATE matches
  SET winner_id = p_winner_id
  WHERE id = p_match_id;

  -- 2. Get tournament_id from one of the participants (assuming all in same tournament)
  -- We need to find which tournament this match belongs to, or use the participants table directly.
  -- Let's fetch it from tournament_matches for safety.
  SELECT tournament_id INTO v_tournament_id
  FROM tournament_matches
  WHERE match_id = p_match_id
  LIMIT 1;

  IF v_tournament_id IS NULL THEN
    RAISE EXCEPTION 'Match not linked to a tournament';
  END IF;

  -- 3. Update stats for each player
  FOREACH v_player_id IN ARRAY p_player_ids
  LOOP
    v_is_winner := (v_player_id = p_winner_id);
    
    UPDATE tournament_participants
    SET 
      points = COALESCE(points, 0) + CASE WHEN v_is_winner THEN 3 ELSE 0 END,
      wins = COALESCE(wins, 0) + CASE WHEN v_is_winner THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_is_winner THEN 0 ELSE 1 END,
      matches_played = COALESCE(matches_played, 0) + 1
    WHERE 
      tournament_id = v_tournament_id AND 
      player_id = v_player_id;
      
  END LOOP;
END;
$$;
