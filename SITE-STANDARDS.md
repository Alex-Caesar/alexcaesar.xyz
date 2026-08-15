# Site standards: maintenance, SEO/AI, and a security/web baseline

Reference doc for keeping alexcaesar.xyz working, findable, and safe over time.
Three parts: automated upkeep tooling, SEO/AI-crawler improvements specific to
this repo, and a general-purpose "what should any website have" checklist
synthesized from the standards that actually cover that ground (there isn't
one OWASP-style umbrella for it — see [Part 3](#part-3-a-website-baseline-not-just-owasp)).

Current state noted below reflects a repo audit on 2026-08-15.

## Part 1: Automated maintenance tooling

None of this is wired up yet (no CI is configured — see README's Deployment
section). Recommended additions, roughly in priority order:

| Tool | Catches | Setup |
|---|---|---|
| **Dependabot** | Outdated/vulnerable npm deps (astro, mdx, sitemap, three) | `.github/dependabot.yml`, zero config beyond a schedule |
| **Lychee** | Broken internal/external links, dead image srcs | GitHub Action, run weekly + on PR |
| **Lighthouse CI** | Perf/accessibility/SEO regressions | GitHub Action against a built `dist/` preview |
| **UptimeRobot** or **Better Uptime** | Server/Caddy downtime, expired TLS cert | External, points at `https://alexcaesar.xyz`, free tier |
| `npm audit` | Known CVEs in dependencies | Run in the same Dependabot/CI workflow |

Since there's no CI at all right now, the fastest win is a single GitHub
Actions workflow that runs `npm audit`, Lychee, and Lighthouse CI on a
schedule (e.g. weekly) plus on every PR into `main`. Deployment itself can
stay manual (per README) — this is just a tripwire, not a deploy pipeline.

## Part 2: SEO & AI-crawler gaps in this repo

Audited `src/layouts/BaseLayout.astro` and `public/`. What's already solid:
canonical URLs, sitemap (`@astrojs/sitemap`), RSS feed, full favicon/manifest
set, semantic HTML with a skip link, WCAG AA-checked contrast (per README).

What's missing:

- **Open Graph / Twitter Card meta** — no `og:title`, `og:description`,
  `og:image`, `twitter:card`, etc. Social shares (Slack, Twitter/X, LinkedIn,
  iMessage previews) currently render with no preview card. Needs a
  1200×630 `og-image.png` in `public/` and per-page title/description passed
  through to the new tags (the layout already takes `title`/`description`
  props, so this is additive).
- **JSON-LD structured data** — no `application/ld+json`. Add a `Person`
  schema (site-wide, in `BaseLayout.astro`) and a `BlogPosting` schema per
  post (in `BlogPostLayout.astro`). This is what lets Google show rich
  results and is one of the more reliable signals for AI answer engines
  (Perplexity, ChatGPT browsing, Google AI Overviews) to correctly attribute
  and summarize the page.
- **`robots.txt`** — doesn't exist in `public/`. Even though the sitemap is
  submitted separately, a `robots.txt` that points to
  `https://alexcaesar.xyz/sitemap-index.xml` is the conventional discovery
  path and is where AI-crawler allow/disallow rules live (see below).
- **`theme-color` meta tag** — the manifest has a fixed `theme_color`
  (`#15181A`, the dark value) but there's no `<meta name="theme-color">` in
  `BaseLayout.astro` that could vary with the light/dark toggle. Minor, but
  it's why mobile browser chrome won't match the light theme.
- **`llms.txt`** — an emerging (not yet universally adopted) convention at
  `/llms.txt`: a plain-markdown index of the site's key pages, meant for LLMs
  to consume directly instead of parsing HTML. Cheap to add, low downside,
  genuinely useful for a static personal/portfolio site with a small,
  stable page set (`/`, `/work/`, `/about/`, `/blog/`).

### Consider a `/now` page

A ["now page"](https://nownownow.com/about) — a short, dated page answering
"what am I currently focused on" — is a lightweight content addition worth
considering here. It's not a formal standard, just a personal-site convention,
but it pulls its weight on two fronts this doc already cares about:

- **Fresh content signal.** A page you actually revisit and update
  periodically gives search engines a recrawl reason and a genuine
  `lastmod` change, unlike static bio pages that never move.
- **AI attribution.** It's exactly the kind of concrete, current, first-person
  fact ("as of [date], working on X") that answer engines pull from when
  someone asks an assistant what you're up to — better material for that than
  a general bio, which tends to stay abstract and dated.

Cheap to add given the existing `/about/` and `/work/` routes — a new
`src/pages/now.astro` reusing `BaseLayout`, linked from the header nav.

### AI-crawler access is a deliberate `robots.txt` decision, not a default

Once `robots.txt` exists, it's the place to explicitly allow or block
AI-specific user agents rather than leaving it to whatever each crawler
defaults to:

- `GPTBot`, `ChatGPT-User` (OpenAI)
- `ClaudeBot`, `Claude-User`, `anthropic-ai` (Anthropic)
- `Google-Extended` (Google's AI-training opt-out, separate from `Googlebot`)
- `PerplexityBot`
- `CCBot` (Common Crawl — feeds many downstream models)

For a resume/portfolio site, being *findable* by AI answer engines is
probably the goal (someone asking an assistant "who is Alex Caesar" should
get a good answer), so the likely right call is allow-all here rather than
the increasingly common blanket-block — but it's worth deciding explicitly
rather than by omission.

## Part 3: A website baseline (not just OWASP)

OWASP covers *application* security (input handling, auth, injection) — it's
the wrong shape for a static site with no backend, no forms, and no user
data. There's no single equivalent standard for "what should a website have"
across security, performance, accessibility, and device support. In
practice, the combination below is what fills that role, each piece owning
the slice it's actually authoritative on:

| Pillar | Standard(s) | What it covers |
|---|---|---|
| Security headers | **OWASP Secure Headers Project**, graded by **Mozilla Observatory** / securityheaders.com | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Transport security | **HSTS preload list**, TLS config graded by **Qualys SSL Labs** | Forces HTTPS, certificate hygiene |
| App-layer security (if forms/auth/user data are ever added) | **OWASP ASVS**, **OWASP Top 10** | Injection, auth, session handling |
| Performance | **Core Web Vitals** (LCP, INP, CLS) + Lighthouse's Performance category | Load speed, interactivity, layout stability |
| Accessibility | **WCAG 2.2 AA** | Contrast, keyboard nav, screen readers, motion |
| SEO | Lighthouse's SEO category + **schema.org** structured data | Crawlability, metadata, rich results |
| AI-crawler / agent access | `robots.txt` AI user-agent rules, `llms.txt` (llmstxt.org) | What LLM-driven crawlers and browsing agents can see and how they should read it |
| Cross-device | Responsive viewport meta, `manifest.json`, tested against real device breakpoints (not just DevTools) | Renders correctly on phone/tablet/desktop, installable as a PWA-lite |
| Privacy/compliance (if analytics/cookies are ever added) | Cookie consent per applicable law (GDPR/CCPA), a real privacy policy | Only relevant once tracking exists — currently N/A, no analytics in this repo |

### Consolidated checklist, current status for this site

- [x] HTTPS enforced (verify HSTS header is actually sent by Caddy — not
      configured in this repo, check the Caddyfile on the server)
- [ ] Security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`,
      `Permissions-Policy`) — set at the Caddy level, not in this repo; worth
      a pass through securityheaders.com once deployed
- [x] Canonical URLs
- [x] `sitemap.xml`
- [ ] `robots.txt`
- [ ] Open Graph / Twitter Card meta
- [ ] JSON-LD structured data
- [ ] `llms.txt`
- [x] Semantic HTML, skip link, WCAG AA contrast (per README)
- [x] Reduced-motion support (per README)
- [x] Responsive viewport meta + web manifest
- [ ] `theme-color` meta synced to light/dark toggle
- [x] RSS feed
- [ ] Automated link checking (Part 1)
- [ ] Automated dependency updates (Part 1)
- [ ] Uptime monitoring (Part 1)
- [ ] Lighthouse CI regression tracking (Part 1)
