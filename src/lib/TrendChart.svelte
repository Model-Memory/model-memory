<script lang="ts">
	import { stampDate } from '$lib/format';

	// Share-of-voice over time, one line per product. Colors are entity-fixed
	// (assigned once by overall rank at render, never repainted) and the trio
	// passes the six palette checks against the paper surface.
	type Series = { name: string; color: string; points: Array<number | null> };

	let { dates, series }: { dates: number[]; series: Series[] } = $props();

	const W = 640;
	const H = 220;
	const M = { top: 14, right: 16, bottom: 26, left: 40 };

	const x = (i: number) =>
		M.left + (dates.length === 1 ? 0 : (i / (dates.length - 1)) * (W - M.left - M.right));
	const y = (pct: number) => M.top + (1 - pct / 100) * (H - M.top - M.bottom);

	function path(points: Array<number | null>): string {
		let d = '';
		let pen = false;
		points.forEach((p, i) => {
			if (p === null) {
				pen = false;
				return;
			}
			d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`;
			pen = true;
		});
		return d;
	}

	// Direct end-labels, nudged apart when lines end close together.
	const endLabels = $derived.by(() => {
		const labels: Array<{ name: string; yPos: number }> = [];
		for (const s of series) {
			for (let i = s.points.length - 1; i >= 0; i--) {
				const value = s.points[i];
				if (value !== null) {
					labels.push({ name: s.name, yPos: y(value) });
					break;
				}
			}
		}
		labels.sort((a, b) => a.yPos - b.yPos);
		for (let i = 1; i < labels.length; i++) {
			if (labels[i].yPos - labels[i - 1].yPos < 14) labels[i].yPos = labels[i - 1].yPos + 14;
		}
		return labels;
	});

	let hover = $state<number | null>(null);

	const hoverInfo = $derived.by(() => {
		if (hover === null) return null;
		const i = hover;
		const rows: Array<{ name: string; color: string; pct: number }> = [];
		for (const s of series) {
			const pct = s.points[i];
			if (pct !== null) rows.push({ name: s.name, color: s.color, pct });
		}
		return { xPos: x(i), date: dates[i], rows };
	});

	function onMove(event: MouseEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const px = ((event.clientX - rect.left) / rect.width) * W;
		let best = 0;
		let bestDist = Infinity;
		dates.forEach((_, i) => {
			const d = Math.abs(x(i) - px);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		});
		hover = best;
	}
</script>

<div class="chart">
	<svg
		viewBox={`0 0 ${W} ${H}`}
		role="img"
		aria-label="Share of voice over time"
		onmousemove={onMove}
		onmouseleave={() => (hover = null)}
	>
		<!-- recessive grid -->
		{#each [0, 50, 100] as g (g)}
			<line class="grid" x1={M.left} x2={W - M.right} y1={y(g)} y2={y(g)} stroke-dasharray="2 4" />
			<text class="axis" x={M.left - 6} y={y(g) + 3} text-anchor="end">{g}%</text>
		{/each}
		<text class="axis" x={M.left} y={H - 8}>{stampDate(dates[0])}</text>
		<text class="axis" x={W - M.right} y={H - 8} text-anchor="end">
			{stampDate(dates[dates.length - 1])}
		</text>

		{#if hoverInfo}
			<line
				class="crosshair"
				x1={hoverInfo.xPos}
				x2={hoverInfo.xPos}
				y1={M.top}
				y2={H - M.bottom}
			/>
		{/if}

		{#each series as s (s.name)}
			<path d={path(s.points)} fill="none" stroke={s.color} stroke-width="2" />
		{/each}
		{#if hoverInfo}
			{#each hoverInfo.rows as row (row.name)}
				<circle
					cx={hoverInfo.xPos}
					cy={y(row.pct)}
					r="4"
					fill={row.color}
					stroke="var(--color-paper)"
					stroke-width="2"
				/>
			{/each}
		{/if}
	</svg>

	<!-- direct end-labels wear ink, not series color -->
	{#each endLabels as label (label.name)}
		<span class="end-label" style={`top: ${(label.yPos / H) * 100}%`}>{label.name}</span>
	{/each}

	{#if hoverInfo}
		<div class="tooltip" style={`left: ${(hoverInfo.xPos / W) * 100}%`}>
			<div class="tip-date">{stampDate(hoverInfo.date)}</div>
			{#each hoverInfo.rows as row (row.name)}
				<div class="tip-row">
					<span class="chip" style={`background: ${row.color}`}></span>
					<span class="tip-name">{row.name}</span>
					<span class="tip-val">{row.pct}%</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<div class="legend">
	{#each series as s (s.name)}
		<span class="legend-item"
			><span class="chip" style={`background: ${s.color}`}></span>{s.name}</span
		>
	{/each}
</div>

<!-- data table for screen readers -->
<table class="sr-only">
	<caption>Share of voice per run</caption>
	<thead>
		<tr>
			<th>Run date</th>
			{#each series as s (s.name)}<th>{s.name}</th>{/each}
		</tr>
	</thead>
	<tbody>
		{#each dates as date, i (date)}
			<tr>
				<td>{stampDate(date)}</td>
				{#each series as s (s.name)}<td>{s.points[i] === null ? '—' : `${s.points[i]}%`}</td>{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.chart {
		position: relative;
		/* room for end-labels */
		padding-right: 8.5rem;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.grid {
		stroke: var(--color-rule);
		stroke-width: 1;
	}

	.axis {
		font-family: var(--font-mono);
		font-size: 9px;
		fill: var(--color-mark);
	}

	.crosshair {
		stroke: var(--color-mark);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.end-label {
		position: absolute;
		right: 0;
		transform: translateY(-50%);
		max-width: 8rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.85rem;
		color: var(--color-ink);
	}

	.tooltip {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		background: var(--color-paper);
		border: 1px solid var(--color-ink);
		padding: 0.45rem 0.6rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		pointer-events: none;
		min-width: 10rem;
		z-index: 2;
	}

	.tip-date {
		color: var(--color-mark);
		margin-bottom: 0.3rem;
		letter-spacing: 0.08em;
	}

	.tip-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.08rem 0;
	}

	.tip-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-ink);
	}

	.tip-val {
		color: var(--color-ink);
	}

	.chip {
		width: 0.55rem;
		height: 0.55rem;
		display: inline-block;
		flex: none;
	}

	.legend {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
</style>
