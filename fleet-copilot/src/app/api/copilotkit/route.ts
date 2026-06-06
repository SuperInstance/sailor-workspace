/**
 * CopilotKit Runtime API Route
 *
 * This route connects the CopilotKit frontend to the SuperInstance
 * Fleet Copilot agent. It handles streaming chat completions with
 * tool execution support.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SuperInstanceAgent, AgentMessage } from '@/lib/superinstance-agent';
import { executeTool } from '@/lib/tools';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * POST /api/copilotkit
 *
 * Accepts a CopilotKit-compatible request body and returns
 * a streaming response from the Fleet Copilot agent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // CopilotKit sends messages in its own format
    const copilotMessages = body.messages || [];
    const agent = new SuperInstanceAgent();

    // Convert CopilotKit messages to our agent format
    const agentMessages: AgentMessage[] = copilotMessages.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant' | 'tool',
      content: msg.content || '',
      tool_call_id: msg.tool_call_id,
      tool_calls: msg.tool_calls,
      name: msg.name,
    }));

    // Get the last user message
    const lastUserMessage = [...agentMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json(
        { error: 'No user message found' },
        { status: 400 }
      );
    }

    // Process through the agent (non-streaming for now)
    const response = await agent.processMessage(
      [lastUserMessage],
      (toolName, args, result) => {
        console.log(`[Fleet Copilot] Executed ${toolName}:`, args);
      }
    );

    // Return in a format CopilotKit expects
    return NextResponse.json({
      id: crypto.randomUUID(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: process.env.FLEET_MODEL || 'deepseek-ai/DeepSeek-V4-Flash',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response,
          },
          finish_reason: 'stop',
        },
      ],
    });
  } catch (error: any) {
    console.error('[Fleet Copilot] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/copilotkit — Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'fleet-copilot',
    version: '0.1.0',
    tools: ['nebula_status', 'voxelworks_health', 'fleet_docs', 'system_info'],
    model: process.env.FLEET_MODEL || 'deepseek-ai/DeepSeek-V4-Flash',
  });
}
