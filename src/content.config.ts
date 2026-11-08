import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Статті лежать у src/content/articles/uk/ (українською) та src/content/articles/en/ (англійською).
// Однакова назва файлу в обох папках = переклад тієї самої статті.
// Файли, що починаються з «_» (наприклад, _TEMPLATE.md), на сайт не потрапляють.
const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '{uk,en}/**/[^_]*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['news', 'research', 'biomechanics', 'discussion']),
    section: z.enum(['upper-limb', 'lower-limb', 'orthotics', 'gait', 'textbooks']),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    confidence: z.enum(['high', 'moderate', 'low', 'unknown']).optional(),
    evidenceLevel: z.number().int().min(1).max(6).optional(),
    studyType: z.string().optional(),
    limitations: z.string().optional(),
    tags: z.array(z.string()).default([]),
    terms: z.array(z.object({ uk: z.string(), en: z.string() })).default([]),
    question: z.string().optional(),
    references: z
      .array(
        z.object({
          text: z.string(),
          doi: z.string().optional(),
          url: z.string().optional(),
        }),
      )
      .default([]),
    telegram: z.string().optional(),
    coi: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    demo: z.boolean().default(false),
  }),
});

export const collections = { articles };
