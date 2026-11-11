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

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  dash?: string;
  values: number[];
}

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Biểu đồ đường nhiều chuỗi, có chú thích bật/tắt từng chuỗi và gợi ý số liệu khi rê chuột. */
export function LineChart({
  labels,
  series,
  hidden,
  onToggle,
}: {
  labels: string[];
  series: LineSeries[];
  hidden: string[];
  onToggle: (key: string) => void;
}) {
  const w = 760;
  const h = 240;
  const left = 44;
  const right = 12;
  const top = 12;
  const bottom = 28;
  const visible = series.filter((s) => !hidden.includes(s.key));
  const max = niceMax(Math.max(0, ...visible.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i: number) => left + (n <= 1 ? 0 : (i / (n - 1)) * (w - left - right));
  const y = (v: number) => top + (1 - v / max) * (h - top - bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {series.map((s) => {
          const off = hidden.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={!off}
              onClick={() => onToggle(s.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                off ? 'border-slate-200 text-slate-400' : 'border-slate-300 text-slate-800'
              }`}
            >
              <svg width="22" height="8" aria-hidden="true">
                <line x1="0" x2="22" y1="4" y2="4" stroke={off ? '#cbd5e1' : s.color} strokeWidth="3" strokeDasharray={s.dash} />
              </svg>
              {s.name}
            </button>
          );
        })}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[600px] w-full" role="img" aria-label="Biểu đồ 30 ngày gần nhất">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
              <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">
                {t.toLocaleString('vi-VN')}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % step === 0 || i === n - 1 ? (
              <text key={l} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="#64748b">
                {l.slice(5).split('-').reverse().join('/')}
              </text>
            ) : null,
          )}
          {visible.map((s) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeDasharray={s.dash}
              strokeLinejoin="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            />
          ))}
          {labels.map((l, i) => {
            const slot = (w - left - right) / Math.max(1, n - 1);
            return (
              <rect key={l} x={x(i) - slot / 2} y={top} width={slot} height={h - top - bottom} fill="transparent">
                <title>{`${l}\n${series.map((s) => `${s.name}: ${s.values[i].toLocaleString('vi-VN')}`).join('\n')}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

const BADGE: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
  slate: 'bg-slate-100 text-slate-700',
};

export function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'slate'; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[tone]}`}>{children}</span>;
}
