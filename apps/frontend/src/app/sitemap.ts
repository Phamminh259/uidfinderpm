import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const PAGES: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/tinh-nang', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/huong-dan', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/gioi-thieu', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/lien-he', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/chinh-sach-bao-mat', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/dieu-khoan-su-dung', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/mien-tru-trach-nhiem', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
