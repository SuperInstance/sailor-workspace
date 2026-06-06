/**
 * SuperInstance Fleet Copilot — Custom Agent
 *
 * This agent leverages DeepSeek V4 Flash (via DeepInfra, OpenAI-compatible)
 * and is equipped with tools for fleet observability: Nebula, VoxelWorks,
 * CraftMind, cognitive compiler, and ternary crates.
 */

import { executeTool, tools, ToolResult } from './tools';

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface CompletionChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
}

interface CompletionResponse {
  id: string;
  choices: CompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ── Fleet System Prompt ────────────────────────────────────────

const FLEET_SYSTEM_PROMPT = `You are the **SuperInstance Fleet Copilot** — an intelligent operations assistant for the Fleet.

## Your Domain Knowledge

### Nebula Cloud
Nebula is the Fleet's orchestration layer — a multi-region service mesh managing containerized pods across us-east-1, eu-west-1, and ap-southeast-1. It provides service discovery, auto-scaling, and sub-millisecond routing. Current version: v2.4.1.

### VoxelWorks Compute
VoxelWorks powers GPU-accelerated workloads across three clusters: forge-alpha (64x H100), forge-beta (32x A100), and forge-gamma (16x A100). It handles training, inference, and batch processing jobs. Supports CUDA 12.4, PyTorch 2.3, TensorRT 9.0. Current version: v3.1.0.

### CraftMind AI
CraftMind is the Fleet's AI inference layer. It runs DeepSeek V4 Flash models via DeepInfra's OpenAI-compatible API. It provides real-time code generation, cognitive compilation assistance, and fleet-wide monitoring. Typical inference latency: ~340ms.

### Cognitive Compiler
The cognitive compiler transforms high-level developer intent into distributed compute graphs. It uses ternary logic (true/false/uncertain) as optimization branches — optimistic, pessimistic, and exploratory. Cache-first execution achieves 87% hit rate. Current version: ternary-compiler-v0.9.2.

### Ternary Crates
The Fleet's distributed package registry using ternary versioning (stable/beta/experimental). 148 crates published with 37 active dependent projects. Popular crates include core-ternary, graph-ternary, io-ternary, and net-ternary.

## Your Capabilities
- Answer questions about Fleet architecture, components, and status
- Run diagnostic tools to check live system health
- Search Fleet documentation and knowledge base
- Explain ternary concepts, cognitive compilation, and Fleet internals
- Provide deployment guidance and troubleshooting

## Personality
You are precise, technical, and efficient — like a seasoned SRE who happens to love purple. Use code blocks, structured formatting, and clear explanations. When running tools, show the results and explain what they mean.

## Tool Execution
When the user asks about Fleet status or operations, use the appropriate tool to get live data. Always explain the results in context.`;

// ── Agent class ────────────────────────────────────────────────

export class SuperInstanceAgent {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.DEEPINFRA_API_KEY || '';
    this.baseUrl = process.env.DEEPINFRA_BASE_URL || 'https://api.deepinfra.com/v1/openai';
    this.model = process.env.FLEET_MODEL || 'deepseek-ai/DeepSeek-V4-Flash';
  }

  /**
   * Process a user message through the agent loop:
   * 1. Call the LLM with conversation history
   * 2. If the LLM requests tool calls, execute them
   * 3. Feed results back to the LLM
   * 4. Return the final response
   */
  async processMessage(
    messages: AgentMessage[],
    onToolCall?: (toolName: string, args: any, result: ToolResult) => void,
  ): Promise<string> {
    const systemMessage: AgentMessage = {
      role: 'system',
      content: FLEET_SYSTEM_PROMPT,
    };

    const allMessages: AgentMessage[] = [systemMessage, ...messages];

    // --- Turn 1: LLM generates response (may include tool calls) ---
    const firstResponse = await this.callLLM(allMessages);
    const firstMessage = firstResponse.choices[0]?.message;

    if (!firstMessage) {
      return '⚠️ No response from Fleet agent. Please check the API configuration.';
    }

    // If no tool calls, return the response directly
    if (!firstMessage.tool_calls || firstMessage.tool_calls.length === 0) {
      return firstMessage.content || '';
    }

    // --- Execute tool calls ---
    const toolMessages: AgentMessage[] = [
      { role: 'assistant', content: firstMessage.content || '', tool_calls: firstMessage.tool_calls },
    ];

    for (const toolCall of firstMessage.tool_calls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args);

        if (onToolCall) {
          onToolCall(toolCall.function.name, args, result);
        }

        toolMessages.push({
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(result.data || result.formatted || result.error),
          name: toolCall.function.name,
        });
      } catch (err: any) {
        toolMessages.push({
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: err.message }),
          name: toolCall.function.name,
        });
      }
    }

    // --- Turn 2: LLM incorporates tool results into final answer ---
    const secondResponse = await this.callLLM([...allMessages, ...toolMessages]);
    const secondMessage = secondResponse.choices[0]?.message;

    return secondMessage?.content || '✅ Tools executed. No further commentary.';
  }

  /**
   * Call the LLM API (OpenAI-compatible via DeepInfra).
   */
  private async callLLM(messages: AgentMessage[]): Promise<CompletionResponse> {
    const toolDefinitions = tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            t.parameters.map(p => [
              p.name,
              { type: p.type, description: p.description, ...(p.enum ? { enum: p.enum } : {}) },
            ])
          ),
          required: t.parameters.filter(p => p.required).map(p => p.name),
        },
      },
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content || '',
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
        tools: toolDefinitions,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }
}
