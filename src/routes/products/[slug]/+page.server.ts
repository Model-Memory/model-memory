import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { gateway } from '$lib/server/gateway';
import { productKey, tallyProducts } from '$lib/products';
import { productTrend } from '$lib/server/trend-data';

// One product's footprint across the archive. The slug is the canonical
// productKey (SvelteKit delivers it decoded).
export const load: PageServerLoad = async ({ params, platform }) => {
	const gw = gateway(platform);
	if (!gw) error(503, 'Gateway unavailable');

	const key = params.slug;
	const picks = await gw.listExtractedPicks(5000);
	const mine = picks.filter((p) => productKey(p.recommended_product) === key);
	if (mine.length === 0) error(404, 'Product not found in the archive');

	const name = tallyProducts(mine.map((p) => p.recommended_product))[0].name;

	const totals = new Map<string, number>();
	for (const p of picks) {
		totals.set(p.question_id, (totals.get(p.question_id) ?? 0) + 1);
	}

	const byQuestion = new Map<
		string,
		{ question_id: string; text: string; category: string | null; count: number }
	>();
	for (const p of mine) {
		const entry = byQuestion.get(p.question_id) ?? {
			question_id: p.question_id,
			text: p.question_text,
			category: p.category,
			count: 0
		};
		entry.count += 1;
		byQuestion.set(p.question_id, entry);
	}

	const questions = [...byQuestion.values()]
		.map((q) => ({ ...q, total: totals.get(q.question_id) ?? q.count }))
		.sort((a, b) => b.count / b.total - a.count / a.total);

	const categories = [
		...new Set(mine.map((p) => p.category).filter((c): c is string => Boolean(c)))
	];

	return {
		name,
		key,
		trend: productTrend(picks, key),
		mentions: mine.length,
		questions,
		categories,
		recent: mine.slice(0, 15)
	};
};
