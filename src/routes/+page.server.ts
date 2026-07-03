import type { PageServerLoad } from './$types';
import { gateway } from '$lib/server/gateway';
import { computeShifts } from '$lib/shifts';

// Surface the latest archived run and real category stats on the homepage;
// the page falls back to its printed specimen/insights when the gateway is
// unreachable or the archive is still thin.
export const load: PageServerLoad = async ({ platform }) => {
	const gw = gateway(platform);
	if (!gw) return { latest: null, categoryStats: [], shifts: [] };

	try {
		const [runs, categoryStats, picks] = await Promise.all([
			gw.listRuns({ limit: 10 }),
			gw.getCategoryStats(),
			gw.listExtractedPicks(5000)
		]);
		const candidate = runs.find((r) => r.status === 'completed') ?? runs[0];
		const latest = candidate ? await gw.getRun(candidate.id) : null;
		return { latest, categoryStats, shifts: computeShifts(picks).slice(0, 3) };
	} catch (err) {
		console.error('homepage load failed:', err);
		return { latest: null, categoryStats: [], shifts: [] };
	}
};
