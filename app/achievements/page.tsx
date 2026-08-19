'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface UserStats {
  username: string
  rankName: string
  rankImageUrl: string
  selectedCarUrl: string
  totalPoints: number
  previousPoints: number
  coins: number
}

function AchievementsContent() {
  const router = useRouter()
  const [stats, setStats] = useState<UserStats>({
    username: 'Pemain',
    rankName: 'Warrior',
    rankImageUrl: 'https://eepyxtqqnhfxppwizaax.supabase.co/storage/v1/object/public/rank/01_warrior.jpg',
    selectedCarUrl: 'https://eepyxtqqnhfxppwizaax.supabase.co/storage/v1/object/public/cars/01_car.png',
    totalPoints: 0,
    previousPoints: 0,
    coins: 0,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isPointsUnread, setIsPointsUnread] = useState<boolean>(false)

  // Function Navigasi
  const handleGoLobby = () => {
    router.push('/')
  }

  const handlePlayAgain = () => {
    router.push('/race/bot')
  }

  // Handle Event Shortcut Keyboard (ESC & ENTER)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleGoLobby()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        handlePlayAgain()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Fetch data statistik dari LocalStorage / Supabase
  useEffect(() => {
    const storedUsername = localStorage.getItem('typing_race_username') || ''
    const storedUserId = localStorage.getItem('typing_race_user_id') || ''

    let finalUsername = storedUsername
    if (
      !storedUsername ||
      storedUsername.trim() === '' ||
      storedUsername === 'guest_user' ||
      storedUsername === 'Player Solo' ||
      storedUsername.toLowerCase() === 'user'
    ) {
      finalUsername = 'user (kamu)'
    }

    const fetchUserStats = async () => {
      setIsLoading(true)

      if (storedUserId && storedUserId !== 'guest_user') {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', storedUserId)
            .single()

          if (!error && data) {
            setStats({
              username: data.username || finalUsername,
              rankName: data.rank_name || 'Warrior',
              rankImageUrl:
                data.rank_image_url ||
                'https://eepyxtqqnhfxppwizaax.supabase.co/storage/v1/object/public/rank/01_warrior.jpg',
              selectedCarUrl:
                data.selected_car ||
                'https://eepyxtqqnhfxppwizaax.supabase.co/storage/v1/object/public/cars/01_car.png',
              totalPoints: data.total_points ?? 0,
              previousPoints: data.previous_points ?? 0,
              coins: data.coins ?? 0,
            })

            // Cek status is_points_read
            if (data.is_points_read === false) {
              setIsPointsUnread(true)

              // Update status is_points_read menjadi true
              await supabase
                .from('profiles')
                .update({ is_points_read: true })
                .eq('id', storedUserId)
            }
          } else {
            setStats((prev) => ({ ...prev, username: finalUsername }))
          }
        } catch (err) {
          console.error('Gagal mengambil statistik pencapaian:', err)
          setStats((prev) => ({ ...prev, username: finalUsername }))
        }
      } else {
        setStats((prev) => ({ ...prev, username: finalUsername }))
      }

      setIsLoading(false)
    }

    fetchUserStats()
  }, [])

  if (isLoading) {
    return (
      <main className="relative min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center select-none overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
          style={{ backgroundImage: "url('/bg/bg.png')" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400">Memuat Pencapaian...</p>
        </div>
      </main>
    )
  }

  // Kalkulasi persentase bar garis poin
  const gainedPoints = stats.totalPoints - stats.previousPoints
  const targetNextPoints = Math.max(stats.totalPoints, 100)
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((stats.totalPoints / targetNextPoints) * 100))
  )

  return (
    <main className="relative min-h-screen w-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col items-center justify-center select-none overflow-x-hidden">
      {/* Background Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none"
        style={{ backgroundImage: "url('/bg/bg.png')" }}
      />

      {/* CONTAINER TANPA BINGKAI */}
      <div className="relative z-10 max-w-lg w-full flex flex-col items-center px-4">
        
        {/* 1. Koin di Pojok Kanan Atas */}
        <div className="absolute top-0 right-4 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full">
          <span className="text-amber-400 font-bold text-xs">🪙</span>
          <span className="font-mono font-black text-xs text-amber-400">
            {stats.coins.toLocaleString('id-ID')}
          </span>
        </div>

        {/* 2. Gambar Rank Besar di Tengah Atas & Nama Rank */}
        <div className="flex flex-col items-center mt-6">
          <div className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center">
            <Image
              src={stats.rankImageUrl}
              alt={stats.rankName}
              width={128}
              height={128}
              className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            />
          </div>
          <span className="mt-3 px-3 py-1 bg-amber-400/20 text-amber-300 font-extrabold text-xs rounded-md font-mono uppercase tracking-wider">
            {stats.rankName}
          </span>
        </div>

        {/* 3. Baris Mobil Selected (Kiri) & Nama Player (Kanan) */}
        <div className="w-full mt-8 flex items-center justify-between gap-4">
          {/* Foto Mobil Selected (Kiri) */}
          <div className="relative w-20 h-12 flex items-center justify-center shrink-0">
            <Image
              src={stats.selectedCarUrl}
              alt="Mobil Terpilih"
              width={70}
              height={36}
              className="object-contain drop-shadow"
            />
          </div>

          {/* Nama Player (Kanan) */}
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Pemain
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-100 leading-tight truncate max-w-[200px]">
              {stats.username}
            </h2>
          </div>
        </div>

        {/* 4. Indikator Garis Poin Sebelumnya dan Poin Saat Ini */}
        <div className="w-full mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1 text-slate-400">
              <span>Sebelumnya:</span>
              <span className="font-mono text-slate-300">{stats.previousPoints.toLocaleString('id-ID')} PTS</span>
            </div>
            <div className="flex items-center gap-1 text-red-400 font-mono">
              <span>Saat ini:</span>
              <span className="text-sm font-black">{stats.totalPoints.toLocaleString('id-ID')} PTS</span>
              {gainedPoints > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-sans">
                  +{gainedPoints}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar Garis */}
          <div
            className={`relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden transition-all ${
              isPointsUnread ? 'ring-2 ring-red-500/50 animate-pulse' : ''
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 5. Tombol Kembali ke Lobby dan Main Lagi */}
        <div className="w-full mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
          <button
            onClick={handleGoLobby}
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Lobby</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 rounded">
              ESC
            </kbd>
          </button>

          <button
            onClick={handlePlayAgain}
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-between cursor-pointer shadow-lg shadow-red-900/20"
          >
            <div className="flex items-center gap-1.5">
              <span>Main Lagi</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-red-200 bg-red-700/60 rounded">
              ENTER
            </kbd>
          </button>
        </div>

      </div>
    </main>
  )
}

export default function AchievementsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm font-medium">
          Loading Pencapaian...
        </div>
      }
    >
      <AchievementsContent />
    </Suspense>
  )
}