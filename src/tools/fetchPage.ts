import { tool } from 'ai';
import { z } from 'zod';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const MAX_CONTENT_CHARS = 8_000;

export const fetchPage = tool({
  description:
    'Fetch the full content of a web page and extract its readable text. Use this after braveSearch to read the actual content of a promising URL. Returns the page title and clean article text with navigation, ads, and scripts removed.',
  parameters: z.object({
    url: z.string().url().describe('The full URL of the page to fetch and read'),
  }),
  execute: async ({ url }) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ResearchAgent/1.0; +https://github.com/krenova)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        return { error: `HTTP ${response.status} when fetching ${url}` };
      }

      const html = await response.text();

      // jsdom creates a DOM from raw HTML — required by @mozilla/readability
      const dom = new JSDOM(html, { url });
      const article = new Readability(dom.window.document).parse();

      let content: string;
      let title: string;

      if (article) {
        title = article.title ?? '';
        content = article.textContent ?? '';
      } else {
        // Fallback: strip HTML tags if readability can't extract structure
        title = dom.window.document.title ?? '';
        content = dom.window.document.body?.textContent ?? '';
      }

      // Normalise whitespace and cap length to avoid token overload
      content = content.replace(/\s+/g, ' ').trim().slice(0, MAX_CONTENT_CHARS);
      const wordCount = content.split(' ').length;

      return { url, title, content, wordCount };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { error: `Timed out fetching ${url}` };
      }
      return { error: `Failed to fetch ${url}: ${String(err)}` };
    }
  },
});
