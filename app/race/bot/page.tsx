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
  rank?: number
  finishTime?: number | null
}

interface BotPreset {
  username?: string
  name?: string
  min_wpm?: number
  max_wpm?: number
}

const DEFAULT_PASSAGE =
  'Teknologi informasi berkembang sangat pesat dalam beberapa dekade terakhir. Kecepatan dan ketepatan dalam mengetik menjadi salah satu keahlian dasar yang sangat berguna di era digital saat ini.'

const BOT_COUNT = 3

function BotRaceContent() {
  const router = useRouter()

  const [userId, setUserId] = useState<string>('')
  const [, setUsername] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [passageText, setPassageText] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [gameState, setGameState] = useState<'countdown' | 'racing' | 'finished'>('countdown')
  const [raceCountdown, setRaceCountdown] = useState<number>(3)

  const [inputText, setInputText] = useState<string>('')
  const [isError, setIsError] = useState<boolean>(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [myWpm, setMyWpm] = useState<number>(0)
  const [isUserFinished, setIsUserFinished] = useState<boolean>(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const passageWords = passageText ? passageText.split(' ') : []

  // Menentukan indeks kata yang sedang aktif dengan akurat
  const getCurrentWordIndex = () => {
    if (!passageText || !inputText) return 0
    const slicedPassage = passageText.slice(0, inputText.length)
    return slicedPassage.split(' ').length - 1
  }

  const currentWordIndex = getCurrentWordIndex()

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

  // Inisialisasi Player & Load Data dari DB
  useEffect(() => {
    const storedUserId = localStorage.getItem('typing_race_user_id') || 'guest_user'
    const rawUsername = localStorage.getItem('typing_race_username')

    let finalUsername = rawUsername
    if (
      !rawUsername ||
      rawUsername.trim() === '' ||
      rawUsername === 'guest_user' ||
      rawUsername === 'Player Solo' ||
      rawUsername.toLowerCase() === 'user'
    ) {
      finalUsername = 'user (kamu)'
    }

    setUserId(storedUserId)
    setUsername(finalUsername)

    const initRace = async () => {
      setIsLoading(true)
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

      let dbBots: BotPreset[] | null = null
      try {
        const { data } = await supabase.from('bots').select('*')
        dbBots = data
      } catch (err) {
        console.error('Gagal mengambil bot preset dari DB, menggunakan fallback.', err)
      }

      let shuffledBots: BotPreset[] = []
      if (dbBots && dbBots.length > 0) {
        shuffledBots = [...dbBots]
        for (let i = shuffledBots.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffledBots[i], shuffledBots[j]] = [shuffledBots[j], shuffledBots[i]]
        }
      }

      const botsList: Player[] = []
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
          finishTime: null,
        })
      }

      setPlayers([
        {
          id: storedUserId,
          username: finalUsername,
          progress: 0,
          wpm: 0,
          isFinished: false,
          isBot: false,
          finishTime: null,
        },
        ...botsList,
      ])

      setIsLoading(false)
    }

    initRace()

    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current)
    }
  }, [])

  // Helper untuk menghitung ulang peringkat berdasarkan timestamp penyelesaian
  const recalculateRanks = (playerList: Player[]): Player[] => {
    const finishedPlayers = playerList
      .filter((p) => p.isFinished && p.finishTime !== null && p.finishTime !== undefined)
      .sort((a, b) => (a.finishTime ?? 0) - (b.finishTime ?? 0))

    const rankMap = new Map<string, number>()
    finishedPlayers.forEach((p, idx) => {
      rankMap.set(p.id, idx + 1)
    })

    return playerList.map((p) => ({
      ...p,
      rank: rankMap.get(p.id) || p.rank,
    }))
  }

  // Timer Countdown Start (DIPERBAIKI)
  useEffect(() => {
    if (isLoading) return

    if (gameState === 'countdown') {
      if (raceCountdown > 0) {
        const timer = setTimeout(() => setRaceCountdown((prev) => prev - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        // Tampilkan "MULAI!" selama 800ms sebelum mode balapan dimulai
        const startTimer = setTimeout(() => {
          setGameState('racing')
          setStartTime(Date.now())
          setTimeout(() => inputRef.current?.focus(), 100)
          startBotSimulation()
        }, 800)
        return () => clearTimeout(startTimer)
      }
    }
  }, [gameState, raceCountdown, isLoading])

  // Auto-focus input saat mode racing
  useEffect(() => {
    if (gameState !== 'racing' || isUserFinished) return
    const handleGlobalClick = () => inputRef.current?.focus()
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [gameState, isUserFinished])

  // Shortcut Keyboard saat user sudah finish
  useEffect(() => {
    if (!isUserFinished) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'r') {
        e.preventDefault()
        window.location.reload()
      } else if (key === 'l' || key === 'escape') {
        e.preventDefault()
        router.push('/')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isUserFinished, router])

  // Simulasi Kemajuan Bot
  const startBotSimulation = () => {
    if (botIntervalRef.current) clearInterval(botIntervalRef.current)

    botIntervalRef.current = setInterval(() => {
      setPlayers((prev) => {
        let playersAllFinished = true
        const now = Date.now()

        const updated = prev.map((p) => {
          if (!p.isBot) {
            if (!p.isFinished) playersAllFinished = false
            return p
          }

          if (p.isFinished) return p

          const minWpm = p.minWpm || 40
          const maxWpm = p.maxWpm || 70
          const currentWpm = Math.floor(Math.random() * (maxWpm - minWpm + 1)) + minWpm

          const totalCharacters = passageText.length || 1
          const charsPerSecond = (currentWpm * 5) / 60
          const progressIncrease = (charsPerSecond / totalCharacters) * 100

          const newProgress = Math.min((p.progress || 0) + progressIncrease, 100)
          const isFinished = newProgress >= 100
          const finishTime = isFinished ? p.finishTime ?? now : null

          if (!isFinished) {
            playersAllFinished = false
          }

          return {
            ...p,
            progress: Math.round(newProgress * 10) / 10,
            wpm: currentWpm,
            isFinished,
            finishTime,
          }
        })

        const rankedPlayers = recalculateRanks(updated)

        if (playersAllFinished && botIntervalRef.current) {
          clearInterval(botIntervalRef.current)
          setGameState('finished')
        }

        return rankedPlayers
      })
    }, 1000)
  }

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
    }
  }

  // Pengolahan Input Ketikan User
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'racing' || isUserFinished) return

    const val = e.target.value
    if (val.length < inputText.length) return

    const nextCharIndex = inputText.length
    const expectedChar = passageText[nextCharIndex]
    const inputLastChar = val[val.length - 1]

    if (inputLastChar === expectedChar) {
      const updatedText = val
      setInputText(updatedText)
      setIsError(false)

      const isFinished = updatedText === passageText
      const now = Date.now()

      const progress = isFinished
        ? 100
        : Math.round((updatedText.length / passageText.length) * 100)

      let currentWpm = 0
      if (startTime) {
        const timeInMinutes = (now - startTime) / 60000
        currentWpm = timeInMinutes > 0 ? Math.round(updatedText.length / 5 / timeInMinutes) : 0
      }

      setMyWpm(currentWpm)

      if (isFinished) {
        setIsUserFinished(true)
      }

      setPlayers((prev) => {
        let playersAllFinished = true

        const nextPlayers = prev.map((p) => {
          if (p.id !== userId) {
            if (!p.isFinished) playersAllFinished = false
            return p
          }

          if (!isFinished) playersAllFinished = false

          return {
            ...p,
            progress,
            wpm: currentWpm,
            isFinished,
            finishTime: isFinished ? p.finishTime ?? now : null,
          }
        })

        const rankedPlayers = recalculateRanks(nextPlayers)

        if (playersAllFinished && botIntervalRef.current) {
          clearInterval(botIntervalRef.current)
          setGameState('finished')
        }

        return rankedPlayers
      })
    } else {
      setIsError(true)
    }
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
          colorClass = 'text-red-600 font-bold'
        }
        return (
          <span key={index} className={`${colorClass} font-mono text-base md:text-lg`}>
            {char}
          </span>
        )
      })

      let spaceChar = null
      if (wordIdx < passageWords.length - 1) {
        const spaceIndex = globalCharIndex++
        let spaceColorClass = 'text-slate-400'
        if (spaceIndex < inputText.length) {
          spaceColorClass = 'text-red-600 font-bold'
        }
        spaceChar = (
          <span key={`space-${spaceIndex}`} className={`${spaceColorClass} font-mono text-base md:text-lg`}>
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

  if (isLoading) {
    return (
      <main className="min-h-screen w-screen bg-slate-50 text-slate-900 flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Menyiapkan Arena & Soal...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen w-screen bg-slate-50 text-slate-900 p-4 md:p-6 flex flex-col items-center justify-start select-none">
      <div className="max-w-3xl w-full flex flex-col gap-3 relative">

        {/* Header Utama */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              title="Tinggalkan Arena"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-black text-slate-900 leading-none">Arena Balapan Bot</h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">WPM Anda</span>
            <p className="text-base font-black text-red-600 font-mono leading-none">{myWpm}</p>
          </div>
        </div>

        {/* Area Countdown */}
        <div className="h-10 flex items-center justify-center shrink-0 my-1">
          {gameState === 'countdown' && (
            <span
              className={`text-2xl md:text-3xl font-black text-red-600 tracking-wider ${
                raceCountdown > 0 ? 'animate-pulse' : 'scale-110 transition-transform'
              }`}
            >
              {raceCountdown > 0 ? raceCountdown : 'MULAI!'}
            </span>
          )}
        </div>

        {/* Card Arena & Track Mobil */}
        <div className="bg-transparent px-1 py-2 shrink-0 border-b border-slate-200 my-1">
          <div className="space-y-4">
            {players.map((p, index) => {
              const isMe = p.id === userId
              const progressVal = Math.min(Math.max(p.progress || 0, 0), 100)

              return (
                <div key={`${p.id}-${index}`} className="relative group bg-transparent py-2 pr-2 pl-28 md:pl-36 overflow-visible">
                  <div className="relative w-full h-1">
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear pointer-events-none z-10 min-w-max flex items-center"
                      style={{ left: `calc(${progressVal}% * 0.95)` }}
                    >
                      <div className="absolute -left-2 -translate-x-full flex flex-col items-end justify-center whitespace-nowrap bg-slate-50/90 px-1.5 py-0.5 rounded shadow-xs text-right">
                        <span className={`text-[10px] leading-tight font-bold flex items-center gap-1 ${isMe ? 'text-black font-extrabold' : 'text-slate-700'}`}>
                          {p.rank && (
                            <span className="px-1 py-0.5 bg-amber-400 text-slate-900 font-extrabold text-[9px] rounded font-mono">
                              #{p.rank}
                            </span>
                          )}
                          {p.isBot && (
                            <svg className="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                          {p.username}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 leading-tight">
                          {p.wpm || 0} WPM • {Math.round(progressVal)}%
                        </span>
                      </div>

                      <Image
                        src="/car/car.png"
                        alt="Mobil Balap"
                        width={80}
                        height={50}
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

        {/* Input Area / Hasil */}
        {!isUserFinished ? (
          <div className="space-y-1 shrink-0 relative my-2">
            <div
              ref={containerRef}
              onClick={() => inputRef.current?.focus()}
              className="px-[50%] py-4 bg-white border border-slate-200 rounded-lg overflow-x-hidden whitespace-nowrap cursor-text flex items-center leading-relaxed scroll-smooth shadow-xs"
            >
              {renderPassage()}
            </div>

            <div className="h-4 flex items-center justify-center">
              {isError && (
                <span className="text-xs font-semibold text-red-500 transition-opacity duration-150">
                  Huruf Salah
                </span>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onKeyDown={handleKeyDownInput}
              onChange={handleInputChange}
              disabled={gameState !== 'racing' || isUserFinished}
              className="opacity-0 pointer-events-none absolute -z-10"
              autoFocus
            />
          </div>
        ) : (
          <div className="py-5 bg-red-50/50 border border-red-100 rounded-lg text-center space-y-4 shrink-0 my-2">
            <div>
              <h2 className="text-xl font-black text-red-600">Anda Memuat Garis Finish!</h2>
              <p className="text-slate-600 text-xs mt-1">
                Kecepatan akhir Anda: <span className="font-mono font-bold text-slate-900">{myWpm} WPM</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-md shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                Balapan Ulang
                <kbd className="px-1.5 py-0.5 text-[10px] bg-red-800 text-white rounded font-mono uppercase">R</kbd>
              </button>

              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-md shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                Tinggalkan Arena
                <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-400 text-white rounded font-mono uppercase">Esc</kbd>
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

export default function BotRacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
          Loading Arena...
        </div>
      }
    >
      <BotRaceContent />
    </Suspense>
  )
}