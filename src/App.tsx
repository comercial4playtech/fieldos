import { useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, ClipboardList, LayoutGrid, LineChart, MapPin, Plus, Upload, Users } from 'lucide-react'
import { useApp } from './ctx'
import { supabase } from './supabase'
import Dashboard from './pages/Dashboard'
import OS from './pages/OS'
import Clientes from './pages/Clientes'
import Campo from './pages/Campo'

function Login() {
  const [email, setEmail] = useState(''), [senha, setSenha] = useState(''), [erro, setErro] = useState('')
  const entrar = async () => { const { error } = await supabase.auth.signInWithPassword({ email, password: senha }); if (error) setErro(error.message) }
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
    <div className="card" style={{ width: 340, display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0 }}>Entrar</h2>
      <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && entrar()} />
      {erro && <span style={{ color: '#dc2626' }}>{erro}</span>}<button onClick={entrar}>Entrar</button>
    </div></div>
}
const Off = ({ i, t }: any) => <div className="off">{i}<span className="lbl">{t} · em breve</span></div>

export default function App() {
  const { session, profile, brand, setTema } = useApp(), nav = useNavigate()
  if (session === undefined) return null
  if (!session) return <Login />
  if (!profile || !brand) return <div className="page">Carregando…</div>
  const gestao = profile.papel !== 'tecnico', ini = (s: string) => s.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
  return <div className="shell">
    <nav className="side card">
      <div className="logo">{brand.logo_url ? <img src={brand.logo_url} height={44} /> : <i>{ini(brand.nome_empresa)}</i>}<div><b>{brand.nome_empresa}</b><div className="mut">{brand.subtitulo || 'GESTÃO DE O.S.'}</div></div></div>
      {gestao && <button onClick={() => nav('/#nova')} style={{ borderRadius: 16, marginTop: 8 }}><Plus size={16} /> Nova ordem de serviço</button>}
      <h6>MÓDULOS DO SISTEMA</h6>
      {gestao && <NavLink to="/" end><LayoutGrid size={18} /><span className="lbl">Dashboard</span></NavLink>}
      {gestao && <NavLink to="/clientes"><Users size={18} /><span className="lbl">Clientes</span></NavLink>}
      <NavLink to="/campo"><MapPin size={18} /><span className="lbl">Campo</span></NavLink>
      {gestao && <><Off i={<CalendarDays size={18} />} t="Agenda & Escala" /><Off i={<Upload size={18} />} t="Importar Clientes" /><Off i={<LineChart size={18} />} t="Gestão Estratégica" /><Off i={<ClipboardList size={18} />} t="Usuários & Equipe" /></>}
      <button className="sec" style={{ marginTop: 'auto' }} onClick={() => supabase.auth.signOut()}>Sair</button>
    </nav>
    <div className="main">
      <header className="top">
        <span className="mut">{brand.nome_empresa} Operacional / <b style={{ color: 'var(--primary)' }}>DASHBOARD</b></span>
        <span className="pill">● SISTEMA ONLINE{brand.cidade_base ? ` · ${brand.cidade_base}` : ''}</span>
        <span style={{ flex: 1 }} />
        {gestao && <div className="seg">{['gelo', 'esmeralda'].map(t => <button key={t} className={brand.tema === t ? 'on' : ''} onClick={() => setTema(t)}>{t === 'gelo' ? 'Gelo' : 'Esmeralda'}</button>)}</div>}
        <Bell size={20} />
        <div className="row"><span className="av">{ini(profile.nome)}</span><div><b>{profile.nome}</b><div className="mut" style={{ textTransform: 'capitalize' }}>{profile.papel === 'master' ? 'Gestor Master' : profile.papel}</div></div></div>
      </header>
      <main className="page"><Routes>
        <Route path="/" element={gestao ? <Dashboard /> : <Navigate to="/campo" />} />
        <Route path="/clientes" element={<Clientes />} /><Route path="/campo" element={<Campo />} /><Route path="/os/:id" element={<OS />} />
      </Routes></main></div></div>
}
