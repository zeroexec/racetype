'use client'

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react'
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

interface RewardResult {
  earnedPoints: number
  earnedCoins: number
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

  // State untuk menyimpan total hadiah & status simpan
  const [rewards, setRewards] = useState<RewardResult | null>(null)
  const [isSavingRewards, setIsSavingRewards] = useState<boolean>(false)
  const [saveStatusText, setSaveStatusText] = useState<string>('')

  const inputRef = useRef<HTMLInputElement>(null)
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const rewardSavedRef = useRef<boolean>(false) // Mencegah double claim/save

  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  // Memoize kata-kata passage agar tidak di-split setiap re-render
  const passageWords = useMemo(() => {
    return passageText ? passageText.split(' ') : []
  }, [passageText])

  const currentWordIndex = useMemo(() => {
    if (!passageText || !inputText) return 0
    const slicedPassage = passageText.slice(0, inputText.length)
    return slicedPassage.split(' ').length - 1
  }, [passageText, inputText])

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

  // Recalculate Rank (urutan garis finish)
  const recalculateRanks = useCallback((playerList: Player[]): Player[] => {
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
  }, [])

  // Kalkulasi & Simpan Hadiah ke Supabase Database
  const calculateAndSaveRewards = useCallback(
    async (finalRank: number, finalWpm: number, currentUserId: string) => {
      if (rewardSavedRef.current) return
      rewardSavedRef.current = true
      setIsSavingRewards(true)
      setSaveStatusText('Menyimpan perolehan poin & koin...')

      // 1. Logika Hadiah Poin & Koin
      let basePoints = 5
      let baseCoins = 2

      if (finalRank === 1) {
        basePoints = 30
        baseCoins = 15
      } else if (finalRank === 2) {
        basePoints = 20
        baseCoins = 10
      } else if (finalRank === 3) {
        basePoints = 10
        baseCoins = 5
      }

      // Bonus berbasis WPM
      const wpmBonusPoints = Math.floor(finalWpm * 0.5)
      const wpmBonusCoins = Math.floor(finalWpm * 0.2)

      const earnedPoints = basePoints + wpmBonusPoints
      const earnedCoins = baseCoins + wpmBonusCoins

      setRewards({ earnedPoints, earnedCoins })

      // 2. Ambil ID User dari Supabase Auth jika currentUserId dari state kosong
      let targetUserId = currentUserId
      if (!targetUserId || targetUserId === 'guest_user') {
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          targetUserId = authData.user.id
        }
      }

      // 3. Simpan Perubahan ke Supabase jika User Terdaftar
      if (targetUserId && targetUserId !== 'guest_user') {
        try {
          // Ambil profil user saat ini
          const { data: profileData, error: fetchErr } = await supabase
            .from('profiles')
            .select('total_points, coins')
            .eq('id', targetUserId)
            .maybeSingle()

          if (fetchErr) {
            console.error('Fetch Error:', fetchErr)
            setSaveStatusText('Gagal membaca profil pengguna.')
            setIsSavingRewards(false)
            return
          }

          const currentTotalPoints = profileData?.total_points ?? 0
          const currentCoins = profileData?.coins ?? 0

          const newTotalPoints = currentTotalPoints + earnedPoints
          const newCoins = currentCoins + earnedCoins

          // Perbarui poin, koin, dan waktu balapan terakhir
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({
              total_points: newTotalPoints,
              coins: newCoins,
              last_raced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUserId)

          if (updateErr) {
            console.error('Update Error:', updateErr)
            setSaveStatusText('Gagal menyimpan hadiah ke database.')
          } else {
            setSaveStatusText('Poin & koin berhasil ditambahkan!')
          }
        } catch (err) {
          console.error('Gagal memperbarui koin dan poin ke database:', err)
          setSaveStatusText('Terjadi kesalahan saat menyimpan hadiah.')
        }
      } else {
        setSaveStatusText('Mode Tamu: Poin & koin tidak disimpan.')
      }

      setIsSavingRewards(false)
    },
    []
  )

  // Simulasi Bot
  const startBotSimulation = useCallback(() => {
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
          const charsPerTick = ((currentWpm * 5) / 60) * 0.5
          const progressIncrease = (charsPerTick / totalCharacters) * 100

          const newProgress = Math.min((p.progress || 0) + progressIncrease, 100)
          const isFinished = newProgress >= 100
          const finishTime = isFinished ? p.finishTime ?? now : null

          if (!isFinished) playersAllFinished = false

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
    }, 500)
  }, [passageText.length, recalculateRanks])

  // Inisialisasi Data User & Sesi
  useEffect(() => {
    const initRace = async () => {
      setIsLoading(true)

      // Sync Supabase Auth User ID
      let currentAuthUserId = ''
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        currentAuthUserId = authData.user.id
      }

      const storedUserId = currentAuthUserId || localStorage.getItem('typing_race_user_id') || ''
      const rawUsername = localStorage.getItem('typing_race_username') || ''

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

      let selectedPassage = DEFAULT_PASSAGE

      try {
        const { data: passageData, error: passageErr } = await supabase.from('passages').select('content')
        if (!passageErr && passageData && passageData.length > 0) {
          selectedPassage = passageData[Math.floor(Math.random() * passageData.length)].content
        }
      } catch (err) {
        console.error('Gagal mengambil passage dari DB, menggunakan default.', err)
      }
      setPassageText(selectedPassage)

      let dbBots: BotPreset[] | null = null
      try {
        const { data, error: botErr } = await supabase.from('bots').select('*')
        if (!botErr && data) {
          dbBots = data
        }
      } catch (err) {
        console.error('Gagal mengambil bot preset dari DB, menggunakan fallback.', err)
      }

      let shuffledBots: BotPreset[] = []
      if (dbBots && dbBots.length > 0) {
        shuffledBots = [...dbBots].sort(() => Math.random() - 0.5)
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
          id: storedUserId || 'guest_user',
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

  // Timer Countdown Start
  useEffect(() => {
    if (isLoading || gameState !== 'countdown') return

    const timer = setInterval(() => {
      setRaceCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setGameState('racing')
          setStartTime(Date.now())
          setTimeout(() => inputRef.current?.focus(), 100)
          startBotSimulation()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, isLoading, startBotSimulation])

  // Global Focus Handler
  useEffect(() => {
    if (gameState !== 'racing' || isUserFinished) return
    const handleFocus = () => inputRef.current?.focus()
    window.addEventListener('click', handleFocus)
    window.addEventListener('keydown', handleFocus)
    return () => {
      window.removeEventListener('click', handleFocus)
      window.removeEventListener('keydown', handleFocus)
    }
  }, [gameState, isUserFinished])

  // Shortcut Keyboard (Enter untuk langsung ke Halaman Achievements)
  useEffect(() => {
    if (!isUserFinished || isSavingRewards) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        router.push('/achievements')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isUserFinished, isSavingRewards, router])

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
    }
  }

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
        const timeInMinutes = Math.max((now - startTime) / 60000, 0.001)
        currentWpm = Math.round(updatedText.length / 5 / timeInMinutes)
      }

      setMyWpm(currentWpm)

      setPlayers((prev) => {
        let playersAllFinished = true

        const nextPlayers = prev.map((p) => {
          if (!p.isBot) {
            if (!isFinished) playersAllFinished = false
            return {
              ...p,
              progress,
              wpm: currentWpm,
              isFinished,
              finishTime: isFinished ? p.finishTime ?? now : null,
            }
          }

          if (!p.isFinished) playersAllFinished = false
          return p
        })

        const rankedPlayers = recalculateRanks(nextPlayers)

        if (isFinished) {
          setIsUserFinished(true)
          const myPlayer = rankedPlayers.find((p) => !p.isBot)
          const finalRank = myPlayer?.rank || 4
          calculateAndSaveRewards(finalRank, currentWpm, userId)
        }

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

  const playerCharPositions = players.map((p) => {
    if (!p.isBot) {
      return { id: p.id, index: inputText.length, isMe: true }
    }
    const charIdx = Math.min(
      Math.floor((p.progress / 100) * passageText.length),
      passageText.length - 1
    )
    return { id: p.id, index: charIdx, isMe: false }
  })

  const renderPassage = () => {
    wordRefs.current = []
    let globalCharIndex = 0

    return passageWords.map((word, wordIdx) => {
      const isCurrentWord = wordIdx === currentWordIndex
      const wordChars = word.split('').map((char) => {
        const index = globalCharIndex++

        let colorClass = 'text-slate-400'
        if (index < inputText.length) {
          colorClass = 'text-red-600 font-bold'
        }

        const activePlayersOnChar = playerCharPositions.filter((p) => p.index === index)

        return (
          <span key={index} className="relative inline-flex flex-col items-center group">
            <span className={`${colorClass} font-mono text-base md:text-lg`}>{char}</span>
            {activePlayersOnChar.length > 0 && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-[2px] bg-slate-300 rounded-full shadow-sm animate-pulse" />
            )}
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

        const activePlayersOnSpace = playerCharPositions.filter((p) => p.index === spaceIndex)

        spaceChar = (
          <span key={`space-${spaceIndex}`} className="relative inline-flex flex-col items-center group">
            <span className={`${spaceColorClass} font-mono text-base md:text-lg`}>{'\u00A0'}</span>
            {activePlayersOnSpace.length > 0 && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-[2px] bg-slate-300 rounded-full shadow-sm animate-pulse" />
            )}
          </span>
        )
      }

      return (
        <span
          key={`word-${wordIdx}`}
          ref={(el) => {
            wordRefs.current[wordIdx] = el
          }}
          className={`inline-flex items-center rounded px-1 py-1 mx-0.5 transition-colors ${
            isCurrentWord ? 'bg-red-100 outline outline-2 outline-red-500/60' : ''
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
      <main className="relative min-h-screen w-screen bg-slate-900 text-slate-900 flex items-center justify-center select-none overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
          style={{ backgroundImage: "url('/bg/bg.png')" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Menyiapkan Arena & Soal...</p>
        </div>
      </main>
    )
  }

  const myRankPosition = players.find((p) => !p.isBot)?.rank || 4
  const totalWords = passageWords.length

  return (
    <main className="relative min-h-screen w-screen bg-slate-950 text-slate-900 p-4 md:p-6 flex flex-col items-center justify-start select-none overflow-x-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none"
        style={{ backgroundImage: "url('/bg/bg.png')" }}
      />

      <div className="relative z-10 max-w-3xl w-full flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              title="Tinggalkan Arena"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
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

        {/* Countdown */}
        {gameState === 'countdown' && (
          <div className="h-10 flex items-center justify-center shrink-0">
            <span
              className={`text-2xl md:text-3xl font-black text-red-500 tracking-wider ${
                raceCountdown > 0 ? 'animate-pulse' : 'scale-110 transition-transform'
              }`}
            >
              {raceCountdown > 0 ? raceCountdown : 'MULAI!'}
            </span>
          </div>
        )}

        {/* Track Mobil */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shrink-0">
          <div className="space-y-4">
            {players.map((p, index) => {
              const isMe = !p.isBot
              const progressVal = Math.min(Math.max(p.progress || 0, 0), 100)

              return (
                <div key={`${p.id}-${index}`} className="relative group py-2 pr-2 pl-28 md:pl-36 overflow-visible">
                  <div className="relative w-full h-1 bg-slate-100 rounded-full">
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear pointer-events-none z-10 min-w-max flex items-center"
                      style={{ left: `calc(${progressVal}% * 0.95)` }}
                    >
                      <div className="absolute -left-2 -translate-x-full flex flex-col items-end justify-center whitespace-nowrap bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-right">
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
                        <span className="text-[9px] font-mono font-bold text-slate-500 leading-tight">
                          {p.wpm || 0} WPM • {Math.round(progressVal)}%
                        </span>
                      </div>

                      <Image
                        src="/car/car.png"
                        alt="Mobil Balap"
                        width={80}
                        height={50}
                        style={{ height: 'auto' }}
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

        {/* Input Text Area */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-2 shrink-0 relative">
          <div
            ref={containerRef}
            onClick={() => inputRef.current?.focus()}
            className="px-[50%] py-4 bg-slate-50 border border-slate-200 rounded-lg overflow-x-hidden whitespace-nowrap cursor-text flex items-center leading-relaxed scroll-smooth"
          >
            {renderPassage()}
          </div>

          <div className="h-4 flex items-center justify-center">
            {isError && (
              <span className="text-xs font-semibold text-slate-400 transition-opacity duration-150">
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

        {/* Inline Hasil Balapan & Hadiah */}
        {isUserFinished && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Row Detail Statistik */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 w-full border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Posisi Finish</span>
                <p className="text-xl font-black text-slate-900 font-mono">
                  Juara <span className="text-red-600">#{myRankPosition}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kecepatan</span>
                <p className="text-xl font-black text-slate-900 font-mono">
                  {myWpm} <span className="text-xs font-semibold text-slate-500">WPM</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kata Tersetel</span>
                <p className="text-xl font-black text-slate-900 font-mono">
                  {totalWords} <span className="text-xs font-semibold text-slate-500">Kata</span>
                </p>
              </div>

              {/* Hadiah Poin & Koin */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Poin Perolehan</span>
                  <p className="text-base font-black text-blue-600 font-mono leading-none">
                    +{rewards?.earnedPoints ?? 0}
                  </p>
                </div>
                <div className="h-6 w-[1px] bg-slate-200" />
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Koin Perolehan</span>
                  <p className="text-base font-black text-amber-500 font-mono leading-none">
                    +{rewards?.earnedCoins ?? 0} 🪙
                  </p>
                </div>
              </div>
            </div>

            {/* Row Tombol Aksi & Keterangan Status */}
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center gap-2">
                {isSavingRewards && (
                  <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-500">
                  {saveStatusText}
                </span>
              </div>

              <button
                onClick={() => router.push('/achievements')}
                disabled={isSavingRewards}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-3 shadow-sm ${
                  isSavingRewards
                    ? 'bg-red-400 cursor-not-allowed opacity-70'
                    : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSavingRewards ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>Berikutnya</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </div>
                {!isSavingRewards && (
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-red-600 bg-white border border-red-200 rounded shadow-2xs">
                    ENTER
                  </kbd>
                )}
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
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm font-medium">
          Loading Arena...
        </div>
      }
    >
      <BotRaceContent />
    </Suspense>
  )
}