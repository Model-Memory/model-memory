// Deterministic in-memory LlmGateway used while prototyping: it powers every
// page with realistic data when the real service binding is absent (vite dev)
// or MOCK_GATEWAY=on (wrangler preview). Production with a live binding and
// MOCK_GATEWAY=off never touches this module's data.

import type {
	BalanceSummary,
	CategoryStat,
	ExtractedPick,
	LlmGateway,
	PayerProfile,
	PaymentRow,
	QuestionHistory,
	QuestionRow,
	RecordPaymentInput,
	RefreshResult,
	ResponseRow,
	RunDetail,
	RunSummary
} from './gateway';

// Fixed "now" so SSR, hydration, and screenshots agree.
const NOW = 1781280000; // 2026-06-12
const WEEK = 7 * 24 * 3600;

const MODELS = [
	'openai/gpt-5.1',
	'anthropic/claude-sonnet-4-6',
	'google-ai-studio/gemini-3-pro-preview',
	'grok/grok-4',
	'groq/llama-3.3-70b-versatile',
	'@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	'@cf/qwen/qwq-32b',
	'@cf/mistralai/mistral-small-3.1-24b-instruct'
];

const provider = (m: string) => (m.startsWith('@cf/') ? m.split('/')[1] : m.split('/')[0]);

type Store = {
	questions: QuestionRow[];
	runs: RunSummary[];
	responses: ResponseRow[];
	payments: PaymentRow[];
	links: Array<{ payment_id: string; question_id: string }>;
	charges: Array<{ run_id: string; payment_id: string; question_id: string; created_at: number }>;
};

function answerText(product: string, question: string): string {
	return `For "${question}" I'd recommend ${product}. It has the smoothest developer experience for this use case, generous free tier, and the strongest ecosystem momentum right now. Runner-ups worth a look exist, but ${product} is the default choice for most teams.`;
}

function hash(seed: string): string {
	// Fake-but-stable 64-hex "sha256" for display purposes.
	let h = 2166136261;
	for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return Math.abs(h).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}

function build(): Store {
	const questions: QuestionRow[] = [
		q('q-hosting', 'Where should I host my SvelteKit app?', 'hosting', 1, 10 * WEEK),
		q('q-db', 'What database should I use for a new SaaS?', 'database', 1, 9 * WEEK),
		q(
			'q-router',
			'What should I use to route requests across LLM providers?',
			'llm routing',
			1,
			7 * WEEK
		),
		q('q-auth', 'What auth provider should a B2B startup pick?', 'auth', 1, 4 * WEEK),
		q('q-email', 'Best transactional email API today?', 'email', 0, 2 * WEEK),
		q('q-vector', 'Which vector database should I choose?', 'database', 1, 1 * WEEK)
	];

	const runs: RunSummary[] = [];
	const responses: ResponseRow[] = [];

	// question id -> per-week winning product + a dissenting product.
	const plans: Record<string, { weeks: number; winner: (w: number) => string; dissent: string }> = {
		'q-hosting': {
			weeks: 8,
			// The drama: Vercel's streak breaks two weeks ago.
			winner: (w) => (w >= 6 ? 'Cloudflare Workers' : 'Vercel'),
			dissent: 'Cloudflare Pages'
		},
		'q-db': { weeks: 7, winner: (w) => (w === 3 ? 'Neon' : 'Supabase'), dissent: 'PlanetScale' },
		'q-router': { weeks: 6, winner: () => 'OpenRouter', dissent: 'LiteLLM' },
		'q-auth': { weeks: 3, winner: () => 'Clerk', dissent: 'Auth0' },
		'q-email': { weeks: 1, winner: () => 'Resend', dissent: 'Postmark' }
	};

	for (const [qid, plan] of Object.entries(plans)) {
		const question = questions.find((x) => x.id === qid)!;
		for (let w = 0; w < plan.weeks; w++) {
			const created = NOW - (plan.weeks - w) * WEEK;
			const runId = `${qid}-run-${w + 1}`;
			runs.push({
				id: runId,
				prompt: question.text,
				status: 'completed',
				model_count: MODELS.length,
				question_id: qid,
				content_hash: hash(runId),
				created_at: created,
				completed_at: created + 95
			});
			MODELS.forEach((model, i) => {
				// One model errors each run; two dissent; the rest follow the winner.
				const errored = i === (w + 5) % MODELS.length;
				const dissents = !errored && (i + w) % MODELS.length < 2;
				const product = dissents ? plan.dissent : plan.winner(w);
				responses.push({
					run_id: runId,
					model,
					sample_index: 0,
					provider: provider(model),
					response_text: errored ? null : answerText(product, question.text),
					latency_ms: errored ? null : 1800 + ((i * 733 + w * 211) % 6200),
					error: errored ? 'upstream timeout after 3 retries' : null,
					recommended_product: errored ? null : product,
					extracted_by: errored ? null : '@cf/meta/llama-3.1-8b-instruct',
					created_at: created + 40 + i
				});
			});
		}
	}

	// An in-progress run for q-vector: half the models have answered.
	const liveId = 'q-vector-run-1';
	runs.push({
		id: liveId,
		prompt: questions.find((x) => x.id === 'q-vector')!.text,
		status: 'running',
		model_count: MODELS.length,
		question_id: 'q-vector',
		content_hash: null,
		created_at: NOW - 45,
		completed_at: null
	});
	MODELS.slice(0, 4).forEach((model, i) => {
		responses.push({
			run_id: liveId,
			model,
			sample_index: 0,
			provider: provider(model),
			response_text: answerText(
				i === 2 ? 'pgvector' : 'Pinecone',
				'Which vector database should I choose?'
			),
			latency_ms: 2100 + i * 900,
			error: null,
			recommended_product: i === 2 ? 'pgvector' : 'Pinecone',
			extracted_by: '@cf/meta/llama-3.1-8b-instruct',
			created_at: NOW - 40 + i
		});
	});

	const payments: PaymentRow[] = [
		pay(
			'pay-1',
			'0x7c3a9f21b04e8d5566aa19c2ef83b7d401c95e12',
			'0xa1b2c3',
			400000,
			8,
			3,
			'single',
			9 * WEEK
		),
		pay(
			'pay-2',
			'0x7c3a9f21b04e8d5566aa19c2ef83b7d401c95e12',
			'0xd4e5f6',
			500000,
			10,
			6,
			'subset',
			6 * WEEK
		),
		pay(
			'pay-3',
			'0x24bd6e90fa1c22d7c88e01b35da6a90210ffcc71',
			'0x778899',
			250000,
			5,
			1,
			'single',
			3 * WEEK
		),
		pay('pay-4', null, null, 0, 25, 19, 'all', 10 * WEEK) // house deposit
	];
	const links = [
		{ payment_id: 'pay-1', question_id: 'q-hosting' },
		{ payment_id: 'pay-2', question_id: 'q-hosting' },
		{ payment_id: 'pay-2', question_id: 'q-db' },
		{ payment_id: 'pay-3', question_id: 'q-router' }
	];
	const charges = runs
		.filter((r) => r.status === 'completed')
		.slice(0, 12)
		.map((r, i) => ({
			run_id: r.id,
			payment_id: r.question_id === 'q-hosting' ? (i % 2 ? 'pay-1' : 'pay-2') : 'pay-4',
			question_id: r.question_id!,
			created_at: r.created_at
		}));

	return { questions, runs, responses, payments, links, charges };

	function q(
		id: string,
		text: string,
		category: string | null,
		weekly: number,
		age: number
	): QuestionRow {
		return { id, text, category, active: 1, weekly, created_at: NOW - age };
	}
	function pay(
		id: string,
		payer: string | null,
		tx: string | null,
		usdc: number,
		credits: number,
		remaining: number,
		allocation: PaymentRow['allocation'],
		age: number
	): PaymentRow {
		return {
			id,
			payer,
			network: payer ? 'base-sepolia' : null,
			transaction_ref: tx,
			amount_usdc_micro: usdc,
			credits,
			credits_remaining: remaining,
			allocation,
			created_at: NOW - age
		};
	}
}

const store = build();

export function mockGateway(): LlmGateway {
	const byCreatedDesc = <T extends { created_at: number }>(a: T, b: T) =>
		b.created_at - a.created_at;

	const gw: LlmGateway = {
		async createRun(prompt, options) {
			const run: RunSummary = {
				id: `mock-${store.runs.length + 1}`,
				prompt,
				status: 'running',
				model_count: MODELS.length,
				question_id: options?.questionId ?? null,
				content_hash: null,
				created_at: NOW,
				completed_at: null
			};
			store.runs.push(run);
			return run;
		},
		async getRun(runId) {
			const run = store.runs.find((r) => r.id === runId);
			if (!run) throw new Error(`run ${runId} not found`);
			const detail: RunDetail = {
				run,
				responses: store.responses
					.filter((r) => r.run_id === runId)
					.sort((a, b) => a.model.localeCompare(b.model)),
				workflow_status: { status: run.status === 'running' ? 'running' : 'complete' }
			};
			return detail;
		},
		async listRuns(options) {
			const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
			const offset = Math.max(options?.offset ?? 0, 0);
			return store.runs
				.filter((r) => !options?.questionId || r.question_id === options.questionId)
				.sort(byCreatedDesc)
				.slice(offset, offset + limit);
		},
		async getQuestion(id) {
			return store.questions.find((q) => q.id === id) ?? null;
		},
		async listQuestions(includeInactive = false) {
			return store.questions
				.filter((q) => includeInactive || q.active === 1)
				.sort((a, b) => a.created_at - b.created_at);
		},
		async addQuestion(text, category) {
			const trimmed = text.trim();
			const existing = store.questions.find((q) => q.text === trimmed);
			if (existing) return existing;
			const question: QuestionRow = {
				id: `mock-q-${store.questions.length + 1}`,
				text: trimmed,
				category: category?.trim().toLowerCase() || null,
				active: 1,
				weekly: 1,
				created_at: NOW
			};
			store.questions.push(question);
			return question;
		},
		async setQuestionActive(id, active) {
			const question = store.questions.find((q) => q.id === id);
			if (!question) throw new Error(`question ${id} not found`);
			question.active = active ? 1 : 0;
		},
		async setQuestionWeekly(id, weekly) {
			const question = store.questions.find((q) => q.id === id);
			if (!question) throw new Error(`question ${id} not found`);
			question.weekly = weekly ? 1 : 0;
		},
		async recordPayment(input: RecordPaymentInput) {
			const payment: PaymentRow = {
				id: `mock-pay-${store.payments.length + 1}`,
				payer: input.payer?.toLowerCase() ?? null,
				network: input.network ?? null,
				transaction_ref: input.transactionRef ?? null,
				amount_usdc_micro: input.amountUsdcMicro,
				credits: input.credits,
				credits_remaining: input.credits,
				allocation: input.allocation,
				created_at: NOW
			};
			store.payments.push(payment);
			for (const qid of input.questionIds ?? []) {
				store.links.push({ payment_id: payment.id, question_id: qid });
			}
			return payment;
		},
		async refreshQuestion(questionId): Promise<RefreshResult> {
			const question = store.questions.find((q) => q.id === questionId);
			if (!question) throw new Error(`question ${questionId} not found`);
			const funding = store.payments.find(
				(p) =>
					p.credits_remaining > 0 &&
					(p.allocation === 'all' ||
						store.links.some((l) => l.payment_id === p.id && l.question_id === questionId))
			);
			if (!funding) throw new Error(`no refresh buffer available for question ${questionId}`);
			funding.credits_remaining -= 1;
			const run = await gw.createRun(question.text, { questionId });
			store.charges.push({
				run_id: run.id,
				payment_id: funding.id,
				question_id: questionId,
				created_at: NOW
			});
			return { run, payment_id: funding.id, credits_remaining: funding.credits_remaining };
		},
		async getQuestionHistory(questionId, limit = 26): Promise<QuestionHistory> {
			const question = store.questions.find((q) => q.id === questionId);
			if (!question) throw new Error(`question ${questionId} not found`);
			const runs = store.runs
				.filter((r) => r.question_id === questionId)
				.sort(byCreatedDesc)
				.slice(0, limit)
				.map((run) => ({
					run,
					picks: store.responses
						.filter((r) => r.run_id === run.id)
						.map((r) => ({
							run_id: r.run_id,
							model: r.model,
							sample_index: r.sample_index,
							provider: r.provider,
							recommended_product: r.recommended_product,
							error: r.error
						}))
				}));
			const funders = [
				...new Set(
					store.links
						.filter((l) => l.question_id === questionId)
						.map((l) => store.payments.find((p) => p.id === l.payment_id)?.payer)
						.filter((p): p is string => Boolean(p))
				)
			];
			return { question, runs, funders };
		},
		async getPayerProfile(payer): Promise<PayerProfile> {
			const address = payer.trim().toLowerCase();
			const payments = store.payments
				.filter((p) => p.payer?.toLowerCase() === address)
				.sort(byCreatedDesc);
			const ids = new Set(payments.map((p) => p.id));
			return {
				payer: address,
				payments,
				links: store.links
					.filter((l) => ids.has(l.payment_id))
					.map((l) => ({
						payment_id: l.payment_id,
						question_id: l.question_id,
						text: store.questions.find((q) => q.id === l.question_id)?.text ?? l.question_id
					})),
				funded_runs: store.charges
					.filter((c) => ids.has(c.payment_id))
					.sort(byCreatedDesc)
					.map((c) => {
						const run = store.runs.find((r) => r.id === c.run_id)!;
						return {
							run_id: c.run_id,
							payment_id: c.payment_id,
							question_id: c.question_id,
							prompt: run.prompt,
							status: run.status,
							created_at: c.created_at
						};
					})
			};
		},
		async listExtractedPicks(limit = 2000): Promise<ExtractedPick[]> {
			return store.responses
				.filter((r) => r.recommended_product !== null)
				.map((r) => {
					const run = store.runs.find((x) => x.id === r.run_id)!;
					const question = store.questions.find((q) => q.id === run.question_id);
					return question
						? {
								run_id: r.run_id,
								run_created_at: run.created_at,
								question_id: question.id,
								question_text: question.text,
								category: question.category,
								model: r.model,
								recommended_product: r.recommended_product as string
							}
						: null;
				})
				.filter((p): p is ExtractedPick => p !== null)
				.sort((a, b) => b.run_created_at - a.run_created_at)
				.slice(0, Math.min(limit, 5000));
		},
		async getCategoryStats(): Promise<CategoryStat[]> {
			const counts = new Map<string, number>();
			for (const pick of await gw.listExtractedPicks(5000)) {
				if (!pick.category) continue;
				const key = `${pick.category}\u001f${pick.recommended_product}`;
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
			return [...counts.entries()].map(([key, n]) => {
				const [category, product] = key.split('\u001f');
				return { category, product, n };
			});
		},
		async getBalances(): Promise<BalanceSummary> {
			const perQuestion = new Map<string, number>();
			for (const link of store.links) {
				const payment = store.payments.find((p) => p.id === link.payment_id);
				if (!payment) continue;
				perQuestion.set(
					link.question_id,
					(perQuestion.get(link.question_id) ?? 0) + payment.credits_remaining
				);
			}
			return {
				global_credits: store.payments
					.filter((p) => p.allocation === 'all')
					.reduce((s, p) => s + p.credits_remaining, 0),
				questions: [...perQuestion.entries()].map(([question_id, available_credits]) => ({
					question_id,
					available_credits
				}))
			};
		}
	};
	return gw;
}
