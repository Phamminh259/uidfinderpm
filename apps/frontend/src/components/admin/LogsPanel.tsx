'use client';

import { useState } from 'react';
import { Card, Table, fmt } from './ui';
import { useAdminData } from './useAdminData';

interface LogPage {
  page: number;
  total: number;
  items: { id: string; action: string; target: string | null; admin: string | null; createdAt: string }[];
}

export function LogsPanel() {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useAdminData<LogPage>(`/admin/audit-logs?page=${page}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1;

  return (
    <Card title="Nhật ký hoạt động quản trị">
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-600">Đang tải…</p>
      ) : (
        <Table
          head={['Thời gian', 'Quản trị viên', 'Hành động', 'Đối tượng']}
          rows={(data?.items ?? []).map((l) => [
            new Date(l.createdAt).toLocaleString('vi-VN'),
            l.admin ?? '—',
            l.action,
            l.target ?? '—',
          ])}
        />
      )}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-600">Tổng: {fmt(data?.total)}</span>
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
  );
}
