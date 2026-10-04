import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  hasToolCall,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import {connect, contextConfigured, initialContext} from '@/lib/context'
import {systemPrompt} from '@/lib/prompt'
import {dilute, pcrProgram, scaleRecipe, verdict} from '@/lib/tools'

export const maxDuration = 120

// Vercel AI Gateway. The free tier serves GPT-5.x but not Claude, so that's the default;
// set ALIQUOT_MODEL to switch (e.g. anthropic/claude-sonnet-4.6 on paid credits).
const MODEL = process.env.ALIQUOT_MODEL ?? 'openai/gpt-5.2'

export async function POST(req: Request) {
  if (!contextConfigured()) {
    return Response.json({error: 'Sanity Context is not configured on this deployment.'}, {status: 503})
  }

  const body: {messages: UIMessage[]} = await req.json()
  // Bench questions don't need long memory; a short window also bounds cost.
  const messages = body.messages.slice(-8)

  const [kbOutline, ledgerSchema, context] = await Promise.all([
    initialContext('kb'),
    initialContext('ledger'),
    connect(),
  ])

  const result = streamText({
    model: MODEL,
    system: systemPrompt({now: new Date().toISOString(), kbOutline, ledgerSchema}),
    messages: await convertToModelMessages(messages),
    tools: {...context.tools, pcr_program: pcrProgram, scale_recipe: scaleRecipe, dilute, verdict},
    stopWhen: [isStepCount(16), hasToolCall('verdict')],
    providerOptions: {openai: {reasoningEffort: 'low'}},
    onFinish: () => context.close(),
    onError: () => context.close(),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({stream: result.stream}),
  })
}
