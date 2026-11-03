# Legal Tech Oaxaca

Static site for Legal Tech Oaxaca, published with GitHub Pages and associated with `www.legaltechoaxacacorporativojuridico.com`.

## Legal AI chat

The site includes a legal-information chat interface. Its backend is a Cloudflare Worker in `functions/chat-worker`; GitHub Pages itself cannot execute server code. The frontend defaults to the same-origin `POST /api/chat`. For a `workers.dev` deployment, set the `legal-chat-endpoint` meta tag in `index.html` to the Worker URL followed by `/api/chat`. For same-origin use, configure the Worker route shown in `functions/chat-worker/wrangler.toml` and ensure the domain's DNS is proxied through Cloudflare.

### Deploy the chat backend

1. Sign in to an account that manages the domain in Cloudflare, install Node.js/npm, then run `cd functions/chat-worker` and `npx wrangler login`.
2. Add the required server-side settings with `npx wrangler secret put AI_API_KEY`, `AI_BASE_URL` (HTTPS chat-completions endpoint for an OpenAI-compatible provider), `AI_MODEL`, and `ALLOWED_ORIGINS` (exact website origin, e.g. `http://www.legaltechoaxacacorporativojuridico.com`; add the HTTPS origin too if used).
3. Run `npx wrangler deploy`. This deploys a `workers.dev` URL. For same-origin `/api/chat`, enable the example route in `wrangler.toml`, use Cloudflare DNS/proxy for the site, and deploy again. Otherwise, set `legal-chat-endpoint` to the deployed Worker URL plus `/api/chat` and publish the site.
4. Check the Worker `/health` endpoint; `configured: true` means the backend secrets exist. Send a test question through the website and confirm an answer before treating the integration as live.

The Worker accepts only JSON containing up to 20 `user`/`assistant` messages (4,000 characters per message), limits each IP to 10 requests/minute, applies a 25-second provider timeout, and returns generic errors without exposing upstream details. The provider must implement the OpenAI-compatible chat-completions request/response format. Choose a provider and verify its legal-data handling before adding its key. Never send confidential case details until privacy, provider retention, and consent policies are approved. The chat is informational, not legal advice; model responses can be inaccurate.

No Cloudflare account credentials, AI-provider key, model, or provider endpoint were present in this repository. These must be configured as Worker secrets by an account owner; do not put them in the static site or commit them.
