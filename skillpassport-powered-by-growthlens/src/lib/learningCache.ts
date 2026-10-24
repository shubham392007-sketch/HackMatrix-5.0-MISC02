/**
 * SkillPassport Domain 5: Learn & Grow Caching Engine
 * Scoped by Authenticated User ID, Selected Target Role ID, and Integration Contract Version.
 * Guarantees immediate UI responsiveness while preventing stale data leakage across users or roles.
 */

export interface CachedLearningPayload<T = any> {
  userId: string;
  targetRoleId: string | null;
  snapshotId?: string | null;
  version: string;
  cachedAt: number;
  data: T;
}

const CONTRACT_VERSION = "v2026.1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL for instant navigation

function getStorageKey(userId: string, targetRoleId: string | null = "default", keyType: string): string {
  const safeRole = targetRoleId || "no_target_role";
  return `sp_lg_cache_${userId}_${safeRole}_${keyType}_${CONTRACT_VERSION}`;
}

export const learningCache = {
  /**
   * Retrieves user- and role-scoped cached data if present and within TTL.
   */
  get<T = any>(userId: string, targetRoleId: string | null = "default", keyType: string = "overview"): T | null {
    if (typeof window === "undefined" || !userId) return null;
    try {
      const storageKey = getStorageKey(userId, targetRoleId, keyType);
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed: CachedLearningPayload<T> = JSON.parse(raw);
      if (
        parsed.userId !== userId ||
        parsed.version !== CONTRACT_VERSION ||
        Date.now() - parsed.cachedAt > CACHE_TTL_MS
      ) {
        sessionStorage.removeItem(storageKey);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  },

  /**
   * Persists user- and role-scoped data with expiration timestamp.
   */
  set<T = any>(
    userId: string,
    targetRoleId: string | null = "default",
    keyType: string = "overview",
    data: T,
    snapshotId?: string | null
  ): void {
    if (typeof window === "undefined" || !userId) return;
    try {
      const storageKey = getStorageKey(userId, targetRoleId, keyType);
      const payload: CachedLearningPayload<T> = {
        userId,
        targetRoleId,
        snapshotId,
        version: CONTRACT_VERSION,
        cachedAt: Date.now(),
        data,
      };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.warn("[learningCache] Failed to persist cache item:", e);
    }
  },

  /**
   * Invalidates all cache entries for a specific user, or for a specific user and role.
   */
  invalidate(userId: string, targetRoleId?: string | null): void {
    if (typeof window === "undefined" || !userId) return;
    try {
      const prefix = targetRoleId !== undefined
        ? `sp_lg_cache_${userId}_${targetRoleId || "no_target_role"}_`
        : `sp_lg_cache_${userId}_`;

      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {
      console.warn("[learningCache] Invalidation error:", e);
    }
  },
};
