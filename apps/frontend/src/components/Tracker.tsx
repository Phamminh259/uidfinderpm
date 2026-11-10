'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { API_BASE } from '@/lib/site';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('uidf_sid');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('uidf_sid', id);
    }
    return id;
  } catch {
    return 'no-session';
  }
}

/** Ghi lượt xem trang thật về backend. Không ghi trang /admin. */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const body = JSON.stringify({
      path: pathname,
      sessionId: getSessionId(),
      referrer: document.referrer || undefined,
    });
    fetch(`${API_BASE}/analytics/collect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
