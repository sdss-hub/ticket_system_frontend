export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export class ApiClient {
  private baseUrl: string;
  private getAuthToken?: () => string | undefined;

  constructor(options?: { baseUrl?: string; getAuthToken?: () => string | undefined }) {
    const raw =
      options?.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5104/api';
    this.baseUrl = raw.endsWith('/') ? raw : raw + '/';
    this.getAuthToken = options?.getAuthToken;
  }

  setAuthTokenGetter(getter?: () => string | undefined) {
    this.getAuthToken = getter;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
    const relPath = path.replace(/^\/+/, '');
    const url = new URL(relPath, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
      });
    }
    return url.toString();
  }

  async request<T>(
    path: string,
    options?: {
      method?: HttpMethod;
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options?.headers,
    };

    const token = this.getAuthToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Bypass ngrok browser warning page which otherwise returns HTML
    try {
      const u = new URL(url);
      if (u.hostname.includes('ngrok')) {
        headers['ngrok-skip-browser-warning'] = 'true';
      }
    } catch {
      // ignore URL parsing issues
    }

    const hasBody = options?.body !== undefined;
    const isFormData =
      typeof FormData !== 'undefined' && options?.body instanceof FormData;
    const isBlob = typeof Blob !== 'undefined' && options?.body instanceof Blob;
    const isBinary = isFormData || isBlob;
    if (hasBody && !headers['Content-Type'] && !isBinary) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method: options?.method ?? 'GET',
      headers,
      body: hasBody ? (isBinary ? (options!.body as any) : JSON.stringify(options?.body)) : undefined,
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await res.json().catch(() => undefined) : undefined;

    if (!res.ok) {
      const err: ApiError = {
        status: res.status,
        message: (payload as any)?.message || res.statusText || 'Request failed',
        details: payload,
      };
      throw err;
    }

    return payload as T;
  }
}

export const api = new ApiClient();

export function setApiAuthTokenGetter(getter?: () => string | undefined) {
  api.setAuthTokenGetter(getter);
}

