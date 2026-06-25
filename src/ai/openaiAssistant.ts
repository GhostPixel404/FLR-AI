import type { ChatTurn, AssistantReply } from './assistant';
import { SYSTEM_PROMPT } from './systemPrompt';
import { toolDeclarations, dispatchTool, type ToolActions } from './tools';

// Map our tool declarations to the OpenAI "tools" shape (used by OpenRouter,
// Ollama, and any other OpenAI-compatible endpoint).
const OPENAI_TOOLS = toolDeclarations.map((d) => ({
  type: 'function',
  function: { name: d.name, description: d.description, parameters: d.parameters },
}));

/** A human-readable explanation for a failed fetch to an OpenAI-compatible URL. */
export function describeNetworkError(baseUrl: string): string {
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(baseUrl);
  if (location.protocol === 'https:' && isLocal) {
    return `Can't reach a local server (${baseUrl}) from the HTTPS site — browsers block http://localhost from an https page (mixed content). ` +
      `Run the app locally (\`bun run dev\` → http://localhost:5173), or use OpenRouter instead.`;
  }
  return `Couldn't reach ${baseUrl}. Make sure the server is running and reachable. ` +
    `For Ollama, start it with \`OLLAMA_ORIGINS=* ollama serve\` so the browser is allowed to call it.`;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
}

/**
 * Assistant backed by any OpenAI-compatible chat-completions API with function
 * calling — e.g. OpenRouter (free cloud models) or a local Ollama server.
 */
export class OpenAICompatAssistant {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private model: string,
    private actions: ToolActions,
  ) {}

  private async post(messages: ChatMessage[], withTools: boolean) {
    const url = this.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    headers['HTTP-Referer'] = location.origin; // OpenRouter attribution (ignored elsewhere)
    headers['X-Title'] = 'FLR AI';
    const body: Record<string, unknown> = { model: this.model, messages };
    if (withTools) { body.tools = OPENAI_TOOLS; body.tool_choice = 'auto'; }

    let res: Response;
    try {
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    } catch {
      // fetch throws a TypeError ("Load failed" / "Failed to fetch") on
      // network, CORS, or mixed-content errors — explain the likely cause.
      throw new Error(describeNetworkError(this.baseUrl));
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    return res.json();
  }

  async send(history: ChatTurn[], message: string): Promise<AssistantReply> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((t): ChatMessage => ({ role: t.role === 'model' ? 'assistant' : 'user', content: t.text })),
      { role: 'user', content: message },
    ];
    const toolsUsed: string[] = [];

    for (let i = 0; i < 5; i++) {
      const data = await this.post(messages, true);
      const msg = data.choices?.[0]?.message as ChatMessage | undefined;
      if (!msg) throw new Error('Empty response from model');
      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) return { text: msg.content ?? '', toolsUsed };

      messages.push(msg);
      for (const c of calls) {
        const name = c.function?.name;
        if (!name) continue;
        toolsUsed.push(name);
        let args: Record<string, any> = {};
        try { args = JSON.parse(c.function.arguments || '{}'); } catch { /* ignore bad JSON */ }
        const result = await dispatchTool(name, args, this.actions);
        messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) });
      }
    }

    // Tool loop exhausted — ask once more without tools to get a final answer.
    const data = await this.post(messages, false);
    return { text: data.choices?.[0]?.message?.content ?? '', toolsUsed };
  }
}
