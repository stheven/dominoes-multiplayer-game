export type Board = {
  sides: [number, number]
  position: [number, number, number]
  rotation: [number, number, number]
  color?: string
  id?: string
}

export type RoomData = {
  id: string
  turn: string
  players: string[]
  board: Board[]
  hands: Record<string, Board[]>
}

export type Tile = {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  sides: [number, number]
}
