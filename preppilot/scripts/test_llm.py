import os
import openai

client = openai.OpenAI(
    base_url="https://aicredits.in/v1",
    api_key=os.environ.get("OPENAI_API_KEY", "")
)

completion = client.chat.completions.create(
    model="openai/gpt-5-nano",
    messages=[
        {"role": "system", "content": "You are a helpful AI assistant."},
        {"role": "user", "content": "Hello!"}
    ],
    stream=True
)

for chunk in completion:
    print(chunk.choices[0].delta.content or "", end="")
print()
