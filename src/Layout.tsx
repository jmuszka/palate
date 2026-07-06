declare const __APP_VERSION__: string

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function Layout({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [panelWidth, setPanelWidth] = useState(30)
  const dragging = useRef(false)
  const location = useLocation()

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [0, 20],
      zoom: 2,
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (location.pathname === '/') {
      map.flyTo({ center: [0, 20], zoom: 2 })
    } else if (location.pathname.startsWith('/words/')) {
      map.flyTo({ center: [15, 54], zoom: 4 })
    }
  }, [location.pathname])

  const onMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const pct = (e.clientX / window.innerWidth) * 100
      setPanelWidth(Math.min(Math.max(pct, 25), 50))
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
        <p className="mt-auto pt-4 text-xs text-zinc-400 text-center">{__APP_VERSION__}</p>
      </div>
      <div
        className="h-full flex items-center justify-center w-4 shrink-0 cursor-col-resize group"
        onMouseDown={onMouseDown}
      >
        <div className="w-1 h-8 rounded-full bg-zinc-300 group-hover:bg-zinc-400 transition-colors" />
      </div>
      <div ref={containerRef} className="h-full rounded-3xl flex-1 border border-zinc-200" />
    </div>
  )
}
