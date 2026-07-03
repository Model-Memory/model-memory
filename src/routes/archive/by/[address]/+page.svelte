<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import { shortAddress, stampDate } from '$lib/format';
	import { resolve } from '$app/paths';

	let { data } = $props();

	const profile = $derived(data.profile);
	const textByQuestion = $derived(
		Object.fromEntries(profile.links.map((l) => [l.question_id, l.text]))
	);
	const linksByPayment = $derived.by(() => {
		const m: Record<string, string[]> = {};
		for (const l of profile.links) {
			m[l.payment_id] = [...(m[l.payment_id] ?? []), l.question_id];
		}
		return m;
	});
	const totals = $derived({
		bought: profile.payments.reduce((s, p) => s + p.credits, 0),
		remaining: profile.payments.reduce((s, p) => s + p.credits_remaining, 0),
		spentUsdc: profile.payments.reduce((s, p) => s + p.amount_usdc_micro, 0) / 1e6
	});
</script>

<svelte:head>
	<title>{shortAddress(profile.payer)} — Model Memory</title>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section>
			<div class="entry-header">
				<span class="stamp">Patron</span>
				<span class="logged"><code>{profile.payer}</code></span>
			</div>

			{#if profile.payments.length === 0}
				<p class="notice">
					No payments recorded for this address yet. Your wallet is your account — commission a
					query via <code>POST /api/commission</code> and it will appear here.
				</p>
			{:else}
				<p class="status-line">
					<span class="tag on">{totals.remaining} of {totals.bought} credits remaining</span>
					<span class="tag">{totals.spentUsdc.toFixed(2)} USDC paid</span>
				</p>
			{/if}
		</section>

		{#if profile.payments.length > 0}
			<hr class="rule" />

			<section>
				<h2 class="section-title">Payments</h2>
				<ul class="ledger">
					{#each profile.payments as p (p.id)}
						<li>
							<span class="row-main">
								<span class="logged">{stampDate(p.created_at)}</span>
								<span class="pick">
									{p.credits} credit{p.credits === 1 ? '' : 's'} · {p.allocation}
								</span>
								<span class="count">{p.credits_remaining} left</span>
							</span>
							<span class="row-side">
								{#each linksByPayment[p.id] ?? [] as qid (qid)}
									<a class="qlink" href={resolve('/archive/q/[questionId]', { questionId: qid })}>
										{textByQuestion[qid] ?? qid}
									</a>
								{/each}
								{#if p.allocation === 'all'}
									<span class="qlink muted">every question</span>
								{/if}
								{#if p.transaction_ref}
									<code class="tx">{shortAddress(p.transaction_ref)}</code>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</section>

			<hr class="rule" />

			<section>
				<h2 class="section-title">Runs this wallet funded</h2>
				{#if profile.funded_runs.length === 0}
					<p class="notice">None yet — credits are waiting for the next refresh.</p>
				{:else}
					<ul class="ledger">
						{#each profile.funded_runs as r (r.run_id)}
							<li>
								<a class="row-main" href={resolve('/archive/[runId]', { runId: r.run_id })}>
									<span class="logged">{stampDate(r.created_at)}</span>
									<span class="pick">{r.prompt}</span>
									<span class="count">{r.status}</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
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
		text-transform: none;
		letter-spacing: 0.04em;
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

	a.row-main:hover .pick {
		color: var(--color-stamp);
	}

	.row-side {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.78rem;
	}

	.logged {
		color: var(--color-mark);
	}

	.pick {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 1.05rem;
	}

	.count {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-mark);
	}

	.qlink {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-stamp);
		text-decoration: none;
	}

	.qlink:hover {
		text-decoration: underline;
	}

	.qlink.muted {
		color: var(--color-mark);
	}

	.tx {
		color: var(--color-mark);
	}

	.notice {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
		max-width: 60ch;
	}

	.notice code {
		font-style: normal;
	}
</style>
