import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { gateway } from '$lib/server/gateway';
import { computeShifts } from '$lib/shifts';
import { withEdgeCache } from '$lib/server/cache';

// Machine-readable changelog of consensus shifts across all tracked questions.
export const GET: RequestHandler = ({ platform, url }) =>
	withEdgeCache(platform, url, async () => {
		const gw = gateway(platform);
		if (!gw) return json({ error: 'gateway unavailable' }, { status: 503 });

		const picks = await gw.listExtractedPicks(5000);
		const shifts = computeShifts(picks);
		return json({ shifts }, { headers: { 'cache-control': 'public, max-age=300' } });
	});
