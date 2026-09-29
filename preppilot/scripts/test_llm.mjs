import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://aicredits.in/v1',
  apiKey: process.env.OPENAI_API_KEY
});

async function main() {
  console.log('Testing streaming chat completion via aicredits.in with openai/gpt-5-nano...');
  const completion = await client.chat.completions.create({
    model: 'openai/gpt-5-nano',
    messages: [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: 'Hello! Introduce yourself briefly.' }
    ],
    stream: true
  });

  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
  console.log('\n--- Done ---');
}

main().catch(console.error);
