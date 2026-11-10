'use client';

import { FormEvent, useState } from 'react';
import { API_BASE } from '@/lib/site';

interface UidResult {
  uid: string;
  url: string;
  username: string | null;
  type: string;
  cached: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  PROFILE: 'Trang cá nhân',
  USERNAME: 'Trang cá nhân (username)',
  PAGE: 'Page',
  GROUP: 'Nhóm',
  POST: 'Bài viết',
  SHARE: 'Liên kết chia sẻ',
  UNKNOWN: 'Không xác định',
};

export function UidForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UidResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch(`${API_BASE}/uid/lookup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json().catch(() => null)) as (UidResult & { message?: string | string[] }) | null;
      if (!res.ok || !data) {
        const msg = Array.isArray(data?.message) ? data?.message.join(', ') : data?.message;
        setError(msg ?? 'Không thể tra cứu lúc này, vui lòng thử lại.');
        return;
      }
      setResult(data);
    } catch {
      setError('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch {
      setError('Trình duyệt không cho phép đọc bộ nhớ tạm. Hãy dán thủ công bằng Ctrl+V.');
    }
  }

  async function copyUid() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Không thể sao chép tự động. Hãy bôi đen và sao chép thủ công.');
    }
  }

  const openHref =
    result && (result.type === 'POST' || result.type === 'SHARE')
      ? result.url
      : result
        ? `https://www.facebook.com/profile.php?id=${result.uid}`
        : '#';

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" noValidate>
        <label htmlFor="fb-url" className="block text-sm font-semibold text-slate-800">
          Đường dẫn Facebook
        </label>
        <input
          id="fb-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.facebook.com/username"
          maxLength={2048}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary flex-1 sm:flex-none" disabled={loading || !url.trim()}>
            {loading ? 'Đang tra cứu…' : 'Lấy UID'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={paste}>
            Dán
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setUrl('');
              setResult(null);
              setError(null);
            }}
            disabled={!url && !result && !error}
          >
            Xóa
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {result && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm" aria-label="Kết quả tra cứu">
            <p className="text-sm font-semibold text-emerald-700">Đã tìm thấy UID</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="break-all rounded-lg bg-slate-100 px-3 py-2 text-xl font-bold text-slate-900">
                {result.uid}
              </code>
              <button type="button" className="btn btn-primary" onClick={copyUid}>
                {copied ? 'Đã sao chép' : 'Sao chép UID'}
              </button>
              <a href={openHref} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-secondary">
                Mở Facebook
              </a>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Loại đối tượng</dt>
                <dd className="font-medium text-slate-900">{TYPE_LABEL[result.type] ?? result.type}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Username</dt>
                <dd className="font-medium text-slate-900">{result.username ?? 'Không có'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Đường dẫn Facebook</dt>
                <dd className="break-all font-medium text-slate-900">{result.url}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
