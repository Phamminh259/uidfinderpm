'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Card } from './ui';
import { useAdminData } from './useAdminData';

const FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: 'siteName', label: 'Tên website' },
  { key: 'siteTagline', label: 'Mô tả ngắn (footer)' },
  { key: 'logoUrl', label: 'Logo (URL ảnh)', placeholder: 'https://…/logo.png' },
  { key: 'contactEmail', label: 'Email liên hệ' },
  { key: 'contactPhone', label: 'Số điện thoại' },
  { key: 'contactAddress', label: 'Địa chỉ' },
  { key: 'socialFacebook', label: 'Facebook (URL)' },
  { key: 'socialTiktok', label: 'TikTok (URL)' },
  { key: 'socialYoutube', label: 'YouTube (URL)' },
  { key: 'socialZalo', label: 'Zalo (URL)' },
  { key: 'socialTelegram', label: 'Telegram (URL)' },
];

export function SettingsPanel() {
  const { data, error, loading } = useAdminData<Record<string, string>>('/admin/settings');
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const settings: Record<string, string> = {};
    for (const f of FIELDS) {
      if (form[f.key] !== undefined) settings[f.key] = form[f.key];
    }
    try {
      await adminFetch('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
      setMsg('Đã lưu cấu hình. Trang công khai sẽ cập nhật trong tối đa 1 phút.');
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  if (loading) return <p className="text-sm text-slate-600">Đang tải…</p>;

  return (
    <Card title="Cấu hình website, logo, liên hệ và mạng xã hội">
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`s-${f.key}`} className="block text-sm font-medium text-slate-700">
              {f.label}
            </label>
            <input
              id={`s-${f.key}`}
              type="text"
              maxLength={500}
              placeholder={f.placeholder}
              value={form[f.key] ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary">
            Lưu cấu hình
          </button>
          {msg && <span role="status" className="ml-3 text-sm text-emerald-700">{msg}</span>}
          {err && <span role="alert" className="ml-3 text-sm text-red-700">{err}</span>}
        </div>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        Logo (hiển thị trên website) nhập bằng URL ảnh đã tải lên nơi khác. Favicon và tiêu đề/mô tả hiển thị trên Google được cấu hình trong mã nguồn, xem docs/15-seo-va-favicon.md.
      </p>
    </Card>
  );
}
