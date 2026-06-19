---
name: gemini-api-resilience
description: Guidelines for calling Google Gemini API safely, handling rate limits (429 errors), and implementing exponential backoff.
---

# Gemini API Resilience Skill

## Use this skill when
- Implementing functions that call the Gemini API (`generateContent`).
- Writing error handling, retry logic, or queuing mechanisms for the LLM client.

## Instructions
1. **Exponential Backoff**:
   - Wrap the Gemini API invocation in a retry loop (e.g., up to 3-5 retries).
   - Catch errors and identify `429 Too Many Requests` (Rate Limit) status.
   - Wait/sleep dynamically using an exponential formula: `2000 * (retryIndex + 1)` ms before retrying.
2. **Safe Fallback**:
   - If all retries fail, return a polite fallback message instructing the user to try again in 1-2 minutes or contact the ward police directly.
3. **Prompt Safety**:
   - Instruct the model strictly via `systemInstruction` or custom prompt.
   - The model must identify itself as "Công an Phường".
   - The model must ONLY answer based on the provided reference context, and refuse to answer if the context does not contain the answer.
