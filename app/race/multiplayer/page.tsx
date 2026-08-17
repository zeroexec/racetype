'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface Player {
  id: string
  username: string
  progress?: number
  wpm?: number
  isFinished?: boolean
}

const DEFAULT_PASSAGE =
  'Teknologi informasi berkembang sangat pesat dalam beberapa dekade terakhir. Kecepatan dan ketepatan dalam mengetik menjadi salah satu keahlian dasar yang sangat berguna di era digital saat ini.'

const LOBBY_WAIT_TIME = 15
const MAX_PLAYERS = 5

// Helper untuk menghapus player duplikat berdasarkan ID
const deduplicatePlayers = (playerList: Player[]): Player[] => {
  const map = new Map<string, Player>()
  playerList.forEach((p) => {
    if (p && p.id) {
      map.set(p.id, {
        ...p,
        progress: p.progress || 0,
        wpm: p.wpm || 0,
        isFinished: p.isFinished || false,
      })
    }
  })
  return Array.from(map.values())
}

function MultiplayerRaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('roomId')

  const [userId, setUserId] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [passageText, setPassageText] = useState<string>(DEFAULT_PASSAGE)

  const [gameState, setGameState] = useState<'waiting' | 'lobby_countdown' | 'countdown' | 'racing' | 'finished'>('waiting')
  const [lobbyTimer, setLobbyTimer] = useState<number>(LOBBY_WAIT_TIME)
  const [raceCountdown, setRaceCountdown] = useState<number>(3)

  // State untuk Menghitung Berapa Detik Player Menunggu & Animasi Titik-Titik
  const [waitingTime, setWaitingTime] = useState<number>(0)
  const [dotsCount, setDotsCount] = useState<number>(1)

  const [inputText, setInputText] = useState<string>('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [myWpm, setMyWpm] = useState<number>(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const passageWords = passageText.split(' ')
  const currentWordIndex = inputText.endsWith(' ')
    ? inputText.trim().split(' ').length
    : Math.max(0, inputText.trim().split(' ').length - 1)

  // Timer Menunggu & Animasi titik-titik saat status 'waiting'
  useEffect(() => {
    if (gameState !== 'waiting') return

    const dotsInterval = setInterval(() => {
      setDotsCount((prev) => (prev >= 4 ? 1 : prev + 1))
    }, 400)

    const timerInterval = setInterval(() => {
      setWaitingTime((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(timerInterval)
    }
  }, [gameState])

  // Auto-scroll horizontal
  useEffect(() => {
    if (containerRef.current && wordRefs.current[currentWordIndex]) {
      const container = containerRef.current
      const activeWordElem = wordRefs.current[currentWordIndex]
      if (activeWordElem) {
        const targetScrollLeft = activeWordElem.offsetLeft - container.offsetWidth / 2 + activeWordElem.offsetWidth / 2
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
      }
    }
  }, [currentWordIndex])

  // Fetch Room & Set Listener Supabase Realtime
  useEffect(() => {
    const storedUserId = localStorage.getItem('typing_race_user_id')
    const storedUsername = localStorage.getItem('typing_race_username')

    if (!storedUserId || !storedUsername || !roomId) {
      router.push('/')
      return
    }

    setUserId(storedUserId)
    setUsername(storedUsername)

    const fetchRoom = async () => {
      const { data, error } = await supabase.from('matches').select('*').eq('id', roomId).single()

      if (error || !data) {
        alert('Room tidak ditemukan.')
        router.push('/')
        return
      }

      if (data.passage) setPassageText(data.passage)

      const uniquePlayers = deduplicatePlayers(data.players || [])
      setPlayers(uniquePlayers)

      if (uniquePlayers.length > 1 && data.status === 'waiting') {
        setGameState('lobby_countdown')
      } else if (data.status === 'racing') {
        setGameState('racing')
      }
    }

    fetchRoom()

    const channel = supabase.channel(`race_${roomId}`)
    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${roomId}` }, (payload) => {
        const updatedPlayers = deduplicatePlayers(payload.new.players || [])
        setPlayers(updatedPlayers)

        setGameState((prevStatus) => {
          if (payload.new.status === 'racing' && prevStatus !== 'racing' && prevStatus !== 'countdown') {
            return 'countdown'
          } else if (updatedPlayers.length > 1 && prevStatus === 'waiting') {
            setLobbyTimer(LOBBY_WAIT_TIME)
            return 'lobby_countdown'
          }
          return prevStatus
        })
      })
      .on('broadcast', { event: 'game-event' }, (payload) => {
        const { type, data } = payload.payload

        if (type === 'start-countdown') {
          setGameState('countdown')
        } else if (type === 'progress-update') {
          setPlayers((prev) =>
            prev.map((p) => (p.id === data.userId ? { ...p, progress: data.progress, wpm: data.wpm, isFinished: data.isFinished } : p))
          )
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, router])

  // Signal Mulai Otomatis Saat Timer Lobby Habis
  const handleStartRaceSignal = async () => {
    await supabase.from('matches').update({ status: 'racing' }).eq('id', roomId)

    supabase.channel(`race_${roomId}`).send({
      type: 'broadcast',
      event: 'game-event',
      payload: { type: 'start-countdown' },
    })
    setGameState('countdown')
  }

  // Timer Handlers untuk Lobby Countdown (Otomatis Mulai)
  useEffect(() => {
    if (gameState === 'lobby_countdown') {
      if (lobbyTimer > 0) {
        const timer = setTimeout(() => setLobbyTimer((prev) => prev - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        if (players.length > 0 && players[0].id === userId) {
          handleStartRaceSignal()
        }
      }
    }
  }, [gameState, lobbyTimer, players, userId])

  // Timer Handlers untuk Countdown Balapan
  useEffect(() => {
    if (gameState === 'countdown') {
      if (raceCountdown > 0) {
        const timer = setTimeout(() => setRaceCountdown((prev) => prev - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        setGameState('racing')
        setStartTime(Date.now())
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [gameState, raceCountdown])

  useEffect(() => {
    if (gameState !== 'racing') return
    const handleGlobalClick = () => inputRef.current?.focus()
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [gameState])

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
        if (typedWords[i] === targetWord) completedWords.push(typedWords[i])
        else { isValidInput = false; break }
      } else {
        if (!targetWord.startsWith(typedWords[i])) isValidInput = false
        else if (typedWords[i] === targetWord && typedWords.length === passageWords.length) {
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

    const isFinished = completedWords.length === passageWords.length && val.trim() === passageText
    setMyWpm(currentWpm)
    if (isFinished) setGameState('finished')

    const updatedPlayers = players.map((p) => (p.id === userId ? { ...p, progress, wpm: currentWpm, isFinished } : p))
    setPlayers(updatedPlayers)

    supabase.channel(`race_${roomId}`).send({
      type: 'broadcast',
      event: 'game-event',
      payload: { type: 'progress-update', data: { userId, progress, wpm: currentWpm, isFinished } },
    })

    if (progress % 10 === 0 || isFinished) {
      supabase.from('matches').update({ players: updatedPlayers }).eq('id', roomId).then()
    }
  }

  const renderPassage = () => {
    let globalCharIndex = 0
    return passageWords.map((word, wordIdx) => {
      const isCurrentWord = wordIdx === currentWordIndex
      const wordChars = word.split('').map((char) => {
        const index = globalCharIndex++
        let colorClass = 'text-slate-400'
        if (index < inputText.length) {
          colorClass = inputText[index] === char ? 'text-red-600 bg-red-100/70 font-bold' : 'text-red-700 bg-red-200 font-bold'
        }
        return <span key={index} className={`${colorClass} font-mono text-lg md:text-xl`}>{char}</span>
      })

      let spaceChar = null
      if (wordIdx < passageWords.length - 1) {
        const spaceIndex = globalCharIndex++
        let spaceColorClass = 'text-slate-400'
        if (spaceIndex < inputText.length) {
          spaceColorClass = inputText[spaceIndex] === ' ' ? 'text-red-600 bg-red-100/70 font-bold' : 'text-red-700 bg-red-200 font-bold'
        }
        spaceChar = <span key={`space-${spaceIndex}`} className={`${spaceColorClass} font-mono text-lg md:text-xl`}>{'\u00A0'}</span>
      }

      return (
        <span
          key={`word-${wordIdx}`}
          ref={(el) => { wordRefs.current[wordIdx] = el }}
          className={`inline-flex items-center rounded px-1 py-0.5 mx-0.5 transition-colors ${isCurrentWord ? 'bg-red-100/80 outline outline-2 outline-red-500/60' : ''}`}
        >
          {wordChars}
          {spaceChar}
        </span>
      )
    })
  }

  return (
    <main className="h-screen w-screen bg-slate-50 text-slate-900 p-3 md:p-6 flex flex-col items-center justify-center overflow-hidden">
      <div className="max-w-4xl w-full bg-white border border-slate-200 rounded-2xl shadow-md p-4 md:p-6 flex flex-col justify-between gap-3 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <h1 className="text-lg md:text-xl font-black text-slate-900 leading-none">Arena Mabar (Multiplayer)</h1>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-700">
            <span>{players.length}/{MAX_PLAYERS} Player</span>
          </div>
        </div>

        {/* Status Lobby */}
        {gameState === 'waiting' && (
          <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-xs flex items-center justify-between text-red-900 font-semibold">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span>
                Menunggu Player lain bergabung
                <span className="inline-block font-mono min-w-[32px] font-bold text-red-600">
                  {'.'.repeat(dotsCount)}
                </span>
              </span>
            </div>
            <div className="text-[11px] font-mono font-medium text-red-700 bg-red-100/80 px-2 py-0.5 rounded-md">
              Anda telah menunggu ({waitingTime} detik)
            </div>
          </div>
        )}

        {gameState === 'lobby_countdown' && (
          <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl text-xs text-red-950 font-medium">
            Pemain ditemukan! Memulai otomatis: <span className="font-extrabold font-mono text-red-600">{lobbyTimer}s</span>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="text-center py-0.5 shrink-0">
            <span className="text-3xl font-black text-red-600 animate-pulse tracking-wider">
              {raceCountdown > 0 ? raceCountdown : 'GO!'}
            </span>
          </div>
        )}

        {/* Lintasan Balap dengan Mobil */}
        <div className="bg-white p-1 rounded-xl border border-slate-100 shrink-0">
          <div className="space-y-0"> {/* No space between lanes, separator handles it */}
            {players.map((p, index) => {
              const isMe = p.id === userId
              const progressVal = p.progress || 0
              // Dimensi Baru: Diperbesar secara signifikan
              const carWidth = 150; 
              const carHeight = 80;

              return (
                <div key={p.id} className={`relative ${index < players.length - 1 ? 'border-b border-dashed border-slate-300' : ''}`}>
                  {/* Overlay Info Player - Dipindah ke ujung kanan dan rata kanan */}
                  <div className="absolute top-2 right-2 z-20 flex flex-col gap-0.5 bg-white/70 px-1.5 py-0.5 rounded text-[10px] font-semibold backdrop-blur-sm text-right items-end">
                    <span className={isMe ? 'text-red-600 font-extrabold' : 'text-slate-700'}>
                      {p.username} {isMe && '(Anda)'}
                    </span>
                    <span className="text-slate-500 font-mono text-[9px] font-bold">
                      {p.wpm || 0} WPM • {progressVal}%
                    </span>
                  </div>
                  
                  {/* Track / Jalur Mobil - Tinggi disesuaikan h-20 (80px) agar pas dengan mobil */}
                  <div className="relative w-full bg-slate-100 h-20 overflow-hidden flex items-center">
                    
                    {/* Kontainer Gambar Mobil - Diperbesar */}
                    <div 
                      className="absolute transition-all duration-300 ease-linear z-10"
                      style={{ 
                        // Kalkulasi left: 0% di ujung kiri, 100% di ujung kanan dikurangi lebar mobil
                        left: `calc(${progressVal}% - ${(progressVal / 100) * carWidth}px)` 
                      }}
                    >
                      <Image 
                        src="/car/car.png" 
                        alt="Car" 
                        width={carWidth} 
                        height={carHeight} 
                        className={`object-contain ${!isMe ? 'opacity-50 grayscale-[50%]' : 'drop-shadow-xl'}`}
                        priority
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Typing Area & Leave Button Container */}
        {gameState !== 'finished' ? (
          <div className="space-y-4 flex-1 flex flex-col justify-center min-h-0 relative items-center">
            {/* Box Teks */}
            <div ref={containerRef} onClick={() => inputRef.current?.focus()} className="w-full px-[50%] py-5 bg-slate-50 border border-slate-200 rounded-xl select-none overflow-x-hidden whitespace-nowrap cursor-text flex items-center leading-loose scroll-smooth">
              {renderPassage()}
            </div>
            
            <input ref={inputRef} type="text" value={inputText} onChange={handleInputChange} disabled={gameState !== 'racing'} className="opacity-0 pointer-events-none absolute -z-10" autoFocus />

            {/* Tombol Tinggalkan Arena Balap */}
            {(gameState === 'waiting' || gameState === 'lobby_countdown') && (
              <div className="flex justify-center w-full pt-1">
                <button
                  onClick={() => router.push('/')}
                  className="w-full max-w-md py-3.5 px-6 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-base font-extrabold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Tinggalkan Arena Balap</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center space-y-3 bg-red-50 rounded-xl border border-red-200">
            <h2 className="text-2xl font-black text-red-600">Balapan Selesai! 🎉</h2>
            <p className="text-sm text-slate-700 font-semibold">Kecepatan Kamu: <span className="font-bold text-red-600 font-mono text-lg">{myWpm} WPM</span></p>
            <button onClick={() => router.push('/')} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition shadow-md">
              Kembali ke Lobby
            </button>
          </div>
        )}

      </div>
    </main>
  )
}

export default function MultiplayerRacePage() {
  return (
    <Suspense fallback={<div>Loading Arena...</div>}>
      <MultiplayerRaceContent />
    </Suspense>
  )
}