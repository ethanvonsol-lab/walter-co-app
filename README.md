# Walter & Co

An AI-powered Instagram reply automation service. Walter & Co learns a creator's voice through a short onboarding flow, then drafts and sends on-brand replies to incoming Instagram messages, surfacing leads along the way.

Built with [Next.js](https://nextjs.org), [Supabase](https://supabase.com) (auth + database), and the [Anthropic API](https://docs.anthropic.com).

## Features

- **Voice onboarding** — a guided questionnaire builds a per-client voice profile used to generate replies.
- **Dashboard** — inbox, leads, voice settings, and analytics in one place.
- **Instagram webhook** — receives incoming messages and detects buying-intent leads.
- **AI replies** — generates responses in the client's voice via the Anthropic API.
- **Embeddable widget** — a lightweight widget endpoint for collecting messages.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file in the project root with the following:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Instagram
INSTAGRAM_ACCESS_TOKEN=
WEBHOOK_VERIFY_TOKEN=
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the project with ESLint |

## Project Structure

- `app/` — Next.js App Router pages and API routes (`dashboard`, `onboarding`, `login`, `widget`, `privacy`, `api/*`).
- `components/` — shared React components.
- `lib/` — Supabase client and other utilities.
- `middleware.ts` — auth/session middleware.
