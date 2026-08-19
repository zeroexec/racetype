-- 1. Buat tabel profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  total_points INT DEFAULT 0,
  rank_name VARCHAR(50) DEFAULT 'Warrior III',
  last_raced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS) demi keamanan data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Semua orang bisa membaca profil (untuk leaderboard/lawan balapan)
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Policy: User hanya bisa meng-update profil miliknya sendiri
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);