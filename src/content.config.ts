import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      // Optional: a co-located image (see README in src/content/blog/) — using the `image()`
      // helper here (rather than a plain string path) is what runs it through Astro's image
      // pipeline, so it gets resized/converted/optimized instead of served as-is.
      coverImage: image().optional(),
      coverImageAlt: z.string().optional(),
    }),
});

export const collections = { blog };
