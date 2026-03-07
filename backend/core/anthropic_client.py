import anthropic
from backend.core.config import ANTHROPIC_API_KEY

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

LENGTH_INSTRUCTIONS = {
    "short": "Provide a very concise summary in 1 page.",
    "medium": "Provide a clear summary in 2-3 pages.",
    "long": "Provide a detailed summary covering all key points.",
}


SYSTEM_PROMPT = """
You are a helpful assistant that summarizes webpage content for someone with ADHD.
Make the summary clean, clear, and easy to read. Use simple language and short sentences.
Avoid clutter and unnecessary details. Focus on the main points and key information.

When summarizing, consider the following instructions:
- Give a concise overview of the content, highlighting the most important information.
- Use Markdown formatting to break up the text and make it easier to read.
- Use bullet points or numbered lists to organize information when appropriate.
- Avoid long paragraphs and complex sentences. Keep it simple and straightforward.
- If the content is very long, focus on summarizing the first few sections or the most relevant parts.
- If the content is a news article, focus on the who, what, when, where, why, and how.

"""

def get_system_prompt(length: str) -> str:
    length_instruction = LENGTH_INSTRUCTIONS.get(length, LENGTH_INSTRUCTIONS["medium"])
    return SYSTEM_PROMPT + "\n\n" + length_instruction


def summarize_content(text: str, length: str = "medium") -> str:
    system_prompt = get_system_prompt(length)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": text,
            }
        ],
    )
    return message.content[0].text
