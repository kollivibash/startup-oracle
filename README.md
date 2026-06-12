# Startup Oracle

AI-powered startup validation platform. Submit your startup idea, get a deep-dive analysis report with 6 sections and 44 sub-analyses, and connect with other founders in the community.

**Live:** https://startup-oracle-chi.vercel.app

## Features

### Idea Validation
- 3-step submission form (basics, details, review)
- AI generates a comprehensive report covering:
  - **Validation** — scores, market demand, unit economics, roadmap, customer journey
  - **Market** — TAM/SAM/SOM, audience personas, competitors, entry strategy, risks
  - **Business Plan** — overview, operating plan, financials, growth strategy, tools
  - **Brand Strategy** — naming, color, typography, voice, content, art direction
  - **Visual Identity** — logo concepts, color palette (hex codes), type system, templates
  - **Marketing** — ad copy, channel playbook, funnel design, SEO plan, launch sequence
- Reports saved to database; re-open anytime from Account page

### Community
- Post startup ideas with photo/document attachments
- Half-star rating system
- Suggestions/comments on posts
- Instagram-style follow requests (pending → accept/reject)
- Bell notifications for incoming follow requests
- Real-time direct messages
- Founder profiles with followers/following counts

### Auth
- Google and GitHub OAuth
- Email/password signup
- Session persistence across reloads
- Hard global logout (all devices)

## Tech Stack

- **Frontend:** React 19 + Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **AI:** Groq API (llama-3.3-70b-versatile)
- **Hosting:** Vercel
- **Styling:** Inline CSS (no component library)

## Setup

```bash
npm install
npm run dev
```

Create `.env.local`:
```
VITE_GROQ_API_KEY=your_groq_api_key
```

See [CLAUDE.md](CLAUDE.md) for full architecture docs, database setup, and deployment instructions.
