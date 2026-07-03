import { mockGateway } from './mock-gateway';

// Typed surface of the llm-gateway Worker's RPC entrypoint, reached via the
// LLM_GATEWAY service binding. These shapes mirror llm-gateway/src/types.ts;
// they are declared structurally here so this repo builds without the
// gateway checked out alongside it.

export type RunStatus = 'running' | 'completed' | 'failed';

export type RunSummary = {
	id: string;
	prompt: string;
	status: RunStatus;
	model_count: number;
	question_id: string | null;
	content_hash: string | null;
	created_at: number;
	completed_at: number | null;
};

export type ResponseRow = {
	run_id: string;
	model: string;
	sample_index: number;
	provider: string;
	response_text: string | null;
	latency_ms: number | null;
	error: string | null;
	recommended_product: string | null;
	extracted_by: string | null;
	created_at: number;
};

export type QuestionRow = {
	id: string;
	text: string;
	active: number;
	weekly: number;
	category: string | null;
	created_at: number;
};

export type CategoryStat = {
	category: string;
	product: string;
	n: number;
};

export type RunDetail = {
	run: RunSummary;
	responses: ResponseRow[];
	workflow_status: unknown;
};

export type PaymentAllocation = 'all' | 'subset' | 'single';

export type PaymentRow = {
	id: string;
	payer: string | null;
	network: string | null;
	transaction_ref: string | null;
	amount_usdc_micro: number;
	credits: number;
	credits_remaining: number;
	allocation: PaymentAllocation;
	created_at: number;
};

export type QuestionBalance = {
	question_id: string;
	available_credits: number;
};

export type BalanceSummary = {
	global_credits: number;
	questions: QuestionBalance[];
};

export type RefreshResult = {
	run: RunSummary;
	payment_id: string;
	credits_remaining: number;
};

export type QuestionHistoryPick = {
	run_id: string;
	model: string;
	sample_index: number;
	provider: string;
	recommended_product: string | null;
	error: string | null;
};

export type QuestionHistoryRun = {
	run: RunSummary;
	picks: QuestionHistoryPick[];
};

export type QuestionHistory = {
	question: QuestionRow;
	runs: QuestionHistoryRun[];
	funders: string[];
};

export type ExtractedPick = {
	run_id: string;
	run_created_at: number;
	question_id: string;
	question_text: string;
	category: string | null;
	model: string;
	recommended_product: string;
};

export type PayerProfile = {
	payer: string;
	payments: PaymentRow[];
	links: Array<{ payment_id: string; question_id: string; text: string }>;
	funded_runs: Array<{
		run_id: string;
		payment_id: string;
		question_id: string;
		prompt: string;
		status: RunStatus;
		created_at: number;
	}>;
};

export type RecordPaymentInput = {
	payer?: string;
	network?: string;
	transactionRef?: string;
	amountUsdcMicro: number;
	credits: number;
	allocation: PaymentAllocation;
	questionIds?: string[];
};

export interface LlmGateway {
	createRun(prompt: string, options?: { questionId?: string }): Promise<RunSummary>;
	getRun(runId: string): Promise<RunDetail>;
	listRuns(options?: {
		limit?: number;
		offset?: number;
		questionId?: string;
	}): Promise<RunSummary[]>;
	getQuestion(questionId: string): Promise<QuestionRow | null>;
	listQuestions(includeInactive?: boolean): Promise<QuestionRow[]>;
	addQuestion(text: string, category?: string): Promise<QuestionRow>;
	getCategoryStats(): Promise<CategoryStat[]>;
	setQuestionActive(questionId: string, active: boolean): Promise<void>;
	setQuestionWeekly(questionId: string, weekly: boolean): Promise<void>;
	recordPayment(input: RecordPaymentInput): Promise<PaymentRow>;
	refreshQuestion(questionId: string): Promise<RefreshResult>;
	getQuestionHistory(questionId: string, limit?: number): Promise<QuestionHistory>;
	getPayerProfile(payer: string): Promise<PayerProfile>;
	listExtractedPicks(limit?: number): Promise<ExtractedPick[]>;
	getBalances(): Promise<BalanceSummary>;
}

// The generated Env types the service binding as Fetcher; the RPC methods
// exist at runtime on the WorkerEntrypoint stub.
//
// While prototyping, a deterministic mock backs the whole UI: it is used
// whenever the binding is absent (plain `vite dev`) or MOCK_GATEWAY=on
// (wrangler preview). Set MOCK_GATEWAY=off before pointing this at the real
// gateway in production.
export function gateway(platform: App.Platform | undefined): LlmGateway | null {
	const binding = platform?.env?.LLM_GATEWAY;
	const mockFlag = String(platform?.env?.MOCK_GATEWAY ?? '');
	if (mockFlag === 'on' || !binding) return mockGateway();
	return binding as unknown as LlmGateway;
}
