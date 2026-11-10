'use client';

import { Card, Stat, fmt, fmtBytes } from './ui';
import { useAdminData } from './useAdminData';

interface SystemInfo {
  cpuPercent: number;
  memory: { totalBytes: number; usedBytes: number; usedPercent: number };
  disk: { totalBytes: number; usedBytes: number; usedPercent: number };
  api: { ok: boolean; uptimeSeconds: number };
  postgres: { ok: boolean; latencyMs: number | null };
  redis: { ok: boolean; latencyMs: number | null };
  requests24h: { requests: number; avgResponseMs: number | null; http4xx: number; http5xx: number };
}

function Status({ ok, latency }: { ok: boolean; latency?: number | null }) {
  return (
    <span className={ok ? 'text-emerald-700' : 'text-red-700'}>
      {ok ? 'Hoạt động' : 'Lỗi'}
      {ok && latency != null ? ` · ${latency} ms` : ''}
    </span>
  );
}

export function SystemPanel() {
  const { data, error, loading, reload } = useAdminData<SystemInfo>('/admin/dashboard/system');

  if (loading) return <p className="text-sm text-slate-600">Đang tải…</p>;
  if (error || !data) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </p>
    );
  }
  const s = data;
  const hours = Math.floor(s.api.uptimeSeconds / 3600);

  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="btn btn-secondary" onClick={reload}>
          Làm mới
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="CPU" value={`${s.cpuPercent}%`} />
        <Stat label="RAM" value={`${s.memory.usedPercent}%`} hint={`${fmtBytes(s.memory.usedBytes)} / ${fmtBytes(s.memory.totalBytes)}`} />
        <Stat label="Disk" value={`${s.disk.usedPercent}%`} hint={`${fmtBytes(s.disk.usedBytes)} / ${fmtBytes(s.disk.totalBytes)}`} />
      </div>
      <Card title="Dịch vụ">
        <ul className="space-y-2 text-sm">
          <li>Backend API: <Status ok={s.api.ok} /> · chạy {hours} giờ</li>
          <li>PostgreSQL: <Status ok={s.postgres.ok} latency={s.postgres.latencyMs} /></li>
          <li>Redis: <Status ok={s.redis.ok} latency={s.redis.latencyMs} /></li>
        </ul>
      </Card>
      <Card title="Request 24 giờ qua">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Tổng request" value={fmt(s.requests24h.requests)} />
          <Stat label="Response time TB" value={s.requests24h.avgResponseMs == null ? '—' : `${s.requests24h.avgResponseMs} ms`} />
          <Stat label="HTTP 4xx" value={fmt(s.requests24h.http4xx)} />
          <Stat label="HTTP 5xx" value={fmt(s.requests24h.http5xx)} />
        </div>
      </Card>
      <p className="text-xs text-slate-500">CPU/RAM/Disk là của container backend. Số liệu request được ghi từ lúc backend bắt đầu chạy.</p>
    </>
  );
}
