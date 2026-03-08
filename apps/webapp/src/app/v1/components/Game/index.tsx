'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { Scene } from '../Scene'
import { generateDeck } from '../../utils/generateDeck'
import { app, auth, db } from '../../lib/firebase'
import { collection, doc, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore'
import { APP_ID } from '../constants'
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken, User } from 'firebase/auth'
import { Board, RoomData } from '../../types'
import { Lobby } from '../Lobby'

export const Game = () => {
  const [user, setUser] = useState<User | null>(null)
  const [roomName, setRoomName] = useState('')
  const [rooms, setRooms] = useState([])
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null)
  const [view, setView] = useState('lobby')

  useEffect(() => {
    // const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, initializeApp } = window.FB
    // const app = initializeApp(firebaseConfig)
    // const auth = getAuth(app)

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token)
        } else {
          await signInAnonymously(auth)
        }
      } catch (e) {
        console.error('Auth error', e)
      }
    }
    initAuth()
    const unsubscribe = onAuthStateChanged(auth, setUser)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    const roomsCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms')
    const q = query(roomsCol)

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      (error) => {
        console.error('Rooms snapshot error', error)
      },
    )
    return () => unsubscribe()
  }, [user])

  const handleCreate = async () => {
    if (!roomName.trim() || !user) return
    const deck = generateDeck()
    const myHand = deck.splice(0, 7)
    const roomRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', roomName)

    try {
      await setDoc(roomRef, {
        players: [user.uid],
        hands: { [user.uid]: myHand },
        boneyard: deck,
        board: [],
        turn: user.uid,
        status: 'waiting',
        createdAt: Date.now(),
      })
      join(roomName)
    } catch (e) {
      console.error('Create room error', e)
    }
  }

  const join = (id: string) => {
    if (!user) return
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', id)

    const unsubscribe = onSnapshot(
      ref,
      async (snap) => {
        const data = snap.data()
        if (!data) return

        if (data.players.length < 2 && !data.players.includes(user.uid)) {
          const deck = [...data.boneyard]
          const hand = deck.splice(0, 7)
          await updateDoc(ref, {
            players: [...data.players, user.uid],
            [`hands.${user.uid}`]: hand,
            boneyard: deck,
            status: 'playing',
          })
        }
        setCurrentRoom({ id, ...data })
        setView('game')
      },
      (error) => {
        console.error('Join room snapshot error', error)
      },
    )
    return () => unsubscribe()
  }

  const play = async (tile: Board) => {
    if (!user || !currentRoom || currentRoom.turn !== user.uid) return
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', currentRoom.id)

    const newBoard = [
      ...currentRoom.board,
      {
        ...tile,
        position: [currentRoom.board.length * 0.6 - 1.5, 0, (Math.random() - 0.5) * 0.1],
        rotation: [Math.PI / 2, 0, (Math.random() - 0.5) * 0.2],
      },
    ]
    const nextHand = currentRoom.hands[user.uid].filter((t) => t.id !== tile.id)
    const nextPlayer = currentRoom.players.find((p) => p !== user.uid) || user.uid

    try {
      await updateDoc(ref, {
        board: newBoard,
        [`hands.${user.uid}`]: nextHand,
        turn: nextPlayer,
      })
    } catch (e) {
      console.error('Play tile error', e)
    }
  }

  console.log('render')

  if (!currentRoom || !user) {
    return <Lobby rooms={rooms} roomName={roomName} setRoomName={setRoomName} handleCreate={handleCreate} join={join} />
  }

  return (
    <div className='relative w-full h-screen'>
      <Suspense fallback={null}>
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 45 }}>
          <Scene roomData={currentRoom} userId={user.uid} />
        </Canvas>
      </Suspense>
      <div className='absolute top-8 left-8 p-5 bg-black/80 rounded-2xl border border-white/10 pointer-events-none'>
        <div className='text-[10px] text-neutral-500 font-bold uppercase mb-1 tracking-widest'>
          Room: {currentRoom.id}
        </div>
        <div className={`text-xl font-black ${currentRoom.turn === user.uid ? 'text-green-400' : 'text-yellow-500'}`}>
          {currentRoom.turn === user.uid ? 'YOUR TURN' : "OPPONENT'S TURN"}
        </div>
      </div>
      <div className='absolute bottom-10 left-0 w-full px-10'>
        <div className='max-w-4xl mx-auto flex flex-col items-center gap-8'>
          {currentRoom.players.includes(user.uid) && (
            <div className='flex gap-3 overflow-x-auto pb-6 max-w-full no-scrollbar'>
              {currentRoom.hands[user.uid]?.map((t) => (
                <button
                  key={t.id}
                  disabled={currentRoom.turn !== user.uid}
                  onClick={() => play(t)}
                  className={`flex-shrink-0 w-16 h-28 bg-white rounded-xl flex flex-col items-center justify-between p-2 transition-all ${currentRoom.turn === user.uid ? 'hover:-translate-y-6 border-4 border-yellow-500' : 'opacity-40 grayscale'}`}
                >
                  <span className='text-black text-2xl font-black'>{t.sides[0]}</span>
                  <div className='w-full h-0.5 bg-neutral-200' />
                  <span className='text-black text-2xl font-black'>{t.sides[1]}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setView('lobby')}
            className='text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-widest'
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  )
}
