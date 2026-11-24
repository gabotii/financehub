// Thin typed client for the FinanceHub API.
// Access/refresh tokens live in localStorage; a 401 triggers one refresh
// (the backend rotates + blacklists refresh tokens) and the request is retried.

export type Kind = "income" | "expense";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}
export interface Category {
  id: number;
  name: string;
  kind: Kind;
  color: string;
}
export interface Transaction {
  id: number;
  category: number;
  category_name: string;
  kind: Kind;
  amount: string;
  date: string;
  description: string;
  notes: string;
}
export interface Budget {
  id: number;
  category: number;
  category_name: string;
  month: string;
  amount: string;
  spent: string;
  remaining: string;
  percent_used: number;
}
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export interface Summary {
  date_from: string;
  date_to: string;
  total_income: string;
  total_expense: string;
  balance: string;
  savings_rate: number | null;
  transaction_count: number;
}
export interface CategoryTotal {
  category_id: number;
  name: string;
  color: string;
  total: string;
  count: number;
  percentage: number;
}
export interface MonthRow {
  month: string;
  income: string;
  expense: string;
  balance: string;
}

const BASE = "/api/v1";
const ACCESS = "fh.access";
const REFRESH = "fh.refresh";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
}

export const tokens = {
  get access() {
    return read(ACCESS);
  },
  get refresh() {
    return read(REFRESH);
  },
  set(access: string, refresh: string) {
    write(ACCESS, access);
    write(REFRESH, refresh);
  },
  clear() {
    write(ACCESS, null);
    write(REFRESH, null);
  },
};

/** Error carrying DRF's response body so forms can show field errors. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(describe(body) ?? `Error ${status}`);
  }
  field(name: string): string | undefined {
    const b = this.body as Record<string, unknown> | null;
    const v = b?.[name];
    return Array.isArray(v) ? String(v[0]) : typeof v === "string" ? v : undefined;
  }
}

function describe(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string") return b.detail;
  const first = Object.entries(b)[0];
  if (!first) return undefined;
  const [key, value] = first;
  const msg = Array.isArray(value) ? value[0] : value;
  return key === "non_field_errors" ? String(msg) : `${key}: ${String(msg)}`;
}

let onLoggedOut: () => void = () => {};
export function setLoggedOutHandler(fn: () => void) {
  onLoggedOut = fn;
}

let refreshing: Promise<boolean> | null = null;
async function refreshTokens(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      tokens.set(data.access, data.refresh ?? refresh);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

type Query = Record<string, string | number | undefined | null>;

function url(path: string, query?: Query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return `${BASE}${path}${s ? `?${s}` : ""}`;
}

async function raw(method: string, path: string, body?: unknown, query?: Query, retry = true) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  const res = await fetch(url(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && retry && tokens.refresh) {
    if (await refreshTokens()) return raw(method, path, body, query, false);
    tokens.clear();
    onLoggedOut();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data);
  }
  return res;
}

async function json<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const res = await raw(method, path, body, query);
  return res.status === 204 || res.status === 205 ? (undefined as T) : res.json();
}

/** Fetch every page of a list endpoint (categories are few; this keeps forms simple). */
async function all<T>(path: string, query?: Query): Promise<T[]> {
  const first = await json<Page<T>>("GET", path, undefined, { ...query, page_size: 100 });
  const items = [...first.results];
  let page = 2;
  while (items.length < first.count) {
    const next = await json<Page<T>>("GET", path, undefined, { ...query, page_size: 100, page });
    items.push(...next.results);
    page += 1;
  }
  return items;
}

export const api = {
  login: async (email: string, password: string) => {
    const data = await json<{ access: string; refresh: string }>("POST", "/auth/login/", {
      email,
      password,
    });
    tokens.set(data.access, data.refresh);
  },
  register: async (payload: { email: string; password: string; first_name: string }) => {
    const data = await json<{ user: User; tokens: { access: string; refresh: string } }>(
      "POST",
      "/auth/register/",
      payload,
    );
    tokens.set(data.tokens.access, data.tokens.refresh);
    return data.user;
  },
  logout: async () => {
    const refresh = tokens.refresh;
    try {
      if (refresh) await json("POST", "/auth/logout/", { refresh });
    } finally {
      tokens.clear();
    }
  },
  me: () => json<User>("GET", "/auth/me/"),

  categories: (kind?: Kind) => all<Category>("/categories/", { kind }),
  createCategory: (c: Omit<Category, "id">) => json<Category>("POST", "/categories/", c),
  updateCategory: (id: number, c: Partial<Category>) =>
    json<Category>("PATCH", `/categories/${id}/`, c),
  deleteCategory: (id: number) => json<void>("DELETE", `/categories/${id}/`),

  transactions: (query: Query) => json<Page<Transaction>>("GET", "/transactions/", undefined, query),
  createTransaction: (t: TransactionInput) => json<Transaction>("POST", "/transactions/", t),
  updateTransaction: (id: number, t: TransactionInput) =>
    json<Transaction>("PATCH", `/transactions/${id}/`, t),
  deleteTransaction: (id: number) => json<void>("DELETE", `/transactions/${id}/`),
  exportTransactions: async (query: Query) => (await raw("GET", "/transactions/export/", undefined, query)).blob(),

  budgets: (month: string) => all<Budget>("/budgets/", { month }),
  createBudget: (b: BudgetInput) => json<Budget>("POST", "/budgets/", b),
  updateBudget: (id: number, b: Partial<BudgetInput>) => json<Budget>("PATCH", `/budgets/${id}/`, b),
  deleteBudget: (id: number) => json<void>("DELETE", `/budgets/${id}/`),

  summary: (date_from: string, date_to: string) =>
    json<Summary>("GET", "/analytics/summary/", undefined, { date_from, date_to }),
  byCategory: (date_from: string, date_to: string, kind: Kind) =>
    json<CategoryTotal[]>("GET", "/analytics/by-category/", undefined, { date_from, date_to, kind }),
  monthly: (months: number) => json<MonthRow[]>("GET", "/analytics/monthly/", undefined, { months }),
};

export interface TransactionInput {
  category: number;
  amount: string;
  date: string;
  description: string;
  notes: string;
}
export interface BudgetInput {
  category: number;
  month: string;
  amount: string;
}
