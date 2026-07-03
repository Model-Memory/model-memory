<script lang="ts">
	import Colophon from '$lib/Colophon.svelte';
	import Masthead from '$lib/Masthead.svelte';
	import { resolve } from '$app/paths';
	import { payCommission } from '$lib/x402-client';

	let { data } = $props();

	// Initial value only by design — the field is user-editable afterwards.
	// svelte-ignore state_referenced_locally
	let prompt = $state(data.prefill.prompt);
	let category = $state('');
	let credits = $state(4);
	let weekly = $state(true);
	let paying = $state(false);
	let error = $state('');
	let result = $state<null | {
		runId: string | null;
		questionId: string | null;
		creditsRemaining: number;
		payer: string;
	}>(null);

	const refreshing = $derived(data.prefill.questionId !== '');
	const priceUsdc = $derived(
		data.creditPriceUsdcMicro ? ((credits * data.creditPriceUsdcMicro) / 1e6).toFixed(2) : null
	);

	async function pay() {
		error = '';
		result = null;
		paying = true;
		try {
			const body = refreshing
				? { questionId: data.prefill.questionId, credits, weekly }
				: {
						prompt: prompt.trim(),
						credits,
						weekly,
						...(category.trim() ? { category: category.trim() } : {})
					};
			if (!refreshing && !prompt.trim()) {
				throw new Error('Enter a question.');
			}
			const outcome = await payCommission('/api/commission', body);
			if (outcome.status !== 200) {
				const message = (outcome.body as { error?: string }).error;
				throw new Error(message ?? `payment failed (${outcome.status})`);
			}
			const ok = outcome.body as {
				run: { id: string } | null;
				question_id: string | null;
				payment: { credits_remaining: number };
			};
			result = {
				runId: ok.run?.id ?? null,
				questionId: ok.question_id,
				creditsRemaining: ok.payment.credits_remaining,
				payer: outcome.payer
			};
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			paying = false;
		}
	}
</script>

<svelte:head>
	<title>Commission — Model Memory</title>
	<meta
		name="description"
		content="Pay a few cents in USDC to ask every major model your question — the result enters the public archive."
	/>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section>
			<div class="entry-header">
				<span class="stamp">{refreshing ? 'Refresh a query' : 'Commission a query'}</span>
				{#if data.network}
					<span class="logged">USDC on {data.network}</span>
				{/if}
			</div>

			{#if !data.enabled}
				<p class="notice">
					Payments are not configured on this deployment yet — the archive is still browsable.
				</p>
				<p class="actions">
					<a class="button ghost" href={resolve('/archive')}>Browse the archive &rarr;</a>
				</p>
			{:else if result}
				<p class="query">Archived.</p>
				<p class="notice">
					Paid as <code>{result.payer}</code> — {result.creditsRemaining} credit{result.creditsRemaining ===
					1
						? ''
						: 's'} remain banked for weekly refreshes.
				</p>
				<p class="actions">
					{#if result.runId}
						<a class="button" href={resolve('/archive/[runId]', { runId: result.runId })}
							>Watch the run &rarr;</a
						>
					{/if}
					{#if result.questionId}
						<a
							class="button ghost"
							href={resolve('/archive/q/[questionId]', { questionId: result.questionId })}
							>Question page &rarr;</a
						>
					{/if}
					{#if result.payer}
						<a
							class="button ghost"
							href={resolve('/archive/by/[address]', { address: result.payer })}
							>Your ledger &rarr;</a
						>
					{/if}
				</p>
			{:else}
				{#if refreshing}
					<p class="query">
						<span class="quote">&ldquo;</span>{data.prefill.questionText}<span class="quote"
							>&rdquo;</span
						>
					</p>
				{:else}
					<label class="field">
						<span class="label">Your question</span>
						<input
							type="text"
							bind:value={prompt}
							maxlength="500"
							placeholder="e.g. Where should I host my SvelteKit app?"
						/>
					</label>
					<label class="field">
						<span class="label">Category (optional)</span>
						<input type="text" bind:value={category} maxlength="40" placeholder="e.g. hosting" />
					</label>
				{/if}

				<div class="row">
					<label class="field narrow">
						<span class="label">Credits</span>
						<input type="number" bind:value={credits} min="1" max="1000" />
					</label>
					<label class="check">
						<input type="checkbox" bind:checked={weekly} />
						<span>refresh weekly while credits last</span>
					</label>
				</div>

				<p class="footnote">
					1 credit = 1 refresh across every model in the registry. One credit is spent now; the rest
					bank as this question's buffer.
					{#if priceUsdc}Total: <strong>{priceUsdc} USDC</strong>.{/if}
				</p>

				{#if error}
					<p class="notice error">{error}</p>
				{/if}

				<button class="button" onclick={pay} disabled={paying}>
					{paying ? 'Awaiting wallet…' : 'Pay with wallet'}
				</button>

				<p class="footnote">
					No accounts — your wallet address is your identity. Signing authorizes a USDC transfer
					(EIP-3009); settlement happens via the x402 facilitator. Prefer code? Use
					<code>x402-fetch</code> against <code>POST /api/commission</code>.
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
		margin: 0 0 1.5rem;
		max-width: 30ch;
	}

	.query .quote {
		color: var(--color-stamp);
		font-style: normal;
		margin: 0 0.05em;
	}

	.field {
		display: block;
		margin-bottom: 1.1rem;
	}

	.field .label {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-mark);
		margin-bottom: 0.4rem;
	}

	.field input {
		width: 100%;
		background: transparent;
		border: 1px solid var(--color-rule);
		font-family: var(--font-body);
		font-size: 1.05rem;
		padding: 0.55rem 0.8rem;
		color: var(--color-ink);
	}

	.field input:focus {
		border-color: var(--color-stamp);
		outline: none;
	}

	.row {
		display: flex;
		align-items: flex-end;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.field.narrow {
		width: 7rem;
		margin-bottom: 0;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		color: var(--color-ink);
		padding-bottom: 0.6rem;
	}

	.check input {
		accent-color: var(--color-stamp);
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
		padding: 0.6rem 1.4rem;
		cursor: pointer;
		text-decoration: none;
		margin-top: 0.5rem;
	}

	.button:hover:not(:disabled) {
		background: var(--color-stamp);
		border-color: var(--color-stamp);
	}

	.button:disabled {
		opacity: 0.6;
		cursor: wait;
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

	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.notice {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
		max-width: 60ch;
	}

	.notice.error {
		color: var(--color-stamp);
	}

	.notice code {
		font-style: normal;
	}

	.footnote {
		margin: 1rem 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--color-mark);
		max-width: 60ch;
	}

	.footnote code,
	.footnote strong {
		color: var(--color-ink);
	}
</style>
