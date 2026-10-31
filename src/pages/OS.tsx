import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import { supabase } from '../supabase'
import { useApp } from '../ctx'
const PROX: any = { aberto: ['em_deslocamento', 'Iniciar deslocamento'], agendado: ['em_deslocamento', 'Iniciar deslocamento'], em_deslocamento: ['em_atendimento', 'Iniciar atendimento'], em_atendimento: ['concluido', 'Concluir O.S.'] }
function Assinatura({ onSave }: { onSave: (b: Blob) => void }) {
  const ref = useRef<HTMLCanvasElement>(null), desenhando = useRef(false)
  const pos = (e: any) => { const r = ref.current!.getBoundingClientRect(); return [(e.clientX - r.left) * ref.current!.width / r.width, (e.clientY - r.top) * ref.current!.height / r.height] }
  useEffect(() => { const c = ref.current!; c.width = 600; c.height = 240; const x = c.getContext('2d')!; x.lineWidth = 3; x.lineCap = 'round' }, [])
  return <div style={{ display: 'grid', gap: 6 }}><canvas ref={ref}
    onPointerDown={e => { desenhando.current = true; const x = ref.current!.getContext('2d')!; x.beginPath(); const [a, b] = pos(e); x.moveTo(a, b) }}
    onPointerMove={e => { if (!desenhando.current) return; const x = ref.current!.getContext('2d')!; const [a, b] = pos(e); x.lineTo(a, b); x.stroke() }}
    onPointerUp={() => { desenhando.current = false }} />
    <div className="row"><button className="sec" onClick={() => ref.current!.getContext('2d')!.clearRect(0, 0, 600, 240)}>Limpar</button><button onClick={() => ref.current!.toBlob(b => b && onSave(b), 'image/png')}>Salvar assinatura</button></div></div>
}
export default function OS() {
  const { id } = useParams(), { profile, brand } = useApp()
  const [o, setO] = useState<any>(null), [pecas, setPecas] = useState<any[]>([]), [p, setP] = useState({ descricao: '', quantidade: 1 }), [quem, setQuem] = useState('')
  const load = async () => {
    const a = await supabase.from('ordens_servico').select('*, clientes(*), profiles(nome)').eq('id', id).single(); setO(a.data)
    const b = await supabase.from('os_pecas').select('*').eq('os_id', id); setPecas(b.data || [])
  }
  useEffect(() => { load() }, [id])
  if (!o) return null
  const upd = async (v: any) => { await supabase.from('ordens_servico').update(v).eq('id', id); load() }
  const avancar = () => { const [s] = PROX[o.status]; upd({ status: s, tecnico_id: o.tecnico_id || (profile.papel === 'tecnico' ? profile.id : null), ...(s === 'em_atendimento' ? { iniciado_em: new Date().toISOString() } : {}), ...(s === 'concluido' ? { concluido_em: new Date().toISOString() } : {}) }) }
  const addPeca = async () => { if (!p.descricao) return; await supabase.from('os_pecas').insert({ os_id: id, ...p }); setP({ descricao: '', quantidade: 1 }); load() }
  const salvarAss = async (blob: Blob) => {
    const path = `${o.tenant_id}/${id}/${quem}-${Date.now()}.png`
    const up = await supabase.storage.from('assinaturas').upload(path, blob); if (up.error) return alert(up.error.message)
    const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(x => x.toString(16).padStart(2, '0')).join('')
    await supabase.from('os_assinaturas').insert({ os_id: id, quem, imagem_path: path, hash_sha256: h })
    await upd(quem === 'tecnico' ? { assinou_tecnico_em: new Date().toISOString() } : { assinou_cliente_em: new Date().toISOString() }); setQuem('')
  }
  const pdf = () => {
    const d = new jsPDF(); let y = 20
    d.setFontSize(16); d.text(`${brand.nome_empresa} — Laudo Técnico O.S. #${o.numero}`, 14, y); y += 10; d.setFontSize(11)
    const linha = (t: string) => { d.splitTextToSize(t, 180).forEach((l: string) => { d.text(l, 14, y); y += 6 }) }
    linha(`Cliente: ${o.clientes?.razao_social || ''}`); linha(`Técnico: ${o.profiles?.nome || ''}  |  Status: ${o.status}`); y += 4
    linha(`Relato: ${o.relato_defeito || ''}`); linha(`Parecer técnico: ${o.parecer_tecnico || ''}`); y += 4
    linha('Peças aplicadas:'); pecas.forEach(x => linha(`• ${x.quantidade}x ${x.descricao}`))
    y += 6; linha(`Assinatura técnico: ${o.assinou_tecnico_em ? new Date(o.assinou_tecnico_em).toLocaleString('pt-BR') : 'pendente'}`)
    linha(`Assinatura cliente: ${o.assinou_cliente_em ? new Date(o.assinou_cliente_em).toLocaleString('pt-BR') : 'pendente'}`)
    d.save(`Laudo_OS_${o.numero}.pdf`)
  }
  const c = o.clientes || {}
  return <>
    <div className="card"><h2 style={{ margin: 0 }}>O.S. #{o.numero} <span className="tag">{o.status}</span></h2>
      <div>{c.razao_social}</div><div className="mut">{c.endereco} · {c.telefone}</div>
      <div className="row" style={{ marginTop: 8 }}>
        {c.telefone && <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} target="_blank"><button className="sec">WhatsApp</button></a>}
        {c.endereco && <a href={`https://waze.com/ul?q=${encodeURIComponent(c.endereco)}&navigate=yes`} target="_blank"><button className="sec">Ir com Waze</button></a>}
        {PROX[o.status] && <button onClick={avancar}>{PROX[o.status][1]}</button>}<button className="sec" onClick={pdf}>Baixar laudo PDF</button></div></div>
    <div className="card"><b>Relato</b><p>{o.relato_defeito}</p><b>Parecer técnico</b>
      <textarea style={{ width: '100%', minHeight: 100 }} defaultValue={o.parecer_tecnico || ''} onBlur={e => upd({ parecer_tecnico: e.target.value })} /></div>
    <div className="card"><b>Peças</b>{pecas.map(x => <div key={x.id}>{x.quantidade}x {x.descricao}</div>)}
      <div className="row" style={{ marginTop: 8 }}><input placeholder="Peça" value={p.descricao} onChange={e => setP({ ...p, descricao: e.target.value })} /><input type="number" min={1} style={{ width: 80 }} value={p.quantidade} onChange={e => setP({ ...p, quantidade: +e.target.value })} /><button onClick={addPeca}>Adicionar</button></div></div>
    <div className="card"><b>Assinaturas</b><div className="row" style={{ margin: '8px 0' }}>
      <button className="sec" onClick={() => setQuem('tecnico')}>{o.assinou_tecnico_em ? '✓ ' : ''}Técnico</button><button className="sec" onClick={() => setQuem('cliente')}>{o.assinou_cliente_em ? '✓ ' : ''}Cliente</button></div>
      {quem && <Assinatura onSave={salvarAss} />}</div>
  </>
}
