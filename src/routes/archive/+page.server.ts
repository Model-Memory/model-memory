import type { PageServerLoad } from './$types';
import { gateway } from '$lib/server/gateway';
import { consensusSpark } from '$lib/server/trend-data';
import { productKey, tallyProducts } from '$lib/products';

// Read-only: there is no app-level auth. All writes (new questions,
// refreshes, weekly opt-in) go through the x402-paid POST /api/commission,
// with the settling EVM address as the user identity.
const RUNS_PER_PAGE = 30;

export const load: PageServerLoad = async ({ platform, url }) => {
	const gw = gateway(platform);
	const pageParam = Number(url.searchParams.get('page') ?? 1);
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const search = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
	const empty = {
		available: false,
		questions: [],
		runs: [],
		balances: { global_credits: 0, questions: [] },
		sparks: {} as Record<string, number[]>,
		productHits: [] as Array<{ name: string; key: string; count: number }>,
		categoryHits: [] as string[],
		page,
		hasOlder: false,
		search
	};
	if (!gw) return empty;

	try {
		// Fetch one extra row to know whether an older page exists.
		const [questions, runs, balances, picks] = await Promise.all([
			gw.listQuestions(true),
			gw.listRuns({ limit: RUNS_PER_PAGE + 1, offset: (page - 1) * RUNS_PER_PAGE }),
			gw.getBalances(),
			gw.listExtractedPicks(5000)
		]);
		const filtered = search
			? questions.filter(
					(q) => q.text.toLowerCase().includes(search) || q.category?.includes(search)
				)
			: questions;

		// One sparkline per question: its current top product's weekly share.
		const sparks: Record<string, number[]> = {};
		for (const q of filtered) {
			const spark = consensusSpark(picks.filter((p) => p.question_id === q.id));
			if (spark) sparks[q.id] = spark;
		}

		// Search also matches what the archive knows, not just question text.
		const productHits = search
			? tallyProducts(picks.map((p) => p.recommended_product))
					.filter((t) => productKey(t.name).includes(search))
					.slice(0, 5)
					.map((t) => ({ name: t.name, key: productKey(t.name), count: t.count }))
			: [];
		const categoryHits = search
			? [
					...new Set(
						questions
							.map((q) => q.category)
							.filter((c): c is string => Boolean(c && c.includes(search)))
					)
				]
			: [];

		return {
			available: true,
			questions: filtered,
			runs: runs.slice(0, RUNS_PER_PAGE),
			balances,
			sparks,
			productHits,
			categoryHits,
			page,
			hasOlder: runs.length > RUNS_PER_PAGE,
			search
		};
	} catch (err) {
		console.error('archive load failed:', err);
		return empty;
	}
};
