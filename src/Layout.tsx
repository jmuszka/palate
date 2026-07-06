import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState(30)
  const dragging = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [0, 20],
      zoom: 2,
    })
    return () => map.remove()
  }, [])

  const onMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const pct = (e.clientX / window.innerWidth) * 100
      setPanelWidth(Math.min(Math.max(pct, 15), 60))
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex w-screen h-screen p-4 gap-0 bg-zinc-100">
      <div
        className="h-full rounded-3xl bg-white border border-zinc-200 p-6 flex flex-col gap-4 overflow-y-auto"
        style={{ width: `${panelWidth}%` }}
      >
        {children}
      </div>
      <div
        className="h-full flex items-center justify-center w-4 shrink-0 cursor-col-resize group"
        onMouseDown={onMouseDown}
      >
        <div className="w-1 h-8 rounded-full bg-zinc-300 group-hover:bg-zinc-400 transition-colors" />
      </div>
      <div ref={containerRef} className="h-full rounded-3xl flex-1" />
    </div>
  )
}
