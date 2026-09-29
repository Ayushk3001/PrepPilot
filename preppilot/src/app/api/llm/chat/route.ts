import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, DEFAULT_MODEL } from '@/server/ai/llmClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, stream = false, model = DEFAULT_MODEL, apiKey, baseURL } = body;

    const client = getOpenAIClient(apiKey, baseURL);

    if (stream) {
      const completionStream = await client.chat.completions.create({
        model,
        messages: messages || [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: 'Hello!' },
        ],
        stream: true,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completionStream) {
              const text = chunk.choices[0]?.delta?.content || '';
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

    const completion = await client.chat.completions.create({
      model,
      messages: messages || [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: 'Hello!' },
      ],
    });

    return NextResponse.json({
      content: completion.choices[0]?.message?.content || '',
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('LLM Chat Completion Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat completion', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
