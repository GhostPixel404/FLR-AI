import type { Settings } from '../types';
import type { ToolActions } from './tools';
import { Assistant, type AssistantReply, type ChatTurn } from './assistant';
import { OpenAICompatAssistant } from './openaiAssistant';

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
