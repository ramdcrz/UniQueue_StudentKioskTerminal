import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

import { orchestratorTools } from '@/lib/ai/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORCHESTRATOR_SYSTEM_PROMPT = `
You are the Queue Orchestrator for UniQueue.

Goals:
- Explain queue state accurately.
- Prefer Firestore-backed facts over assumptions.
- Keep replies short, operational, and useful to staff.

Rules:
- Treat WAITING, CALLED, SERVING, COMPLETED, and NOSHOW as the authoritative ticket states.
- Use the provided tools before answering queue questions that depend on live data.
- Do not invent counts, ratios, or timing data.
- If a tool returns no data, say so plainly.
- For wait-time analytics, use the campus local day boundary.
- For counter analytics, scope results to the requested department and counter.
- If the request implies a write action or policy change, explain that this endpoint is read-only.

Communication style:
- Lead with the answer.
- Add one short line of context when needed.
- Use queue language that staff already use.
- State uncertainty only when it changes the conclusion.
`.trim();

interface OrchestratorRequestBody {
  prompt?: string;
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

function normalizeMessages(body: OrchestratorRequestBody) {
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return body.messages;
  }

  if (typeof body.prompt === 'string' && body.prompt.trim().length > 0) {
    return [{ role: 'user', content: body.prompt.trim() }];
  }

  return [];
}

export async function POST(request: Request) {
  let body: OrchestratorRequestBody;

  try {
    body = (await request.json()) as OrchestratorRequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const messages = normalizeMessages(body);

  if (messages.length === 0) {
    return Response.json({ error: 'Provide `prompt` or `messages`.' }, { status: 400 });
  }

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini'),
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    messages: messages as any,
    tools: orchestratorTools,
    temperature: 0.2,
  });

  return result.toUIMessageStreamResponse();
}