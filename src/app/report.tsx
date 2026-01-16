import { Text, View, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react-native';
import { analyzePageSpeed, analyzeSEO, generateAIRecommendations } from '@/lib/seo-api';

interface AnalysisResult {
  performance?: number;
  seo?: number;
  accessibility?: number;
  bestPractices?: number;
  issues?: string[];
  mobileOptimized?: boolean;
  sslCertificate?: boolean;
  metrics?: {
    fcp?: number;
    lcp?: number;
    cls?: number;
  };
  aiRecommendations?: string[];
}

export default function ReportScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError('No URL provided');
      setIsLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        const [pageSpeedResult, seoResult] = await Promise.all([
          analyzePageSpeed(url),
          analyzeSEO(url),
        ]);

        if (pageSpeedResult.error && seoResult.error) {
          setError('Failed to analyze the website. Please try again.');
          return;
        }

        const combined = {
          performance: pageSpeedResult.overall?.performance,
          seo: pageSpeedResult.overall?.seo,
          accessibility: pageSpeedResult.overall?.accessibility,
          bestPractices: pageSpeedResult.overall?.bestPractices,
          metrics: pageSpeedResult.metrics,
          mobileOptimized: seoResult.mobileOptimized,
          sslCertificate: seoResult.sslCertificate,
          issues: seoResult.issues,
        };

        setResults(combined);

        // Fetch AI recommendations in background
        setIsLoadingAI(true);
        const aiRecs = await generateAIRecommendations(url, {
          performance: combined.performance,
          seo: combined.seo,
          accessibility: combined.accessibility,
          bestPractices: combined.bestPractices,
        }, combined.issues);

        setResults(prev => prev ? { ...prev, aiRecommendations: aiRecs } : null);
        setIsLoadingAI(false);
      } catch (err) {
        console.error('Analysis error:', err);
        setError('Failed to analyze the website');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [url]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4 text-gray-600 font-medium">Analyzing your website...</Text>
      </View>
    );
  }

  if (error || !results) {
    return (
      <View className="flex-1 bg-white px-6 justify-center items-center">
        <AlertCircle size={48} color="#FF4444" strokeWidth={1.5} />
        <Text className="text-lg font-bold text-gray-900 mt-4 text-center">{error || 'Analysis failed'}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-black px-8 py-3 rounded-lg">
          <Text className="text-white font-semibold">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const overallScore = Math.round((
    ((results.performance || 0) +
    (results.seo || 0) +
    (results.accessibility || 0) +
    (results.bestPractices || 0)) / 4
  ));

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center mb-3">
          <ArrowLeft size={20} color="#000" strokeWidth={2.5} />
        </Pressable>
        <Text className="text-gray-600 text-sm font-medium truncate">{url}</Text>
      </View>

      {/* Overall Score */}
      <View className="px-6 py-8 border-b border-gray-200">
        <Text className="text-gray-600 text-sm font-medium mb-2">Your SEO Score</Text>
        <Text className="text-5xl font-bold text-gray-900">{overallScore}</Text>
        <Text className="text-gray-500 text-sm mt-1">out of 100</Text>
      </View>

      {/* Scores */}
      <View className="px-6 py-6 border-b border-gray-200">
        <Text className="text-gray-900 font-bold text-base mb-4">Scores</Text>
        <View className="gap-3">
          <ScoreRow label="Performance" value={results.performance} />
          <ScoreRow label="SEO" value={results.seo} />
          <ScoreRow label="Accessibility" value={results.accessibility} />
          <ScoreRow label="Best Practices" value={results.bestPractices} />
        </View>
      </View>

      {/* Issues */}
      {results.issues && results.issues.length > 0 && (
        <View className="px-6 py-6 border-b border-gray-200">
          <Text className="text-gray-900 font-bold text-base mb-4">Issues Found</Text>
          <View className="gap-2">
            {results.issues.slice(0, 5).map((issue, idx) => (
              <View key={idx} className="flex-row gap-2">
                <AlertCircle size={16} color="#FF4444" className="mt-0.5 flex-shrink-0" />
                <Text className="flex-1 text-gray-800 text-sm">{issue}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* AI Recommendations */}
      <View className="px-6 py-6 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 font-bold text-base">AI Tips</Text>
          {isLoadingAI && <ActivityIndicator size="small" color="#000" />}
        </View>

        {results.aiRecommendations && results.aiRecommendations.length > 0 ? (
          <View className="gap-3">
            {results.aiRecommendations.map((rec, idx) => (
              <View key={idx} className="flex-row gap-3">
                <Lightbulb size={18} color="#FFB800" fill="#FFB800" className="mt-0.5 flex-shrink-0" />
                <Text className="flex-1 text-gray-800 text-sm leading-5">{rec}</Text>
              </View>
            ))}
          </View>
        ) : isLoadingAI ? (
          <View className="items-center gap-2 py-4">
            <ActivityIndicator size="small" color="#000" />
            <Text className="text-gray-600 text-sm">Generating AI tips...</Text>
          </View>
        ) : (
          <Text className="text-gray-600 text-sm">AI tips coming soon</Text>
        )}
      </View>

      {/* CTA */}
      <View className="px-6 py-6">
        <Pressable
          onPress={() => Linking.openURL('https://your-website.com/contact')}
          className="bg-black py-3 px-4 rounded-lg items-center">
          <Text className="text-white font-semibold text-base">Get Help</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ScoreRow({ label, value }: { label: string; value?: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-gray-700 text-sm">{label}</Text>
      <Text className="font-bold text-gray-900 text-sm">{value ?? '—'}</Text>
    </View>
  );
}
