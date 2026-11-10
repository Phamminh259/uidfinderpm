'use client';

import { BarChart, Card, Stat, Table, fmt } from './ui';
import { useAdminData } from './useAdminData';

interface Traffic {
  viewsToday: number;
  viewsYesterday: number;
  views7Days: number;
  views30Days: number;
  totalViews: number;
  estimatedVisitors: number;
  sessions: number;
  sources: { source: string; count: number }[];
  devices: { device: string; count: number }[];
  series: { day: string; views: number; visitors: number }[];
}

interface UidStats {
  total: number;
  success: number;
  failed: number;
  invalid: number;
  rateLimited: number;
  successRate: number | null;
  byType: { type: string; count: number }[];
}

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  direct: 'Trực tiếp',
  'search-other': 'Công cụ tìm kiếm khác',
  other: 'Khác',
};
const DEVICE_LABEL: Record<string, string> = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' };

export function DashboardPanel() {
  const traffic = useAdminData<Traffic>('/admin/dashboard/traffic');
  const uid = useAdminData<UidStats>('/admin/dashboard/uid');

  if (traffic.loading || uid.loading) return <p className="text-sm text-slate-600">Đang tải số liệu…</p>;
  if (traffic.error || uid.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        {traffic.error ?? uid.error}
      </p>
    );
  }
  const t = traffic.data!;
  const u = uid.data!;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lượt truy cập hôm nay" value={fmt(t.viewsToday)} />
        <Stat label="Hôm qua" value={fmt(t.viewsYesterday)} />
        <Stat label="7 ngày" value={fmt(t.views7Days)} />
        <Stat label="30 ngày" value={fmt(t.views30Days)} />
        <Stat label="Tổng lượt truy cập" value={fmt(t.totalViews)} />
        <Stat label="Người truy cập (ước tính)" value={fmt(t.estimatedVisitors)} hint="Đếm theo mã băm IP + trình duyệt" />
        <Stat label="Số phiên truy cập" value={fmt(t.sessions)} />
      </div>

      <Card title="Lưu lượng 30 ngày gần nhất (giờ Việt Nam)">
        <BarChart data={t.series.map((s) => ({ label: s.day, a: s.views, b: s.visitors }))} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Nguồn truy cập (30 ngày)">
          <Table
            head={['Nguồn', 'Lượt xem']}
            rows={t.sources.map((s) => [SOURCE_LABEL[s.source] ?? s.source, fmt(s.count)])}
          />
        </Card>
        <Card title="Thiết bị (30 ngày)">
          <Table
            head={['Thiết bị', 'Lượt xem']}
            rows={t.devices.map((d) => [DEVICE_LABEL[d.device] ?? d.device, fmt(d.count)])}
          />
        </Card>
      </div>

      <h2 className="pt-2 text-base font-bold text-slate-900">Thống kê UIDFinder</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tổng lượt tra cứu" value={fmt(u.total)} />
        <Stat label="Thành công" value={fmt(u.success)} />
        <Stat label="Thất bại" value={fmt(u.failed)} />
        <Stat
          label="Tỷ lệ thành công"
          value={u.successRate == null ? '—' : `${u.successRate}%`}
          hint="Không tính URL sai định dạng và bị giới hạn"
        />
        <Stat label="URL không hợp lệ" value={fmt(u.invalid)} />
        <Stat label="Bị Rate Limit" value={fmt(u.rateLimited)} />
      </div>
      <Card title="Loại URL phổ biến (lượt thành công)">
        <Table head={['Loại', 'Số lượt']} rows={u.byType.map((b) => [b.type, fmt(b.count)])} />
      </Card>
    </>
  );
}
