<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import { stampDateTime } from '$lib/format';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { displayModel, tallyProducts } from '$lib/products';

	let { data } = $props();

	const run = $derived(data.detail.run);
	const responses = $derived(data.detail.responses);
	const consensus = $derived.by(() => {
		const named = responses
			.map((r) => r.recommended_product)
			.filter((p): p is string => Boolean(p));
		const tally = tallyProducts(named);
		if (tally.length === 0) return null;
		return { top: tally[0].name, n: tally[0].count, of: named.length };
	});

	// Live progress: while the fan-out runs, refetch every few seconds so
	// answers appear as models respond — no manual reload.
	$effect(() => {
		if (run.status !== 'running') return;
		const timer = setInterval(() => void invalidateAll(), 5000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Run — Model Memory</title>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section class="entry">
			<div class="entry-header">
				<span class="stamp">{run.status === 'running' ? 'In progress' : 'Archived'}</span>
				<span class="logged">
					Logged {stampDateTime(run.created_at)}
					{#if run.content_hash}
						&nbsp;·&nbsp;<code title={`sha256: ${run.content_hash}`}
							>{run.content_hash.slice(0, 12)}</code
						>
					{/if}
				</span>
			</div>

			<p class="query">
				<span class="quote">&ldquo;</span>{run.prompt}<span class="quote">&rdquo;</span>
			</p>

			{#if run.question_id}
				<p class="crossref">
					<a href={resolve('/archive/q/[questionId]', { questionId: run.question_id })}
						>This question's history &rarr;</a
					>
				</p>
			{/if}

			{#if run.status === 'running'}
				<p class="notice live">
					<span class="pulse" aria-hidden="true"></span>
					{responses.length} of {run.model_count} models answered — updating live.
				</p>
			{/if}

			{#if responses.length === 0}
				{#if run.status !== 'running'}
					<p class="notice">No responses were archived for this run.</p>
				{/if}
			{:else}
				<ul class="answers">
					{#each responses as r (`${r.model}#${r.sample_index}`)}
						<li class:errored={r.error !== null}>
							<div class="answer-head">
								<span class="model" title={r.model}>
									{displayModel(r.model)}{r.sample_index > 0 ? ` #${r.sample_index + 1}` : ''}
								</span>
								<span class="answer-meta">
									{#if r.latency_ms !== null}
										<span>{(r.latency_ms / 1000).toFixed(1)}s</span>
									{/if}
									{#if r.recommended_product}
										<span class="product">※ {r.recommended_product}</span>
									{:else if r.error}
										<span class="errmark">error</span>
									{/if}
								</span>
							</div>
							{#if r.response_text}
								<p class="response">{r.response_text}</p>
							{:else if r.error}
								<p class="response error-text">{r.error}</p>
							{/if}
						</li>
					{/each}
				</ul>

				{#if consensus}
					<p class="consensus">
						Consensus {consensus.n}&thinsp;⁄&thinsp;{consensus.of} for
						<em>{consensus.top}</em>.
					</p>
				{/if}
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

	.entry-header .logged code {
		text-transform: none;
		letter-spacing: 0.04em;
	}

	.query {
		font-family: var(--font-display);
		font-size: clamp(1.7rem, 4vw, 2.6rem);
		line-height: 1.18;
		font-style: italic;
		margin: 0 0 2rem;
		max-width: 30ch;
	}

	.query .quote {
		color: var(--color-stamp);
		font-style: normal;
		margin: 0 0.05em;
	}

	.answers {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.answers li {
		padding: 1rem 0;
		border-top: 1px dashed var(--color-rule);
	}

	.answers li:last-child {
		border-bottom: 1px dashed var(--color-rule);
	}

	.answer-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	.answer-head .model {
		font-weight: 500;
	}

	.answer-meta {
		display: flex;
		gap: 0.9rem;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-mark);
	}

	.answer-meta .product {
		color: var(--color-stamp);
		text-transform: none;
		letter-spacing: 0;
		font-size: 0.85rem;
	}

	.answer-meta .errmark {
		color: var(--color-stamp);
	}

	.response {
		font-family: var(--font-body);
		font-size: 1rem;
		line-height: 1.55;
		margin: 0.6rem 0 0;
		white-space: pre-wrap;
		max-height: 14rem;
		overflow-y: auto;
	}

	.response.error-text {
		color: var(--color-mark);
		font-style: italic;
	}

	.consensus {
		margin: 1.5rem 0 0;
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
		font-size: 1rem;
	}

	.consensus em {
		color: var(--color-stamp);
	}

	.notice {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
	}

	.crossref {
		margin: -1rem 0 1.5rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.crossref a {
		color: var(--color-mark);
		text-decoration: none;
	}

	.crossref a:hover {
		color: var(--color-stamp);
	}

	.notice.live {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.pulse {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: var(--color-stamp);
		animation: pulse 1.6s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.25;
		}
	}
</style>
