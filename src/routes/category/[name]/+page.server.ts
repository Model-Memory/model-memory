import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { gateway } from '$lib/server/gateway';
import { productKey, tallyProducts } from '$lib/products';
import { shareTrend } from '$lib/server/trend-data';

export const load: PageServerLoad = async ({ params, platform }) => {
	const gw = gateway(platform);
	if (!gw) error(503, 'Gateway unavailable');

	const name = params.name.toLowerCase();
	const picks = (await gw.listExtractedPicks(5000)).filter((p) => p.category === name);
	if (picks.length === 0) error(404, 'No archived picks in this category');

	const share = tallyProducts(picks.map((p) => p.recommended_product));
	const total = share.reduce((sum, t) => sum + t.count, 0);

	// Per question: its current top pick (from its most recent run with picks).
	const byQuestion = new Map<string, typeof picks>();
	for (const p of picks) {
		byQuestion.set(p.question_id, [...(byQuestion.get(p.question_id) ?? []), p]);
	}
	const questions = [...byQuestion.values()].map((qPicks) => {
		const latestRunAt = Math.max(...qPicks.map((p) => p.run_created_at));
		const latest = qPicks.filter((p) => p.run_created_at === latestRunAt);
		const top = tallyProducts(latest.map((p) => p.recommended_product))[0];
		return {
			question_id: qPicks[0].question_id,
			text: qPicks[0].question_text,
			top: top?.name ?? null,
			topKey: top ? productKey(top.name) : null,
			at: latestRunAt
		};
	});

	return {
		name,
		share: share.slice(0, 8).map((t) => ({ ...t, key: productKey(t.name) })),
		total,
		trend: shareTrend(picks),
		questions: questions.sort((a, b) => b.at - a.at)
	};
};
