<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import { stampDate } from '$lib/format';
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>The Shifts — Model Memory</title>
	<meta
		name="description"
		content="A changelog of LLM mindshare: every time the models' consensus recommendation changed."
	/>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section class="hero">
			<h1>The <em>shifts.</em></h1>
			<p class="subhead">
				Mindshare is sticky — until it isn't. Every entry below is a moment the models' consensus
				answer changed.
			</p>
		</section>

		<hr class="rule" />

		<section>
			{#if !data.available}
				<p class="notice">The ledger is warming up — the gateway is not reachable yet.</p>
			{:else if data.shifts.length === 0}
				<p class="notice">
					No shifts recorded yet. The same names keep coming back — which is rather the point.
				</p>
			{:else}
				<ul class="ledger">
					{#each data.shifts as shift (shift.run_id + shift.question_id)}
						<li>
							<a class="row-main" href={resolve('/archive/[runId]', { runId: shift.run_id })}>
								<span class="logged">{stampDate(shift.at)}</span>
								<span class="flip">
									<s>{shift.from}</s>
									<span class="arrow">&rarr;</span>
									<em>{shift.to}</em>
									<span class="count">{shift.count}&thinsp;⁄&thinsp;{shift.of}</span>
								</span>
							</a>
							<a
								class="question"
								href={resolve('/archive/q/[questionId]', { questionId: shift.question_id })}
							>
								&ldquo;{shift.question_text}&rdquo;
							</a>
						</li>
					{/each}
				</ul>
				<p class="footnote">
					Machine-readable: <code>GET /api/shifts</code>.
				</p>
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

	.hero h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(2.5rem, 8vw, 5rem);
		line-height: 0.95;
		margin: 0;
	}

	.hero h1 em {
		font-style: italic;
		color: var(--color-stamp);
	}

	.hero .subhead {
		font-family: var(--font-body);
		font-size: clamp(1.05rem, 1.5vw, 1.25rem);
		line-height: 1.55;
		max-width: 42ch;
		margin: 1.25rem 0 0;
	}

	.rule {
		border: 0;
		border-top: 1px solid var(--color-rule);
		margin: clamp(2rem, 5vw, 3.5rem) 0;
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
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.85rem 0;
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

	.logged {
		color: var(--color-mark);
	}

	.flip {
		font-family: var(--font-body);
		font-size: 1.15rem;
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.flip s {
		color: var(--color-mark);
	}

	.flip .arrow {
		color: var(--color-stamp);
	}

	.flip em {
		color: var(--color-stamp);
		font-style: italic;
	}

	.flip .count {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--color-mark);
	}

	.question {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		color: var(--color-mark);
		text-decoration: none;
	}

	.question:hover {
		color: var(--color-stamp);
	}

	.notice {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
		max-width: 60ch;
	}

	.footnote {
		margin-top: 1.25rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--color-mark);
	}

	.footnote code {
		color: var(--color-ink);
	}
</style>
