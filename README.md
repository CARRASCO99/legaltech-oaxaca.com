# Legal Tech Oaxaca

Static site for Legal Tech Oaxaca, published with GitHub Pages and associated with `www.legaltechoaxacacorporativojuridico.com`.

## Legal AI chat

The site includes a legal-information chat interface. Its backend is a Cloudflare Worker in `functions/chat-worker`; GitHub Pages itself cannot execute server code. The frontend defaults to the same-origin `POST /api/chat`. For a `workers.dev` deployment, set the `legal-chat-endpoint` meta tag in `index.html` to the Worker URL followed by `/api/chat`. For same-origin use, configure the Worker route shown in `functions/chat-worker/wrangler.toml` and ensure the domain's DNS is proxied through Cloudflare.

### Deploy the chat backend

1. Sign in to an account that manages the domain in Cloudflare, install Node.js/npm, then run `cd functions/chat-worker` and `npx wrangler login`.
2. The default configuration uses the Cloudflare Workers AI binding with model `@cf/meta/llama-3.1-8b-instruct` and the website's HTTPS origin. Confirm that this model is available for the account and review current Workers AI pricing/quotas before use. To change it, update `AI_MODEL` in `wrangler.toml`. The alternative OpenAI-compatible provider requires the server-side secrets `AI_API_KEY`, `AI_BASE_URL` (HTTPS endpoint), and `AI_MODEL`; never put keys in the site or commit them.
3. Run `node --test test/worker.test.mjs` from `functions/chat-worker` for offline tests with a mocked AI binding. For local inference, run `npx wrangler dev` from that directory. The Worker runs locally, but the AI binding is configured as a remote binding because Cloudflare does not provide a local AI simulation. This sends inference to Cloudflare and requires a valid `CLOUDFLARE_API_TOKEN` in the local process environment and account access; usage may consume account quota or incur charges. Do not commit the token. Use the same-origin local website or configure its chat endpoint for the local Worker before testing the browser integration.
4. After confirming account, model, quota and domain routing, an account owner may deploy with `npx wrangler deploy`. This publishes a `workers.dev` URL. For same-origin `/api/chat`, enable the example route in `wrangler.toml`, use Cloudflare DNS/proxy for the site, and deploy again. Otherwise, set `legal-chat-endpoint` to the deployed Worker URL plus `/api/chat` and publish the site.
5. Check `/health`; `configured: true` means an AI binding or provider secrets, origin allowlist and rate limiter are present. It does not prove that the account can run the selected model. Test an actual question only after verifying the account and cost policy.

The local Worker tests can use a mocked `AI.run` binding without sending prompts to Cloudflare; they validate request handling and response parsing, not model quality or account availability.

The Worker accepts only JSON containing up to 20 `user`/`assistant` messages (4,000 characters per message), limits each IP to 10 requests/minute, applies a 25-second provider timeout, and returns generic errors without exposing upstream details. The system prompt instructs the model to refuse harmful or unlawful assistance; model instructions are not an unbreakable security boundary and cannot guarantee how every model response behaves. Do not rely on spiritual beliefs or prompt text as technical authorization or abuse prevention. The current abuse control is a per-IP rate limit; the Worker does not identify or permanently block people. The provider must implement the OpenAI-compatible chat-completions request/response format. Choose a provider and verify its legal-data handling before adding its key. Never send confidential case details until privacy, provider retention, and consent policies are approved. The chat is informational, not legal advice; model responses can be inaccurate.

No Cloudflare account credentials, AI-provider key, or external provider endpoint are stored in this repository. The Workers AI model and allowed website origin are non-secret Worker configuration; the AI binding still requires a Cloudflare account with Workers AI access. Alternative-provider credentials must be configured as Worker secrets by an account owner; do not put them in the static site or commit them.

## Current product and access-control scope

This repository contains a GitHub Pages static site and the optional Cloudflare chat Worker. It does not contain user accounts, authentication, a case-management database, appointment booking, payment processing, subscription entitlements, or a software license. The Worker rate limit and upstream provider quotas also mean the chat cannot provide literally unlimited execution; usage depends on deployment quotas, provider limits, and cost.

The site must not be used to store case records or credentials. The former client-side PIN check and sample case data were removed because they did not provide authentication or secure storage. Four legacy ZIP packages that still contained that exposed PIN and demo case data were removed from the public site source. LexControl and the admin panel are marked unavailable rather than simulating protection. A local template preview is not AI-generated legal advice, and appointment/contact links open WhatsApp but do not book or record a consultation.

Demo/premium roles require a chosen identity provider, server-verified authorization, protected data storage, and explicit entitlements and commercial terms. No prices, license terms, or access rules are defined here, so the static site does not claim to enforce those plans. Do not treat visible client-side controls as authorization.

## Mobile web app

The site includes a web app manifest, a responsive mobile experience, and a service worker that caches the site shell for navigation fallback. The home-page install button uses the browser's install prompt when available; on iOS it explains how to add the site to the home screen. This is a PWA/web app, not a published native iOS or Android app, and there is no native installer or store link in this repository. The chat still requires connectivity and a configured Worker/provider.
