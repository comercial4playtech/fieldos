import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
const Ctx = createContext<any>(null)
export const useApp = () => useContext(Ctx)
export function AppProvider({ children }: any) {
  const [session, setSession] = useState<any>(undefined)
  const [profile, setProfile] = useState<any>(null)
  const [brand, setBrand] = useState<any>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) { setProfile(null); setBrand(null); return }
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)
      if (p) { const { data: b } = await supabase.from('tenant_branding').select('*').eq('tenant_id', p.tenant_id).single(); setBrand(b) }
    })()
  }, [session])
  useEffect(() => {
    if (!brand) return
    document.documentElement.dataset.tema = brand.tema
    document.documentElement.style.setProperty('--primary', brand.cor_primaria || '#0284c7')
    document.title = brand.nome_empresa
  }, [brand])
  const setTema = async (tema: string) => { setBrand({ ...brand, tema }); await supabase.from('tenant_branding').update({ tema }).eq('tenant_id', profile.tenant_id) }
  return <Ctx.Provider value={{ session, profile, brand, setTema }}>{children}</Ctx.Provider>
}
