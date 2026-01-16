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
