'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Gagal terhubung dengan Google. Silakan coba lagi.'
      )
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Background Animated Grid & Glow Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl animate-pulse" />

      {/* Back Button Header */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-6xl mx-auto w-full z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Lobby
        </Link>
      </header>

      {/* Card Auth Container */}
      <div className="relative z-10 max-w-md w-full my-12">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-red-950/20">
          
          {/* Header Brand */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 mb-2">
              <Image
                src="/logo/logo.png"
                alt="Type Race Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              TYPE<span className="text-red-500">RACE</span>
            </h1>
            <p className="text-xs text-slate-400 font-light">
              Masuk dengan akun Google untuk menyimpan statistik dan progres balapan
            </p>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 font-medium text-sm text-slate-200 border border-slate-700/80 hover:border-slate-600 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                <span>Lanjutkan dengan Google</span>
              </>
            )}
          </button>

          {/* Guest Option */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-500">
              Ingin langsung mencoba?{' '}
              <Link
                href="/"
                className="text-red-400 hover:text-red-300 font-semibold underline underline-offset-4"
              >
                Main sebagai Guest
              </Link>
            </p>
          </div>

        </div>
      </div>

      {/* Footer Info */}
      <footer className="absolute bottom-6 text-center text-xs text-slate-600 font-mono">
        Made By Adlan Madjied Ridho
      </footer>
    </main>
  )
}