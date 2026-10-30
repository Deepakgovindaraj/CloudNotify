import { useEffect, useRef } from 'react'
import './Particles.css'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export default function Particles({
  particleColors = ['#ffffff'],
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleBaseSize = 100,
  sizeRandomness = 1,
  glow = 0.5,
  twinkle = 0.3,
  moveParticlesOnHover = true,
  hoverEffect = 'parallax',
  particleHoverFactor = 1,
  hoverRadius = 140,
  clickBurst = true,
  opacity = 1,
  paused = false,
  className = '',
  style,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!container || !canvas || !context) return undefined

    const particles = []
    const pointer = { x: 0, y: 0, active: false }
    const bursts = []
    let animationFrame = 0
    let width = 1
    let height = 1
    let ratio = 1
    let last = 0

    const randomColor = () => particleColors[Math.floor(Math.random() * particleColors.length)] || '#ffffff'
    const createParticle = () => ({
      x: 0.5 + (Math.random() - 0.5) * Math.max(1, particleSpread) / 10,
      y: 0.5 + (Math.random() - 0.5) * Math.max(1, particleSpread) / 10,
      depth: 0.3 + Math.random() * 0.7,
      size: particleBaseSize * (0.45 + Math.random() * 0.55 * sizeRandomness),
      phase: Math.random() * Math.PI * 2,
      color: randomColor(),
      vx: 0,
      vy: 0,
      driftX: (Math.random() - 0.5) * speed * 0.6,
      driftY: (0.25 + Math.random() * 0.75) * speed * 0.5,
    })

    const resize = () => {
      const bounds = container.getBoundingClientRect()
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const locate = event => {
      const bounds = container.getBoundingClientRect()
      pointer.x = event.clientX - bounds.left
      pointer.y = event.clientY - bounds.top
      pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= width && pointer.y <= height
    }

    const onPointerMove = event => {
      if (moveParticlesOnHover) locate(event)
    }

    const onPointerDown = event => {
      if (!clickBurst) return
      locate(event)
      if (pointer.active) bursts.push({ x: pointer.x, y: pointer.y, age: 0 })
    }

    const draw = now => {
      animationFrame = requestAnimationFrame(draw)
      if (paused) return
      const dt = Math.min((now - last) / 1000 || 0.016, 0.05)
      last = now
      context.clearRect(0, 0, width, height)

      for (const particle of particles) {
        const x = particle.x * width
        const y = particle.y * height
        const dx = pointer.x - x
        const dy = pointer.y - y
        const distance = Math.hypot(dx, dy)
        const influence = pointer.active && distance < hoverRadius
          ? (1 - distance / hoverRadius) * particleHoverFactor
          : 0

        if (hoverEffect === 'repel') {
          particle.vx -= (dx / Math.max(distance, 1)) * influence * dt * 2
          particle.vy -= (dy / Math.max(distance, 1)) * influence * dt * 2
        } else if (hoverEffect === 'attract') {
          particle.vx += (dx / Math.max(distance, 1)) * influence * dt * 2
          particle.vy += (dy / Math.max(distance, 1)) * influence * dt * 2
        }

        particle.vx *= 0.96
        particle.vy *= 0.96
        particle.x += (particle.vx + particle.driftX + Math.sin(now * 0.0004 + particle.phase) * speed * 0.02) * dt
        particle.y += (particle.vy + particle.driftY) * dt
        if (particle.x < -0.05) particle.x = 1.05
        if (particle.x > 1.05) particle.x = -0.05
        if (particle.y < -0.05) particle.y = 1.05
        if (particle.y > 1.05) particle.y = -0.05

        const parallaxX = hoverEffect === 'parallax' && pointer.active ? dx * influence * 0.02 : 0
        const parallaxY = hoverEffect === 'parallax' && pointer.active ? dy * influence * 0.02 : 0
        const flicker = 1 - twinkle * 0.35 + twinkle * 0.35 * Math.sin(now * 0.004 + particle.phase)
        const radius = Math.max(0.7, particle.size * particle.depth * 0.025)
        const drawX = particle.x * width + parallaxX
        const drawY = particle.y * height + parallaxY
        const gradient = context.createRadialGradient(drawX, drawY, 0, drawX, drawY, radius * (1 + glow * 2))
        gradient.addColorStop(0, `${particle.color}${Math.round(255 * opacity * flicker).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, `${particle.color}00`)
        context.fillStyle = gradient
        context.beginPath()
        context.arc(drawX, drawY, radius * (1 + glow * 2), 0, Math.PI * 2)
        context.fill()
      }

      for (let index = bursts.length - 1; index >= 0; index -= 1) {
        const burst = bursts[index]
        burst.age += dt
        const radius = burst.age * 260
        context.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 0.6 - burst.age * 0.4)})`
        context.lineWidth = 1.5
        context.beginPath()
        context.arc(burst.x, burst.y, radius, 0, Math.PI * 2)
        context.stroke()
        if (burst.age > 1.5) bursts.splice(index, 1)
      }
    }

    for (let index = 0; index < clamp(particleCount, 1, 2000); index += 1) {
      particles.push(createParticle())
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    resize()
    animationFrame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [
    clickBurst,
    glow,
    hoverEffect,
    hoverRadius,
    moveParticlesOnHover,
    opacity,
    particleBaseSize,
    particleColors,
    particleCount,
    particleHoverFactor,
    particleSpread,
    paused,
    sizeRandomness,
    speed,
    twinkle,
  ])

  return (
    <div ref={containerRef} className={`particles-container${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="particles-canvas" aria-hidden="true" />
    </div>
  )
}
