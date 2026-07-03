<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import { stampDate, stampDateTime } from '$lib/format';
	import { resolve } from '$app/paths';
	import { displayModel, productKey, tallyProductCounts, tallyProducts } from '$lib/products';

	let { data } = $props();

	// Printed fallback specimen, shown until the archive has a real run.
	const fallback = {
		query: 'Where should I host my SvelteKit app?',
		logged: 'Logged 2026.05.30 · 14:21 UTC',
		label: 'Entry №042',
		specimens: [
			{ model: 'GPT-5.1', answer: 'Vercel' },
			{ model: 'Claude 4.7', answer: 'Vercel' },
			{ model: 'Gemini 3.0', answer: 'Vercel' },
			{ model: 'Llama 4', answer: 'Cloudflare Pages' },
			{ model: 'DeepSeek-V4', answer: 'Vercel' }
		]
	};

	const live = $derived.by(() => {
		if (!data.latest) return null;
		const rows = data.latest.responses.filter((r) => r.recommended_product);
		if (rows.length === 0) return null;
		return {
			query: data.latest.run.prompt,
			logged: `Logged ${stampDateTime(data.latest.run.created_at)}`,
			label: 'Latest entry',
			runId: data.latest.run.id,
			specimens: rows.slice(0, 5).map((r) => ({
				model: displayModel(r.model),
				answer: r.recommended_product as string
			}))
		};
	});

	const entry = $derived(live ?? fallback);
	const consensusTop = $derived(tallyProducts(entry.specimens.map((s) => s.answer))[0]);

	const fallbackInsights = [
		{ stat: '87%', label: 'of hosting queries name Vercel', category: null as string | null },
		{ stat: '73%', label: 'of database queries name Supabase', category: null as string | null },
		{ stat: '94%', label: 'of router queries name OpenRouter', category: null as string | null }
	];

	// Real insights once categorized questions have enough archived picks;
	// printed numbers until then.
	const MIN_CATEGORY_PICKS = 5;
	const insights = $derived.by(() => {
		const byCategory: Record<string, { name: string; count: number }[]> = {};
		for (const s of data.categoryStats) {
			byCategory[s.category] = [...(byCategory[s.category] ?? []), { name: s.product, count: s.n }];
		}
		const real = Object.entries(byCategory)
			.map(([category, entries]) => {
				const tally = tallyProductCounts(entries);
				const total = tally.reduce((sum, t) => sum + t.count, 0);
				return { category, top: tally[0], total };
			})
			.filter((c) => c.total >= MIN_CATEGORY_PICKS)
			.sort((a, b) => b.total - a.total)
			.slice(0, 3)
			.map((c) => ({
				stat: `${Math.round((c.top.count / c.total) * 100)}%`,
				label: `of ${c.category} queries name ${c.top.name}`,
				category: c.category as string | null
			}));
		return real.length > 0 ? real : fallbackInsights;
	});
</script>

<svelte:head>
	<title>Model Memory — What do LLMs recommend?</title>
	<meta
		name="description"
		content="An archive of which products LLMs recommend, tracked over time. Market research for the post-search era."
	/>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section class="hero">
			<h1>
				What do <em>the&nbsp;machines</em><br />
				recommend?
			</h1>
			<p class="subhead">
				An archive of which products LLMs recommend, tracked over time. Useful when you want to know
				who owns mindshare in your category — and how that shifts.
			</p>
		</section>

		<hr class="rule" />

		<section class="specimen">
			<div class="entry-header">
				<span class="stamp">{entry.label}</span>
				<span class="logged">{entry.logged}</span>
			</div>

			<p class="query">
				<span class="quote">&ldquo;</span>{entry.query}<span class="quote">&rdquo;</span>
			</p>

			<ul class="answers">
				{#each entry.specimens as { model, answer } (model)}
					<li class:diverges={productKey(answer) !== productKey(consensusTop.name)}>
						<span class="model">{model}</span>
						<span class="dots" aria-hidden="true"></span>
						<span class="answer">{answer}</span>
					</li>
				{/each}
			</ul>

			{#if live}
				<p class="consensus">
					Consensus {consensusTop.count}&thinsp;⁄&thinsp;{entry.specimens.length} for
					{consensusTop.name}.
					<a href={resolve('/archive/[runId]', { runId: live.runId })}>Read the full entry &rarr;</a
					>
				</p>
			{:else}
				<p class="consensus">
					Consensus 4&thinsp;⁄&thinsp;5. The dissenter is, naturally, hosted by Cloudflare.
				</p>
			{/if}
		</section>

		{#if data.shifts.length > 0}
			<hr class="rule" />

			<section class="corrections">
				<h3>Corrections column</h3>
				<ul class="shift-strip">
					{#each data.shifts as shift (shift.run_id + shift.question_id)}
						<li>
							<span class="when">{stampDate(shift.at)}</span>
							<span class="flip">
								<s>{shift.from}</s> <span class="arrow">&rarr;</span> <em>{shift.to}</em>
							</span>
							<a
								class="q"
								href={resolve('/archive/q/[questionId]', { questionId: shift.question_id })}
							>
								&ldquo;{shift.question_text}&rdquo;
							</a>
						</li>
					{/each}
				</ul>
				<p class="more"><a href={resolve('/shifts')}>All shifts &rarr;</a></p>
			</section>
		{/if}

		<hr class="rule" />

		<section class="insight">
			<h2>
				They keep saying<br /><em>the&nbsp;same&nbsp;thing.</em>
			</h2>
			<p class="lede">
				When buyers ask an LLM what to use, the same handful of names come back. Model Memory tracks
				that share-of-voice across every major model, and the rare moments it shifts.
			</p>

			<div class="stats">
				{#each insights as { stat, label, category } (stat + label)}
					{#if category}
						<a class="stat linked" href={resolve('/category/[name]', { name: category })}>
							<div class="big">{stat}</div>
							<div class="tag">{label}</div>
						</a>
					{:else}
						<div class="stat">
							<div class="big">{stat}</div>
							<div class="tag">{label}</div>
						</div>
					{/if}
				{/each}
			</div>
		</section>

		<hr class="rule" />

		<section class="method">
			<h3>Method</h3>
			<ol>
				<li>
					<span class="num">i.</span>
					<div>
						<span class="step-title">We ask.</span>
						<span class="step-body"
							>Every major model. Identical prompts. Weekly cadence, plus on demand.</span
						>
					</div>
				</li>
				<li>
					<span class="num">ii.</span>
					<div>
						<span class="step-title">We archive.</span>
						<span class="step-body"
							>Every answer, time-stamped. Queryable, exportable, and citable as evidence.</span
						>
					</div>
				</li>
				<li>
					<span class="num">iii.</span>
					<div>
						<span class="step-title">You refresh.</span>
						<span class="step-body"
							><a class="step-link" href={resolve('/commission')}
								>Commission a new query or refresh an existing one</a
							> for a few cents in stablecoin via x402. We pay the model costs; the result enters the
							public archive.</span
						>
					</div>
				</li>
			</ol>
		</section>

		<section class="coming-soon">
			<p class="cta-row">
				<a class="button" href={resolve('/archive')}>Browse the archive</a>
				<a class="button ghost" href={resolve('/commission')}>Commission a query &rarr;</a>
			</p>
			<p class="sig">— recommendation intelligence, made public</p>
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

	/* —— hero —— */
	.hero h1 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(3.2rem, 11vw, 7.5rem);
		line-height: 0.92;
		letter-spacing: -0.015em;
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
		font-weight: 400;
		max-width: 38ch;
		margin: clamp(1.5rem, 3vw, 2.4rem) 0 0;
		color: var(--color-ink);
	}

	/* —— rules —— */
	.rule {
		border: 0;
		border-top: 1px solid var(--color-rule);
		margin: clamp(3rem, 6vw, 5rem) 0;
	}

	/* —— specimen ledger —— */
	.specimen {
		position: relative;
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
		margin: 0 0 2rem;
		max-width: 26ch;
	}

	.query .quote {
		color: var(--color-stamp);
		font-style: normal;
		font-weight: 400;
		margin: 0 0.05em;
	}

	.answers {
		list-style: none;
		padding: 0;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.95rem;
	}

	.answers li {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.55rem 0;
		border-top: 1px dashed var(--color-rule);
		color: var(--color-ink);
	}

	.answers li:last-child {
		border-bottom: 1px dashed var(--color-rule);
	}

	.answers .model {
		flex: 0 0 auto;
		font-weight: 500;
	}

	.answers .dots {
		flex: 1 1 auto;
		border-bottom: 1px dotted var(--color-mark);
		transform: translateY(-0.25em);
	}

	.answers .answer {
		flex: 0 0 auto;
		text-align: right;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1.05rem;
	}

	.answers li.diverges .answer {
		color: var(--color-stamp);
	}

	.answers li.diverges .answer::before {
		content: '※ ';
	}

	.consensus {
		margin: 1.5rem 0 0;
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
		font-size: 1rem;
	}

	.consensus a {
		color: var(--color-stamp);
		text-decoration: none;
	}

	.consensus a:hover {
		text-decoration: underline;
	}

	/* —— corrections column —— */
	.corrections h3 {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-weight: 500;
		color: var(--color-mark);
		margin: 0 0 1.25rem;
	}

	.shift-strip {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.shift-strip li {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.6rem 0;
		border-top: 1px dashed var(--color-rule);
	}

	.shift-strip li:last-child {
		border-bottom: 1px dashed var(--color-rule);
	}

	.shift-strip .when {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--color-mark);
	}

	.shift-strip .flip {
		font-family: var(--font-body);
		font-size: 1.1rem;
	}

	.shift-strip .flip s {
		color: var(--color-mark);
	}

	.shift-strip .flip .arrow,
	.shift-strip .flip em {
		color: var(--color-stamp);
	}

	.shift-strip .q {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.95rem;
		color: var(--color-mark);
		text-decoration: none;
	}

	.shift-strip .q:hover {
		color: var(--color-stamp);
	}

	.corrections .more {
		margin: 1rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.corrections .more a {
		color: var(--color-mark);
		text-decoration: none;
	}

	.corrections .more a:hover {
		color: var(--color-stamp);
	}

	/* —— insight —— */
	.insight h2 {
		font-family: var(--font-display);
		font-weight: 400;
		font-size: clamp(2.5rem, 7vw, 4.5rem);
		line-height: 0.98;
		letter-spacing: -0.01em;
		margin: 0;
	}

	.insight h2 em {
		font-style: italic;
		color: var(--color-stamp);
	}

	.insight .lede {
		font-size: clamp(1.05rem, 1.4vw, 1.2rem);
		line-height: 1.55;
		max-width: 40ch;
		margin: 1.5rem 0 0;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1.5rem;
		margin-top: clamp(2rem, 4vw, 3rem);
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-rule);
	}

	a.stat.linked {
		text-decoration: none;
		color: inherit;
	}

	a.stat.linked:hover .big {
		color: var(--color-ink);
	}

	.stat .big {
		font-family: var(--font-display);
		font-size: clamp(3rem, 6vw, 4.5rem);
		font-weight: 400;
		line-height: 1;
		color: var(--color-stamp);
	}

	.stat .tag {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-mark);
		margin-top: 0.5rem;
		max-width: 22ch;
		line-height: 1.4;
	}

	/* —— method —— */
	.method h3 {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-weight: 500;
		color: var(--color-mark);
		margin: 0 0 1.75rem;
	}

	.method ol {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 1.4rem;
	}

	.method li {
		display: grid;
		grid-template-columns: 3rem 1fr;
		gap: 1rem;
		align-items: baseline;
	}

	.method .num {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.8rem;
		color: var(--color-stamp);
		line-height: 1;
	}

	.method .step-title {
		font-family: var(--font-display);
		font-size: 1.6rem;
		display: block;
		margin-bottom: 0.25rem;
	}

	.method .step-body {
		font-family: var(--font-body);
		font-size: 1.05rem;
		line-height: 1.55;
		color: var(--color-ink);
		max-width: 48ch;
	}

	/* —— coming soon —— */
	.coming-soon {
		margin-top: clamp(4rem, 8vw, 6rem);
		text-align: center;
	}

	.cta-row {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin: 0;
	}

	.button {
		display: inline-block;
		background: var(--color-ink);
		color: var(--color-paper);
		border: 1px solid var(--color-ink);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 0.7rem 1.6rem;
		text-decoration: none;
	}

	.button:hover {
		background: var(--color-stamp);
		border-color: var(--color-stamp);
	}

	.button.ghost {
		background: transparent;
		color: var(--color-ink);
		border-color: var(--color-rule);
	}

	.button.ghost:hover {
		color: var(--color-stamp);
		border-color: var(--color-stamp);
		background: transparent;
	}

	.step-link {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: var(--color-stamp);
		text-underline-offset: 0.2em;
	}

	.step-link:hover {
		color: var(--color-stamp);
	}

	.coming-soon .sig {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-mark);
		margin-top: 0.75rem;
	}

	@media (max-width: 600px) {
		.answers li {
			flex-wrap: wrap;
		}
		.answers .dots {
			display: none;
		}
		.answers .answer {
			margin-left: auto;
		}
	}
</style>
