import { API_BASE } from './site';

let accessToken: string | null = null;

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (Array.isArray(data?.message)) return data.message.join(', ');
  return data?.message ?? `Lỗi ${res.status}`;
}

async function refreshToken(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    accessToken = null;
    return false;
  }
  const data = (await res.json()) as { accessToken: string };
  accessToken = data.accessToken;
  return true;
}

export async function adminFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  if (res.status === 401 && retry && (await refreshToken())) {
    return adminFetch<T>(path, init, false);
  }
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(email: string, password: string): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  const data = (await res.json()) as { accessToken: string; user: AdminUser };
  accessToken = data.accessToken;
  return data.user;
}

export async function restoreSession(): Promise<AdminUser | null> {
  if (!(await refreshToken())) return null;
  try {
    return await adminFetch<AdminUser>('/auth/me');
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
  accessToken = null;
}
