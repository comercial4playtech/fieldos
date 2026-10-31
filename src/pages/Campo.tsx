import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useApp } from '../ctx'
export default function Campo() {
  const { profile } = useApp(), [os, setOs] = useState<any[]>([])
  useEffect(() => {
    const load = async () => { const { data } = await supabase.from('ordens_servico').select('*, clientes(razao_social,endereco)').in('status', ['aberto', 'agendado', 'em_deslocamento', 'em_atendimento']).is('deleted_at', null).order('agendado_para'); setOs(data || []) }
    load()
    let last = 0
    const w = navigator.geolocation?.watchPosition(p => {
      if (profile.papel !== 'tecnico' || Date.now() - last < 30000) return; last = Date.now()
      supabase.from('tecnico_localizacao').upsert({ tecnico_id: profile.id, lat: p.coords.latitude, lng: p.coords.longitude, atualizado_em: new Date().toISOString() })
    }, () => {}, { enableHighAccuracy: true })
    return () => { if (w != null) navigator.geolocation.clearWatch(w) }
  }, [])
  return <>{os.length === 0 && <div className="glass mut">Nenhuma O.S. ativa.</div>}
    {os.map(o => <Link key={o.id} to={`/os/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}><div className="glass"><span className="tag">{o.status}</span> <b>#{o.numero} {o.clientes?.razao_social}</b><div className="mut">{o.clientes?.endereco}</div><div>{o.relato_defeito}</div></div></Link>)}</>
}
