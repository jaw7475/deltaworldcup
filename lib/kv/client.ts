import { kv } from "@vercel/kv"

/**
 * KV wrapper. Uses @vercel/kv in production. Falls back to an in-memory map
 * for local dev when KV credentials are absent.
 */
export interface KvLike {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
}

class InMemoryKv implements KvLike {
  private readonly store: Map<string, unknown>
  constructor(store: Map<string, unknown>) {
    this.store = store
  }
  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }
}

// Pinned on globalThis so dev-mode hot reloads and per-route bundles share state.
const GLOBAL_STORE_KEY = "__deltaWorldCupKvStore"
function getMemoryStore(): Map<string, unknown> {
  const g = globalThis as unknown as Record<string, Map<string, unknown> | undefined>
  if (!g[GLOBAL_STORE_KEY]) {
    g[GLOBAL_STORE_KEY] = new Map<string, unknown>()
  }
  return g[GLOBAL_STORE_KEY]!
}
const memoryFallback = new InMemoryKv(getMemoryStore())

function hasKvCreds(): boolean {
  return (
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN
  )
}

export function getKv(): KvLike {
  if (!hasKvCreds()) return memoryFallback
  return {
    async get<T>(key: string): Promise<T | null> {
      return (await kv.get<T>(key)) ?? null
    },
    async set<T>(key: string, value: T): Promise<void> {
      await kv.set(key, value)
    },
  }
}
