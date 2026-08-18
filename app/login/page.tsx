'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Lock, Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/')
      router.refresh()
    } catch (error: any) {
      setErrorMessage(error.message || 'Terjadi kesalahan saat masuk. Silakan periksa kembali email dan kata sandi Anda.')
    } finally {
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
              Masuk ke akun Anda untuk menyimpan statistik dan progres balapan
            </p>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-red-600 hover:bg-red-500 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 font-bold text-xs uppercase tracking-wider text-white rounded-xl transition-all duration-200 shadow-lg shadow-red-600/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Masuk Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider & Guest Option */}
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