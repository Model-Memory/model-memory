<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import { stampDate } from '$lib/format';
	import { resolve } from '$app/paths';
	import { displayModel } from '$lib/products';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} — Model Memory</title>
	<meta
		name="description"
		content={`Where LLMs recommend ${data.name}: ${data.mentions} archived recommendations across ${data.questions.length} tracked questions.`}
	/>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section>
			<div class="entry-header">
				<span class="stamp">Product file</span>
				<span class="logged">
					{data.mentions} recommendation{data.mentions === 1 ? '' : 's'} on record
				</span>
			</div>

			<p class="query">{data.name}</p>

			{#if data.categories.length > 0}
				<p class="status-line">
					{#each data.categories as c (c)}
						<a class="tag" href={resolve('/category/[name]', { name: c })}>{c}</a>
					{/each}
				</p>
			{/if}
		</section>

		<hr class="rule" />

		<section>
			<h2 class="section-title">Share by question</h2>
			<ul class="share">
				{#each data.questions as q (q.question_id)}
					<li>
						<a
							class="share-name"
							href={resolve('/archive/q/[questionId]', { questionId: q.question_id })}>{q.text}</a
						>
						<span class="bar" aria-hidden="true">
							<span class="fill" style={`width: ${Math.round((q.count / q.total) * 100)}%`}></span>
						</span>
						<span class="share-pct">{Math.round((q.count / q.total) * 100)}%</span>
					</li>
				{/each}
			</ul>
		</section>

		<hr class="rule" />

		<section>
			<h2 class="section-title">Latest mentions</h2>
			<ul class="ledger">
				{#each data.recent as pick (pick.run_id + pick.model)}
					<li>
						<a class="row-main" href={resolve('/archive/[runId]', { runId: pick.run_id })}>
							<span class="logged">{stampDate(pick.run_created_at)}</span>
							<span class="model" title={pick.model}>{displayModel(pick.model)}</span>
							<span class="pick">&ldquo;{pick.recommended_product}&rdquo;</span>
						</a>
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
		margin: 0 0 1.25rem;
	}

	.status-line {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin: 0;
	}

	.tag {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border: 1px solid var(--color-rule);
		padding: 0.1rem 0.4rem;
		color: var(--color-mark);
		text-decoration: none;
	}

	.tag:hover {
		border-color: var(--color-stamp);
		color: var(--color-stamp);
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
		grid-template-columns: minmax(10rem, 22rem) 1fr 3rem;
		align-items: center;
		gap: 1rem;
	}

	.share-name {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
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
		flex-wrap: wrap;
		text-decoration: none;
		color: inherit;
	}

	.row-main:hover .pick {
		color: var(--color-stamp);
	}

	.logged {
		color: var(--color-mark);
	}

	.model {
		font-weight: 500;
	}

	.pick {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1rem;
	}
</style>
