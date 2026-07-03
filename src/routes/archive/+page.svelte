<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import Sparkline from '$lib/Sparkline.svelte';
	import { stampDateTime } from '$lib/format';
	import { resolve } from '$app/paths';

	let { data } = $props();

	const balanceByQuestion = $derived(
		new Map(data.balances.questions.map((b) => [b.question_id, b.available_credits]))
	);
	const questionById = $derived(new Map(data.questions.map((q) => [q.id, q])));
</script>

<svelte:head>
	<title>The Archive — Model Memory</title>
	<meta name="description" content="Every query, every model, every answer — time-stamped." />
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		{#if !data.available}
			<p class="notice">
				The archive is warming up — the gateway is not reachable from this deployment yet.
			</p>
		{:else}
			<section>
				<h2 class="section-title">Tracked questions</h2>
				<form class="search" method="GET">
					<input
						type="search"
						name="q"
						value={data.search}
						placeholder="Search questions and categories…"
					/>
					{#if data.search}
						<a class="clear" href={resolve('/archive')}>clear</a>
					{/if}
				</form>
				{#if data.search && (data.productHits.length > 0 || data.categoryHits.length > 0)}
					<p class="hits">
						{#if data.productHits.length > 0}
							<span class="hits-label">products:</span>
							{#each data.productHits as hit (hit.key)}
								<a class="tag" href={resolve('/products/[slug]', { slug: hit.key })}>
									{hit.name} ({hit.count})
								</a>
							{/each}
						{/if}
						{#if data.categoryHits.length > 0}
							<span class="hits-label">categories:</span>
							{#each data.categoryHits as c (c)}
								<a class="tag" href={resolve('/category/[name]', { name: c })}>{c}</a>
							{/each}
						{/if}
					</p>
				{/if}
				{#if data.questions.length === 0}
					{#if data.search}
						<p class="notice">
							{data.productHits.length > 0 || data.categoryHits.length > 0
								? 'No tracked questions match — but the hits above do.'
								: 'Nothing matches that search.'}
						</p>
					{:else}
						<p class="notice">
							No questions tracked yet.
							<a class="link" href={resolve('/commission')}>Commission the first one &rarr;</a>
						</p>
					{/if}
				{:else}
					<ul class="ledger">
						{#each data.questions as q (q.id)}
							{@const credits = (balanceByQuestion.get(q.id) ?? 0) + data.balances.global_credits}
							<li>
								<a class="q-text" href={resolve('/archive/q/[questionId]', { questionId: q.id })}
									>{q.text}</a
								>
								<span class="q-meta">
									{#if data.sparks[q.id]}
										<Sparkline
											points={data.sparks[q.id]}
											label={`Consensus share trend for ${q.text}`}
										/>
									{/if}
									{#if q.category}
										<span class="tag">{q.category}</span>
									{/if}
									<span class="credits" class:unfunded={credits === 0}>
										{credits} refresh{credits === 1 ? '' : 'es'} funded
									</span>
									<span class="tag" class:on={q.weekly === 1}>
										weekly: {q.weekly ? 'on' : 'off'}
									</span>
								</span>
							</li>
						{/each}
					</ul>
					<p class="footnote">
						Shared pool: {data.balances.global_credits} credit{data.balances.global_credits === 1
							? ''
							: 's'} usable by every question.
					</p>
				{/if}
			</section>

			<hr class="rule" />

			<section>
				<h2 class="section-title">Recent runs</h2>
				{#if data.runs.length === 0}
					<p class="notice">No runs yet.</p>
				{:else}
					<ul class="ledger">
						{#each data.runs as run (run.id)}
							<li>
								<a class="q-text" href={resolve('/archive/[runId]', { runId: run.id })}
									>{run.prompt}</a
								>
								<span class="q-meta">
									{#if run.question_id && questionById.get(run.question_id)}
										<span class="tag">tracked</span>
									{/if}
									<span class="tag" class:on={run.status === 'running'}>{run.status}</span>
									<span class="logged">{stampDateTime(run.created_at)}</span>
								</span>
							</li>
						{/each}
					</ul>
					{#if data.page > 1 || data.hasOlder}
						<nav class="pager">
							{#if data.page > 1}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve()-based path plus a query string -->
								<a href={`${resolve('/archive')}?page=${data.page - 1}`}>&larr; newer</a>
							{:else}
								<span></span>
							{/if}
							<span class="page-no">page {data.page}</span>
							{#if data.hasOlder}
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve()-based path plus a query string -->
								<a href={`${resolve('/archive')}?page=${data.page + 1}`}>older &rarr;</a>
							{/if}
						</nav>
					{/if}
				{/if}
			</section>

			<hr class="rule" />

			<section>
				<h2 class="section-title">Commission a query</h2>
				<p class="notice">
					No accounts here — your wallet is your identity. Pay a few cents in USDC via
					<a class="link" href="https://www.x402.org" rel="external">x402</a> and the result enters
					the public archive. One payment buys refresh credits; unspent credits fund that query's
					weekly refreshes.
					<a class="link" href={resolve('/commission')}>Pay in the browser &rarr;</a>
				</p>
				<pre class="howto">{`# new query: 1 refresh now + 3 banked for weekly sweeps
POST /api/commission
{ "prompt": "Where should I host my SvelteKit app?",
  "credits": 4, "weekly": true, "category": "hosting" }

# refresh an existing query
{ "questionId": "<id>", "credits": 1 }

# top up a buffer shared by several queries — or by all of them
{ "allocation": "subset", "questionIds": ["<id>", "<id>"], "credits": 10 }
{ "allocation": "all", "credits": 25 }`}</pre>
				<p class="footnote">
					Use an x402 client (e.g. <code>x402-fetch</code>) — the endpoint answers HTTP 402 with
					payment requirements. <code>GET /api/commission</code> returns live pricing.
				</p>
			</section>
		{/if}
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

	.search {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.search input {
		flex: 1 1 18rem;
		max-width: 26rem;
		background: transparent;
		border: 1px solid var(--color-rule);
		font-family: var(--font-body);
		font-size: 0.95rem;
		padding: 0.4rem 0.7rem;
		color: var(--color-ink);
	}

	.search input:focus {
		border-color: var(--color-stamp);
		outline: none;
	}

	.search .clear {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-mark);
		text-decoration: none;
	}

	.search .clear:hover {
		color: var(--color-stamp);
	}

	.hits {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem 0.6rem;
		margin: 0 0 1.25rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hits-label {
		color: var(--color-mark);
	}

	.hits a.tag {
		text-decoration: none;
	}

	.hits a.tag:hover {
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

	a.q-text:hover {
		color: var(--color-stamp);
	}

	.q-meta {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.credits {
		color: var(--color-ink);
	}

	.credits.unfunded {
		color: var(--color-mark);
	}

	.tag {
		border: 1px solid var(--color-rule);
		padding: 0.1rem 0.4rem;
		color: var(--color-mark);
	}

	.tag.on {
		border-color: var(--color-stamp);
		color: var(--color-stamp);
	}

	.logged {
		color: var(--color-mark);
	}

	.pager {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		margin-top: 1rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.pager a {
		color: var(--color-mark);
		text-decoration: none;
	}

	.pager a:hover {
		color: var(--color-stamp);
	}

	.pager .page-no {
		color: var(--color-mark);
	}

	.notice {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
		max-width: 60ch;
	}

	.notice .link {
		color: var(--color-stamp);
	}

	.footnote {
		margin-top: 1rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--color-mark);
	}

	.footnote code {
		color: var(--color-ink);
	}

	.howto {
		margin: 1.25rem 0 0;
		padding: 1rem 1.2rem;
		border: 1px solid var(--color-rule);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		line-height: 1.6;
		color: var(--color-ink);
		overflow-x: auto;
		background: var(--color-paper-shade);
	}
</style>
