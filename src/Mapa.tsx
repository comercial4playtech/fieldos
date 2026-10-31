import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
export default function Mapa({ tecnicos, clientes }: any) {
  const el = useRef<HTMLDivElement>(null), g = useRef<any>(null)
  useEffect(() => {
    const m = L.map(el.current!).setView([-23.55, -46.63], 10)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m)
    g.current = L.layerGroup().addTo(m); return () => { m.remove() }
  }, [])
  useEffect(() => {
    g.current.clearLayers()
    clientes.filter((c: any) => c.lat && c.lng).forEach((c: any) => L.circleMarker([c.lat, c.lng], { radius: 7, color: '#10b981', fillOpacity: .9 }).bindPopup(c.razao_social).addTo(g.current))
    tecnicos.forEach((t: any) => L.circleMarker([t.lat, t.lng], { radius: 10, color: '#2563eb', fillOpacity: .9 }).bindPopup(`${t.profiles?.nome || 'Técnico'} · ${t.bateria ?? '–'}%`).addTo(g.current))
  }, [tecnicos, clientes])
  return <div ref={el} className="map" />
}
