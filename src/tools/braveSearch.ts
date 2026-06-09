import { z } from 'zod';
import { defineTool } from '../core/Tool.js';

interface BraveResult {
  title: string;
  url: string;
  description: string;
}

interface BraveResponse {
  web?: {
    results?: Array<{
      title: string;
      url: string;
      description?: string;
    }>;
  };
}

export const braveSearch = defineTool({
  description:
    'Search the web using Brave Search. Returns titles, URLs, and descriptions for the top results. Use this first to discover relevant pages before reading them with fetchPage.',
  parameters: z.object({
    query: z.string().describe('The search query'),
    count: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe('Number of results to return (1–10)'),
  }),
  execute: async ({ query, count }) => {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      return { error: 'BRAVE_API_KEY is not set in environment variables.' };
    }

    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(count));

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      });

      if (!response.ok) {
        return { error: `Brave Search API error: ${response.status} ${response.statusText}` };
      }

      const data = (await response.json()) as BraveResponse;
      const results: BraveResult[] = (data.web?.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        description: r.description ?? '',
      }));

      return { query, results };
    } catch (err) {
      return { error: `Failed to reach Brave Search: ${String(err)}` };
    }
  },
});
