'use client';

import { FormEvent, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Card } from './ui';
import { useAdminData } from './useAdminData';

interface Row {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN';
  isActive: boolean;
}

export function AdminsPanel({ currentId }: { currentId: string }) {
  const { data, error, loading, reload } = useAdminData<Row[]>('/admin/admins');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await adminFetch('/admin/admins', { method: 'POST', body: JSON.stringify({ email, password, name: name || undefined, role }) });
      setEmail('');
      setPassword('');
      setName('');
      setMsg('Đã tạo quản trị viên.');
      await reload();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setErr(null);
    setMsg(null);
    try {
      await adminFetch(`/admin/admins/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await reload();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  async function remove(id: string, mail: string) {
    if (!window.confirm(`Xóa quản trị viên ${mail}?`)) return;
    setErr(null);
    try {
      await adminFetch(`/admin/admins/${id}`, { method: 'DELETE' });
      await reload();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  return (
    <>
      <Card title="Danh sách quản trị viên">
        {(error || err) && <p role="alert" className="mb-3 text-sm text-red-700">{error ?? err}</p>}
        {msg && <p role="status" className="mb-3 text-sm text-emerald-700">{msg}</p>}
        {loading ? (
          <p className="text-sm text-slate-600">Đang tải…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Quyền</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((a) => {
                  const self = a.id === currentId;
                  return (
                    <tr key={a.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{a.email}{self && ' (bạn)'}</td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={`Quyền của ${a.email}`}
                          value={a.role}
                          disabled={self}
                          onChange={(e) => patch(a.id, { role: e.target.value })}
                          className="rounded border border-slate-300 px-2 py-1"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">{a.isActive ? 'Đang hoạt động' : 'Đã khóa'}</td>
                      <td className="space-x-2 px-3 py-2">
                        <button type="button" className="btn btn-secondary" disabled={self} onClick={() => patch(a.id, { isActive: !a.isActive })}>
                          {a.isActive ? 'Khóa' : 'Mở khóa'}
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={self} onClick={() => remove(a.id, a.email)}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Thêm quản trị viên">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
          <input type="email" required placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="text" placeholder="Tên hiển thị (tùy chọn)" aria-label="Tên" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="password" required minLength={10} placeholder="Mật khẩu (tối thiểu 10 ký tự)" aria-label="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select aria-label="Quyền" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary">Tạo quản trị viên</button>
          </div>
        </form>
      </Card>
    </>
  );
}
