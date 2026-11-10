import type { ReactNode } from 'react';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      {title && <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function fmt(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('vi-VN');
}

export function fmtBytes(n: number): string {
  const gb = n / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(n / 1024 ** 2).toFixed(0)} MB`;
}

export function BarChart({ data }: { data: { label: string; a: number; b?: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có dữ liệu trong 30 ngày qua.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.a));
  const w = 720;
  const h = 200;
  const pad = 24;
  const bw = (w - pad * 2) / data.length;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 30}`} className="min-w-[560px] w-full" role="img" aria-label="Biểu đồ lưu lượng theo ngày">
        {data.map((d, i) => {
          const bh = (d.a / max) * h;
          const vh = d.b ? (d.b / max) * h : 0;
          const x = pad + i * bw;
          return (
            <g key={d.label}>
              <rect x={x + 2} y={h - bh} width={Math.max(2, bw - 4)} height={bh} fill="#93c5fd" rx="2">
                <title>{`${d.label}: ${d.a} lượt xem${d.b != null ? `, ${d.b} người truy cập` : ''}`}</title>
              </rect>
              {vh > 0 && <rect x={x + 2} y={h - vh} width={Math.max(2, bw - 4)} height={vh} fill="#2563eb" rx="2" />}
              {(i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && (
                <text x={x + bw / 2} y={h + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                  {d.label.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad} x2={w - pad} y1={h} y2={h} stroke="#cbd5e1" />
      </svg>
      <p className="mt-1 text-xs text-slate-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-300" /> Lượt xem
        <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-blue-600" /> Người truy cập
      </p>
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-3 py-4 text-slate-500">
                Chưa có dữ liệu.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-slate-800">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
