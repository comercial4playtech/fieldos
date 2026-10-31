import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
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
    <div className="glass" style={{ width: 340, display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0 }}>Entrar</h2>
      <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && entrar()} />
      {erro && <span style={{ color: '#dc2626' }}>{erro}</span>}<button onClick={entrar}>Entrar</button>
    </div></div>
}

export default function App() {
  const { session, profile, brand, setTema } = useApp()
  if (session === undefined) return null
  if (!session) return <Login />
  if (!profile || !brand) return <div className="main">Carregando…</div>
  const gestao = profile.papel !== 'tecnico'
  return <div className="shell">
    <nav className="side glass" style={{ borderRadius: 0 }}>
      <div className="mut" style={{ marginBottom: 8 }}>{brand.logo_url && <img src={brand.logo_url} height={28} />}<b style={{ color: 'var(--tx)', display: 'block' }}>{brand.nome_empresa}</b>{brand.subtitulo}</div>
      {gestao && <NavLink to="/">Painel</NavLink>}{gestao && <NavLink to="/clientes">Clientes</NavLink>}<NavLink to="/campo">Campo</NavLink>
      {gestao && <button className="sec" onClick={() => setTema(brand.tema === 'gelo' ? 'esmeralda' : 'gelo')}>Tema</button>}
      <button className="sec" onClick={() => supabase.auth.signOut()}>Sair</button>
    </nav>
    <main className="main"><Routes>
      <Route path="/" element={gestao ? <Dashboard /> : <Navigate to="/campo" />} />
      <Route path="/clientes" element={<Clientes />} /><Route path="/campo" element={<Campo />} /><Route path="/os/:id" element={<OS />} />
    </Routes></main></div>
}
