export type PublicSettings = Partial<
  Record<
    | 'siteName'
    | 'siteTagline'
    | 'logoUrl'
    | 'faviconUrl'
    | 'contactEmail'
    | 'contactPhone'
    | 'contactAddress'
    | 'socialFacebook'
    | 'socialTiktok'
    | 'socialYoutube'
    | 'socialZalo'
    | 'socialTelegram',
    string
  >
>;

function backendBase(): string {
  // Dev: backend chạy trên máy. Production: tên service trong mạng Docker.
  if (process.env.NODE_ENV !== 'production') {
    return `http://127.0.0.1:${process.env.BACKEND_PORT ?? 4000}`;
  }
  return process.env.INTERNAL_API_URL ?? 'http://backend:4000';
}

/** Lấy cấu hình công khai ở phía server. Trả về {} nếu backend chưa sẵn sàng (ví dụ lúc build). */
export async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const res = await fetch(`${backendBase()}/api/settings/public`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return {};
    return (await res.json()) as PublicSettings;
  } catch {
    return {};
  }
}
