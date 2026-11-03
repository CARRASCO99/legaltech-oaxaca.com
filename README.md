# Legal Tech Oaxaca

Static site for Legal Tech Oaxaca, published with GitHub Pages and associated with `www.legaltechoaxacacorporativojuridico.com`.

## Legal AI chat

The site includes the chat interface and sends requests to a same-origin `POST /api/chat` endpoint. The static GitHub Pages site does not provide that endpoint; the chat will show an availability error until a backend is deployed and routed at that path.

The backend contract is:

- Request JSON: `{ "messages": [{ "role": "user" | "assistant", "content": "..." }] }` (up to 20 recent messages).
- Response JSON: `{ "reply": "..." }`.
- Keep model credentials on the server, validate message roles and lengths, apply rate limits, and return JSON errors without exposing provider credentials or internal diagnostics.
- Select and configure the AI provider, legal reference sources, retention policy, and privacy notice before enabling the endpoint. Do not send sensitive client or case information to an AI provider without an approved privacy and data-handling process.

No AI provider or server credentials are configured in this repository. Do not add provider secrets to the static site.
