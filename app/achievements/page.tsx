'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface UserStats {
  username: string
  rank: string
  points: number
  totalRaces: number
  wins: number
  avgWpm: number
  maxWpm: number
  accuracy: number
}

function AchievementsContent() {
  const router = useRouter()
  const [stats, setStats] = useState<UserStats>({
    username: 'Pemain',
    rank: 'Gold Racer',
    points: 1250,
    totalRaces: 24,
    wins: 18,
    avgWpm: 68,
    maxWpm: 92,
    accuracy: 98,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)

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
              rank: data.rank || 'Gold Racer',
              points: data.points ?? 1250,
              totalRaces: data.total_races ?? 24,
              wins: data.wins ?? 18,
              avgWpm: data.avg_wpm ?? 68,
              maxWpm: data.max_wpm ?? 92,
              accuracy: data.accuracy ?? 98,
            })
          } else {
            setStats((prev) => ({ ...prev, username: finalUsername }))
          }
        } catch (err) {
          console.error('Gagal mengambil statistik pencapaian dari database:', err)
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
      <main className="relative min-h-screen w-screen bg-slate-900 text-slate-900 flex items-center justify-center select-none overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
          style={{ backgroundImage: "url('/bg/bg.png')" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Memuat Pencapaian...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen w-screen bg-slate-950 text-slate-900 p-4 md:p-6 flex flex-col items-center justify-center select-none overflow-x-hidden">
      {/* Background Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none"
        style={{ backgroundImage: "url('/bg/bg.png')" }}
      />

      <div className="relative z-10 max-w-2xl w-full flex flex-col gap-4">
        {/* Header Status Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Rank Badge / Image Icon */}
            <div className="relative w-16 h-16 md:w-20 md:h-20 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-center shrink-0">
              <Image
                src="/car/car.png"
                alt="Rank Badge"
                width={64}
                height={40}
                className="object-contain drop-shadow-md"
              />
            </div>

            <div className="flex flex-col text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="px-2 py-0.5 bg-amber-400 text-slate-900 font-extrabold text-[10px] rounded font-mono uppercase tracking-wider">
                  {stats.rank}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1 leading-tight">
                {stats.username}
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Peringkat Balapan Utama
              </p>
            </div>
          </div>

          {/* Point Counter */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-center md:text-right w-full md:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Poin
            </span>
            <p className="text-2xl font-black text-red-600 font-mono leading-none mt-1">
              {stats.points.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-bold text-slate-600">PTS</span>
            </p>
          </div>
        </div>

        {/* Grid Stats / Pencapaian */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Balapan
            </span>
            <p className="text-xl md:text-2xl font-black text-slate-900 font-mono mt-2">
              {stats.totalRaces}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Kemenangan
            </span>
            <p className="text-xl md:text-2xl font-black text-emerald-600 font-mono mt-2">
              {stats.wins}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Rata-rata WPM
            </span>
            <p className="text-xl md:text-2xl font-black text-slate-900 font-mono mt-2">
              {stats.avgWpm} <span className="text-xs font-semibold text-slate-500">WPM</span>
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Kecepatan Maks
            </span>
            <p className="text-xl md:text-2xl font-black text-red-600 font-mono mt-2">
              {stats.maxWpm} <span className="text-xs font-semibold text-slate-500">WPM</span>
            </p>
          </div>
        </div>

        {/* Navigation Action Buttons with Shortcut Indicators */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <button
            onClick={handleGoLobby}
            className="w-full sm:w-1/2 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Kembali ke Lobby</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white border border-slate-300 rounded shadow-2xs">
              ESC
            </kbd>
          </button>

          <button
            onClick={handlePlayAgain}
            className="w-full sm:w-1/2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-between cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2">
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
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-red-600 bg-white border border-red-200 rounded shadow-2xs">
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
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm font-medium">
          Loading Pencapaian...
        </div>
      }
    >
      <AchievementsContent />
    </Suspense>
  )
}