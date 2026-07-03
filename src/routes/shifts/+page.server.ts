import type { PageServerLoad } from './$types';
import { gateway } from '$lib/server/gateway';
import { computeShifts } from '$lib/shifts';

export const load: PageServerLoad = async ({ platform, url }) => {
	const gw = gateway(platform);
	const category = url.searchParams.get('category')?.toLowerCase() ?? '';
	if (!gw) return { shifts: [], categories: [], category, available: false };

	try {
		const picks = await gw.listExtractedPicks(5000);
		const all = computeShifts(picks);
		const categories = [
			...new Set(all.map((s) => s.category).filter((c): c is string => Boolean(c)))
		].sort();
		return {
			shifts: category ? all.filter((s) => s.category === category) : all,
			categories,
			category,
			available: true
		};
	} catch (err) {
		console.error('shifts load failed:', err);
		return { shifts: [], categories: [], category, available: false };
	}
};
