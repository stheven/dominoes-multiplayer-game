import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, query } from 'firebase/firestore'

// --- Configuração Firebase ---
const firebaseConfig = JSON.parse(__firebase_config)
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'domino-v11-portal'

// --- Componentes de UI ---

const DominoTile = forwardRef(
  ({ sides, isVertical = true, onClick, disabled, highlight, small = false, layoutId }, ref) => {
    const renderPips = (n) => {
      const dotMap = {
        0: [],
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8],
      }
      const dotSize = small ? 'w-0.5 h-0.5' : 'w-1.5 h-1.5'
      return (
        <div className={`grid grid-cols-3 grid-rows-3 gap-0.5 ${small ? 'w-3 h-3' : 'w-8 h-8'}`}>
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`${dotSize} rounded-full ${dotMap[n].includes(i) ? 'bg-slate-900' : 'bg-transparent'}`}
            />
          ))}
        </div>
      )
    }

    const size = isVertical ? (small ? 'w-6 h-12' : 'w-11 h-22') : small ? 'w-12 h-6' : 'w-22 h-11'

    return (
      <motion.button
        layoutId={layoutId} // Identificador crucial para a animação de transição entre mão e mesa
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: disabled ? 0.4 : 1,
          filter: disabled ? 'grayscale(0.4)' : 'grayscale(0)',
        }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{
          layout: { type: 'spring', stiffness: 200, damping: 25 },
          opacity: { duration: 0.2 },
        }}
        whileHover={!disabled ? { scale: 1.05, y: -8 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        className={`shrink-0 bg-slate-50 rounded-md shadow-lg flex items-center justify-center border-2 transition-colors duration-300
      ${size} ${isVertical ? 'flex-col' : 'flex-row'}
      ${highlight ? 'border-blue-500 ring-4 ring-blue-500/30 z-20' : 'border-slate-300'} 
      ${!disabled ? 'hover:bg-white cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <div className='p-0.5'>{renderPips(sides[0])}</div>
        <div className={`${isVertical ? 'w-full h-[1px]' : 'w-[1px] h-full'} bg-slate-200`} />
        <div className='p-0.5'>{renderPips(sides[1])}</div>
      </motion.button>
    )
  },
)

const PlacementPortal = ({ targetRef, onChoose, canLeft, canRight, isTop }) => {
  if (!targetRef.current) return null
  const rect = targetRef.current.getBoundingClientRect()

  const style = {
    position: 'fixed',
    left: rect.left + rect.width / 2,
    top: isTop ? rect.bottom + 15 : rect.top - 25,
    transform: 'translateX(-50%)',
    zIndex: 9999,
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: isTop ? -20 : 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      style={style}
      className='flex gap-3'
    >
      {canLeft && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onChoose('left')
          }}
          className='bg-blue-600 text-white font-black px-5 py-2.5 rounded-xl shadow-2xl hover:bg-blue-500 active:scale-90 transition-all text-xs border-2 border-white/20 uppercase'
        >
          ← Esquerda
        </button>
      )}
      {canRight && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onChoose('right')
          }}
          className='bg-blue-600 text-white font-black px-5 py-2.5 rounded-xl shadow-2xl hover:bg-blue-500 active:scale-90 transition-all text-xs border-2 border-white/20 uppercase'
        >
          Direita →
        </button>
      )}
    </motion.div>,
    document.body,
  )
}

// --- App Principal ---

export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('lobby')
  const [rooms, setRooms] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const [roomName, setRoomName] = useState('')
  const [selectedTileId, setSelectedTileId] = useState(null)
  const tileRefs = useRef({})

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token)
        } else {
          await signInAnonymously(auth)
        }
      } catch (err) {
        console.error('Erro de autenticação:', err)
      }
    }
    initAuth()
    return onAuthStateChanged(auth, setUser)
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'rooms'))
    return onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [user])

  const createRoom = async () => {
    if (!roomName.trim() || !user) return
    const tiles = []
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        tiles.push({ id: `t-${i}-${j}-${Math.random().toString(36).substr(2, 5)}`, sides: [i, j] })
      }
    }
    const deck = tiles.sort(() => Math.random() - 0.5)
    const botId = 'bot_' + Math.random().toString(36).substr(2, 4)
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomName)

    const data = {
      players: [user.uid, botId],
      hands: { [user.uid]: deck.splice(0, 7), [botId]: deck.splice(0, 7) },
      boneyard: deck,
      board: [],
      turn: user.uid,
      winner: null,
      winnerReason: null,
      lastMove: null,
      createdAt: Date.now(),
    }
    await setDoc(roomRef, data)
    joinRoom(roomName)
  }

  const joinRoom = (id) => {
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', id), (snap) => {
      if (snap.exists()) {
        setCurrentRoom({ id, ...snap.data() })
        setView('game')
      }
    })
  }

  const calculatePoints = (hand) => hand.reduce((acc, tile) => acc + tile.sides[0] + tile.sides[1], 0)

  const checkGameOver = (hands, board, boneyard) => {
    for (const pId in hands) if (hands[pId].length === 0) return { winner: pId, reason: 'Bateu o jogo!' }
    if (boneyard.length === 0 && board.length > 0) {
      const leftEnd = board[0].sides[0]
      const rightEnd = board[board.length - 1].sides[1]
      const canAnyonePlay = Object.values(hands).some((hand) =>
        hand.some((tile) => tile.sides.includes(leftEnd) || tile.sides.includes(rightEnd)),
      )
      if (!canAnyonePlay) {
        const pIds = Object.keys(hands)
        const p1Points = calculatePoints(hands[pIds[0]])
        const p2Points = calculatePoints(hands[pIds[1]])
        if (p1Points < p2Points)
          return { winner: pIds[0], reason: `Trancado! Vitória por pontos (${p1Points} vs ${p2Points})` }
        if (p2Points < p1Points)
          return { winner: pIds[1], reason: `Trancado! Vitória por pontos (${p2Points} vs ${p1Points})` }
        return { winner: 'draw', reason: `Empate! Ambos com ${p1Points} pontos.` }
      }
    }
    return null
  }

  const playTile = async (playerId, tile, side) => {
    if (!currentRoom || currentRoom.winner) return
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoom.id)
    let newBoard = [...currentRoom.board]

    if (newBoard.length === 0) {
      newBoard.push(tile)
    } else {
      const leftEnd = newBoard[0].sides[0]
      const rightEnd = newBoard[newBoard.length - 1].sides[1]
      if (side === 'left') {
        const sides = tile.sides[1] === leftEnd ? [tile.sides[0], tile.sides[1]] : [tile.sides[1], tile.sides[0]]
        newBoard.unshift({ ...tile, sides })
      } else {
        const sides = tile.sides[0] === rightEnd ? [tile.sides[0], tile.sides[1]] : [tile.sides[1], tile.sides[0]]
        newBoard.push({ ...tile, sides })
      }
    }

    const newHands = { ...currentRoom.hands, [playerId]: currentRoom.hands[playerId].filter((t) => t.id !== tile.id) }
    const gameOver = checkGameOver(newHands, newBoard, currentRoom.boneyard)

    setSelectedTileId(null)
    await updateDoc(ref, {
      board: newBoard,
      [`hands.${playerId}`]: newHands[playerId],
      turn: currentRoom.players.find((p) => p !== playerId),
      winner: gameOver?.winner || null,
      winnerReason: gameOver?.reason || null,
      lastMove: { playerId, tileId: tile.id, timestamp: Date.now() },
    })
  }

  const drawTile = async (playerId) => {
    if (!currentRoom || currentRoom.boneyard.length === 0 || currentRoom.winner) return
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoom.id)
    const deck = [...currentRoom.boneyard]
    const tile = deck.pop()
    await updateDoc(ref, { boneyard: deck, [`hands.${playerId}`]: [...(currentRoom.hands[playerId] || []), tile] })
  }

  const passTurn = async (playerId) => {
    if (!currentRoom || currentRoom.winner) return
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoom.id)
    const gameOver = checkGameOver(currentRoom.hands, currentRoom.board, [])
    await updateDoc(ref, {
      turn: currentRoom.players.find((p) => p !== playerId),
      winner: gameOver?.winner || null,
      winnerReason: gameOver?.reason || null,
    })
  }

  if (!user)
    return (
      <div className='h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 font-sans'>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className='w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full'
        />
        <div className='text-blue-500 font-black tracking-widest text-xs uppercase'>A ligar ao Dominó...</div>
      </div>
    )

  if (view === 'lobby') {
    return (
      <div className='h-screen flex items-center justify-center bg-slate-950 p-6 font-sans'>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='w-full max-w-sm space-y-6'
        >
          <h1 className='text-5xl font-black text-center text-white italic tracking-tighter'>
            DOMINÓ<span className='text-blue-500'>.</span>
          </h1>
          <div className='bg-slate-900 p-8 rounded-3xl border border-white/10 space-y-4 shadow-2xl relative overflow-hidden'>
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent' />
            <input
              className='w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all focus:ring-4 focus:ring-blue-500/10'
              placeholder='Nome da sala...'
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createRoom}
              className='w-full bg-blue-600 py-4 rounded-xl font-black text-white uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20'
            >
              CRIAR SALA
            </motion.button>
            <div className='space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1 pt-4'>
              {rooms.length === 0 && (
                <p className='text-slate-600 text-[10px] text-center py-4 uppercase font-bold tracking-widest'>
                  A aguardar salas...
                </p>
              )}
              {rooms.map((r) => (
                <motion.div
                  layout
                  key={r.id}
                  className='flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors'
                >
                  <span className='font-bold text-white text-sm'>{r.id}</span>
                  <button
                    onClick={() => joinRoom(r.id)}
                    className='bg-blue-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all'
                  >
                    ENTRAR
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  const p1 = user.uid
  const p2 = currentRoom.players.find((p) => p !== p1)
  const leftEnd = currentRoom.board[0]?.sides[0]
  const rightEnd = currentRoom.board[currentRoom.board.length - 1]?.sides[1]

  const renderHand = (playerId, isTop = false) => {
    const hand = currentRoom.hands[playerId] || []
    const isMyTurn = currentRoom.turn === playerId && !currentRoom.winner

    return (
      <div
        className={`relative w-full py-8 transition-colors duration-700 ${isMyTurn ? 'bg-blue-500/5' : 'bg-transparent'}`}
      >
        <div className='flex justify-between items-center px-10 mb-6 max-w-6xl mx-auto'>
          <div className='flex items-center gap-3'>
            <div className='relative flex items-center justify-center w-4 h-4'>
              {isMyTurn && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }} // Tornamos linear e mais suave
                  className='absolute w-full h-full rounded-full bg-blue-500'
                />
              )}
              <div
                className={`w-2.5 h-2.5 rounded-full relative z-10 ${isMyTurn ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`}
              />
            </div>
            <span
              className={`text-xs font-black uppercase tracking-[0.2em] ${isMyTurn ? 'text-blue-400' : 'text-slate-600'}`}
            >
              {isTop ? 'OPONENTE' : 'TUA MÃO'} {isMyTurn && '• A JOGAR'}
            </span>
          </div>
          <AnimatePresence>
            {isMyTurn && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className='flex gap-2'
              >
                {currentRoom.boneyard.length > 0 ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => drawTile(playerId)}
                    className='bg-blue-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase shadow-xl shadow-blue-900/20'
                  >
                    Comprar ({currentRoom.boneyard.length})
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => passTurn(playerId)}
                    className='bg-red-600/20 text-red-500 border border-red-500/30 text-[10px] font-black px-5 py-2 rounded-full uppercase hover:bg-red-600 hover:text-white transition-all'
                  >
                    Passar Vez
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className='flex gap-4 px-10 overflow-x-auto no-scrollbar justify-center min-h-[120px] items-center'>
          <AnimatePresence mode='popLayout'>
            {hand.map((tile) => {
              const canLeft = currentRoom.board.length === 0 || tile.sides.includes(leftEnd)
              const canRight = currentRoom.board.length === 0 || tile.sides.includes(rightEnd)
              const isClickable = isMyTurn && (canLeft || canRight)
              const isSelected = selectedTileId === tile.id

              return (
                <div key={tile.id} className='relative shrink-0'>
                  <DominoTile
                    layoutId={tile.id} // ID consistente para o Framer Motion mover o elemento
                    ref={(el) => {
                      if (el) tileRefs.current[tile.id] = el
                    }}
                    sides={tile.sides}
                    small={isTop}
                    highlight={isSelected}
                    disabled={!isClickable}
                    onClick={() => {
                      if (!isMyTurn || !isClickable) return
                      if (currentRoom.board.length === 0) playTile(playerId, tile, 'center')
                      else if (canLeft && canRight) setSelectedTileId(isSelected ? null : tile.id)
                      else if (canLeft) playTile(playerId, tile, 'left')
                      else if (canRight) playTile(playerId, tile, 'right')
                    }}
                  />
                  {isSelected && (
                    <PlacementPortal
                      targetRef={{ current: tileRefs.current[tile.id] }}
                      isTop={isTop}
                      canLeft={canLeft}
                      canRight={canRight}
                      onChoose={(side) => playTile(playerId, tile, side)}
                    />
                  )}
                </div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div className='h-screen flex flex-col bg-slate-950 overflow-hidden select-none font-sans text-slate-200'>
      <AnimatePresence>
        {currentRoom.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6'
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className='bg-slate-900 border border-white/10 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-8 shadow-[0_0_80px_rgba(59,130,246,0.3)]'
            >
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className='text-8xl'
              >
                {currentRoom.winner === 'draw' ? '🤝' : currentRoom.winner === user.uid ? '🏆' : '💀'}
              </motion.div>
              <div className='space-y-2'>
                <h2 className='text-4xl font-black text-white uppercase tracking-tighter italic'>
                  {currentRoom.winner === 'draw'
                    ? 'Empate!'
                    : currentRoom.winner === user.uid
                      ? 'Ganhaste!'
                      : 'Perdeste'}
                </h2>
                <p className='text-slate-400 font-bold uppercase tracking-widest text-xs'>{currentRoom.winnerReason}</p>
              </div>
              <button
                onClick={() => setView('lobby')}
                className='w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40'
              >
                Novo Jogo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className='border-b border-white/5 bg-slate-900/40 backdrop-blur-md z-10'>{renderHand(p2, true)}</div>

      <main className='flex-1 relative overflow-hidden flex items-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black'>
        {/* Usamos AnimatePresence para o layout global do tabuleiro */}
        <motion.div
          className='flex items-center justify-center min-w-full px-[50vw] cursor-grab active:cursor-grabbing'
          drag='x'
          dragConstraints={{ left: -3000, right: 3000 }}
        >
          <div className='flex items-center gap-2 p-12'>
            <AnimatePresence mode='popLayout'>
              {currentRoom.board.map((tile, i) => (
                <DominoTile
                  key={tile.id} // Key baseada no ID único da peça para o layoutId funcionar
                  layoutId={tile.id}
                  sides={tile.sides}
                  isVertical={tile.sides[0] === tile.sides[1]}
                  disabled={false} // Peças na mesa não aparecem como desabilitadas
                  small={currentRoom.board.length > 8}
                />
              ))}
            </AnimatePresence>
            {currentRoom.board.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='text-white/5 font-black uppercase tracking-[1em] text-5xl italic border-4 border-dashed border-white/5 p-24 rounded-full'
              >
                Mesa
              </motion.div>
            )}
          </div>
        </motion.div>

        <div className='absolute bottom-8 right-10 flex items-center gap-8 pointer-events-none'>
          <div className='flex flex-col items-end'>
            <span className='text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1'>Stock</span>
            <div className='flex items-center gap-2'>
              <div className='w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse' />
              <motion.span
                key={currentRoom.boneyard.length}
                initial={{ scale: 1.8, color: '#3b82f6' }}
                animate={{ scale: 1, color: '#94a3b8' }}
                className='text-3xl font-black'
              >
                {currentRoom.boneyard.length}
              </motion.span>
            </div>
          </div>
          <button
            onClick={() => setView('lobby')}
            className='pointer-events-auto bg-white/5 hover:bg-red-500/20 p-4 rounded-2xl transition-all group border border-white/5'
          >
            <svg
              className='w-6 h-6 text-slate-500 group-hover:text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2.5'
                d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
              />
            </svg>
          </button>
        </div>
      </main>

      <div className='border-t border-white/5 bg-slate-900/40 backdrop-blur-md z-10'>{renderHand(p1, false)}</div>
    </div>
  )
}
