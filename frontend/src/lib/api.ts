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
  governmentAllocated?: number; // Original allocation from government (admin only)
  quantity: number; // Current stock (shopkeeper can update)
  unit?: string | null;

  // Backend sometimes returns this:
  updatedAt?: string | null;

  // Older inserts return this:
  last_restocked?: string | null;
}

export interface StockAuditLog {
  id: number;
  itemCode: string;
  shopId: string;
  changedByRole: 'admin' | 'shopkeeper';
  changedByName?: string;
  changedByEmail?: string;
  changeType: 'government_allocation' | 'shopkeeper_update' | 'admin_correction';
  oldQuantity: number;
  newQuantity: number;
  quantityDifference: number;
  reason?: string;
  notes?: string;
  createdAt: string;
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

export interface UserData {
  id: number;
  email: string;
  role: 'admin' | 'shopkeeper' | 'cardholder';
  name?: string;
  gender?: string;
  mobileNumber?: string;
  address?: string;
  rationCardNumber?: string;
  cardType?: 'AAY' | 'PHH' | 'BPL' | 'APL';
  cardColor?: string;
  familySize?: number;
  socioEconomicCategory?: string;
  occupation?: string;
  annualIncome?: number;
  shopId?: string;
  shopName?: string;
  isActive?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  flaggedBy?: number;
  flaggedByName?: string;
  flaggedAt?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface UserStats {
  shopId: string;
  shopName: string;
  shopkeepers: number;
  cardholders: number;
  flaggedUsers: number;
  flaggedShopkeepers: number;
}

// -------------------------------------------------------------
// STOCKS
// -------------------------------------------------------------
export async function getStocks(shopId: string): Promise<StockItem[]> {
  const response: any = await request(`/stocks?shopId=${encodeURIComponent(shopId)}`);
  // Backend returns { success: true, data: [...] }
  return response?.data || [];
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

// PATCH stock with quantity (used by both admin and shopkeeper)
export function patchStockItem(code: string, quantity: number, shopId?: string) {
  return request(`/stocks/${code}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity, shopId: shopId ?? null }),
  });
}

// Get stock audit trail (admin only)
export async function getStockAuditLogs(shopId: string, limit = 50): Promise<StockAuditLog[]> {
  const response: any = await request(`/stocks/audit/${shopId}?limit=${limit}`);
  return response?.data || [];
}

// Allocate government stock (admin only)
export function allocateGovernmentStock(payload: {
  shopId: string;
  itemCode: string;
  quantity: number;
  reason?: string;
}) {
  return request(`/stocks/allocate`, {
    method: "POST",
    body: JSON.stringify(payload),
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

// -------------------------------------------------------------
// USERS (Admin only)
// -------------------------------------------------------------
export async function getAllUsers(params?: {
  role?: 'all' | 'admin' | 'shopkeeper' | 'cardholder';
  shopId?: string;
  flagged?: boolean;
}): Promise<UserData[]> {
  const query = new URLSearchParams();
  if (params?.role) query.set('role', params.role);
  if (params?.shopId) query.set('shopId', params.shopId);
  if (params?.flagged) query.set('flagged', 'true');

  const response: any = await request(`/users?${query.toString()}`);
  return response?.data || [];
}

export async function getUserStats(): Promise<UserStats[]> {
  const response: any = await request(`/users/stats`);
  return response?.data || [];
}

export async function getUserById(id: number): Promise<UserData> {
  const response: any = await request(`/users/${id}`);
  return response?.data;
}

export function flagUser(userId: number, isFlagged: boolean, flagReason?: string) {
  return request(`/users/${userId}/flag`, {
    method: 'PATCH',
    body: JSON.stringify({ isFlagged, flagReason }),
  });
}

export function setUserActive(userId: number, isActive: boolean) {
  return request(`/users/${userId}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export { request };
