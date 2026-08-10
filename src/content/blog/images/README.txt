Put per-post images here, one subfolder per post slug, e.g.:

```
images/
  my-post-slug/
    cover.jpg
    diagram.png
```

Reference them from `../my-post-slug.md` (or `.mdx`) with a relative path:

```markdown
![Alt text](./images/my-post-slug/diagram.png)
```

And as the optional cover image in frontmatter:

```yaml
coverImage: ./images/my-post-slug/cover.jpg
coverImageAlt: Alt text for the cover image
```

Any image referenced this way (relative path, not starting with `/` or `http`) is
automatically resized, converted to WebP, and lazy-loaded by Astro — no extra step needed.
