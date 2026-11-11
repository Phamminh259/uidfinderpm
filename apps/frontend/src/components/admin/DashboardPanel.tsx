'use client';

import { useState } from 'react';
import { Card, LineChart, Table, fmt } from './ui';
import { useAdminData } from './useAdminData';

interface UidCounts {
  total: number;
  success: number;
  failed: number;
  invalid: number;
  rateLimited: number;
  successRate: number | null;
}

interface WindowStats {
  from: string;
  to: string;
  visits: { views: number; unique: number; sessions: number };
  uid: UidCounts;
  uidIps: UidCounts;
  sources: { source: string; views: number; unique: number }[];
  devices: { device: string; views: number; unique: number }[];
  pages: { path: string; views: number }[];
}

interface Summary {
  generatedAt: string;
  windows: Record<string, WindowStats>;
}

interface SeriesPoint {
  day: string;
  views: number;
  visitors: number;
  uidLookups: number;
  uidIps: number;
}

type WindowKey = 'today' | '2h' | '7d' | '30d' | 'custom';

const WINDOW_LABEL: Record<WindowKey, string> = {
  today: 'Hôm nay',
  '2h': '2 giờ qua',
  '7d': '7 ngày',
  '30d': '30 ngày',
  custom: 'Tùy chỉnh',
};

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  direct: 'Trực tiếp',
  'search-other': 'Công cụ tìm kiếm khác',
  other: 'Khác',
};
const DEVICE_LABEL: Record<string, string> = { desktop: 'Máy tính', mobile: 'Điện thoại', tablet: 'Máy tính bảng' };

/** Ngày hiện tại theo giờ Việt Nam, dạng YYYY-MM-DD. */
function vnToday(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400_000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function pct(v: number | null): string {
  return v == null ? '—' : `${v.toLocaleString('vi-VN')}%`;
}

export function DashboardPanel() {
  const [from, setFrom] = useState(() => vnToday(-6));
  const [to, setTo] = useState(() => vnToday());
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);
  const [view, setView] = useState<WindowKey>('today');
  const [hidden, setHidden] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const summaryPath = applied
    ? `/admin/dashboard/summary?from=${applied.from}&to=${applied.to}`
    : '/admin/dashboard/summary';
  const summary = useAdminData<Summary>(summaryPath);
  const series = useAdminData<SeriesPoint[]>('/admin/dashboard/series');

  function applyCustom() {
    setFormError(null);
    if (!from || !to) return setFormError('Hãy chọn đủ ngày bắt đầu và ngày kết thúc.');
    if (from > to) return setFormError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    const days = (Date.parse(to) - Date.parse(from)) / 86400_000 + 1;
    if (days > 366) return setFormError('Khoảng thời gian tối đa là 366 ngày.');
    setApplied({ from, to });
    setView('custom');
  }

  function reload() {
    void summary.reload();
    void series.reload();
  }

  const keys: WindowKey[] = applied ? ['today', '2h', '7d', '30d', 'custom'] : ['today', '2h', '7d', '30d'];
  const data = summary.data;
  const selected = data?.windows[view] ?? data?.windows.today;

  return (
    <>
      <Card title="Khoảng thời gian tùy chỉnh">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="d-from" className="block text-xs font-medium text-slate-600">
              Từ ngày
            </label>
            <input
              id="d-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="d-to" className="block text-xs font-medium text-slate-600">
              Đến ngày
            </label>
            <input
              id="d-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={applyCustom}>
            Xem số liệu
          </button>
          {applied && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setApplied(null);
                setView('today');
              }}
            >
              Bỏ khoảng tùy chỉnh
            </button>
          )}
          <button type="button" className="btn btn-secondary ml-auto" onClick={reload}>
            Làm mới
          </button>
        </div>
        {formError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {formError}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Mốc thời gian tính theo giờ Việt Nam. “Hôm nay”, “7 ngày”, “30 ngày” tính từ 00:00 của ngày đầu tiên; khoảng tùy chỉnh gồm cả ngày kết thúc.
        </p>
      </Card>

      {summary.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {summary.error}
        </p>
      )}
      {summary.loading && !data && <p className="text-sm text-slate-600">Đang tải số liệu…</p>}

      {data && (
        <Card title="Tổng quan theo thời gian">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-medium">Chỉ số</th>
                  {keys.map((k) => (
                    <th key={k} className="px-3 py-2 text-right font-medium">
                      {k === 'custom' && applied ? `${applied.from} → ${applied.to}` : WINDOW_LABEL[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Group title="Lượt truy cập website" cols={keys.length} />
                <Row label="Tổng lượt truy cập" keys={keys} data={data} get={(w) => fmt(w.visits.views)} />
                <Row
                  label="Lượt truy cập duy nhất"
                  hint="Đếm theo mã băm IP + trình duyệt"
                  keys={keys}
                  data={data}
                  get={(w) => fmt(w.visits.unique)}
                />
                <Group title="Lượt lấy UID" cols={keys.length} />
                <Row label="Tổng số lượt" keys={keys} data={data} get={(w) => fmt(w.uid.total)} />
                <Row label="Thành công" keys={keys} data={data} get={(w) => fmt(w.uid.success)} />
                <Row label="Thất bại" keys={keys} data={data} get={(w) => fmt(w.uid.failed)} />
                <Row
                  label="Tỉ lệ thành công"
                  hint="Thành công ÷ (thành công + thất bại)"
                  keys={keys}
                  data={data}
                  get={(w) => pct(w.uid.successRate)}
                />
                <Row label="URL không hợp lệ" keys={keys} data={data} get={(w) => fmt(w.uid.invalid)} />
                <Row label="Bị giới hạn (rate limit)" keys={keys} data={data} get={(w) => fmt(w.uid.rateLimited)} />
                <Group title="Lượt lấy UID theo IP duy nhất" cols={keys.length} />
                <Row label="Tổng số IP" keys={keys} data={data} get={(w) => fmt(w.uidIps.total)} />
                <Row
                  label="IP có lượt thành công"
                  hint="Một IP có thể xuất hiện ở nhiều dòng"
                  keys={keys}
                  data={data}
                  get={(w) => fmt(w.uidIps.success)}
                />
                <Row label="IP có lượt thất bại" keys={keys} data={data} get={(w) => fmt(w.uidIps.failed)} />
                <Row
                  label="Tỉ lệ IP thành công"
                  hint="IP có lượt thành công ÷ (IP thành công + IP thất bại)"
                  keys={keys}
                  data={data}
                  get={(w) => pct(w.uidIps.successRate)}
                />
                <Row label="IP gửi URL không hợp lệ" keys={keys} data={data} get={(w) => fmt(w.uidIps.invalid)} />
                <Row label="IP bị giới hạn (rate limit)" keys={keys} data={data} get={(w) => fmt(w.uidIps.rateLimited)} />
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Biểu đồ 30 ngày gần nhất (giờ Việt Nam)">
        {series.error && (
          <p role="alert" className="text-sm text-red-700">
            {series.error}
          </p>
        )}
        {series.loading && !series.data && <p className="text-sm text-slate-600">Đang tải…</p>}
        {series.data && (
          <LineChart
            labels={series.data.map((p) => p.day)}
            hidden={hidden}
            onToggle={(k) => setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]))}
            series={[
              { key: 'views', name: 'Tổng lượt truy cập', color: '#2563eb', values: series.data.map((p) => p.views) },
              { key: 'visitors', name: 'Lượt truy cập duy nhất', color: '#7c3aed', dash: '6 3', values: series.data.map((p) => p.visitors) },
              { key: 'uid', name: 'Số lượt lấy UID', color: '#059669', values: series.data.map((p) => p.uidLookups) },
              { key: 'ips', name: 'Số IP lấy UID duy nhất', color: '#d97706', dash: '2 3', values: series.data.map((p) => p.uidIps) },
            ]}
          />
        )}
      </Card>

      {data && selected && (
        <>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Chọn khoảng thời gian cho thống kê chi tiết">
            <span className="mr-2 text-sm font-semibold text-slate-900">Nguồn truy cập, thiết bị, lượt xem:</span>
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                onClick={() => setView(k)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  view === k ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-slate-300 text-slate-700'
                }`}
              >
                {WINDOW_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Nguồn truy cập">
              <Table
                head={['Nguồn', 'Lượt xem', 'Duy nhất']}
                rows={selected.sources.map((s) => [SOURCE_LABEL[s.source] ?? s.source, fmt(s.views), fmt(s.unique)])}
              />
            </Card>
            <Card title="Thiết bị">
              <Table
                head={['Thiết bị', 'Lượt xem', 'Duy nhất']}
                rows={selected.devices.map((d) => [DEVICE_LABEL[d.device] ?? d.device, fmt(d.views), fmt(d.unique)])}
              />
            </Card>
            <Card title="Trang được xem nhiều">
              <Table head={['Trang', 'Lượt xem']} rows={selected.pages.map((p) => [p.path, fmt(p.views)])} />
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Group({ title, cols }: { title: string; cols: number }) {
  return (
    <tr className="bg-slate-50">
      <th colSpan={cols + 1} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </th>
    </tr>
  );
}

function Row({
  label,
  hint,
  keys,
  data,
  get,
}: {
  label: string;
  hint?: string;
  keys: WindowKey[];
  data: Summary;
  get: (w: WindowStats) => string;
}) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-2 text-slate-800">
        {label}
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </td>
      {keys.map((k) => (
        <td key={k} className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
          {data.windows[k] ? get(data.windows[k]) : '—'}
        </td>
      ))}
    </tr>
  );
}
