import { useEffect, useRef } from 'react'
import './SpecularButton.css'

const PAD = 24
const TAU = Math.PI * 2

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec2 uEntry;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r;
  float arc = 1.5707963 * r;
  float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p);
  vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0
    ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}

float lobe(float position, float center) {
  float gap = abs(fract(position - center + 0.5) - 0.5);
  return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
  outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
}`

const UNIFORMS = [
  'uCenter',
  'uHalf',
  'uRadius',
  'uPx',
  'uSpot',
  'uEntry',
  'uLineColor',
  'uBaseColor',
  'uIntensity',
  'uWindow',
  'uThickness',
  'uGlow',
]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const wrap = (value) => value - Math.floor(value)

const loopPosition = (x, y, halfX, halfY, radius) => {
  const innerX = halfX - radius
  const innerY = halfY - radius
  const arc = (Math.PI / 2) * radius
  const quarter = innerX + innerY + arc
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  const qx = ax - innerX
  const qy = ay - innerY
  let position

  if (qx > 0 && qy > 0) position = innerY + Math.atan2(qy, qx) * radius
  else if (qx > qy) position = Math.min(ay, innerY)
  else position = innerY + arc + innerX - Math.min(ax, innerX)

  if (x < 0) position = y >= 0 ? 2 * quarter - position : 2 * quarter + position
  else if (y < 0) position = 4 * quarter - position

  return wrap(position / Math.max(4 * quarter, 0.0001))
}

const rimPoint = (position, halfX, halfY, radius) => {
  const innerX = halfX - radius
  const innerY = halfY - radius
  const arc = (Math.PI / 2) * radius
  const quarter = innerX + innerY + arc
  let offset = wrap(position) * 4 * quarter
  let signX = 1
  let signY = 1

  if (offset > 3 * quarter) {
    offset = 4 * quarter - offset
    signY = -1
  } else if (offset > 2 * quarter) {
    offset -= 2 * quarter
    signX = -1
    signY = -1
  } else if (offset > quarter) {
    offset = 2 * quarter - offset
    signX = -1
  }

  let x = innerX - (offset - innerY - arc)
  let y = halfY
  if (offset <= innerY) {
    x = halfX
    y = offset
  } else if (offset <= innerY + arc) {
    const angle = (offset - innerY) / Math.max(radius, 0.0001)
    x = innerX + Math.cos(angle) * radius
    y = innerY + Math.sin(angle) * radius
  }

  return [x * signX, y * signY]
}

const compile = (gl, type, source) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  console.error('SpecularButton shader compilation failed:', gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
  return null
}

const link = (gl) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  const program = gl.createProgram()
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'aPosition')
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  console.error('SpecularButton program linking failed:', gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
  return null
}

export default function SpecularButton({
  as: Component = 'button',
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0.04,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  idleIntensity = 0.35,
  shineSize = 10,
  shineFade = 34,
  thickness = 1.2,
  glow = 1,
  speed = 0.35,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  style,
  ...rest
}) {
  const buttonRef = useRef(null)
  const canvasRef = useRef(null)
  const wakeRef = useRef(null)
  const settings = {
    radius: Math.max(0, radius),
    lineColor: String(lineColor),
    baseColor: String(baseColor),
    intensity: Math.max(0, intensity),
    idleIntensity: clamp(idleIntensity, 0, 1),
    shineSize: Math.max(0, shineSize),
    shineFade: Math.max(0, shineFade),
    thickness: Math.max(0, thickness),
    glow: Math.max(0, glow),
    speed,
    followMouse,
    proximity: Math.max(1, proximity),
    autoAnimate,
    disabled,
  }
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  })

  useEffect(() => {
    const button = buttonRef.current
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    })
    if (!button || !canvas || !gl) return undefined

    const program = link(gl)
    if (!program) return undefined

    const uniforms = {}
    for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name)
    const buffer = gl.createBuffer()
    const vao = gl.createVertexArray()
    if (!buffer || !vao) {
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
      return undefined
    }

    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const colors = new Map()
    const view = { width: 1, height: 1, ratio: 1 }
    const pointer = { x: 0, y: 0, known: false }
    const state = { spot: 0, level: 0, press: 0, ready: false }
    let frameId = 0
    let last = 0
    let visible = true

    const toRgb = (value) => {
      if (colors.has(value)) return colors.get(value)
      let rgb = [1, 1, 1]
      if (probe) {
        probe.clearRect(0, 0, 1, 1)
        probe.fillStyle = '#000000'
        probe.fillStyle = value
        probe.fillRect(0, 0, 1, 1)
        const [red, green, blue] = probe.getImageData(0, 0, 1, 1).data
        rgb = [red / 255, green / 255, blue / 255]
      }
      colors.set(value, rgb)
      return rgb
    }

    const cornerRadius = (currentSettings) =>
      Math.min(currentSettings.radius, view.width / 2, view.height / 2)

    const restSpot = (currentSettings) => {
      const currentRadius = cornerRadius(currentSettings)
      const inset = currentRadius * (1 - Math.SQRT1_2)
      return loopPosition(
        inset - view.width / 2,
        view.height / 2 - inset,
        view.width / 2,
        view.height / 2,
        currentRadius,
      )
    }

    const aim = (currentSettings) => {
      if (!currentSettings.followMouse || currentSettings.disabled || !pointer.known) return null
      const rect = button.getBoundingClientRect()
      const scale = rect.width / view.width || 1
      const halfX = view.width / 2
      const halfY = view.height / 2
      const x = (pointer.x - rect.left - rect.width / 2) / scale
      const y = (rect.top + rect.height / 2 - pointer.y) / scale
      const distance = Math.hypot(
        Math.max(Math.abs(x) - halfX, 0),
        Math.max(Math.abs(y) - halfY, 0),
      )
      const proximityAmount = clamp(1 - distance / currentSettings.proximity, 0, 1)
      const near = proximityAmount * proximityAmount * (3 - 2 * proximityAmount)
      const nearest = loopPosition(x, y, halfX, halfY, cornerRadius(currentSettings))
      if (distance > 0) return { spot: nearest, near }
      const depth = clamp(
        Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8),
        0,
        1,
      )
      const sway = restSpot(currentSettings) - (x / halfX) * 0.06 - (y / halfY) * 0.02
      const offset = sway - nearest - Math.round(sway - nearest)
      return {
        spot: wrap(nearest + offset * depth * depth * (3 - 2 * depth)),
        near,
      }
    }

    const draw = (currentSettings) => {
      const { width, height } = view
      const scaleX = canvas.width / (width + PAD * 2)
      const scaleY = canvas.height / (height + PAD * 2)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.uniform2f(uniforms.uCenter, (PAD + width / 2) * scaleX, (PAD + height / 2) * scaleY)
      gl.uniform2f(uniforms.uHalf, (width / 2) * scaleX, (height / 2) * scaleY)
      gl.uniform1f(
        uniforms.uRadius,
        Math.min(currentSettings.radius, width / 2, height / 2) * scaleX,
      )
      gl.uniform1f(uniforms.uPx, view.ratio)
      const currentRadius = Math.min(currentSettings.radius, width / 2, height / 2)
      const [rimX, rimY] = rimPoint(state.spot, width / 2, height / 2, currentRadius)
      const rimLength = Math.hypot(rimX, rimY)
      const pull =
        1 - Math.min(0.35 * (height / 2), rimLength) / Math.max(rimLength, 0.0001)
      gl.uniform1f(uniforms.uSpot, state.spot)
      gl.uniform2f(uniforms.uEntry, rimX * pull * scaleX, rimY * pull * scaleY)
      gl.uniform3fv(uniforms.uLineColor, toRgb(currentSettings.lineColor))
      gl.uniform3fv(uniforms.uBaseColor, toRgb(currentSettings.baseColor))
      gl.uniform1f(
        uniforms.uIntensity,
        currentSettings.intensity * (state.level + state.press * 0.8),
      )
      gl.uniform2f(
        uniforms.uWindow,
        currentSettings.shineSize / 360 + state.press * 0.06,
        currentSettings.shineFade / 360 + 0.0001,
      )
      gl.uniform1f(uniforms.uThickness, currentSettings.thickness)
      gl.uniform1f(uniforms.uGlow, currentSettings.glow)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
    }

    const frame = (now) => {
      frameId = 0
      if (!visible) return
      const currentSettings = settingsRef.current
      const elapsed = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      const target = aim(currentSettings)
      const spinning = currentSettings.autoAnimate && !reduceMotion
      const steering = Boolean(target && target.near > 0)
      if (!state.ready) {
        state.spot = restSpot(currentSettings)
        state.level = currentSettings.autoAnimate ? 1 : currentSettings.idleIntensity
        state.ready = true
      }
      let difference = 0
      if (spinning && !steering) {
        state.spot = wrap(state.spot + (currentSettings.speed / TAU) * elapsed)
      } else {
        difference = (steering ? target.spot : restSpot(currentSettings)) - state.spot
        difference -= Math.round(difference)
        state.spot = wrap(state.spot + difference * (1 - Math.exp(-elapsed * 8)))
      }
      const level =
        currentSettings.autoAnimate
          ? 1
          : currentSettings.idleIntensity +
            (1 - currentSettings.idleIntensity) * (target ? target.near : 0)
      state.level += (level - state.level) * (1 - Math.exp(-elapsed * 7))
      state.press *= Math.exp(-elapsed * 5)
      draw(currentSettings)
      const settling =
        Math.abs(difference) > 0.0002 ||
        Math.abs(level - state.level) > 0.001 ||
        state.press > 0.002
      if (settling || (spinning && !steering)) frameId = requestAnimationFrame(frame)
      else last = 0
    }

    const wake = () => {
      if (!frameId && visible) frameId = requestAnimationFrame(frame)
    }

    const measure = (entry) => {
      const box = entry?.borderBoxSize?.[0]
      view.width = Math.max(1, box ? box.inlineSize : button.offsetWidth)
      view.height = Math.max(1, box ? box.blockSize : button.offsetHeight)
      view.ratio = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.max(1, Math.round((view.width + PAD * 2) * view.ratio))
      canvas.height = Math.max(1, Math.round((view.height + PAD * 2) * view.ratio))
      if (state.ready) draw(settingsRef.current)
      wake()
    }

    const onPointerMove = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.known = true
      wake()
    }

    const onPointerDown = (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.known = true
      if (!settingsRef.current.disabled) state.press = 1
      wake()
    }

    const onPointerEnd = (event) => {
      if (event.pointerType === 'mouse') return
      pointer.known = false
      wake()
    }

    const onPointerLeave = () => {
      pointer.known = false
      wake()
    }

    const resizeObserver = new ResizeObserver((entries) =>
      measure(entries[entries.length - 1]),
    )
    resizeObserver.observe(button)
    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible) {
        last = 0
        wake()
      }
    })
    intersectionObserver.observe(button)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerEnd, { passive: true })
    window.addEventListener('pointercancel', onPointerEnd, { passive: true })
    document.documentElement.addEventListener('pointerleave', onPointerLeave)
    button.addEventListener('pointerdown', onPointerDown)
    measure()
    wakeRef.current = wake

    return () => {
      cancelAnimationFrame(frameId)
      wakeRef.current = null
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      button.removeEventListener('pointerdown', onPointerDown)
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }, [])

  useEffect(() => {
    wakeRef.current?.()
  })

  const isButton = Component === 'button'
  return (
    <Component
      ref={buttonRef}
      {...(isButton ? { type, disabled, onClick } : {})}
      className={`specular-button specular-button--${size}${className ? ` ${className}` : ''}`}
      style={{
        '--sb-radius': `${radius}px`,
        '--sb-tint': tint,
        '--sb-tint-opacity': tintOpacity,
        '--sb-blur': `${blur}px`,
        '--sb-text-color': textColor,
        '--sb-base-color': baseColor,
        ...style,
      }}
      {...rest}
    >
      <canvas ref={canvasRef} className="specular-button__light" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </Component>
  )
}
