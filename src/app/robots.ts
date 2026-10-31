import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE_URL = 'https://zatsudan-gacha.app';

export default function robots(): MetadataRoute.Robots {
  const aiCrawlers = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'Applebot-Extended',
    'cohere-ai',
  ];

  const allowRules = {
    allow: '/',
    disallow: '/api/',
  };

  return {
    rules: [
      {
        userAgent: '*',
        ...allowRules,
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        ...allowRules,
      })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
