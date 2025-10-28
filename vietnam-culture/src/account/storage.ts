import { createEmptyStore, STORE_VERSION } from "./types";
import type { ProfileStore } from "./types";

const LOCAL_CACHE_KEY = "vn-culture:profile-store";
let inMemoryStore: ProfileStore | null = null;

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI__?.invoke);
}

function ensureVersion(store: ProfileStore | null | undefined): ProfileStore {
  if (!store || store.version !== STORE_VERSION) {
    return createEmptyStore();
  }
  return store;
}

export async function loadProfileStore(): Promise<ProfileStore> {
  if (inMemoryStore) {
    return inMemoryStore;
  }
  let store: ProfileStore | null = null;
  if (isTauriRuntime()) {
    try {
      store = await window.__TAURI__!.invoke<ProfileStore>("load_profile_store");
    } catch (error) {
      console.warn("Failed to load profile store via Tauri:", error);
    }
  }
  if (!store) {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      store = raw ? (JSON.parse(raw) as ProfileStore) : null;
    } catch (error) {
      console.warn("Failed to read profile store from localStorage:", error);
    }
  }
  inMemoryStore = ensureVersion(store);
  return inMemoryStore;
}

export async function saveProfileStore(store: ProfileStore): Promise<void> {
  inMemoryStore = ensureVersion(store);
  if (isTauriRuntime()) {
    try {
      await window.__TAURI__!.invoke("save_profile_store", {
        store: inMemoryStore,
      });
    } catch (error) {
      console.error("Failed to write profile store via Tauri:", error);
    }
  }
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(inMemoryStore));
  } catch (error) {
    console.warn("Failed to write profile store to localStorage:", error);
  }
}

export function clearProfileStoreCache(): void {
  inMemoryStore = null;
}


