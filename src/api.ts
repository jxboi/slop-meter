let tokenProvider: (() => Promise<string | null>) | undefined;

export function configureApiAuth(provider?: () => Promise<string | null>) {
  tokenProvider = provider;
}

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await tokenProvider?.();
  const response = await fetch('/api' + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const text = await response.text();
  let data: { error?: string } & T;
  try {
    data = text ? JSON.parse(text) : ({} as { error?: string } & T);
  } catch {
    throw new Error(
      response.ok
        ? 'The server returned an invalid response.'
        : `The server returned HTTP ${response.status}. Please try again.`,
    );
  }
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export const post = <T>(url: string, body: unknown) =>
  api<T>(url, { method: 'POST', body: JSON.stringify(body) });
export function relative(date: string | null) {
  if (!date) return 'Never scanned';
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(date)) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 2880) return 'Yesterday';
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
