'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { LogOut, Coins, Zap, Target, Trophy, ChevronLeft, Loader2 } from 'lucide-react'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: { 
    id: string
    name: string
    email?: string
    rankImage?: string
    rankName?: string
    coins?: number
    avgWpm?: number
    accuracy?: number
    totalRaces?: number
  } | null
  onLogout: () => void
  loading?: boolean
}

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onLogout,
  loading = false,
}: ProfileModalProps) {
  const [displayCoins, setDisplayCoins] = useState(0)
  const [isReady, setIsReady] = useState(false)

  // Fallback data jika belum ada nilai dari backend
  const rankImg = user?.rankImage || '/rank/01_warrior.jpg'
  const rankTitle = user?.rankName || 'Warrior I'
  const targetCoins = user?.coins ?? 1250
  const avgWpm = user?.avgWpm ?? 68
  const accuracy = user?.accuracy ?? 98
  const totalRaces = user?.totalRaces ?? 42

  // Reset state saat modal dibuka / ditutup
  useEffect(() => {
    if (!isOpen || !user) {
      setIsReady(false)
      setDisplayCoins(0)
    }
  }, [isOpen, user])

  // Animasi Count-Up untuk Koin HANYA berjalan saat modal Siap (isReady = true)
  useEffect(() => {
    if (!isOpen || !user || !isReady) return

    let startTime: number | null = null
    const duration = 1000 // Durasi animasi (1 detik)

    const animateCoins = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing Function: Out Quad
      const easeProgress = 1 - (1 - progress) * (1 - progress)
      setDisplayCoins(Math.floor(easeProgress * targetCoins))

      if (progress < 1) {
        requestAnimationFrame(animateCoins)
      }
    }

    const animationFrame = requestAnimationFrame(animateCoins)
    return () => cancelAnimationFrame(animationFrame)
  }, [isOpen, targetCoins, user, isReady])

  // Fallback Timeout jika gambar gagal / terlalu lama diproses
  useEffect(() => {
    if (!isOpen || !user) return
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [isOpen, user, rankImg])

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes legendEntrance {
          0% {
            opacity: 0;
            transform: scale(2.2) translateY(-20px);
          }
          60% {
            opacity: 1;
            transform: scale(0.95) translateY(5px);
          }
          80% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shineSweep {
          0% {
            transform: translateX(-150%) rotate(25deg);
          }
          100% {
            transform: translateX(250%) rotate(25deg);
          }
        }

        /* Animasi Menerang & Meredup Kuning untuk Koin */
        @keyframes yellowPulse {
          0%, 100% {
            opacity: 0.6;
            filter: brightness(0.9);
          }
          50% {
            opacity: 1;
            filter: brightness(1.3);
          }
        }

        .animate-legend-rank {
          animation: legendEntrance 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-shine {
          animation: shineSweep 2.5s infinite ease-in-out;
        }

        .animate-coin-pulse {
          animation: yellowPulse 2s infinite ease-in-out;
        }
      `}</style>

      {/* Backdrop Gelap (Klik luar untuk menutup modal) */}
      <div
        className="absolute inset-0 bg-black/80 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Card Modal */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-black text-slate-100 animate-in fade-in zoom-in-95 duration-200 min-h-[420px] flex flex-col justify-between">
        
        {/* State Loading Overlay */}
        {!isReady && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 transition-opacity duration-300">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest">
              Memuat Profil...
            </p>
          </div>
        )}

        {/* Top Bar: Button Tutup di Kiri & Jumlah Koin di Kanan */}
        <div className="flex items-center justify-between pt-1">
          {/* Tombol Tutup (< Tutup) */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Tutup</span>
          </button>

          {/* Koin di Atas Kanan (Menerang & Meredup Kuning) */}
          <div className={`flex items-center gap-1.5 text-amber-400 transition-opacity duration-300 ${isReady ? 'animate-coin-pulse' : 'opacity-0'}`}>
            <Coins className="w-4 h-4" />
            <span className="text-xs font-bold font-mono tracking-wide">
              {displayCoins.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Section Rank Besar di Tengah */}
        <div className="flex flex-col items-center justify-center my-auto py-2">
          <div className="relative w-32 h-32 flex items-center justify-center">
            
            {/* Rank Image Wrapper - Animasi Ditahan Sampai isReady = true */}
            <div className={`relative w-full h-full ${isReady ? 'animate-legend-rank' : 'opacity-0'}`}>
              <Image
                src={rankImg}
                alt={rankTitle}
                fill
                priority
                onLoadingComplete={() => setIsReady(true)}
                className="object-contain"
              />

              {/* Kilauan Putih Mengkilap Presisi Sesuai Bentuk PNG Transparent */}
              <div 
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  WebkitMaskImage: `url(${rankImg})`,
                  maskImage: `url(${rankImg})`,
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                }}
              >
                <div className={`w-full h-full bg-gradient-to-tr from-transparent via-white/40 to-transparent ${isReady ? 'animate-shine' : ''}`} />
              </div>
            </div>
          </div>

          <h3 className={`text-lg font-black text-white uppercase tracking-wider mt-2 transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
            {rankTitle}
          </h3>
        </div>

        {/* Section User Info (Card Profil) */}
        <div className="relative flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 my-2">
          {/* Tombol Keluar Akun di Atas Kanan Card Profil */}
          <button
            onClick={onLogout}
            disabled={loading}
            title="Keluar Akun"
            className="absolute top-3 right-3 px-2 py-1 flex items-center gap-1.5 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs font-semibold disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{loading ? '...' : 'Logout'}</span>
          </button>

          {/* Sisi Kiri: Foto Profil */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center text-xl font-black shadow-lg shadow-red-500/10">
              {user.name[0].toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>

          {/* Sisi Kanan: Nama & Email */}
          <div className="space-y-0.5 overflow-hidden pr-16">
            <h4 className="font-bold text-lg text-slate-100 truncate">{user.name}</h4>
            <p className="text-xs text-slate-400 font-mono truncate">
              {user.email || `${user.name.toLowerCase()}@typerace.io`}
            </p>
          </div>
        </div>

        {/* Grid Statistik Game (WPM, Akurasi, Total Balapan) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Avg WPM */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 flex flex-col items-center justify-center text-center">
            <Zap className="w-4 h-4 text-red-400 mb-1" />
            <p className="text-[10px] text-slate-500 uppercase font-mono">Rata WPM</p>
            <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">{avgWpm}</p>
          </div>

          {/* Accuracy */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 flex flex-col items-center justify-center text-center">
            <Target className="w-4 h-4 text-emerald-400 mb-1" />
            <p className="text-[10px] text-slate-500 uppercase font-mono">Akurasi</p>
            <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">{accuracy}%</p>
          </div>

          {/* Total Races */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 flex flex-col items-center justify-center text-center">
            <Trophy className="w-4 h-4 text-sky-400 mb-1" />
            <p className="text-[10px] text-slate-500 uppercase font-mono">Balapan</p>
            <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">{totalRaces}</p>
          </div>
        </div>

      </div>
    </div>
  )
}