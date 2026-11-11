'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminUser, login, logout, restoreSession } from '@/lib/adminApi';
import { AdminsPanel } from './AdminsPanel';
import { DashboardPanel } from './DashboardPanel';
import { IpsPanel } from './IpsPanel';
import { LogsPanel } from './LogsPanel';
import { SettingsPanel } from './SettingsPanel';
import { SystemPanel } from './SystemPanel';

type Tab = 'dashboard' | 'ips' | 'system' | 'settings' | 'admins' | 'logs';

export function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .finally(() => setChecking(false));
  }, []);

  const onLogout = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  if (checking) {
    return <p className="p-8 text-sm text-slate-600">Đang kiểm tra phiên đăng nhập…</p>;
  }
  if (!user) return <LoginForm onLogin={setUser} />;

  const tabs: { id: Tab; label: string; superOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Tổng quan' },
    { id: 'ips', label: 'IP & giới hạn' },
    { id: 'system', label: 'Hệ thống' },
    { id: 'settings', label: 'Cấu hình website' },
    { id: 'admins', label: 'Quản trị viên', superOnly: true },
    { id: 'logs', label: 'Nhật ký' },
  ];

  return (
    <div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="font-bold text-slate-900">UIDFinder · Quản trị</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user.email} ({user.role})
            </span>
            <button type="button" className="btn btn-secondary" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
        <nav aria-label="Menu quản trị" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs
            .filter((t) => !t.superOnly || user.role === 'SUPER_ADMIN')
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {tab === 'dashboard' && <DashboardPanel />}
        {tab === 'ips' && <IpsPanel />}
        {tab === 'system' && <SystemPanel />}
        {tab === 'settings' && <SettingsPanel />}
        {tab === 'admins' && user.role === 'SUPER_ADMIN' && <AdminsPanel currentId={user.id} />}
        {tab === 'logs' && <LogsPanel />}
      </main>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogin(await login(email, password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <form onSubmit={submit} className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Đăng nhập quản trị</h1>
        <label htmlFor="adm-email" className="mt-4 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="adm-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <label htmlFor="adm-pass" className="mt-3 block text-sm font-medium text-slate-700">
          Mật khẩu
        </label>
        <input
          id="adm-pass"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-4 w-full" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
