import { NextRequest, NextResponse } from 'next/server';
import { executeChatCompletion, DEFAULT_MODEL, extractChatCompletionContent } from '@/server/ai/llmClient';
import { traceLlmCall } from '@/lib/interview/tracing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, stream = false, model = DEFAULT_MODEL, apiKey, baseURL, maxOutputTokens, reasoningEffort, purpose } = body;
    const requestId = req.headers.get('x-request-id') || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const effectiveMessages = messages || [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: 'Hello!' },
    ];
    const configuredApiKey = (apiKey || process.env.OPENAI_API_KEY || '').trim();
    if (!configuredApiKey) {
      return NextResponse.json({ error: 'llm_unconfigured', fallbackEligible: true }, { status: 503 });
    }

    if (stream) {
      const completionStream = await traceLlmCall(
        'prep-pilot-streaming-chat',
        effectiveMessages,
        () => executeChatCompletion({ model, messages: effectiveMessages, stream: true, apiKey: configuredApiKey, baseURL, requestId, caller: 'app.llm_chat', purpose: purpose || 'general_chat', maxRetries: 0, maxOutputTokens, reasoningEffort }),
        { model, baseURL, requestId, metadata: { purpose: 'general_chat' } },
      ) as unknown as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>;

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completionStream) {
              const text = chunk.choices?.[0]?.delta?.content || '';
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const completion = await traceLlmCall(
      'prep-pilot-chat-completion',
      effectiveMessages,
      () => executeChatCompletion({ model, messages: effectiveMessages, apiKey: configuredApiKey, baseURL, requestId, caller: 'app.llm_chat', purpose: purpose || 'general_chat', maxRetries: 0, maxOutputTokens, reasoningEffort }),
      { model, baseURL, requestId, metadata: { purpose: 'general_chat' } },
    );

    return NextResponse.json({
      content: extractChatCompletionContent(completion),
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error: unknown) {
    console.error('LLM Chat Completion Route Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to process chat completion', message },
      { status: 500 }
    );
  }
}
