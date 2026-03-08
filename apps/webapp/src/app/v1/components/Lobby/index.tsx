import { FC } from 'react'

type LoobyProps = {
  rooms: { id: string; players: string[] }[]
  roomName: string
  setRoomName: (roomName: string) => void
  handleCreate: () => void
  join: (roomName: string) => void
}

export const Lobby: FC<LoobyProps> = ({ rooms, roomName, setRoomName, handleCreate, join }) => {
  return (
    <div className='h-screen flex items-center justify-center bg-[#0a0a0a] p-4'>
      <div className='w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl'>
        <h1 className='text-3xl font-black text-center text-white mb-8 tracking-tighter'>
          DOMINO <span className='text-yellow-500'>3D</span>
        </h1>
        <div className='space-y-4 mb-10'>
          <input
            className='w-full bg-neutral-800 border-none p-4 rounded-xl text-white outline-none'
            placeholder='Room Name...'
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button
            onClick={handleCreate}
            className='w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition-colors'
          >
            CREATE ROOM
          </button>
        </div>
        <div className='space-y-3'>
          <h2 className='text-xs font-bold text-neutral-500 uppercase tracking-widest px-1'>Live Lobbies</h2>
          <div className='max-h-60 overflow-y-auto pr-1 no-scrollbar space-y-2'>
            {rooms.map((r) => (
              <div
                key={r.id}
                className='flex items-center justify-between bg-neutral-800/50 p-4 rounded-xl border border-neutral-800'
              >
                <span className='text-white font-medium'>{r.id}</span>
                <button
                  onClick={() => join(r.id)}
                  className='bg-white text-black px-4 py-1.5 rounded-lg text-xs font-black hover:bg-neutral-200'
                >
                  {r.players.length >= 2 ? 'WATCH' : 'JOIN'}
                </button>
              </div>
            ))}
            {rooms.length === 0 && (
              <p className='text-neutral-600 text-center py-4 text-xs italic'>No active lobbies found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
