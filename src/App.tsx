import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Float, Text, Html } from '@react-three/drei'
import * as THREE from 'three'

// Game constants
const PLAYER_SPEED = 0.15
const BULLET_SPEED = 0.4
const ALIEN_BULLET_SPEED = 0.15
const ALIEN_MOVE_SPEED = 0.02
const ALIEN_DROP = 0.5
const ALIEN_ROWS = 4
const ALIEN_COLS = 8
const ALIEN_SPACING_X = 1.2
const ALIEN_SPACING_Z = 1.0

// Types
interface Bullet {
  id: number
  position: [number, number, number]
  isAlien?: boolean
}

interface Alien {
  id: number
  position: [number, number, number]
  alive: boolean
  type: number
}

interface Explosion {
  id: number
  position: [number, number, number]
  startTime: number
}

// Player Ship Component
function PlayerShip({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)

  return (
    <group ref={groupRef} position={position}>
      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.6]} />
        <meshStandardMaterial color="#00fff7" emissive="#00fff7" emissiveIntensity={0.5} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.3, 0.15, 0.3]} />
        <meshStandardMaterial color="#ff0080" emissive="#ff0080" emissiveIntensity={0.8} />
      </mesh>
      {/* Wings */}
      <mesh position={[-0.5, -0.05, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.4]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.5, -0.05, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.4]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, -0.1, 0.35]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>
      <pointLight position={[0, 0, 0]} color="#00fff7" intensity={2} distance={3} />
    </group>
  )
}

// Alien Component
function AlienMesh({ type, position }: { type: number; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null!)
  const timeOffset = useRef(Math.random() * Math.PI * 2)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2 + timeOffset.current) * 0.3
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3 + timeOffset.current) * 0.1
    }
  })

  const colors = ['#ff0080', '#8b5cf6', '#00fff7', '#fbbf24']
  const color = colors[type % colors.length]

  return (
    <group ref={meshRef} position={position}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.6, 0.4, 0.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.15, 0.05, -0.21]}>
        <boxGeometry args={[0.1, 0.1, 0.05]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.15, 0.05, -0.21]}>
        <boxGeometry args={[0.1, 0.1, 0.05]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      {/* Tentacles */}
      <mesh position={[-0.2, -0.25, 0]}>
        <boxGeometry args={[0.1, 0.15, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.2, -0.25, 0]}>
        <boxGeometry args={[0.1, 0.15, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[0.1, 0.15, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={2} />
    </group>
  )
}

// Bullet Component
function BulletMesh({ position, isAlien }: { position: [number, number, number]; isAlien?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.2
    }
  })

  const color = isAlien ? '#ff0080' : '#00fff7'

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      <pointLight color={color} intensity={1} distance={2} />
    </mesh>
  )
}

// Explosion Effect
function ExplosionEffect({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      ),
      position: new THREE.Vector3(0, 0, 0),
    }))
  )

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const p = particles.current[i]
        p.position.add(p.velocity)
        child.position.copy(p.position)
        child.scale.multiplyScalar(0.95)
      })
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {particles.current.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#ff0080' : '#fbbf24'}
            emissive={i % 2 === 0 ? '#ff0080' : '#fbbf24'}
            emissiveIntensity={2}
          />
        </mesh>
      ))}
    </group>
  )
}

// Grid Floor
function GridFloor() {
  return (
    <group position={[0, -2, 0]}>
      <gridHelper args={[30, 30, '#8b5cf6', '#1a1a2e']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0a0f" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

// Game Scene
function GameScene({
  playerPosition,
  bullets,
  aliens,
  explosions,
  score,
  lives,
  gameOver,
  wave,
  onRestart,
}: {
  playerPosition: [number, number, number]
  bullets: Bullet[]
  aliens: Alien[]
  explosions: Explosion[]
  score: number
  lives: number
  gameOver: boolean
  wave: number
  onRestart: () => void
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, -5]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, 5, 0]} intensity={1} color="#ff0080" />

      {/* Background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Grid Floor */}
      <GridFloor />

      {/* Player */}
      <PlayerShip position={playerPosition} />

      {/* Bullets */}
      {bullets.map((bullet) => (
        <BulletMesh key={bullet.id} position={bullet.position} isAlien={bullet.isAlien} />
      ))}

      {/* Aliens */}
      {aliens
        .filter((a) => a.alive)
        .map((alien) => (
          <AlienMesh key={alien.id} type={alien.type} position={alien.position} />
        ))}

      {/* Explosions */}
      {explosions.map((exp) => (
        <ExplosionEffect key={exp.id} position={exp.position} />
      ))}

      {/* 3D Score Display */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[0, 6, -5]}
          fontSize={0.8}
          color="#00fff7"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
        >
          SCORE: {score.toString().padStart(6, '0')}
        </Text>
      </Float>

      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[-6, 6, -5]}
          fontSize={0.5}
          color="#ff0080"
          anchorX="left"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
        >
          WAVE {wave}
        </Text>
      </Float>

      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[6, 6, -5]}
          fontSize={0.5}
          color="#fbbf24"
          anchorX="right"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
        >
          {'♥'.repeat(lives)}
        </Text>
      </Float>

      {/* Game Over */}
      {gameOver && (
        <Html center position={[0, 2, 0]}>
          <div className="text-center select-none">
            <div
              className="text-4xl md:text-6xl font-bold mb-4 animate-pulse"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                color: '#ff0080',
                textShadow: '0 0 20px #ff0080, 0 0 40px #ff0080',
              }}
            >
              GAME OVER
            </div>
            <div
              className="text-xl md:text-2xl mb-6"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                color: '#00fff7',
              }}
            >
              FINAL SCORE: {score}
            </div>
            <button
              onClick={onRestart}
              className="px-6 py-3 text-sm md:text-base cursor-pointer transition-all duration-200 hover:scale-110"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                background: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)',
                border: '3px solid #00fff7',
                color: '#00fff7',
                boxShadow: '0 0 20px #8b5cf6, inset 0 0 20px rgba(0,255,247,0.2)',
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        </Html>
      )}
    </>
  )
}

// Game Controller
function GameController({
  onPlayerMove,
  onShoot,
  gameStarted,
  gameOver,
}: {
  onPlayerMove: (direction: number) => void
  onShoot: () => void
  gameStarted: boolean
  gameOver: boolean
}) {
  const keysPressed = useRef<Set<string>>(new Set())
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 8, 12)
    camera.lookAt(0, 0, 0)
  }, [camera])

  useEffect(() => {
    if (!gameStarted || gameOver) return

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase())
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        onShoot()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameStarted, gameOver, onShoot])

  useFrame(() => {
    if (!gameStarted || gameOver) return

    let direction = 0
    if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
      direction = -1
    }
    if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
      direction = 1
    }
    if (direction !== 0) {
      onPlayerMove(direction)
    }
  })

  return null
}

// Main App
export default function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [wave, setWave] = useState(1)
  const [playerX, setPlayerX] = useState(0)
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [aliens, setAliens] = useState<Alien[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const alienDirection = useRef(1)
  const lastShootTime = useRef(0)
  const bulletIdRef = useRef(0)
  const explosionIdRef = useRef(0)
  const lastAlienShootTime = useRef(0)

  // Initialize aliens
  const initAliens = useCallback((waveNum: number) => {
    const newAliens: Alien[] = []
    let id = 0
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        newAliens.push({
          id: id++,
          position: [
            col * ALIEN_SPACING_X - (ALIEN_COLS * ALIEN_SPACING_X) / 2 + ALIEN_SPACING_X / 2,
            1,
            -8 + row * ALIEN_SPACING_Z,
          ],
          alive: true,
          type: row,
        })
      }
    }
    setAliens(newAliens)
    alienDirection.current = 1
  }, [])

  // Start game
  const startGame = useCallback(() => {
    setGameStarted(true)
    setGameOver(false)
    setScore(0)
    setLives(3)
    setWave(1)
    setPlayerX(0)
    setBullets([])
    setExplosions([])
    initAliens(1)
  }, [initAliens])

  // Player movement
  const handlePlayerMove = useCallback((direction: number) => {
    setPlayerX((prev) => {
      const newX = prev + direction * PLAYER_SPEED
      return Math.max(-6, Math.min(6, newX))
    })
  }, [])

  // Shooting
  const handleShoot = useCallback(() => {
    const now = Date.now()
    if (now - lastShootTime.current < 250) return
    lastShootTime.current = now

    setBullets((prev) => [
      ...prev,
      {
        id: bulletIdRef.current++,
        position: [playerX, 0.5, 5],
      },
    ])
  }, [playerX])

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const gameLoop = setInterval(() => {
      // Update bullets
      setBullets((prev) => {
        const updated = prev
          .map((b) => ({
            ...b,
            position: [
              b.position[0],
              b.position[1],
              b.position[2] + (b.isAlien ? ALIEN_BULLET_SPEED : -BULLET_SPEED),
            ] as [number, number, number],
          }))
          .filter((b) => (b.isAlien ? b.position[2] < 8 : b.position[2] > -12))
        return updated
      })

      // Move aliens
      setAliens((prev) => {
        const aliveAliens = prev.filter((a) => a.alive)
        if (aliveAliens.length === 0) return prev

        const leftMost = Math.min(...aliveAliens.map((a) => a.position[0]))
        const rightMost = Math.max(...aliveAliens.map((a) => a.position[0]))

        let shouldDrop = false
        let newDirection = alienDirection.current

        if (rightMost > 6 && alienDirection.current > 0) {
          shouldDrop = true
          newDirection = -1
        } else if (leftMost < -6 && alienDirection.current < 0) {
          shouldDrop = true
          newDirection = 1
        }

        alienDirection.current = newDirection

        return prev.map((a) => ({
          ...a,
          position: [
            a.position[0] + ALIEN_MOVE_SPEED * newDirection,
            a.position[1],
            a.position[2] + (shouldDrop ? ALIEN_DROP : 0),
          ] as [number, number, number],
        }))
      })

      // Alien shooting
      const now = Date.now()
      if (now - lastAlienShootTime.current > 1000) {
        lastAlienShootTime.current = now
        setAliens((prev) => {
          const aliveAliens = prev.filter((a) => a.alive)
          if (aliveAliens.length > 0) {
            const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)]
            setBullets((bullets) => [
              ...bullets,
              {
                id: bulletIdRef.current++,
                position: [...shooter.position] as [number, number, number],
                isAlien: true,
              },
            ])
          }
          return prev
        })
      }

      // Collision detection
      setBullets((prevBullets) => {
        let newBullets = [...prevBullets]

        setAliens((prevAliens) => {
          const newAliens = [...prevAliens]
          const bulletsToRemove = new Set<number>()

          newBullets.forEach((bullet) => {
            if (bullet.isAlien) {
              // Check player hit
              const dx = Math.abs(bullet.position[0] - playerX)
              const dz = Math.abs(bullet.position[2] - 5)
              if (dx < 0.5 && dz < 0.5) {
                bulletsToRemove.add(bullet.id)
                setLives((l) => {
                  const newLives = l - 1
                  if (newLives <= 0) {
                    setGameOver(true)
                  }
                  return newLives
                })
                setExplosions((prev) => [
                  ...prev,
                  {
                    id: explosionIdRef.current++,
                    position: [playerX, 0.5, 5],
                    startTime: Date.now(),
                  },
                ])
              }
            } else {
              // Check alien hit
              newAliens.forEach((alien) => {
                if (alien.alive) {
                  const dx = Math.abs(bullet.position[0] - alien.position[0])
                  const dz = Math.abs(bullet.position[2] - alien.position[2])
                  if (dx < 0.5 && dz < 0.5) {
                    alien.alive = false
                    bulletsToRemove.add(bullet.id)
                    setScore((s) => s + (4 - alien.type) * 100)
                    setExplosions((prev) => [
                      ...prev,
                      {
                        id: explosionIdRef.current++,
                        position: [...alien.position] as [number, number, number],
                        startTime: Date.now(),
                      },
                    ])
                  }
                }
              })
            }
          })

          // Check if all aliens dead
          if (newAliens.every((a) => !a.alive)) {
            setWave((w) => {
              const newWave = w + 1
              setTimeout(() => initAliens(newWave), 1000)
              return newWave
            })
          }

          // Check if aliens reached player
          const closestAlien = Math.max(...newAliens.filter((a) => a.alive).map((a) => a.position[2]))
          if (closestAlien > 4) {
            setGameOver(true)
          }

          newBullets = newBullets.filter((b) => !bulletsToRemove.has(b.id))
          return newAliens
        })

        return newBullets
      })

      // Clean up old explosions
      setExplosions((prev) => prev.filter((e) => Date.now() - e.startTime < 500))
    }, 1000 / 60)

    return () => clearInterval(gameLoop)
  }, [gameStarted, gameOver, playerX, initAliens])

  // Mobile controls
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const screenCenter = window.innerWidth / 2
    const direction = touch.clientX < screenCenter ? -1 : 1
    handlePlayerMove(direction)
  }, [handlePlayerMove])

  return (
    <div className="w-screen h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
          opacity: 0.3,
        }}
      />

      {/* CRT vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Canvas */}
      <Canvas
        className="touch-none"
        onTouchStart={handleShoot}
        onTouchMove={handleTouchMove}
      >
        <Suspense fallback={null}>
          <GameController
            onPlayerMove={handlePlayerMove}
            onShoot={handleShoot}
            gameStarted={gameStarted}
            gameOver={gameOver}
          />
          <GameScene
            playerPosition={[playerX, 0, 5]}
            bullets={bullets}
            aliens={aliens}
            explosions={explosions}
            score={score}
            lives={lives}
            gameOver={gameOver}
            wave={wave}
            onRestart={startGame}
          />
        </Suspense>
      </Canvas>

      {/* Start Screen */}
      {!gameStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#0a0a0f]/90 backdrop-blur-sm">
          <div className="text-center px-4">
            <h1
              className="text-3xl md:text-5xl lg:text-7xl font-bold mb-2 animate-pulse"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                color: '#00fff7',
                textShadow: '0 0 10px #00fff7, 0 0 20px #00fff7, 0 0 40px #00fff7',
              }}
            >
              SPACE
            </h1>
            <h1
              className="text-3xl md:text-5xl lg:text-7xl font-bold mb-8"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                color: '#ff0080',
                textShadow: '0 0 10px #ff0080, 0 0 20px #ff0080, 0 0 40px #ff0080',
              }}
            >
              INVADERS
            </h1>
            <p
              className="text-xs md:text-sm mb-8 text-[#8b5cf6]"
              style={{ fontFamily: '"Press Start 2P", monospace' }}
            >
              3D EDITION
            </p>
            <button
              onClick={startGame}
              className="px-8 py-4 text-sm md:text-lg cursor-pointer transition-all duration-200 hover:scale-110 animate-bounce"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                background: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)',
                border: '4px solid #00fff7',
                color: '#00fff7',
                boxShadow: '0 0 30px #8b5cf6, inset 0 0 20px rgba(0,255,247,0.2)',
              }}
            >
              START GAME
            </button>
            <div className="mt-12 space-y-2">
              <p
                className="text-xs text-[#00fff7]/70"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                ← → or A/D TO MOVE
              </p>
              <p
                className="text-xs text-[#ff0080]/70"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                SPACE TO SHOOT
              </p>
              <p
                className="text-xs text-[#8b5cf6]/70 mt-4"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                MOBILE: TAP TO SHOOT
              </p>
              <p
                className="text-xs text-[#8b5cf6]/70"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                SWIPE LEFT/RIGHT TO MOVE
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      {gameStarted && !gameOver && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20 pointer-events-none">
          <div
            className="text-xs md:text-sm text-[#ff0080]"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              textShadow: '0 0 10px #ff0080',
            }}
          >
            WAVE {wave}
          </div>
          <div
            className="text-sm md:text-lg text-[#00fff7]"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              textShadow: '0 0 10px #00fff7',
            }}
          >
            {score.toString().padStart(6, '0')}
          </div>
          <div
            className="text-sm md:text-lg"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              color: '#fbbf24',
              textShadow: '0 0 10px #fbbf24',
            }}
          >
            {'♥'.repeat(lives)}
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {gameStarted && !gameOver && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-8 md:hidden z-20">
          <button
            onTouchStart={() => handlePlayerMove(-1)}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: 'rgba(139, 92, 246, 0.3)',
              border: '2px solid #8b5cf6',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
            }}
          >
            <span className="text-2xl text-[#00fff7]">←</span>
          </button>
          <button
            onTouchStart={handleShoot}
            className="w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: 'rgba(255, 0, 128, 0.3)',
              border: '3px solid #ff0080',
              boxShadow: '0 0 30px rgba(255, 0, 128, 0.5)',
            }}
          >
            <span className="text-xs text-[#ff0080]" style={{ fontFamily: '"Press Start 2P", monospace' }}>
              FIRE
            </span>
          </button>
          <button
            onTouchStart={() => handlePlayerMove(1)}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: 'rgba(139, 92, 246, 0.3)',
              border: '2px solid #8b5cf6',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
            }}
          >
            <span className="text-2xl text-[#00fff7]">→</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer
        className="absolute bottom-2 left-0 right-0 text-center z-20 pointer-events-none"
        style={{
          fontFamily: '"Press Start 2P", monospace',
        }}
      >
        <p className="text-[8px] md:text-[10px] text-[#8b5cf6]/40">
          Requested by @web-user · Built by @clonkbot
        </p>
      </footer>
    </div>
  )
}
