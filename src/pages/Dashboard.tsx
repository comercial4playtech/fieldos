import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useApp } from '../ctx'
const ATIVAS = ['aberto', 'agendado', 'em_deslocamento', 'em_atendimento']
export default function Dashboard() {
  const { profile } = useApp()
  const [os, setOs] = useState<any[]>([]), [clientes, setClientes] = useState<any[]>([])
  const [q, setQ] = useState(''), [st, setSt] = useState(''), [novo, setNovo] = useState<any>({ cliente_id: '', relato_defeito: '' })
  const [escopo, setEscopo] = useState('os'), [conf, setConf] = useState('')
  const load = async () => {
    const { data } = await supabase.from('ordens_servico').select('*, clientes(razao_social), profiles(nome)').is('deleted_at', null).order('numero', { ascending: false }).limit(500)
    setOs(data || [])
    const c = await supabase.from('clientes').select('id,razao_social').is('deleted_at', null).order('razao_social'); setClientes(c.data || [])
  }
  useEffect(() => { load(); const ch = supabase.channel('os').on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, load).subscribe(); return () => { supabase.removeChannel(ch) } }, [])
  const ativas = os.filter(o => ATIVAS.includes(o.status))
  const pend = os.filter(o => o.status === 'concluido' && !o.assinou_cliente_em)
  const campo = new Set(os.filter(o => ['em_deslocamento', 'em_atendimento'].includes(o.status)).map(o => o.tecnico_id)).size
  const lista = os.filter(o => (!st || o.status === st) && (`${o.numero} ${o.clientes?.razao_social || ''} ${o.relato_defeito || ''}`).toLowerCase().includes(q.toLowerCase()))
  const criar = async () => { if (!novo.cliente_id) return; await supabase.from('ordens_servico').insert({ cliente_id: novo.cliente_id, relato_defeito: novo.relato_defeito }); setNovo({ cliente_id: '', relato_defeito: '' }); load() }
  const apagar = async () => { const { error } = await supabase.rpc('master_apagar', { escopo }); if (error) alert(error.message); setConf(''); load() }
  return <>
    <div className="cards">
      <div className="glass"><span className="mut">O.S. ativas</span><b>{ativas.length}</b></div>
      <div className="glass"><span className="mut">Laudos pendentes</span><b>{pend.length}</b></div>
      <div className="glass"><span className="mut">Técnicos em campo</span><b>{campo}</b></div>
      <div className="glass"><span className="mut">Total de O.S.</span><b>{os.length}</b></div>
    </div>
    <div className="glass row">
      <select value={novo.cliente_id} onChange={e => setNovo({ ...novo, cliente_id: e.target.value })}><option value="">Cliente…</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}</select>
      <input style={{ flex: 1, minWidth: 160 }} placeholder="Relato do defeito" value={novo.relato_defeito} onChange={e => setNovo({ ...novo, relato_defeito: e.target.value })} />
      <button onClick={criar}>+ Nova O.S.</button>
    </div>
    <div className="glass">
      <div className="row" style={{ marginBottom: 8 }}>
        <input style={{ flex: 1, minWidth: 160 }} placeholder="Buscar por cliente, nº ou defeito" value={q} onChange={e => setQ(e.target.value)} />
        <select value={st} onChange={e => setSt(e.target.value)}><option value="">Todos os status</option>{['aberto', 'agendado', 'em_deslocamento', 'em_atendimento', 'concluido', 'cancelado'].map(s => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="scroll"><table><thead><tr><th>#</th><th>Cliente</th><th>Técnico</th><th>Status</th><th></th></tr></thead><tbody>
        {lista.map(o => <tr key={o.id}><td>{o.numero}</td><td>{o.clientes?.razao_social}</td><td>{o.profiles?.nome || '—'}</td><td><span className="tag">{o.status}</span></td><td><Link to={`/os/${o.id}`}>Ver →</Link></td></tr>)}
      </tbody></table></div>
    </div>
    {profile.papel === 'master' && <div className="glass row"><b>Zona do Gestor Master</b>
      <select value={escopo} onChange={e => setEscopo(e.target.value)}><option value="os">Apagar todas as O.S.</option><option value="clientes">Apagar clientes e equipamentos</option><option value="tudo">Apagar tudo</option></select>
      <input placeholder='Digite APAGAR' value={conf} onChange={e => setConf(e.target.value)} />
      <button className="red" disabled={conf !== 'APAGAR'} onClick={apagar}>Executar</button></div>}
  </>
}
