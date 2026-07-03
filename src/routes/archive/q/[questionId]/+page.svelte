<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import TrendChart from '$lib/TrendChart.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import { shortAddress, stampDate } from '$lib/format';
	import { resolve } from '$app/paths';
	import { displayModel, productKey, tallyProducts } from '$lib/products';

	let { data } = $props();

	const question = $derived(data.history.question);

	// Overall share of voice: every named pick across every archived run.
	const share = $derived.by(() => {
		const all = data.history.runs.flatMap((r) => r.picks.map((p) => p.recommended_product));
		const tally = tallyProducts(all);
		const total = tally.reduce((sum, t) => sum + t.count, 0);
		return { tally: tally.slice(0, 6), total };
	});

	// Per-run consensus rows, newest first.
	const timeline = $derived(
		data.history.runs.map(({ run, picks }) => {
			const named = picks.filter((p) => p.recommended_product);
			const tally = tallyProducts(named.map((p) => p.recommended_product));
			const top = tally[0] ?? null;
			const dissenters = top
				? named
						.filter((p) => productKey(p.recommended_product as string) !== productKey(top.name))
						.map((p) => displayModel(p.model))
				: [];
			const excerpt = top
				? (named.find((p) => productKey(p.recommended_product as string) === productKey(top.name))
						?.excerpt ?? null)
				: null;
			return { run, top, named: named.length, dissenters, excerpt };
		})
	);

	// Model ledger: one row per model, one column per run (oldest left),
	// highlighting the moments a model's pick flips.
	const MATRIX_RUNS = 10;
	const matrix = $derived.by(() => {
		const runs = [...data.history.runs].slice(0, MATRIX_RUNS).reverse();
		if (runs.length < 2) return null;
		const models = [...new Set(runs.flatMap((r) => r.picks.map((p) => p.model)))].sort();
		const rows = models.map((model) => {
			let prevKey: string | null = null;
			const cells = runs.map(({ run, picks }) => {
				const pick = picks.find((p) => p.model === model);
				const product = pick?.recommended_product ?? null;
				const key = product ? productKey(product) : null;
				const flipped = key !== null && prevKey !== null && key !== prevKey;
				if (key !== null) prevKey = key;
				return { runId: run.id, product, flipped, errored: Boolean(pick?.error) };
			});
			return { model, cells };
		});
		return { runs: runs.map((r) => r.run), rows };
	});

	// Share-of-voice over time for the top products. Colors are entity-fixed
	// by overall rank at render (validated trio for the paper surface).
	const CHART_COLORS = ['#a8261c', '#0f6fae', '#a07414'];
	const trend = $derived.by(() => {
		const runsAsc = [...data.history.runs]
			.reverse()
			.map(({ run, picks }) => ({ run, named: picks.filter((p) => p.recommended_product) }))
			.filter((r) => r.named.length > 0);
		if (runsAsc.length < 2 || share.tally.length === 0) return null;
		const top = share.tally.slice(0, CHART_COLORS.length);
		return {
			dates: runsAsc.map((r) => r.run.created_at),
			series: top.map((t, i) => ({
				name: t.name,
				color: CHART_COLORS[i],
				points: runsAsc.map(({ named }) => {
					const count = named.filter(
						(p) => productKey(p.recommended_product as string) === productKey(t.name)
					).length;
					return Math.round((count / named.length) * 100);
				})
			}))
		};
	});

	// The matrix reads oldest -> newest; when it overflows, the newest runs
	// (the interesting end) must be the visible ones.
	let matrixScroll = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (matrix && matrixScroll) matrixScroll.scrollLeft = matrixScroll.scrollWidth;
	});
</script>

<svelte:head>
	<title>{question.text} — Model Memory</title>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section>
			<div class="entry-header">
				<span class="stamp">Tracked question</span>
				<span class="logged">since {stampDate(question.created_at)}</span>
			</div>

			<p class="query">
				<span class="quote">&ldquo;</span>{question.text}<span class="quote">&rdquo;</span>
			</p>

			<p class="status-line">
				{#if question.category}
					<a class="tag pay" href={resolve('/category/[name]', { name: question.category })}
						>{question.category}</a
					>
				{/if}
				<span class="tag" class:on={question.weekly === 1}
					>weekly: {question.weekly ? 'on' : 'off'}</span
				>
				<span class="tag" class:on={data.credits > 0}>
					{data.credits} refresh{data.credits === 1 ? '' : 'es'} funded
				</span>
				<a class="tag pay" href={`${resolve('/commission')}?questionId=${question.id}`}>
					refresh — pay with wallet
				</a>
				{#if data.history.funders.length > 0}
					<span class="funders">
						funded by
						{#each data.history.funders as funder, i (funder)}
							<a href={resolve('/archive/by/[address]', { address: funder })}
								><code>{shortAddress(funder)}</code></a
							>{i < data.history.funders.length - 1 ? ', ' : ''}
						{/each}
					</span>
				{/if}
			</p>
		</section>

		<hr class="rule" />

		<section>
			<h2 class="section-title">Share of voice</h2>
			{#if share.total === 0}
				<p class="notice">No extracted recommendations yet.</p>
			{:else}
				<ul class="share">
					{#each share.tally as { name, count } (name)}
						<li>
							<a class="share-name" href={resolve('/products/[slug]', { slug: productKey(name) })}
								>{name}</a
							>
							<span class="bar" aria-hidden="true">
								<span class="fill" style={`width: ${Math.round((count / share.total) * 100)}%`}
								></span>
							</span>
							<span class="share-pct">{Math.round((count / share.total) * 100)}%</span>
						</li>
					{/each}
				</ul>
				<p class="footnote">
					{share.total} named recommendation{share.total === 1 ? '' : 's'} across {data.history.runs
						.length} run{data.history.runs.length === 1 ? '' : 's'}.
				</p>
			{/if}
		</section>

		{#if trend}
			<hr class="rule" />

			<section>
				<h2 class="section-title">Share over time</h2>
				<TrendChart dates={trend.dates} series={trend.series} />
			</section>
		{/if}

		{#if matrix}
			<hr class="rule" />

			<section>
				<h2 class="section-title">Model ledger</h2>
				<div class="matrix-scroll" bind:this={matrixScroll}>
					<table class="matrix">
						<thead>
							<tr>
								<th class="model-col">model</th>
								{#each matrix.runs as run (run.id)}
									<th
										><a href={resolve('/archive/[runId]', { runId: run.id })}
											>{stampDate(run.created_at)}</a
										></th
									>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each matrix.rows as { model, cells } (model)}
								<tr>
									<td class="model-col" title={model}>{displayModel(model)}</td>
									{#each cells as cell, i (cell.runId + model + i)}
										<td class:flipped={cell.flipped} title={cell.product ?? undefined}>
											{#if cell.product}
												{cell.flipped ? '※ ' : ''}{cell.product}
											{:else if cell.errored}
												<span class="err">×</span>
											{:else}
												<span class="none">—</span>
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="footnote">※ marks a flip — the model changed its pick from the previous run.</p>
			</section>
		{/if}

		<hr class="rule" />

		<section>
			<h2 class="section-title">Timeline</h2>
			{#if timeline.length === 0}
				<p class="notice">No runs archived for this question yet.</p>
			{:else}
				<ul class="ledger">
					{#each timeline as { run, top, named, dissenters, excerpt } (run.id)}
						<li>
							<a class="row-main" href={resolve('/archive/[runId]', { runId: run.id })}>
								<span class="logged">{stampDate(run.created_at)}</span>
								{#if top}
									<span class="pick">{top.name}</span>
									<span class="count">{top.count}&thinsp;⁄&thinsp;{named}</span>
								{:else}
									<span class="pick muted">
										{run.status === 'running' ? 'in progress' : 'no clear pick'}
									</span>
								{/if}
							</a>
							{#if excerpt}
								<span class="excerpt">&ldquo;{excerpt}&hellip;&rdquo;</span>
							{/if}
							{#if dissenters.length > 0}
								<span class="dissent">dissent: {dissenters.join(', ')}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</main>

	<Colophon />
</div>

<style>
	.paper {
		max-width: 920px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 5vw, 4rem) 4rem;
		min-height: 100vh;
	}

	.entry-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		margin-bottom: 1.5rem;
	}

	.entry-header .stamp {
		color: var(--color-stamp);
		border: 1px solid var(--color-stamp);
		padding: 0.25rem 0.55rem;
		display: inline-block;
		transform: rotate(-1.2deg);
	}

	.entry-header .logged {
		color: var(--color-mark);
	}

	.query {
		font-family: var(--font-display);
		font-size: clamp(1.7rem, 4vw, 2.6rem);
		line-height: 1.18;
		font-style: italic;
		margin: 0 0 1.25rem;
		max-width: 30ch;
	}

	.query .quote {
		color: var(--color-stamp);
		font-style: normal;
		margin: 0 0.05em;
	}

	.status-line {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.9rem;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-mark);
	}

	.tag {
		border: 1px solid var(--color-rule);
		padding: 0.1rem 0.4rem;
	}

	.tag.on {
		border-color: var(--color-stamp);
		color: var(--color-stamp);
	}

	a.tag.pay {
		text-decoration: none;
		color: var(--color-ink);
	}

	a.tag.pay:hover {
		border-color: var(--color-stamp);
		color: var(--color-stamp);
	}

	.funders a {
		text-decoration: none;
	}

	.funders a:hover code {
		color: var(--color-stamp);
	}

	.funders code {
		text-transform: none;
		color: var(--color-ink);
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-weight: 500;
		color: var(--color-mark);
		margin: 0 0 1.25rem;
	}

	.rule {
		border: 0;
		border-top: 1px solid var(--color-rule);
		margin: clamp(2rem, 5vw, 3.5rem) 0;
	}

	.matrix-scroll {
		overflow-x: auto;
	}

	.matrix {
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		width: 100%;
	}

	.matrix th,
	.matrix td {
		border: 1px dashed var(--color-rule);
		padding: 0.4rem 0.6rem;
		text-align: left;
		white-space: nowrap;
		max-width: 11rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.matrix thead th {
		font-weight: 500;
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-mark);
	}

	.matrix thead a {
		color: inherit;
		text-decoration: none;
	}

	.matrix thead a:hover {
		color: var(--color-stamp);
	}

	.matrix .model-col {
		font-weight: 500;
		color: var(--color-ink);
	}

	.matrix td.flipped {
		color: var(--color-stamp);
		border-color: var(--color-stamp);
	}

	.matrix .none,
	.matrix .err {
		color: var(--color-mark);
	}

	.share {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.6rem;
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	.share li {
		display: grid;
		grid-template-columns: minmax(8rem, 14rem) 1fr 3rem;
		align-items: center;
		gap: 1rem;
	}

	.share-name {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1.05rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-ink);
		text-decoration: none;
	}

	a.share-name:hover {
		color: var(--color-stamp);
	}

	.bar {
		height: 0.55rem;
		border: 1px solid var(--color-rule);
		display: block;
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--color-stamp);
		opacity: 0.75;
	}

	.share-pct {
		text-align: right;
		color: var(--color-mark);
	}

	.ledger {
		list-style: none;
		padding: 0;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.9rem;
	}

	.ledger li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		padding: 0.6rem 0;
		border-top: 1px dashed var(--color-rule);
	}

	.ledger li:last-child {
		border-bottom: 1px dashed var(--color-rule);
	}

	.row-main {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		text-decoration: none;
		color: inherit;
	}

	.row-main:hover .pick {
		color: var(--color-stamp);
	}

	.logged {
		color: var(--color-mark);
	}

	.pick {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1.05rem;
	}

	.pick.muted {
		color: var(--color-mark);
	}

	.count {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--color-mark);
	}

	.excerpt {
		flex-basis: 100%;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.9rem;
		color: var(--color-mark);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dissent {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-stamp);
	}

	.notice {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
	}

	.footnote {
		margin-top: 1rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--color-mark);
	}
</style>
