import { RoundedBox } from '@react-three/drei'
import { FC } from 'react'
import { TILE_D, TILE_H, TILE_W } from '../constants'

type DominoProps = {
  sides: [number, number]
  position: [number, number, number]
  rotation: [number, number, number]
  color?: string
}

export const Domino: FC<DominoProps> = ({ sides, position, rotation, color = '#ffffff' }) => {
  const pips = (val: number, offset: number) => {
    const map: Record<number, [number, number][]> = {
      0: [],
      1: [[0, 0]],
      2: [
        [-0.15, 0.15],
        [0.15, -0.15],
      ],
      3: [
        [-0.15, 0.15],
        [0, 0],
        [0.15, -0.15],
      ],
      4: [
        [-0.15, 0.15],
        [0.15, 0.15],
        [-0.15, -0.15],
        [0.15, -0.15],
      ],
      5: [
        [-0.15, 0.15],
        [0.15, 0.15],
        [0, 0],
        [-0.15, -0.15],
        [0.15, -0.15],
      ],
      6: [
        [-0.15, 0.15],
        [0.15, 0.15],
        [-0.15, 0],
        [0.15, 0],
        [-0.15, -0.15],
        [0.15, -0.15],
      ],
    }
    return map[val].map((p, i) => (
      <mesh key={i} position={[p[0], offset + p[1], TILE_D / 2 + 0.005]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color='#111' />
      </mesh>
    ))
  }

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[TILE_W, TILE_H, TILE_D]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0, TILE_D / 2 + 0.001]}>
        <planeGeometry args={[TILE_W * 0.8, 0.015]} />
        <meshBasicMaterial color='#444' />
      </mesh>
      {pips(sides[0], 0.25)}
      {pips(sides[1], -0.25)}
    </group>
  )
}
