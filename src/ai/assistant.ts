import { GoogleGenerativeAI, type FunctionDeclaration } from '@google/generative-ai';
import { SYSTEM_PROMPT } from './systemPrompt';
import { toolDeclarations, dispatchTool, type ToolActions } from './tools';

export interface ChatTurn { role: 'user' | 'model'; text: string; tools?: string[] }

export interface AssistantReply { text: string; toolsUsed: string[] }

export class Assistant {
  private model;
  constructor(apiKey: string, modelName: string, private actions: ToolActions) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolDeclarations as unknown as FunctionDeclaration[] }],
    });
  }

  /** Send a user message; resolves to the final text plus the tools that ran. */
  async send(history: ChatTurn[], message: string): Promise<AssistantReply> {
    const chat = this.model.startChat({
      history: history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    });
    let result = await chat.sendMessage(message);
    const toolsUsed: string[] = [];
    // Tool-call loop: keep dispatching until the model returns plain text.
    for (let i = 0; i < 5; i++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;
      const responses = await Promise.all(calls.map(async (c) => {
        toolsUsed.push(c.name);
        return {
          functionResponse: {
            name: c.name,
            response: await dispatchTool(c.name, (c.args ?? {}) as Record<string, any>, this.actions),
          },
        };
      }));
      result = await chat.sendMessage(responses as any);
    }
    return { text: result.response.text(), toolsUsed };
  }
}
