import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
export default function Clientes() {
  const [lista, setLista] = useState<any[]>([]), [q, setQ] = useState(''), [f, setF] = useState<any>({ razao_social: '', telefone: '', contato: '', endereco: '' })
  const load = async () => { const { data } = await supabase.from('clientes').select('*').is('deleted_at', null).order('razao_social').limit(1000); setLista(data || []) }
  useEffect(() => { load() }, [])
  const salvar = async () => { if (!f.razao_social) return; await supabase.from('clientes').insert(f); setF({ razao_social: '', telefone: '', contato: '', endereco: '' }); load() }
  const excluir = async (id: string) => { if (confirm('Excluir cliente?')) { const { error } = await supabase.from('clientes').delete().eq('id', id); if (error) alert(error.message); load() } }
  return <>
    <div className="glass row">{(['razao_social', 'telefone', 'contato', 'endereco'] as const).map(k => <input key={k} placeholder={k.replace('_', ' ')} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />)}<button onClick={salvar}>Adicionar</button></div>
    <div className="glass"><input style={{ width: '100%', marginBottom: 8 }} placeholder="Buscar cliente" value={q} onChange={e => setQ(e.target.value)} />
      <div className="scroll"><table><tbody>{lista.filter(c => c.razao_social.toLowerCase().includes(q.toLowerCase())).map(c => <tr key={c.id}><td>{c.razao_social}</td><td>{c.telefone}</td><td>{c.endereco}</td><td><button className="sec" onClick={() => excluir(c.id)}>Excluir</button></td></tr>)}</tbody></table></div></div>
  </>
}
