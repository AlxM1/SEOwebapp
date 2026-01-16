// Google PageSpeed Insights API
export async function analyzePageSpeed(url: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=AIzaSyD4YMV8C6pZE0HS2WNP5bswZB0V_WVFWDQ`
    );
    const data = await response.json();

    if (data.error) {
      return { error: data.error.message };
    }

    const lighthouse = data.lighthouseResult;
    const categories = lighthouse.categories;

    return {
      overall: {
        performance: Math.round(categories.performance.score * 100),
        seo: Math.round(categories.seo.score * 100),
        accessibility: Math.round(categories.accessibility.score * 100),
        bestPractices: Math.round(categories['best-practices'].score * 100),
      },
      metrics: {
        fcp: Math.round(lighthouse.audits['first-contentful-paint'].numericValue / 1000),
        lcp: Math.round(lighthouse.audits['largest-contentful-paint'].numericValue / 1000),
        cls: Math.round(lighthouse.audits['cumulative-layout-shift'].numericValue * 100) / 100,
        ttfb: Math.round(lighthouse.audits['server-response-time'].numericValue),
      }
    };
  } catch (error) {
    console.error('PageSpeed API error:', error);
    return { error: 'Failed to analyze page speed' };
  }
}

// Generate AI Recommendations using Grok or OpenAI
export async function generateAIRecommendations(
  url: string,
  scores: {
    performance?: number;
    seo?: number;
    accessibility?: number;
    bestPractices?: number;
  },
  issues?: string[]
): Promise<string[]> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GROK_API_KEY || process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
    const isGrok = !!process.env.EXPO_PUBLIC_VIBECODE_GROK_API_KEY;

    if (!apiKey) {
      return [];
    }

    const endpoint = isGrok ? 'https://api.x.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    const model = isGrok ? 'grok-4-fast-non-reasoning' : 'gpt-5-nano';

    const prompt = `You are a competitive analysis expert. Analyze this competitor's website metrics and provide 5 specific strategies they're using that give them an advantage, plus gaps you can exploit.

Competitor Website: ${url}
Performance Score: ${scores.performance}/100
SEO Strength: ${scores.seo}/100
Accessibility Score: ${scores.accessibility}/100
Best Practices Score: ${scores.bestPractices}/100
${issues && issues.length > 0 ? `Technical Issues: ${issues.slice(0, 3).join(', ')}` : ''}

Provide insights as a numbered list (1-5). Each insight should:
- Identify what they're doing well OR where they're weak
- Show how to compete against them or exploit their weakness
- Be actionable and strategic
- Focus on gaining competitive advantage

Format each as: "Number. [Strategy/Gap] - How to compete: [specific action]"`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful SEO expert. Provide practical, actionable recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(isGrok ? { max_tokens: 1000, temperature: 1 } : { max_completion_tokens: 1000, temperature: 1 }),
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.statusText);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse the response into individual recommendations
    const recommendations = content
      .split('\n')
      .filter((line: string) => line.trim().match(/^\d+\./))
      .map((line: string) => line.trim())
      .slice(0, 5);

    return recommendations.length > 0 ? recommendations : [];
  } catch (error) {
    console.error('AI Recommendation error:', error);
    return [];
  }
}

// Webpulls Free SEO Audit API
export async function analyzeSEO(url: string) {
  try {
    const response = await fetch('https://api.webpulls.com/v1/seo-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url.replace(/https?:\/\//, '') }),
    });

    const data = await response.json();

    if (data.error) {
      return { error: data.error };
    }

    return {
      title: data.title,
      description: data.description,
      h1: data.h1,
      images: data.images,
      links: data.links,
      mobileOptimized: data.mobile_optimized,
      sslCertificate: data.ssl_certificate,
      score: Math.round((data.score || 0) * 100),
      issues: data.issues || [],
    };
  } catch (error) {
    console.error('Webpulls API error:', error);
    return { error: 'Failed to analyze SEO' };
  }
}
