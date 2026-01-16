import { Text, View, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle, TrendingUp, Zap, Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
        <ActivityIndicator size="large" color="#0066FF" />
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
          className="mt-6 bg-blue-600 px-8 py-3 rounded-full">
          <Text className="text-white font-bold">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center mb-3">
          <ArrowLeft size={24} color="#0066FF" strokeWidth={2.5} />
        </Pressable>
        <Text className="text-gray-600 text-sm font-medium truncate">{url}</Text>
      </View>

      {/* Overall Score */}
      <Animated.View entering={FadeInDown.delay(100)} className="px-6 pt-6 pb-4">
        <LinearGradient
          colors={['#0066FF', '#0052CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl p-8 items-center">
          <Text className="text-white/70 font-semibold text-sm mb-2">OVERALL SEO SCORE</Text>
          <Text className="text-white text-6xl font-bold">
            {Math.round((
              ((results.performance || 0) +
              (results.seo || 0) +
              (results.accessibility || 0) +
              (results.bestPractices || 0)) / 4
            ))}
          </Text>
          <Text className="text-white/70 font-medium text-sm mt-2">out of 100</Text>
        </LinearGradient>
      </Animated.View>

      {/* Metrics Grid */}
      <Animated.View entering={FadeInUp.delay(200)} className="px-6 py-4 gap-3">
        <View className="flex-row gap-3">
          <MetricCard
            label="Performance"
            value={results.performance}
            color="#FF6B6B"
          />
          <MetricCard
            label="SEO"
            value={results.seo}
            color="#4ECDC4"
          />
        </View>
        <View className="flex-row gap-3">
          <MetricCard
            label="Accessibility"
            value={results.accessibility}
            color="#FFE66D"
          />
          <MetricCard
            label="Best Practices"
            value={results.bestPractices}
            color="#95E1D3"
          />
        </View>
      </Animated.View>

      {/* Key Insights */}
      <Animated.View entering={FadeInUp.delay(300)} className="px-6 py-4">
        <Text className="text-gray-900 font-bold text-lg mb-4">Key Insights</Text>

        <View className="bg-white rounded-2xl p-4 gap-3">
          {results.mobileOptimized && (
            <InsightRow
              icon={<CheckCircle size={20} color="#4ECDC4" />}
              title="Mobile Friendly"
              description="Your site is optimized for mobile devices"
            />
          )}

          {results.sslCertificate && (
            <InsightRow
              icon={<CheckCircle size={20} color="#4ECDC4" />}
              title="SSL Secure"
              description="Your site uses HTTPS security"
            />
          )}

          {results.metrics?.fcp && (
            <InsightRow
              icon={<TrendingUp size={20} color="#FF6B6B" />}
              title={`First Paint: ${results.metrics.fcp}s`}
              description="Time until first content appears"
            />
          )}

          {results.metrics?.lcp && (
            <InsightRow
              icon={<TrendingUp size={20} color="#FF6B6B" />}
              title={`Largest Paint: ${results.metrics.lcp}s`}
              description="Time for largest element to render"
            />
          )}
        </View>
      </Animated.View>

      {/* Issues */}
      {results.issues && results.issues.length > 0 && (
        <Animated.View entering={FadeInUp.delay(400)} className="px-6 py-4">
          <Text className="text-gray-900 font-bold text-lg mb-4">Issues Found</Text>

          <View className="bg-red-50 rounded-2xl p-4 gap-3">
            {results.issues.slice(0, 5).map((issue, idx) => (
              <View key={idx} className="flex-row gap-3">
                <AlertCircle size={20} color="#FF4444" className="mt-1" />
                <Text className="flex-1 text-gray-800 text-sm font-medium">{issue}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* AI Recommendations */}
      <Animated.View entering={FadeInUp.delay(500)} className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 font-bold text-lg">AI Recommendations</Text>
          {isLoadingAI && <ActivityIndicator size="small" color="#0066FF" />}
        </View>

        {results.aiRecommendations && results.aiRecommendations.length > 0 ? (
          <View className="bg-blue-50 rounded-2xl p-4 gap-3 border border-blue-200">
            {results.aiRecommendations.map((rec, idx) => (
              <View key={idx} className="flex-row gap-3">
                <Lightbulb size={20} color="#0066FF" fill="#0066FF" className="mt-1" />
                <Text className="flex-1 text-gray-800 text-sm font-medium leading-5">{rec}</Text>
              </View>
            ))}
          </View>
        ) : isLoadingAI ? (
          <View className="bg-blue-50 rounded-2xl p-6 border border-blue-200 items-center gap-2">
            <ActivityIndicator size="small" color="#0066FF" />
            <Text className="text-blue-700 text-sm font-medium">Generating personalized recommendations...</Text>
          </View>
        ) : (
          <View className="bg-blue-50 rounded-2xl p-4 gap-2 border border-blue-200">
            <Text className="text-blue-900 font-semibold text-sm">AI Insights Generated</Text>
            <Text className="text-blue-800 text-xs leading-5">
              AI couldn't generate specific recommendations. Use the metrics above to improve your SEO.
            </Text>
          </View>
        )}
      </Animated.View>

      {/* CTA Button */}
      <Animated.View entering={FadeInUp.delay(600)} className="px-6 py-6">
        <Pressable
          onPress={() => Linking.openURL('https://your-website.com/contact')}
          className="bg-gradient-to-r from-blue-600 to-blue-500 py-4 px-6 rounded-2xl flex-row items-center justify-center gap-2">
          <Text className="text-white font-bold text-base">Get a Free SEO Consultation</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

function MetricCard({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 items-center">
      <Text className="text-gray-600 text-xs font-semibold mb-2">{label}</Text>
      <Text style={{ color }} className="text-4xl font-bold">
        {value ?? '—'}
      </Text>
    </View>
  );
}

function InsightRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row gap-3">
      {icon}
      <View className="flex-1">
        <Text className="text-gray-900 font-semibold text-sm">{title}</Text>
        <Text className="text-gray-600 text-xs mt-0.5">{description}</Text>
      </View>
    </View>
  );
}

