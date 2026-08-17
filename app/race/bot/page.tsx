'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface Player {
  id: string
  username: string
  progress: number
  wpm: number
  isFinished: boolean
  isBot: boolean
  minWpm?: number
  maxWpm?: number
}

const DEFAULT_PASSAGE =
  'Teknologi informasi berkembang sangat pesat dalam beberapa dekade terakhir. Kecepatan dan ketepatan dalam mengetik menjadi salah satu keahlian dasar yang sangat berguna di era digital saat ini.'

const BOT_COUNT = 3

function BotRaceContent() {
  const router = useRouter()

  const [userId, setUserId] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [passageText, setPassageText] = useState<string>(DEFAULT_PASSAGE)

  const [gameState, setGameState] = useState<'countdown' | 'racing' | 'finished'>('countdown')
  const [raceCountdown, setRaceCountdown] = useState<number>(3)

  const [inputText, setInputText] = useState<string>('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [myWpm, setMyWpm] = useState<number>(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const passageWords = passageText.split(' ')
  const currentWordIndex = inputText.endsWith(' ')
    ? inputText.trim().split(' ').length
    : Math.max(0, inputText.trim().split(' ').length - 1)

  // Auto-scroll horizontal ke kata aktif
  useEffect(() => {
    if (containerRef.current && wordRefs.current[currentWordIndex]) {
      const container = containerRef.current
      const activeWordElem = wordRefs.current[currentWordIndex]
      if (activeWordElem) {
        const targetScrollLeft =
          activeWordElem.offsetLeft - container.offsetWidth / 2 + activeWordElem.offsetWidth / 2
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
      }
    }
  }, [currentWordIndex])

  // Inisialisasi Player & Load Preset Bot dari DB
  useEffect(() => {
    const storedUserId = localStorage.getItem('typing_race_user_id') || 'guest_user'
    const storedUsername = localStorage.getItem('typing_race_username') || 'Player Solo'

    setUserId(storedUserId)
    setUsername(storedUsername)

    const initRace = async () => {
      let selectedPassage = DEFAULT_PASSAGE

      try {
        const { data: passageData } = await supabase.from('passages').select('content')
        if (passageData && passageData.length > 0) {
          selectedPassage = passageData[Math.floor(Math.random() * passageData.length)].content
        }
      } catch (err) {
        console.error('Gagal mengambil passage dari DB, menggunakan default.', err)
      }
      setPassageText(selectedPassage)

      let dbBots: any[] | null = null
      try {
        const { data } = await supabase.from('bots').select('*')
        dbBots = data
      } catch (err) {
        console.error('Gagal mengambil bot preset dari DB, menggunakan fallback.', err)
      }

      const botsList: Player[] = []
      const shuffledBots = dbBots && dbBots.length > 0 ? [...dbBots].sort(() => 0.5 - Math.random()) : []

      for (let i = 0; i < BOT_COUNT; i++) {
        const preset = shuffledBots[i]
        botsList.push({
          id: `bot_${i + 1}`,
          username: preset?.username || preset?.name || `Bot Speedster ${i + 1}`,
          progress: 0,
          wpm: 0,
          isFinished: false,
          isBot: true,
          minWpm: preset?.min_wpm ?? 40,
          maxWpm: preset?.max_wpm ?? 70,
        })
      }

      setPlayers([
        { id: storedUserId, username: storedUsername, progress: 0, wpm: 0, isFinished: false, isBot: false },
        ...botsList,
      ])
    }

    initRace()

    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current)
    }
  }, [])

  // Timer Countdown Start
  useEffect(() => {
    if (gameState === 'countdown') {
      if (raceCountdown > 0) {
        const timer = setTimeout(() => setRaceCountdown((prev) => prev - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        setGameState('racing')
        setStartTime(Date.now())
        setTimeout(() => inputRef.current?.focus(), 100)
        startBotSimulation()
      }
    }
  }, [gameState, raceCountdown])

  // Auto-focus input saat mode racing
  useEffect(() => {
    if (gameState !== 'racing') return
    const handleGlobalClick = () => inputRef.current?.focus()
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [gameState])

  // Simulasi Kemajuan Bot
  const startBotSimulation = () => {
    if (botIntervalRef.current) clearInterval(botIntervalRef.current)

    botIntervalRef.current = setInterval(() => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (!p.isBot || p.isFinished) return p

          const minWpm = p.minWpm || 40
          const maxWpm = p.maxWpm || 70
          const currentWpm = Math.floor(Math.random() * (maxWpm - minWpm + 1)) + minWpm

          const totalCharacters = passageText.length || 1
          const charsPerSecond = (currentWpm * 5) / 60
          const progressIncrease = (charsPerSecond / totalCharacters) * 100

          const newProgress = Math.min((p.progress || 0) + progressIncrease, 100)

          return {
            ...p,
            progress: Math.round(newProgress * 10) / 10,
            wpm: currentWpm,
            isFinished: newProgress >= 100,
          }
        })
      )
    }, 1000)
  }

  // Pengolahan Input Ketikan User
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'racing') return

    const val = e.target.value
    const typedWords = val.split(' ')
    const completedWords: string[] = []
    let isValidInput = true

    for (let i = 0; i < typedWords.length; i++) {
      const isLastWord = i === typedWords.length - 1
      const targetWord = passageWords[i]

      if (!targetWord) {
        isValidInput = false
        break
      }

      if (!isLastWord) {
        if (typedWords[i] === targetWord) {
          completedWords.push(typedWords[i])
        } else {
          isValidInput = false
          break
        }
      } else {
        if (!targetWord.startsWith(typedWords[i])) {
          isValidInput = false
        } else if (typedWords[i] === targetWord && typedWords.length === passageWords.length) {
          completedWords.push(typedWords[i])
        }
      }
    }

    if (!isValidInput) return
    setInputText(val)

    const progress = Math.round((completedWords.length / passageWords.length) * 100)
    let currentWpm = 0
    if (startTime) {
      const timeInMinutes = (Date.now() - startTime) / 60000
      currentWpm = timeInMinutes > 0 ? Math.round(completedWords.length / timeInMinutes) : 0
    }

    const isFinished = completedWords.length === passageWords.length && val.trim() === passageText.trim()
    setMyWpm(currentWpm)

    if (isFinished) {
      setGameState('finished')
      if (botIntervalRef.current) clearInterval(botIntervalRef.current)
    }

    setPlayers((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, progress, wpm: currentWpm, isFinished } : p))
    )
  }

  // Rendering Teks Lintasan Ketik
  const renderPassage = () => {
    let globalCharIndex = 0
    return passageWords.map((word, wordIdx) => {
      const isCurrentWord = wordIdx === currentWordIndex
      const wordChars = word.split('').map((char) => {
        const index = globalCharIndex++
        let colorClass = 'text-slate-400'
        if (index < inputText.length) {
          colorClass =
            inputText[index] === char
              ? 'text-red-600 bg-red-100/70 font-bold'
              : 'text-red-700 bg-red-200 font-bold'
        }
        return (
          <span key={index} className={`${colorClass} font-mono text-lg md:text-xl`}>
            {char}
          </span>
        )
      })

      let spaceChar = null
      if (wordIdx < passageWords.length - 1) {
        const spaceIndex = globalCharIndex++
        let spaceColorClass = 'text-slate-400'
        if (spaceIndex < inputText.length) {
          spaceColorClass =
            inputText[spaceIndex] === ' '
              ? 'text-red-600 bg-red-100/70 font-bold'
              : 'text-red-700 bg-red-200 font-bold'
        }
        spaceChar = (
          <span key={`space-${spaceIndex}`} className={`${spaceColorClass} font-mono text-lg md:text-xl`}>
            {'\u00A0'}
          </span>
        )
      }

      return (
        <span
          key={`word-${wordIdx}`}
          ref={(el) => {
            wordRefs.current[wordIdx] = el
          }}
          className={`inline-flex items-center rounded px-1 py-0.5 mx-0.5 transition-colors ${
            isCurrentWord ? 'bg-red-100/80 outline outline-2 outline-red-500/60' : ''
          }`}
        >
          {wordChars}
          {spaceChar}
        </span>
      )
    })
  }

  return (
    <main className="h-screen w-screen bg-slate-50 text-slate-900 p-3 md:p-6 flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="max-w-4xl w-full bg-white border border-slate-200 rounded-2xl shadow-md p-4 md:p-6 flex flex-col justify-between gap-4 overflow-hidden relative">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none">Arena Balapan Bot</h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">WPM Anda</span>
            <p className="text-lg font-black text-red-600 font-mono leading-none">{myWpm}</p>
          </div>
        </div>

        {/* Countdown Overlay */}
        {gameState === 'countdown' && (
          <div className="text-center py-1 shrink-0">
            <span className="text-3xl font-black text-red-600 animate-pulse tracking-wider">
              {raceCountdown > 0 ? raceCountdown : 'GO!'}
            </span>
          </div>
        )}

        {/* Lintasan Balap Player & Bot */}
        <div className="bg-transparent p-1 md:p-2 shrink-0 border-b border-slate-100 mb-2">
          <div className="space-y-1">
            {players.map((p, index) => {
              const isMe = p.id === userId
              const progressVal = Math.min(Math.max(p.progress || 0, 0), 100)

              return (
                <div key={`${p.id}-${index}`} className="relative group bg-transparent pt-3 pb-6 px-12 border-b border-slate-200 last:border-b-0 overflow-visible">
                  
                  {/* Info Player & WPM Overlay */}
                  <div className="absolute left-4 top-2 z-20 flex items-center gap-1.5 bg-white/90 px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className={isMe ? 'text-black font-extrabold flex items-center gap-1' : 'text-slate-700 flex items-center gap-1'}>
                      {p.isBot && (
                        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                      <span className="text-[10px]">{p.username}</span>
                    </span>
                    <span className="text-slate-500 font-mono text-[9px] font-bold">
                      {p.wpm || 0} WPM • {Math.round(progressVal)}%
                    </span>
                  </div>

                  {/* Container Bar Progress / Track */}
                  <div className="relative w-full bg-slate-100 h-1.5 rounded-full shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ease-out ${isMe ? 'bg-black' : 'bg-slate-500'}`}
                      style={{ width: `${progressVal}%` }}
                    />
                    
                    {/* Gambar Mobil */}
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear pointer-events-none z-10 min-w-max"
                      style={{ left: `calc(${progressVal}% * 0.9 + 5%)` }}
                    >
                      <Image
                        src="/car/car.png"
                        alt="Mobil Balap"
                        width={120}
                        height={75}
                        className="object-contain"
                        priority={index === 0}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Papan Teks Area Ketik */}
        {gameState !== 'finished' ? (
          <div className="space-y-3 flex-1 flex flex-col justify-center min-h-0 relative">
            <div
              ref={containerRef}
              onClick={() => inputRef.current?.focus()}
              className="px-[50%] py-6 bg-slate-50 border border-slate-200 rounded-xl overflow-x-hidden whitespace-nowrap cursor-text flex items-center leading-loose scroll-smooth shadow-inner"
            >
              {renderPassage()}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              disabled={gameState !== 'racing'}
              className="opacity-0 pointer-events-none absolute -z-10"
              autoFocus
            />
          </div>
        ) : (
          /* Result Summary Screen */
          <div className="py-8 bg-red-50/50 border border-red-100 rounded-xl text-center space-y-3">
            <h2 className="text-2xl font-black text-red-600">Balapan Selesai!</h2>
            <p className="text-slate-600 text-sm">
              Kecepatan akhir Anda: <span className="font-mono font-bold text-slate-900">{myWpm} WPM</span>
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition"
            >
              Main Lagi
            </button>
          </div>
        )}

        {/* Tombol Tinggalkan Arena (Besar, Di Bawah Papan Teks, BG Merah) */}
        <div className="pt-5 shrink-0">
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-lg rounded-xl shadow-lg transition-colors duration-200 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Tinggalkan Arena
          </button>
        </div>

      </div>
    </main>
  )
}

export default function BotRacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
          Loading Arena...
        </div>
      }
    >
      <BotRaceContent />
    </Suspense>
  )
}