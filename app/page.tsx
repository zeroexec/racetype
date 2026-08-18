'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import ProfileModal from './modal/ProfileModal'
import { ChevronDown, LogIn, Play, User as UserIcon, HelpCircle } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email?: string } | null>(null)
  
  // State Modal Profil
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // Cek status autentikasi/session saat halaman dimuat & listen perubahan auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User'
        setCurrentUser({ 
          id: session.user.id, 
          name, 
          email: session.user.email 
        })
      } else {
        setCurrentUser(null)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User'
        setCurrentUser({ 
          id: session.user.id, 
          name, 
          email: session.user.email 
        })
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Handle Logout dari Modal
  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    localStorage.removeItem('typing_race_username')
    setCurrentUser(null)
    setIsProfileModalOpen(false)
    setLoading(false)
    router.refresh()
  }

  // Handle Match vs Bot
  const handleStartBotRace = () => {
    const activeUsername = currentUser ? currentUser.name : 'User'
    localStorage.setItem('typing_race_username', activeUsername)
    router.push('/race/bot')
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      
      {/* Background Animated Grid & Glow Effects (Merah) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl animate-pulse" />

      {/* Logo Transparan Samar di Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
        <Image 
          src="/logo/logo.png" 
          alt="Type Race Logo Background" 
          width={600} 
          height={600} 
          priority
          className="object-contain filter grayscale"
        />
      </div>

      {/* Top Bar / Header Nav */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-6xl mx-auto w-full z-10">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">Server Online</span>
        </div>

        {/* Jika Sudah Login -> Pil Profil Interaktif yang Memicu Modal */}
        {currentUser ? (
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="group relative flex items-center gap-2.5 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-red-500/50 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
            title="Klik untuk membuka profil"
          >
            {/* Avatar dengan Indikator Status */}
            <div className="relative flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xs font-bold group-hover:scale-105 transition-transform">
                {currentUser.name[0].toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
            </div>

            <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
              {currentUser.name}
            </span>

            {/* Icon Chevron sebagai petunjuk UI bahwa komponen ini dropdown/modal */}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 transition-all duration-200 group-hover:translate-y-0.5" />
          </button>
        ) : (
          /* Jika Belum Login -> Tombol Masuk */
          <Link
            href="/login"
            className="px-5 py-2 text-xs font-semibold tracking-wider uppercase text-red-400 hover:text-white bg-slate-900/80 border border-red-500/30 hover:border-red-500 hover:bg-red-600/10 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg shadow-red-500/5 flex items-center gap-2"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </Link>
        )}
      </header>

      {/* Hero Lobby Container */}
      <div className="relative z-10 max-w-xl w-full text-center space-y-8 px-4">
        
        {/* Animated Badge & Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium tracking-wide">
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Real-time Typing Arena</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-sm">
            TYPE<span className="text-red-500">RACE</span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-sm mx-auto font-light leading-relaxed">
            Adu kecepatan jari jemari mengetik secara instan. Tanpa ribet, langsung tancap gas!
          </p>
        </div>

        {/* Action Section: Multiplayer (Kiri) & Bot (Kanan) */}
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tombol Kiri: Multiplayer (Fitur Mendatang) */}
            <div className="group relative w-full py-4 px-6 bg-slate-900/50 border border-slate-800 text-slate-500 rounded-xl flex flex-col items-center justify-center gap-1 overflow-hidden shadow-inner cursor-not-allowed backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-slate-600" />
                <span className="font-bold text-sm tracking-wider uppercase">Vs Player</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600 tracking-wide">(Fitur Mendatang)</span>
            </div>

            {/* Tombol Kanan: Latihan vs Bot (Tombol Utama) */}
            <button
              onClick={handleStartBotRace}
              disabled={loading}
              className="group relative w-full py-4 px-6 bg-red-600 hover:bg-red-500 active:scale-95 disabled:scale-100 border border-red-700 hover:border-red-500 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all duration-200 shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] flex items-center justify-center gap-3 overflow-hidden"
            >
              {/* Glossy shine effect */}
              <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />

              <span>Mulai Balapan</span>
              <Play className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform" />
            </button>

          </div>

          {/* Status User Saat Ini */}
          <p className="text-xs text-slate-500 font-mono">
            {currentUser ? (
              <>
                Bertanding sebagai <span className="text-red-400 font-semibold">{currentUser.name}</span>
              </>
            ) : (
              <>
                Bermain sebagai <span className="text-slate-300 font-semibold">User (Guest)</span>
              </>
            )}
          </p>
        </div>

      </div>

      {/* Modal Profil Pengguna */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onLogout={handleLogout}
        loading={loading}
      />

      {/* Footer Info */}
      <footer className="absolute bottom-6 text-center text-xs text-slate-600 font-mono">
        Made By Adlan Madjied Ridho
      </footer>
    </main>
  )
}