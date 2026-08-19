CREATE OR REPLACE FUNCTION process_race_result(
  p_user_id UUID,
  p_completed_words INT,
  p_rank INT
)
RETURNS TABLE (
  earned_points INT,
  new_total_points INT,
  new_rank VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points INT;
  v_bonus_penalty INT := 0;
  v_earned INT := 0;
  v_final_points INT := 0;
  v_calculated_rank VARCHAR(50);
BEGIN
  -- 1. Ambil poin user saat ini
  SELECT total_points INTO v_current_points
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User tidak ditemukan';
  END IF;

  -- 2. Hitung Bonus/Penalty berdasarkan Juara & Tier saat ini
  -- Jika Rank tinggi (Epic ke atas / >= 7000 poin), Juara 4 dapat penalty -30
  IF p_rank = 1 THEN v_bonus_penalty := 50;
  ELSIF p_rank = 2 THEN v_bonus_penalty := 25;
  ELSIF p_rank = 3 THEN v_bonus_penalty := 10;
  ELSIF p_rank = 4 THEN
    IF v_current_points >= 7000 THEN
      v_bonus_penalty := -30; -- Penalty Juara 4 di Rank Tinggi
    ELSE
      v_bonus_penalty := 0;   -- Rank Rendah aman dari penalti
    END IF;
  END IF;

  -- 3. Kalkulasi Total Poin Baru (Minimal 0)
  v_earned := p_completed_words + v_bonus_penalty;
  v_final_points := GREATEST(0, v_current_points + v_earned);

  -- 4. Tentukan Rank Baru Berdasarkan Poin
  IF v_final_points >= 20000 THEN v_calculated_rank := 'Mythic';
  ELSIF v_final_points >= 18000 THEN v_calculated_rank := 'Legend I';
  ELSIF v_final_points >= 16500 THEN v_calculated_rank := 'Legend II';
  ELSIF v_final_points >= 15000 THEN v_calculated_rank := 'Legend III';
  ELSIF v_final_points >= 13500 THEN v_calculated_rank := 'Legend IV';
  ELSIF v_final_points >= 12000 THEN v_calculated_rank := 'Legend V';
  ELSIF v_final_points >= 11000 THEN v_calculated_rank := 'Epic I';
  ELSIF v_final_points >= 10000 THEN v_calculated_rank := 'Epic II';
  ELSIF v_final_points >= 9000 THEN v_calculated_rank := 'Epic III';
  ELSIF v_final_points >= 8000 THEN v_calculated_rank := 'Epic IV';
  ELSIF v_final_points >= 7000 THEN v_calculated_rank := 'Epic V';
  ELSIF v_final_points >= 6000 THEN v_calculated_rank := 'Grandmaster I';
  ELSIF v_final_points >= 5100 THEN v_calculated_rank := 'Grandmaster II';
  ELSIF v_final_points >= 4300 THEN v_calculated_rank := 'Grandmaster III';
  ELSIF v_final_points >= 3500 THEN v_calculated_rank := 'Grandmaster IV';
  ELSIF v_final_points >= 3000 THEN v_calculated_rank := 'Master I';
  ELSIF v_final_points >= 2500 THEN v_calculated_rank := 'Master II';
  ELSIF v_final_points >= 2000 THEN v_calculated_rank := 'Master III';
  ELSIF v_final_points >= 1500 THEN v_calculated_rank := 'Master IV';
  ELSIF v_final_points >= 1100 THEN v_calculated_rank := 'Elite I';
  ELSIF v_final_points >= 800 THEN v_calculated_rank := 'Elite II';
  ELSIF v_final_points >= 500 THEN v_calculated_rank := 'Elite III';
  ELSIF v_final_points >= 300 THEN v_calculated_rank := 'Warrior I';
  ELSIF v_final_points >= 150 THEN v_calculated_rank := 'Warrior II';
  ELSE v_calculated_rank := 'Warrior III';
  END IF;

  -- 5. Update data di database
  UPDATE profiles
  SET 
    total_points = v_final_points,
    rank_name = v_calculated_rank,
    last_raced_at = NOW()
  WHERE id = p_user_id;

  -- 6. Kembalikan hasil ke frontend
  earned_points := v_earned;
  new_total_points := v_final_points;
  new_rank := v_calculated_rank;
  RETURN NEXT;
END;
$$;