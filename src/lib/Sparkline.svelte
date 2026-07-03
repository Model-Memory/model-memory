<script lang="ts">
	// Tiny single-series line (0–100%), stamp red on paper — no axes; the
	// question page carries the full chart.
	let { points, label }: { points: number[]; label: string } = $props();

	const W = 64;
	const H = 18;
	const PAD = 2;

	const d = $derived(
		points
			.map((p, i) => {
				const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
				const y = PAD + (1 - p / 100) * (H - PAD * 2);
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join('')
	);
</script>

<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}>
	<path {d} fill="none" stroke="var(--color-stamp)" stroke-width="1.5" opacity="0.85" />
</svg>

<style>
	svg {
		display: inline-block;
		vertical-align: middle;
		flex: none;
	}
</style>
