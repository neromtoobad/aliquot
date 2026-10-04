import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type StopCondition,
  type ToolSet,
  type UIMessage,
} from 'ai'
import {connect, contextConfigured, initialContext} from '@/lib/context'
import {systemPrompt} from '@/lib/prompt'
import {getCatalog} from '@/lib/sanity'
import {dilute, pcrProgram, scaleRecipe, verdict} from '@/lib/tools'

export const maxDuration = 120

const FORCE_VERDICT_AT = 7

// Stop only once a verdict card was actually delivered — a verdict call whose
// input failed validation goes back to the model as an error to fix.
const verdictDelivered: StopCondition<ToolSet> = ({steps}) =>
  steps.at(-1)?.toolResults?.some((r) => r.toolName === 'verdict') ?? false

// Vercel AI Gateway. The free tier serves GPT-5.x but not Claude, so that's the default;
// set ALIQUOT_MODEL to switch (e.g. anthropic/claude-sonnet-4.6 on paid credits).
const MODEL = process.env.ALIQUOT_MODEL ?? 'openai/gpt-5.2'

export async function POST(req: Request) {
  if (!contextConfigured()) {
    return Response.json({error: 'Sanity Context is not configured on this deployment.'}, {status: 503})
  }

  const body: {messages: UIMessage[]; model?: string} = await req.json()
  // Model override for local comparisons only.
  const model = process.env.NODE_ENV !== 'production' && body.model ? body.model : MODEL
  // Bench questions don't need long memory; a short window also bounds cost.
  const messages = body.messages.slice(-8)

  const [kbOutline, ledgerSchema, catalog, context] = await Promise.all([
    initialContext('kb'),
    initialContext('ledger'),
    getCatalog(),
    connect(),
  ])

  const result = streamText({
    model,
    system: systemPrompt({now: new Date().toISOString(), kbOutline, ledgerSchema, catalog}),
    messages: await convertToModelMessages(messages),
    tools: {...context.tools, pcr_program: pcrProgram, scale_recipe: scaleRecipe, dilute, verdict},
    // Every turn ends in a verdict card: the model must call a tool on each step,
    // and after enough reading it is made to answer rather than keep querying.
    toolChoice: 'required',
    prepareStep: ({stepNumber}) => (stepNumber >= FORCE_VERDICT_AT ? {toolChoice: {type: 'tool', toolName: 'verdict'}} : undefined),
    stopWhen: [isStepCount(FORCE_VERDICT_AT + 3), verdictDelivered],
    providerOptions: {openai: {reasoningEffort: 'low'}},
    // The gateway occasionally drops a stream mid-response; rerun just that step.
    streamRetries: 2,
    onFinish: () => context.close(),
    onError: () => context.close(),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({stream: result.stream}),
  })
}
