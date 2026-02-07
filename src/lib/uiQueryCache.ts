const uiQueryCache = new Map<string, unknown>();

export function getCachedQueryData<T>(key: string): T | undefined {
    return uiQueryCache.get(key) as T | undefined;
}

export function storeCachedQueryData<T>(key: string, value: T | undefined): void {
    if (value === undefined) {
        return;
    }
    uiQueryCache.set(key, value);
}

export function clearQueryCache(): void {
    uiQueryCache.clear();
}

export function clearQueryCacheByPrefix(prefix: string): void {
    for (const key of uiQueryCache.keys()) {
        if (key.startsWith(prefix)) {
            uiQueryCache.delete(key);
        }
    }
}
