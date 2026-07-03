<script lang="ts">
	import Masthead from '$lib/Masthead.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — Model Memory</title>
</svelte:head>

<div class="paper">
	<Masthead />

	<main class="page">
		<section>
			<div class="entry-header">
				<span class="stamp">{page.status}</span>
			</div>
			<p class="query">
				{page.status === 404 ? 'Not in the archive.' : 'The presses jammed.'}
			</p>
			<p class="notice">
				{page.error?.message ?? 'Something went wrong.'} — perhaps start from
				<a href={resolve('/archive')}>the archive</a> or
				<a href={resolve('/shifts')}>the shifts</a>.
			</p>
		</section>
	</main>
</div>

<style>
	.paper {
		max-width: 920px;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 5vw, 4rem) 4rem;
		min-height: 100vh;
	}

	.entry-header {
		margin-bottom: 1.5rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.18em;
	}

	.entry-header .stamp {
		color: var(--color-stamp);
		border: 1px solid var(--color-stamp);
		padding: 0.25rem 0.55rem;
		display: inline-block;
		transform: rotate(-1.2deg);
	}

	.query {
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 7vw, 4.5rem);
		font-style: italic;
		line-height: 1.05;
		margin: 0 0 1.25rem;
	}

	.notice {
		font-family: var(--font-body);
		font-style: italic;
		color: var(--color-mark);
		max-width: 55ch;
	}

	.notice a {
		color: var(--color-stamp);
	}
</style>
