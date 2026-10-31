import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, ClipboardCheck, Clock, Trash2, Users } from 'lucide-react'
import { supabase } from '../supabase'
import { useApp } from '../ctx'
import { Linhas, Rosca } from '../Charts'
import Mapa from '../Mapa'
const ATIVAS = ['aberto', 'agendado', 'em_deslocamento', 'em_atendimento'], CAMPO = ['em_deslocamento', 'em_atendimento']
const ETAPA: any = { aberto: [25, 'TRIAGEM INICIAL', 1], agendado: [25, 'AGENDADO', 1], em_deslocamento: [50, 'EM CAMPO', 2], em_atendimento: [75, 'PARECER & REPARO', 3], concluido: [100, 'CONCLUÍDO', 4], cancelado: [0, 'CANCELADO', 0] }
const COR: any = { aberto: '#3b82f6', agendado: '#06b6d4', cancelado: '#f59e0b', concluido: '#8b5cf6', em_deslocamento: '#a855f7', em_atendimento: '#6366f1' }
const NOME: any = { aberto: 'Aberto', agendado: 'Agendado', em_deslocamento: 'Em deslocamento', em_atendimento: 'Em atendimento', concluido: 'Concluído', cancelado: 'Cancelado' }
const TABS: any = { todas: null, abertas: ['aberto', 'agendado'], andamento: CAMPO, concluidas: ['concluido'], canceladas: ['cancelado'] }
const mesmoDia = (d: any, ref: Date) => d && new Date(d).toDateString() === ref.toDateString()
export default function Dashboard() {
  const { profile } = useApp(), loc = useLocation()
  const [os, setOs] = useState<any[]>([]), [clientes, setClientes] = useState<any[]>([]), [equip, setEquip] = useState(0)
  const [equipe, setEquipe] = useState<any[]>([]), [locs, setLocs] = useState<any[]>([])
  const [q, setQ] = useState(''), [tab, setTab] = useState('todas'), [vista, setVista] = useState('cartoes')
  const [novo, setNovo] = useState<any>({ cliente_id: '', relato_defeito: '' }), [form, setForm] = useState(false)
  const [escopo, setEscopo] = useState('os'), [conf, setConf] = useState('')
  const load = async () => {
    const a = await supabase.from('ordens_servico').select('*, clientes(razao_social), profiles(nome)').is('deleted_at', null).order('numero', { ascending: false }).limit(1000); setOs(a.data || [])
    const c = await supabase.from('clientes').select('id,razao_social,lat,lng').is('deleted_at', null).order('razao_social'); setClientes(c.data || [])
    const e = await supabase.from('equipamentos').select('id', { count: 'exact', head: true }).is('deleted_at', null); setEquip(e.count || 0)
    const p = await supabase.from('profiles').select('id,nome,papel').eq('ativo', true); setEquipe(p.data || [])
    const l = await supabase.from('tecnico_localizacao').select('*, profiles(nome)'); setLocs(l.data || [])
  }
  useEffect(() => { if (loc.hash === '#nova') setForm(true) }, [loc.hash])
  useEffect(() => { load(); const ch = supabase.channel('painel').on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'tecnico_localizacao' }, load).subscribe(); return () => { supabase.removeChannel(ch) } }, [])
  const hoje = new Date(), ativas = os.filter(o => ATIVAS.includes(o.status)), pend = os.filter(o => o.status === 'concluido' && !o.assinou_cliente_em)
  const emCampo = os.filter(o => CAMPO.includes(o.status)), tecCampo = new Set(emCampo.map(o => o.tecnico_id)).size
  const tempos = os.filter(o => o.iniciado_em).map(o => (+new Date(o.iniciado_em) - +new Date(o.criado_em)) / 60000), med = tempos.length ? Math.round(tempos.reduce((s, x) => s + x, 0) / tempos.length) : 0
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d })
  const ab = dias.map(d => os.filter(o => mesmoDia(o.criado_em, d)).length), co = dias.map(d => os.filter(o => mesmoDia(o.concluido_em, d)).length)
  const dist = Object.keys(NOME).map(s => ({ n: s, v: os.filter(o => o.status === s).length, c: COR[s] })).filter(d => d.v)
  const sucesso = os.length ? Math.round(os.filter(o => o.status === 'concluido').length / os.length * 100) : 0
  const lista = os.filter(o => (!TABS[tab] || TABS[tab].includes(o.status)) && (`#${o.numero} ${o.numero} ${o.clientes?.razao_social || ''} ${o.relato_defeito || ''}`).toLowerCase().includes(q.toLowerCase()))
  const criar = async () => { if (!novo.cliente_id) return; await supabase.from('ordens_servico').insert({ cliente_id: novo.cliente_id, relato_defeito: novo.relato_defeito }); setNovo({ cliente_id: '', relato_defeito: '' }); setForm(false); load() }
  const excluir = async (id: string) => { if (confirm('Excluir esta O.S.?')) { const { error } = await supabase.from('ordens_servico').delete().eq('id', id); if (error) alert(error.message); load() } }
  const apagar = async () => { const { error } = await supabase.rpc('master_apagar', { escopo }); if (error) alert(error.message); setConf(''); load() }
  const K = ({ t, v, sub, I }: any) => <div className="card"><div className="kpi"><div><small>{t}</small><b>{v}</b></div><span className="ico"><I size={22} /></span></div><div className="mut" style={{ marginTop: 14 }}>{sub}</div></div>
  const G = ({ t, v, bg }: any) => <div className="big" style={{ background: bg }}><small>{t}</small><b>{v}</b></div>
  const fmt = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
  return <>
    <div className="row" style={{ justifyContent: 'space-between' }}><div><h1>PAINEL DE GESTÃO</h1><div className="mut">Ordens ativas, laudos pendentes, tempo médio de resposta e controle de frotas</div></div>
      <button onClick={() => setForm(!form)}>+ NOVA O.S.</button></div>
    {form && <div className="card row"><select value={novo.cliente_id} onChange={e => setNovo({ ...novo, cliente_id: e.target.value })}><option value="">Cliente…</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}</select>
      <input style={{ flex: 1, minWidth: 180 }} placeholder="Relato do defeito" value={novo.relato_defeito} onChange={e => setNovo({ ...novo, relato_defeito: e.target.value })} /><button onClick={criar}>Abrir O.S.</button></div>}
    <div className="grid4">
      <K t="TOTAL OPEN OS" v={ativas.length} sub={`${os.filter(o => o.status === 'aberto').length} aberto(s) · ${emCampo.length} em andamento`} I={Activity} />
      <K t="PENDING INSPECTIONS" v={pend.length} sub="Vistorias & laudos pendentes" I={ClipboardCheck} />
      <K t="ACTIVE TECHNICIANS IN FIELD" v={tecCampo} sub={`${equipe.filter(p => p.papel === 'tecnico').length} técnicos alocados`} I={Users} />
      <K t="AVERAGE RESPONSE TIME" v={med ? fmt(med) : '—'} sub="Da abertura ao início do atendimento" I={Clock} /></div>
    <div className="grid4">
      <div className="card"><span className="mut">TOTAL O.S.</span><div className="kpi"><b>{os.length}</b></div></div>
      <div className="card"><span className="mut">O.S. ABERTAS</span><div className="kpi"><b style={{ color: '#f59e0b' }}>{ativas.length}</b></div></div>
      <div className="card"><span className="mut">CLIENTES</span><div className="kpi"><b style={{ color: '#10b981' }}>{clientes.length}</b></div></div>
      <div className="card"><span className="mut">EQUIPAMENTOS</span><div className="kpi"><b style={{ color: '#6366f1' }}>{equip}</b></div></div></div>
    <div className="grid4">
      <G t="ABERTAS HOJE" v={os.filter(o => mesmoDia(o.criado_em, hoje)).length} bg="linear-gradient(135deg,#2563eb,#4f46e5)" />
      <G t="CONCLUÍDAS HOJE" v={os.filter(o => mesmoDia(o.concluido_em, hoje)).length} bg="linear-gradient(135deg,#059669,#10b981)" />
      <G t="EM CAMPO AGORA" v={emCampo.length} bg="linear-gradient(135deg,#7c3aed,#c026d3)" />
      <G t="TÉCNICOS ATIVOS" v={equipe.filter(p => p.papel === 'tecnico').length} bg="linear-gradient(135deg,#0f172a,#1e293b)" /></div>
    <div className="grid2">
      <div className="card"><b>ATIVIDADE — ÚLTIMOS 7 DIAS</b><Linhas labels={dias.map(d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`)} a={ab} b={co} />
        <div className="row mut"><span style={{ color: '#2563eb' }}>● Abertas</span><span style={{ color: '#10b981' }}>● Concluídas</span></div></div>
      <div className="card"><b>DISTRIBUIÇÃO POR STATUS</b><div style={{ textAlign: 'center' }}><Rosca dados={dist} centro={`${sucesso}%`} /></div>
        <div className="row mut">{dist.map(d => <span key={d.n} style={{ color: d.c }}>● {NOME[d.n]} ({d.v})</span>)}</div></div></div>
    <div className="grid2">
      <div className="card"><b>TÉCNICOS EM CAMPO — TEMPO REAL</b><div style={{ marginTop: 12 }}><Mapa tecnicos={locs} clientes={clientes} /></div></div>
      <div className="card team"><b>EQUIPE DE CAMPO</b><div style={{ marginTop: 12 }}>{equipe.map(p => <div className="p" key={p.id}><span className="av">{p.nome[0]}</span>
        <div style={{ flex: 1 }}><b>{p.nome}</b><div className="mut" style={{ textTransform: 'uppercase' }}>{p.papel}</div></div>
        <div className="mut" style={{ textAlign: 'right' }}>{emCampo.filter(o => o.tecnico_id === p.id).length} em campo<br />{os.filter(o => o.tecnico_id === p.id && mesmoDia(o.criado_em, hoje)).length} hoje</div></div>)}</div></div></div>
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row"><b>MONITORAMENTO DE ORDENS DE SERVIÇO</b><span className="pill">{lista.length} Registros</span></div>
      <div className="row"><input style={{ flex: 1, minWidth: 200 }} placeholder="Filtrar por nome do cliente ou ID da O.S. (ex: #292)" value={q} onChange={e => setQ(e.target.value)} />
        <div className="seg">{[['cartoes', 'Cartões'], ['tabela', 'Tabela']].map(([k, l]) => <button key={k} className={vista === k ? 'on' : ''} onClick={() => setVista(k)}>{l}</button>)}</div></div>
      <div className="row">{[['todas', 'Todas'], ['abertas', 'Abertas'], ['andamento', 'Em Andamento'], ['concluidas', 'Concluídas'], ['canceladas', 'Canceladas']].map(([k, l]) => <button key={k} className={'chip ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
      {vista === 'cartoes' ? <div className="ocards">{lista.slice(0, 60).map(o => { const [pct, et, n] = ETAPA[o.status]; return <div className="oc" key={o.id}>
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="row"><span className="num">#{o.numero}</span><span className={'tag ' + o.status}>{NOME[o.status].toUpperCase()}</span></span>{profile.papel === 'master' && <Trash2 size={16} style={{ cursor: 'pointer', opacity: .6 }} onClick={() => excluir(o.id)} />}</div>
        <h3>{o.clientes?.razao_social || '—'}</h3><p>{o.relato_defeito}</p>
        <div className="stage"><div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 12 }}>ETAPA: {et}</b><b style={{ color: 'var(--primary)' }}>{pct}%</b></div>
          <div className="bar"><i style={{ width: pct + '%', background: pct < 50 ? '#f59e0b' : 'linear-gradient(90deg,#6366f1,#2563eb)' }} /></div>
          <div className="steps">{['1. Triagem', '2. Em Campo', '3. Laudo/Peças', '4. Concluído'].map((s, i) => <span key={s} className={n >= i + 1 ? 'on' : ''}>{s}</span>)}</div></div>
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="mut">{o.profiles?.nome || '—'}</span><Link to={`/os/${o.id}`} style={{ color: '#10b981', fontWeight: 800, textDecoration: 'none' }}>Ver O.S. →</Link></div></div> })}</div>
      : <div className="scroll"><table><thead><tr><th>#</th><th>Cliente</th><th>Técnico</th><th>Status</th><th></th></tr></thead><tbody>{lista.map(o => <tr key={o.id}><td>{o.numero}</td><td>{o.clientes?.razao_social}</td><td>{o.profiles?.nome || '—'}</td><td><span className={'tag ' + o.status}>{NOME[o.status]}</span></td><td><Link to={`/os/${o.id}`}>Ver →</Link></td></tr>)}</tbody></table></div>}
      {lista.length === 0 && <div className="mut">Nenhuma ordem de serviço encontrada.</div>}</div>
    {profile.papel === 'master' && <div className="card row"><b style={{ color: '#dc2626' }}>Zona do Gestor Master</b>
      <select value={escopo} onChange={e => setEscopo(e.target.value)}><option value="os">Apagar todas as O.S.</option><option value="clientes">Apagar clientes e equipamentos</option><option value="tudo">Apagar tudo</option></select>
      <input placeholder="Digite APAGAR" value={conf} onChange={e => setConf(e.target.value)} /><button className="red" disabled={conf !== 'APAGAR'} onClick={apagar}>Executar</button></div>}
  </>
}
