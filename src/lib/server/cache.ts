// Workers do NOT cache responses just because they carry a cache-control
// header — the Cache API must be used explicitly. This wraps the hot,
// aggregate-heavy public endpoints so repeat hits stop at the edge instead
// of re-scanning D1 through the gateway.

type PlatformWithCaches = App.Platform & {
	caches?: CacheStorage & { default: Cache };
	ctx?: { waitUntil(promise: Promise<unknown>): void };
};

export async function withEdgeCache(
	platform: App.Platform | undefined,
	url: URL,
	build: () => Promise<Response>
): Promise<Response> {
	const p = platform as PlatformWithCaches | undefined;
	const cache = p?.caches?.default;
	const key = new Request(url.href);

	if (cache) {
		const hit = await cache.match(key);
		if (hit) return hit;
	}

	const response = await build();
	// Only store publicly cacheable successes; TTL comes from cache-control.
	if (cache && response.ok && response.headers.get('cache-control')?.includes('public')) {
		const store = cache.put(key, response.clone());
		if (p?.ctx?.waitUntil) p.ctx.waitUntil(store);
		else await store;
	}
	return response;
}
