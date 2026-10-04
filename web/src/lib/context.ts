import {createMCPClient, type MCPClient} from '@ai-sdk/mcp'
import type {ToolSet} from 'ai'

// Aliquot reads two Sanity Context endpoints:
//   kb     — Knowledge Base mode: manufacturer manuals, published protocols and biosafety guidance, reconciled at build time
//   ledger — GROQ mode: the structured dataset (polymerases, recipes, protocols, reagents, claims, lab rules)
// Both are configured in the Context app, so what they serve can change without a redeploy.

const ORG = process.env.SANITY_ORG_ID
const TOKEN = process.env.SANITY_ORGANIZATION_TOKEN

export type Endpoint = 'kb' | 'ledger'

const ENDPOINT_NAMES: Record<Endpoint, string | undefined> = {
  kb: process.env.CONTEXT_KB_ENDPOINT,
  ledger: process.env.CONTEXT_LEDGER_ENDPOINT,
}

function endpointUrl(name: string) {
  return `https://api.sanity.io/v1/context/organizations/${ORG}/mcp/${name}`
}

function headers() {
  return {Authorization: `Bearer ${TOKEN}`}
}

// One retry on a network-level failure (connect timeout, reset). Context MCP is
// read-only, so retrying a connection or an initial-context fetch is safe.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    await new Promise((r) => setTimeout(r, 400))
    return fn()
  }
}

export function contextConfigured() {
  return Boolean(ORG && TOKEN && ENDPOINT_NAMES.kb && ENDPOINT_NAMES.ledger)
}

// Initial context is the KB outline (kb) or the compressed schema (ledger).
// It only changes on a rebuild or a schema deploy, so a short cache is safe.
const initialCache = new Map<Endpoint, {text: string; at: number}>()
const TTL = 5 * 60 * 1000

export async function initialContext(which: Endpoint): Promise<string> {
  const hit = initialCache.get(which)
  if (hit && Date.now() - hit.at < TTL) return hit.text
  const name = ENDPOINT_NAMES[which]!
  const res = await withRetry(() => fetch(`${endpointUrl(name)}/initial-context`, {headers: headers(), cache: 'no-store'}))
  if (!res.ok) throw new Error(`initial-context ${which}: ${res.status} ${await res.text()}`)
  const text = await res.text()
  initialCache.set(which, {text, at: Date.now()})
  return text
}

export async function connect(): Promise<{tools: ToolSet; close: () => Promise<void>}> {
  const clients: MCPClient[] = []
  const tools: ToolSet = {}

  for (const which of ['kb', 'ledger'] as const) {
    const client = await withRetry(() =>
      createMCPClient({
        clientName: `aliquot-${which}`,
        transport: {type: 'http', url: endpointUrl(ENDPOINT_NAMES[which]!), headers: headers()},
      }),
    )
    clients.push(client)
    const served = await withRetry(() => client.tools())
    for (const [name, tool] of Object.entries(served)) {
      if (name === 'initial_context') continue // inlined into the system prompt instead
      tools[name] = tool
    }
  }

  return {
    tools,
    close: async () => {
      await Promise.allSettled(clients.map((c) => c.close()))
    },
  }
}
