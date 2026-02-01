-- 1. Redefine the function to REPORT and CHANGE match results safely
-- This logic handles reverting stats if a winner was already selected.

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
  v_old_winner_id UUID;
  v_player_id UUID;
  v_is_winner BOOLEAN;
  v_is_old_winner BOOLEAN;
BEGIN
  -- 1. Get current match status (check for existing winner)
  SELECT winner_id INTO v_old_winner_id
  FROM matches
  WHERE id = p_match_id;

  -- 2. Get tournament_id
  SELECT tournament_id INTO v_tournament_id
  FROM tournament_matches
  WHERE match_id = p_match_id
  LIMIT 1;

  IF v_tournament_id IS NULL THEN
    RAISE EXCEPTION 'Match not linked to a tournament';
  END IF;

  -- 3. If there was an old winner, REVERT stats for everyone in the match
  IF v_old_winner_id IS NOT NULL THEN
     FOREACH v_player_id IN ARRAY p_player_ids
     LOOP
       v_is_old_winner := (v_player_id = v_old_winner_id);
       
       -- Reverse the previous stats addition
       UPDATE tournament_participants
       SET 
         points = points - CASE WHEN v_is_old_winner THEN 3 ELSE 0 END,
         wins = wins - CASE WHEN v_is_old_winner THEN 1 ELSE 0 END,
         losses = losses - CASE WHEN v_is_old_winner THEN 0 ELSE 1 END,
         matches_played = matches_played - 1
       WHERE 
         tournament_id = v_tournament_id AND 
         player_id = v_player_id;
     END LOOP;
  END IF;

  -- 4. Apply NEW result
  
  -- Update match table
  UPDATE matches
  SET winner_id = p_winner_id
  WHERE id = p_match_id;

  -- Update stats for each player
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
