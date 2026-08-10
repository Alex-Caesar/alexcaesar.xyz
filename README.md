# alexcaesar.xyz

Source for my personal website: resume, blog, and ways to connect.

## Stack

- [Astro](https://astro.build/) — static site generator, ships zero client-side JS by default
- Markdown-based [content collections](https://docs.astro.build/en/guides/content-collections/) for the blog
- Plain CSS with custom properties for theming (no CSS framework)
- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (self-hosted via [Fontsource](https://fontsource.org/)) for type
- Hand-authored, build-time-generated inline SVG for the homepage graphic — no raster images or animation libraries

Design goals: fast (static output, minimal JS, optimized images, self-hosted fonts) and accessible (semantic HTML, visible focus states, WCAG AA–checked color contrast in both light and dark themes, reduced-motion support).

## Project structure

```
src/
  content/blog/     Blog posts, as markdown files
  content.config.ts Blog collection schema
  components/       Reusable Astro components
  layouts/          Page layouts (base + blog post)
  pages/            Routes (/, /resume/, /blog/, /connect/)
  styles/           Design tokens + global styles
public/             Static assets (favicons, resume PDFs, fonts)
```

## Development

```sh
npm install
npm run dev       # local dev server
npm run build     # static build to dist/
npm run preview   # preview the production build locally
```

## Writing a blog post

Add a new markdown file under `src/content/blog/` with frontmatter:

```md
---
title: Post Title
description: One-sentence summary.
pubDate: 2026-01-01
tags: [tag-one, tag-two]
---

Post body in markdown.
```

## Deployment

`npm run build` produces a fully static site in `dist/`, which is deployed to a self-hosted [Caddy](https://caddyserver.com/) server. No CI is configured — builds are deployed manually by syncing `dist/` to the server's web root and reloading Caddy.

This redesign changed the URL structure (e.g. `/blog.html` → `/blog/`, `/contact.html` → `/connect/`). The server config redirects the old paths to their new equivalents so existing links/bookmarks keep working.

## License

Content (writing, resume, bio) is not licensed for reuse. Feel free to reference the code/structure for your own site.
