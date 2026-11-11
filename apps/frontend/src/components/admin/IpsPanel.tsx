'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Badge, Card, fmt } from './ui';
import { useAdminData } from './useAdminData';

interface IpRow {
  ip: string;
  views: number;
  lookups: number;
  requests: number;
  success: number;
  failed: number;
  invalid: number;
  rateLimited: number;
  lastSeenAt: string;
  blocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  limitPerMinute: number | null;
  status: 'normal' | 'suspicious' | 'blocked';
  reasons: string[];
}

interface IpPage {
  page: number;
  pageSize: number;
  total: number;
  counts: { all: number; suspicious: number; blocked: number };
  truncated: boolean;
  items: IpRow[];
}

interface Limits {
  uidPerMinute: number;
  uidPerHour: number;
  requestsPerDay: number;
  rateLimitedHits: number;
  invalidHits: number;
  failPercent: number;
  failMinAttempts: number;
}

type Filter = 'all' | 'suspicious' | 'blocked';
type Action = { mode: 'block' | 'limit'; ip: string; manual?: boolean } | null;

const RANGES: [string, string][] = [
  ['2h', '2 giờ qua'],
  ['24h', '24 giờ qua'],
  ['today', 'Hôm nay'],
  ['7d', '7 ngày'],
  ['30d', '30 ngày'],
];

const LIMIT_FIELDS: { key: keyof Limits; label: string; hint: string; min: number; max: number }[] = [
  { key: 'uidPerMinute', label: 'Tra cứu UID tối đa mỗi phút (mỗi IP)', hint: 'Vượt mức này sẽ bị từ chối và ghi nhận “bị giới hạn”.', min: 1, max: 600 },
  { key: 'uidPerHour', label: 'Tra cứu UID tối đa mỗi giờ (mỗi IP)', hint: '0 = không giới hạn theo giờ.', min: 0, max: 100000 },
  { key: 'requestsPerDay', label: 'Nghi vấn: số request trong 24 giờ', hint: 'Lượt xem trang + lượt tra cứu. 0 = tắt quy tắc.', min: 0, max: 1000000 },
  { key: 'rateLimitedHits', label: 'Nghi vấn: số lần bị giới hạn trong 24 giờ', hint: '0 = tắt quy tắc.', min: 0, max: 100000 },
  { key: 'invalidHits', label: 'Nghi vấn: số URL không hợp lệ trong 24 giờ', hint: '0 = tắt quy tắc.', min: 0, max: 100000 },
  { key: 'failPercent', label: 'Nghi vấn: tỉ lệ tra cứu thất bại (%)', hint: '0 = tắt quy tắc.', min: 0, max: 100 },
  { key: 'failMinAttempts', label: 'Số lượt tối thiểu trước khi xét tỉ lệ thất bại', hint: 'Tránh đánh giá sai khi mới có vài lượt.', min: 1, max: 100000 },
];

export function IpsPanel() {
  const [range, setRange] = useState('24h');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const params = new URLSearchParams({ range, filter, page: String(page) });
  if (query) params.set('q', query);
  const list = useAdminData<IpPage>(`/admin/ips?${params.toString()}`);

  function flash(ok: string | null, bad: string | null) {
    setMsg(ok);
    setErr(bad);
  }

  async function call(path: string, method: 'POST' | 'PUT', body: unknown, okText: string) {
    try {
      await adminFetch(path, { method, body: JSON.stringify(body) });
      flash(okText, null);
      setAction(null);
      await list.reload();
    } catch (e) {
      flash(null, (e as Error).message);
    }
  }

  function unblock(ip: string) {
    if (!window.confirm(`Bỏ chặn ${ip}?`)) return;
    void call('/admin/ips/unblock', 'POST', { ip }, `Đã bỏ chặn ${ip}.`);
  }

  function search(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(q.trim());
  }

  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;

  return (
    <>
      <Card title="Địa chỉ IP truy cập">
        <p className="mb-4 text-xs text-slate-500">
          Request = lượt xem trang + lượt tra cứu UID. Trạng thái “Nghi vấn” được tự động đánh giá theo hoạt động 24 giờ gần nhất và các ngưỡng ở mục “Giới hạn request” bên dưới. Địa chỉ IP chỉ hiển thị cho quản trị viên.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="ip-range" className="block text-xs font-medium text-slate-600">
              Khoảng thời gian
            </label>
            <select
              id="ip-range"
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setPage(1);
              }}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {RANGES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <form onSubmit={search} className="flex items-end gap-2">
            <div>
              <label htmlFor="ip-q" className="block text-xs font-medium text-slate-600">
                Tìm IP
              </label>
              <input
                id="ip-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="vd: 113.161"
                maxLength={64}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Tìm
            </button>
          </form>
          <button type="button" className="btn btn-secondary" onClick={() => setAction({ mode: 'block', ip: '', manual: true })}>
            Chặn IP thủ công
          </button>
          <button type="button" className="btn btn-secondary ml-auto" onClick={() => void list.reload()}>
            Làm mới
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
          {(
            [
              ['all', `Tất cả (${d?.counts.all ?? 0})`],
              ['suspicious', `Nghi vấn (${d?.counts.suspicious ?? 0})`],
              ['blocked', `Bị chặn (${d?.counts.blocked ?? 0})`],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              onClick={() => {
                setFilter(k);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1 text-sm ${
                filter === k ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-slate-300 text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {msg}
          </p>
        )}
        {(err || list.error) && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {err ?? list.error}
          </p>
        )}

        {action && (
          <ActionForm
            action={action}
            onCancel={() => setAction(null)}
            onSubmit={(value, reason) => {
              if (action.mode === 'block') {
                void call('/admin/ips/block', 'POST', { ip: value, reason: reason || undefined }, `Đã chặn ${value}.`);
              } else {
                const trimmed = reason.trim();
                const limit = trimmed === '' ? null : Number(trimmed);
                if (limit !== null && (!Number.isInteger(limit) || limit < 0 || limit > 600)) {
                  flash(null, 'Giới hạn phải là số nguyên từ 0 đến 600, hoặc để trống để dùng giới hạn chung.');
                  return;
                }
                void call('/admin/ips/limit', 'PUT', { ip: value, limitPerMinute: limit }, `Đã cập nhật giới hạn cho ${value}.`);
              }
            }}
          />
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="px-3 py-2 font-medium">Địa chỉ IP</th>
                <th className="px-3 py-2 text-right font-medium">Tổng request</th>
                <th className="px-3 py-2 text-right font-medium">Lượt xem</th>
                <th className="px-3 py-2 text-right font-medium">Tra cứu UID</th>
                <th className="px-3 py-2 font-medium">TC / TB / Sai URL / Limit</th>
                <th className="px-3 py-2 font-medium">Lần cuối</th>
                <th className="px-3 py-2 font-medium">Giới hạn riêng</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.loading && !d && (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-slate-500">
                    Đang tải…
                  </td>
                </tr>
              )}
              {d && d.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-slate-500">
                    Chưa có IP nào phù hợp. IP chỉ được ghi nhận từ khi bản cập nhật này chạy.
                  </td>
                </tr>
              )}
              {d?.items.map((r) => (
                <tr key={r.ip} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-2 font-mono text-xs text-slate-900">{r.ip}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(r.requests)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(r.views)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(r.lookups)}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">
                    {r.success} / {r.failed} / {r.invalid} / {r.rateLimited}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{new Date(r.lastSeenAt).toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {r.limitPerMinute === null ? 'Mặc định' : r.limitPerMinute === 0 ? 'Cấm tra cứu' : `${r.limitPerMinute}/phút`}
                  </td>
                  <td className="px-3 py-2">
                    {r.status === 'blocked' && <Badge tone="red">Bị chặn</Badge>}
                    {r.status === 'suspicious' && <Badge tone="amber">Nghi vấn</Badge>}
                    {r.status === 'normal' && <Badge tone="green">Bình thường</Badge>}
                    {r.status === 'blocked' && r.blockedReason && <p className="mt-1 max-w-[200px] text-xs text-slate-500">{r.blockedReason}</p>}
                    {r.reasons.map((x) => (
                      <p key={x} className="mt-1 max-w-[220px] text-xs text-amber-800">
                        {x}
                      </p>
                    ))}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {r.blocked ? (
                        <button type="button" className="btn btn-secondary" onClick={() => unblock(r.ip)}>
                          Bỏ chặn
                        </button>
                      ) : (
                        <button type="button" className="btn btn-secondary" onClick={() => setAction({ mode: 'block', ip: r.ip })}>
                          Chặn
                        </button>
                      )}
                      <button type="button" className="btn btn-secondary" onClick={() => setAction({ mode: 'limit', ip: r.ip })}>
                        Đặt giới hạn
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {d?.truncated && (
          <p className="mt-3 text-xs text-slate-500">Chỉ hiển thị 500 IP hoạt động nhiều nhất trong khoảng thời gian đã chọn. Dùng ô tìm kiếm để tìm IP cụ thể.</p>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">Tổng: {fmt(d?.total)}</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trước
            </button>
            <span className="self-center">
              {page}/{pages}
            </span>
            <button type="button" className="btn btn-secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Sau
            </button>
          </div>
        </div>
      </Card>

      <LimitsCard />
    </>
  );
}

function ActionForm({
  action,
  onCancel,
  onSubmit,
}: {
  action: NonNullable<Action>;
  onCancel: () => void;
  onSubmit: (ip: string, extra: string) => void;
}) {
  const [ip, setIp] = useState(action.ip);
  const [extra, setExtra] = useState('');
  const isBlock = action.mode === 'block';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(ip.trim(), extra);
      }}
      className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4"
    >
      <p className="text-sm font-semibold text-slate-900">{isBlock ? 'Chặn địa chỉ IP' : 'Đặt giới hạn riêng cho IP'}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="act-ip" className="block text-xs font-medium text-slate-600">
            Địa chỉ IP
          </label>
          <input
            id="act-ip"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            readOnly={!action.manual}
            required
            maxLength={64}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm read-only:bg-slate-100"
          />
        </div>
        <div>
          <label htmlFor="act-extra" className="block text-xs font-medium text-slate-600">
            {isBlock ? 'Lý do (không bắt buộc)' : 'Số lượt tra cứu mỗi phút (0 = cấm, để trống = mặc định)'}
          </label>
          <input
            id="act-extra"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            inputMode={isBlock ? 'text' : 'numeric'}
            maxLength={200}
            className="mt-1 w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          {isBlock ? 'Chặn IP' : 'Lưu giới hạn'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Hủy
        </button>
      </div>
      {isBlock && (
        <p className="mt-3 text-xs text-slate-500">
          IP bị chặn sẽ nhận lỗi 403 ở mọi API công khai. Khu vực quản trị vẫn truy cập được để bạn có thể bỏ chặn. Không thể chặn chính IP bạn đang dùng.
        </p>
      )}
    </form>
  );
}

function LimitsCard() {
  const { data, error, loading } = useAdminData<Limits>('/admin/limits');
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])));
  }, [data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const body: Record<string, number> = {};
    for (const f of LIMIT_FIELDS) {
      const raw = (form[f.key] ?? '').trim();
      const n = Number(raw);
      if (raw === '' || !Number.isInteger(n) || n < f.min || n > f.max) {
        setErr(`“${f.label}” phải là số nguyên từ ${f.min} đến ${f.max}.`);
        return;
      }
      body[f.key] = n;
    }
    try {
      await adminFetch('/admin/limits', { method: 'PUT', body: JSON.stringify(body) });
      setMsg('Đã lưu. Giới hạn mới áp dụng trong vòng 15 giây.');
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  return (
    <Card title="Giới hạn request và ngưỡng nghi vấn">
      {loading && !data && <p className="text-sm text-slate-600">Đang tải…</p>}
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        {LIMIT_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`lim-${f.key}`} className="block text-sm font-medium text-slate-700">
              {f.label}
            </label>
            <input
              id={`lim-${f.key}`}
              inputMode="numeric"
              value={form[f.key] ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">{f.hint}</p>
          </div>
        ))}
        <div className="md:col-span-2">
          {msg && (
            <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {msg}
            </p>
          )}
          {err && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {err}
            </p>
          )}
          <button type="submit" className="btn btn-primary">
            Lưu giới hạn
          </button>
        </div>
      </form>
    </Card>
  );
}
