// src/lib/api.ts
// Clean, fully synchronized version for Admin + Cardholder Dashboards

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const ROOT_BASE = API_BASE.replace(/\/api$/, "");

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function getAuthToken(): string | null {
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // ---------- FIX: Handle 204/304 or empty body ----------
  if (res.status === 204 || res.status === 304) {
    return null as T;
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // body is empty → return null instead of failing
    return null as T;
  }

  if (!res.ok) {
    const err: ApiError = new Error(json?.message || `Request failed ${res.status}`);
    err.status = res.status;
    err.details = json;
    throw err;
  }

  return json as T;
}


// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
export interface StockItem {
  code: string;
  name: string;
  item_name_hindi?: string | null;
  quantity: number;
  unit?: string | null;

  // Backend sometimes returns this:
  updatedAt?: string | null;

  // Older inserts return this:
  last_restocked?: string | null;
}


export interface NotificationItem {
  id: number;
  shopId?: string | null;
  userId?: number | null;
  type: string;
  message: string;
  isSent?: boolean;
  createdAt?: string;
  acknowledgedAt?: string | null;
}

export interface TokenInfo {
  id: string;
  timeslot: string;
  position: number;
  status: string;
  createdAt: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
  db?: {
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
}

// -------------------------------------------------------------
// STOCKS
// -------------------------------------------------------------
export function getStocks(shopId: string): Promise<StockItem[]> {
  return request(`/stocks?shopId=${encodeURIComponent(shopId)}`);
}

export function updateStockItem(
  itemCode: string,
  deltaQuantity: number,
  shopId?: string | null
) {
  return request(`/stocks/update`, {
    method: "POST",
    body: JSON.stringify({
      itemCode,
      deltaQuantity,
      shopId: shopId ?? null,
    }),
  });
}

// -------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------
export function getNotifications(limit = 20): Promise<NotificationItem[]> {
  return request(`/notifications?limit=${limit}`);
}

export function createNotification(payload: {
  shopId?: string | null;
  userId?: number | null;
  type: string;
  message: string;
}) {
  return request(`/notifications`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function acknowledgeNotification(id: number) {
  return request(`/notifications/${id}/ack`, {
    method: "PATCH",
    body: JSON.stringify({ acknowledged: true }),
  });
}

// -------------------------------------------------------------
// TOKENS
// -------------------------------------------------------------
export function getMyToken(): Promise<TokenInfo | null> {
  return request(`/tokens/my`);
}

export function createToken(shopId: string): Promise<TokenInfo> {
  return request(`/tokens`, {
    method: "POST",
    body: JSON.stringify({ shopId }),
  });
}

export function updateTokenStatus(id: string, status: string) {
  return request(`/tokens/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getAllTokens(shopId?: string): Promise<TokenInfo[]> {
  const q = shopId ? `?shopId=${encodeURIComponent(shopId)}` : "";
  return request(`/tokens${q}`);
}

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${ROOT_BASE}/health`);
  let body: any = null;
  try {
    body = await res.json();
  } catch {}

  if (!res.ok) {
    throw new Error(body?.message || `Health check failed`);
  }

  return body as HealthStatus;
}

export { request };
