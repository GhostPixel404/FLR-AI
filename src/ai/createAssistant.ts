import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Settings } from '../types';
import type { ToolActions } from './tools';
import { Assistant, type AssistantReply, type ChatTurn } from './assistant';
import { OpenAICompatAssistant, describeNetworkError, OPENAI_TOOLS } from './openaiAssistant';

export interface AssistantClient {
  send(history: ChatTurn[], message: string): Promise<AssistantReply>;
}

function isLocal(url: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url);
}

/** Whether the selected provider has enough config to be used. */
export function isAiConfigured(s: Settings): boolean {
  if (s.aiProvider === 'gemini') return !!s.geminiApiKey;
  // OpenAI-compatible: needs a model + base URL; key optional for local servers.
  return !!s.openaiModel && !!s.openaiBaseUrl && (!!s.openaiApiKey || isLocal(s.openaiBaseUrl));
}

/** The model name to show in the chat status chip. */
export function aiModelLabel(s: Settings): string {
  return s.aiProvider === 'gemini' ? s.geminiModel : (s.openaiModel || 'model');
}

export function createAssistant(s: Settings, actions: ToolActions): AssistantClient {
  if (s.aiProvider === 'gemini') {
    return new Assistant(s.geminiApiKey, s.geminiModel, actions);
  }
  return new OpenAICompatAssistant(s.openaiBaseUrl, s.openaiApiKey, s.openaiModel, actions);
}

export interface TestResult { ok: boolean; message: string }

/** Send a tiny no-tools prompt to verify the provider/key/model actually work. */
export async function testConnection(s: Settings): Promise<TestResult> {
  if (!isAiConfigured(s)) {
    return { ok: false, message: s.aiProvider === 'gemini'
      ? 'Add your Gemini API key first.'
      : 'Add a base URL, model, and (for cloud) an API key first.' };
  }

  if (s.aiProvider === 'gemini') {
    try {
      const genAI = new GoogleGenerativeAI(s.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: s.geminiModel });
      await model.generateContent('Reply with the single word: OK');
      return { ok: true, message: `Connected to ${s.geminiModel}.` };
    } catch (e) {
      const msg = (e as Error).message || String(e);
      return { ok: false, message: /API key|API_KEY|PERMISSION|401|403/i.test(msg)
        ? 'The Gemini API key was rejected. Double-check it in Google AI Studio.'
        : /not found|404|model/i.test(msg)
          ? `Model "${s.geminiModel}" wasn't found. Try gemini-2.5-flash or gemini-2.0-flash.`
          : `Failed: ${msg.slice(0, 160)}` };
    }
  }

  // OpenAI-compatible (OpenRouter / Ollama)
  const url = s.openaiBaseUrl.replace(/\/+$/, '') + '/chat/completions';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (s.openaiApiKey) headers.Authorization = `Bearer ${s.openaiApiKey}`;
  headers['HTTP-Referer'] = location.origin;
  headers['X-Title'] = 'FLR AI';
  let res: Response;
  try {
    // Include tools so the test catches models that don't support function
    // calling — which the assistant needs to do anything useful.
    res = await fetch(url, {
      method: 'POST', headers,
      body: JSON.stringify({ model: s.openaiModel, max_tokens: 5, tools: OPENAI_TOOLS, tool_choice: 'auto',
        messages: [{ role: 'user', content: 'Reply with the single word: OK' }] }),
    });
  } catch {
    return { ok: false, message: describeNetworkError(s.openaiBaseUrl) };
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    const noTools = /tool use|support tools?|no endpoints/i.test(detail);
    const hint = noTools ? ` — this model doesn't support tool use. Pick a model with the “Tools” badge on OpenRouter.`
      : res.status === 401 ? ' — the API key was rejected.'
      : res.status === 404 ? ` — model "${s.openaiModel}" not found; check the exact ID.`
      : res.status === 429 ? ' — rate limited; wait, or add a little OpenRouter credit.'
      : '';
    return { ok: false, message: `HTTP ${res.status}${hint}${!noTools && detail ? ` (${detail})` : ''}` };
  }
  const data = await res.json().catch(() => null);
  const msg = data?.choices?.[0]?.message;
  if (!msg) {
    return { ok: false, message: 'Reached the endpoint but got an unexpected response. Is the model OpenAI-compatible?' };
  }
  return { ok: true, message: `Connected to ${s.openaiModel} — tools supported. ✈` };
}
