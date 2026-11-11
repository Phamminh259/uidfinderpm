import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Ngày cập nhật nội dung từng trang. Chỉ đổi ngày khi nội dung trang thật sự thay đổi.
const PAGES: {
  path: string;
  lastModified: string;
  priority: number;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
}[] = [
  { path: '', lastModified: '2026-11-11', priority: 1, changeFrequency: 'weekly' },
  { path: '/tinh-nang', lastModified: '2026-11-11', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/huong-dan', lastModified: '2026-11-11', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', lastModified: '2026-11-11', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/gioi-thieu', lastModified: '2026-11-11', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/lien-he', lastModified: '2026-11-11', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/chinh-sach-bao-mat', lastModified: '2026-11-11', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/dieu-khoan-su-dung', lastModified: '2026-11-11', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/mien-tru-trach-nhiem', lastModified: '2026-11-11', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/+$/, '');
  return PAGES.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: p.lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
