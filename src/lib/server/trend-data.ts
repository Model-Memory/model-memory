// Weekly share-of-voice series built from extracted picks, feeding the
// TrendChart on category and product pages and the archive sparklines.
// Buckets are calendar weeks (the archive's natural cadence).

import type { ExtractedPick } from './gateway';
import { CHART_COLORS, productKey, tallyProducts } from '$lib/products';

const WEEK = 7 * 24 * 3600;

export type TrendData = {
	dates: number[];
	series: Array<{ name: string; color: string; points: Array<number | null> }>;
};

const weekOf = (at: number) => Math.floor(at / WEEK) * WEEK;

function weeks(picks: ExtractedPick[]): number[] {
	return [...new Set(picks.map((p) => weekOf(p.run_created_at)))].sort((a, b) => a - b);
}

// Top products' share of all named picks in the set, week by week.
// Series colors are entity-fixed by overall rank at build.
export function shareTrend(picks: ExtractedPick[]): TrendData | null {
	const dates = weeks(picks);
	if (dates.length < 2) return null;

	const top = tallyProducts(picks.map((p) => p.recommended_product)).slice(0, CHART_COLORS.length);
	if (top.length === 0) return null;

	const byWeek = new Map<number, ExtractedPick[]>();
	for (const pick of picks) {
		const w = weekOf(pick.run_created_at);
		byWeek.set(w, [...(byWeek.get(w) ?? []), pick]);
	}

	return {
		dates,
		series: top.map((t, i) => ({
			name: t.name,
			color: CHART_COLORS[i],
			points: dates.map((w) => {
				const inWeek = byWeek.get(w) ?? [];
				if (inWeek.length === 0) return null;
				const count = inWeek.filter(
					(p) => productKey(p.recommended_product) === productKey(t.name)
				).length;
				return Math.round((count / inWeek.length) * 100);
			})
		}))
	};
}

// One product's share within each of its top questions, week by week.
// Series = questions (labelled by their text); value = the product's share
// of that question's named picks that week; null when the question didn't run.
export function productTrend(allPicks: ExtractedPick[], key: string): TrendData | null {
	const mine = allPicks.filter((p) => productKey(p.recommended_product) === key);
	if (mine.length === 0) return null;

	const mentionsByQuestion = new Map<string, number>();
	for (const p of mine) {
		mentionsByQuestion.set(p.question_id, (mentionsByQuestion.get(p.question_id) ?? 0) + 1);
	}
	const topQuestions = [...mentionsByQuestion.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, CHART_COLORS.length)
		.map(([id]) => id);

	const relevant = allPicks.filter((p) => topQuestions.includes(p.question_id));
	const dates = weeks(relevant);
	if (dates.length < 2) return null;

	return {
		dates,
		series: topQuestions.map((qid, i) => {
			const qPicks = relevant.filter((p) => p.question_id === qid);
			const text = qPicks[0]?.question_text ?? qid;
			return {
				name: text.length > 34 ? `${text.slice(0, 33)}…` : text,
				color: CHART_COLORS[i],
				points: dates.map((w) => {
					const inWeek = qPicks.filter((p) => weekOf(p.run_created_at) === w);
					if (inWeek.length === 0) return null;
					const count = inWeek.filter((p) => productKey(p.recommended_product) === key).length;
					return Math.round((count / inWeek.length) * 100);
				})
			};
		})
	};
}

// A single line for archive sparklines: the question's current top product's
// share per week. Returns null when there's under two weeks of data.
export function consensusSpark(picks: ExtractedPick[]): number[] | null {
	const dates = weeks(picks);
	if (dates.length < 2) return null;
	const top = tallyProducts(picks.map((p) => p.recommended_product))[0];
	if (!top) return null;

	return dates.map((w) => {
		const inWeek = picks.filter((p) => weekOf(p.run_created_at) === w);
		if (inWeek.length === 0) return 0;
		const count = inWeek.filter(
			(p) => productKey(p.recommended_product) === productKey(top.name)
		).length;
		return Math.round((count / inWeek.length) * 100);
	});
}
