export function Linhas({ labels, a, b }: any) {
  const W = 600, H = 200, P = 28, max = Math.max(3, ...a, ...b)
  const x = (i: number) => P + i * (W - 2 * P) / (labels.length - 1), y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const d = (s: number[]) => s.map((v, i) => { if (!i) return `M${x(0)},${y(v)}`; const c = (x(i - 1) + x(i)) / 2; return `C${c},${y(s[i - 1])} ${c},${y(v)} ${x(i)},${y(v)}` }).join(' ')
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%">
    {[0, 1, 2, 3].map(i => <line key={i} x1={P} x2={W - P} y1={y(max * i / 3)} y2={y(max * i / 3)} stroke="currentColor" opacity=".1" />)}
    <path d={d(a)} fill="none" stroke="#2563eb" strokeWidth="3" /><path d={d(b)} fill="none" stroke="#10b981" strokeWidth="3" />
    {labels.map((l: string, i: number) => <text key={l} x={x(i)} y={H - 6} fontSize="11" textAnchor="middle" fill="currentColor" opacity=".6">{l}</text>)}
  </svg>
}
export function Rosca({ dados, centro }: any) {
  const tot = dados.reduce((s: number, d: any) => s + d.v, 0) || 1, R = 70, C = 2 * Math.PI * R; let acc = 0
  return <svg viewBox="0 0 200 200" width="200">
    {dados.map((d: any) => { const len = d.v / tot * C; const el = <circle key={d.n} r={R} cx="100" cy="100" fill="none" stroke={d.c} strokeWidth="26" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 100 100)" />; acc += len; return el })}
    <text x="100" y="106" textAnchor="middle" fontSize="28" fontWeight="800" fill="currentColor">{centro}</text>
  </svg>
}
