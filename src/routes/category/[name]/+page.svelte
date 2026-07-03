<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import TrendChart from '$lib/TrendChart.svelte';
	import { stampDate } from '$lib/format';
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} — Model Memory</title>
	<meta
		name="description"
		content={`Which products LLMs recommend for ${data.name}: share of voice across ${data.questions.length} tracked questions.`}
	/>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section>
			<div class="entry-header">
				<span class="stamp">Category</span>
				<span class="logged"
					>{data.total} recommendation{data.total === 1 ? '' : 's'} on record</span
				>
			</div>
			<p class="query">{data.name}</p>
		</section>

		<hr class="rule" />

		<section>
			<h2 class="section-title">Share of voice</h2>
			<ul class="share">
				{#each data.share as { name, count, key } (key)}
					<li>
						<a class="share-name" href={resolve('/products/[slug]', { slug: key })}>{name}</a>
						<span class="bar" aria-hidden="true">
							<span class="fill" style={`width: ${Math.round((count / data.total) * 100)}%`}></span>
						</span>
						<span class="share-pct">{Math.round((count / data.total) * 100)}%</span>
					</li>
				{/each}
			</ul>
		</section>

		{#if data.trend}
			<hr class="rule" />

			<section>
				<h2 class="section-title">Share over time</h2>
				<TrendChart dates={data.trend.dates} series={data.trend.series} />
			</section>
		{/if}

		<hr class="rule" />

		<section>
			<h2 class="section-title">Questions in this category</h2>
			<ul class="ledger">
				{#each data.questions as q (q.question_id)}
					<li>
						<a
							class="q-text"
							href={resolve('/archive/q/[questionId]', { questionId: q.question_id })}>{q.text}</a
						>
						<span class="q-meta">
							{#if q.top && q.topKey}
								<a class="top-pick" href={resolve('/products/[slug]', { slug: q.topKey })}
									>{q.top}</a
								>
							{/if}
							<span class="logged">{stampDate(q.at)}</span>
						</span>
					</li>
				{/each}
			</ul>
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
		font-size: clamp(2.2rem, 6vw, 4rem);
		line-height: 1.05;
		margin: 0;
		text-transform: capitalize;
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
		color: var(--color-ink);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.share-name:hover {
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
		gap: 0.5rem 1rem;
		padding: 0.6rem 0;
		border-top: 1px dashed var(--color-rule);
	}

	.ledger li:last-child {
		border-bottom: 1px dashed var(--color-rule);
	}

	.q-text {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1.05rem;
		color: var(--color-ink);
		text-decoration: none;
	}

	.q-text:hover {
		color: var(--color-stamp);
	}

	.q-meta {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
	}

	.top-pick {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-stamp);
		text-decoration: none;
	}

	.top-pick:hover {
		text-decoration: underline;
	}

	.logged {
		color: var(--color-mark);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
</style>
