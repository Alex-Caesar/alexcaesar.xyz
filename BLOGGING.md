# Writing a blog post

A short guide to adding posts to this site's blog.

## Quick start

1. Create a new file at `src/content/blog/your-post-slug.md` (the filename becomes the URL: `/blog/your-post-slug/`).
2. Add frontmatter + body:

   ```md
   ---
   title: Post Title
   description: One-sentence summary, used on the blog index and as the page's meta description.
   pubDate: 2026-01-01
   tags: [webdev, design]
   ---

   Post body in [CommonMark](https://commonmark.org/help/) markdown.
   ```

3. Run `npm run dev` and check `/blog/` — new posts appear automatically, newest first.

## Frontmatter fields

Defined in [`src/content.config.ts`](src/content.config.ts):

| Field          | Required | Type                | Notes                                                         |
| -------------- | -------- | ------------------- | -------------------------------------------------------------- |
| `title`        | yes      | string              |                                                                  |
| `description`  | yes      | string               | Shown on the blog index and used as the page's meta description |
| `pubDate`      | yes      | date (`YYYY-MM-DD`) | Controls sort order on `/blog/`                                 |
| `tags`         | no       | string array        | Defaults to `[]`. Rendered via `TagList`                        |
| `draft`        | no       | boolean              | Defaults to `false`. Draft posts are filtered out of `/blog/` but still build (useful for previewing before publishing) |
| `coverImage`   | no       | image path           | See [Images](#images) below                                     |
| `coverImageAlt`| no       | string               | Alt text for the cover image                                    |

## Images

Put per-post images in a subfolder under `src/content/blog/images/`, named after the post's slug:

```
src/content/blog/
  your-post-slug.md
  images/
    your-post-slug/
      cover.jpg
      diagram.png
```

Reference them with a relative path — from the post body:

```md
![Alt text](./images/your-post-slug/diagram.png)
```

or as the cover image, in frontmatter:

```yaml
coverImage: ./images/your-post-slug/cover.jpg
coverImageAlt: Alt text for the cover image
```

Any image referenced this way (relative path, not `/...` or `http...`) runs through Astro's image pipeline automatically — resized, converted to WebP, lazy-loaded. No extra step needed.

## Markdown features

Standard [CommonMark](https://commonmark.org/help/) — headings, lists, blockquotes, tables, fenced code blocks, images — all have styles already defined in [`BlogPostLayout.astro`](src/layouts/BlogPostLayout.astro). Headings in the post body start at `##` (the post title itself is the page's `<h1>`).

For anything beyond plain markdown (embedding a custom component, JSX-like expressions), name the file `.mdx` instead of `.md` — the content collection glob picks up both. See the [MDX docs](https://docs.astro.build/en/guides/integrations-guide/mdx/).

## Reference

- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) — how the schema/loader above works
- [Astro Markdown](https://docs.astro.build/en/guides/markdown-content/) — how `.md`/`.mdx` files get turned into pages here
- [Astro MDX integration](https://docs.astro.build/en/guides/integrations-guide/mdx/) — components/expressions inside post bodies
- [Astro syntax highlighting](https://docs.astro.build/en/guides/syntax-highlighting/) — fenced code blocks are highlighted via Shiki by default; this covers supported languages and themes
- [CommonMark syntax](https://commonmark.org/help/) — the base markdown spec
- [GitHub Flavored Markdown spec](https://github.github.com/gfm/) — tables, strikethrough, task lists, autolinks (all enabled by default in Astro's markdown, on top of CommonMark)
