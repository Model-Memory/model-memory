import type { RequestHandler } from './$types';
import { gateway } from '$lib/server/gateway';
import { tallyProducts } from '$lib/products';
import { withEdgeCache } from '$lib/server/cache';

// Embeddable SVG badge: the latest consensus for a tracked question.
// e.g. <img src="https://.../api/badge/q/<id>" alt="Model Memory consensus">
export const GET: RequestHandler = ({ params, platform, url }) =>
	withEdgeCache(platform, url, async () => {
		const gw = gateway(platform);
		if (!gw) return new Response('gateway unavailable', { status: 503 });

		try {
			const history = await gw.getQuestionHistory(params.questionId, 5);
			const latest = history.runs.find((r) => r.picks.some((p) => p.recommended_product));
			const tally = latest ? tallyProducts(latest.picks.map((p) => p.recommended_product)) : [];
			const top = tally[0];
			const named = latest?.picks.filter((p) => p.recommended_product).length ?? 0;

			const label = 'models say';
			const value = top ? `${top.count}/${named} ${top.name}` : 'no consensus yet';
			const svg = badge(label, value);
			return new Response(svg, {
				headers: {
					'content-type': 'image/svg+xml',
					'cache-control': 'public, max-age=300'
				}
			});
		} catch {
			return new Response('question not found', { status: 404 });
		}
	});

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function badge(label: string, value: string): string {
	// Approximate monospace width: 7.2px per char + padding.
	const labelW = Math.round(label.length * 7.2) + 16;
	const valueW = Math.round(Math.min(value.length, 40) * 7.2) + 16;
	const total = labelW + valueW;
	const text = escapeXml(value.slice(0, 40));
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="24" role="img" aria-label="${escapeXml(label)}: ${text}">
  <rect width="${labelW}" height="24" fill="#1a1612"/>
  <rect x="${labelW}" width="${valueW}" height="24" fill="#a8261c"/>
  <g font-family="ui-monospace,monospace" font-size="11" fill="#f4ecd8">
    <text x="8" y="16">${escapeXml(label)}</text>
    <text x="${labelW + 8}" y="16">${text}</text>
  </g>
</svg>`;
}
