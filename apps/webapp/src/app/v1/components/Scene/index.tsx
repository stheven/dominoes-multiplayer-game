import { ContactShadows, Float, OrbitControls, Text } from '@react-three/drei'
import React, { FC } from 'react'
import { Domino } from '../Domino'
import { RoomData } from '../../types'

type SceneProps = {
  roomData: RoomData
  userId: string
}

export const Scene: FC<SceneProps> = ({ roomData, userId }) => {
  const isMyTurn = roomData.turn === userId
  const isPlayer = roomData.players.includes(userId)

  return (
    <React.Fragment>
      <color attach='background' args={['#050505']} />
      <ambientLight intensity={1.2} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <spotLight position={[-5, 5, 5]} angle={0.2} penumbra={1} intensity={2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color='#111' roughness={0.9} />
      </mesh>

      <group>
        {roomData.board.map((t, idx) => (
          <Domino
            key={t.id || idx}
            sides={t.sides}
            position={t.position || [idx * 0.6 - 2, 0, 0]}
            rotation={t.rotation || [Math.PI / 2, 0, 0]}
          />
        ))}
      </group>

      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.2} />
      <ContactShadows opacity={0.5} scale={10} blur={2} far={10} />

      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <Text position={[0, 3, -5]} fontSize={0.5} color='white'>
          {!isPlayer ? 'SPECTATING' : isMyTurn ? 'YOUR TURN' : 'WAITING...'}
        </Text>
      </Float>
    </React.Fragment>
  )
}
