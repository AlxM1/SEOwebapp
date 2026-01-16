import { Text, View, ScrollView, Pressable, ActivityIndicator, Linking, useColorScheme } from 'react-native';
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
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
      <View className={`flex-1 ${isDark ? 'bg-gray-950' : 'bg-white'} justify-center items-center`}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
        <Text className={`mt-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Analyzing competitor...
        </Text>
      </View>
    );
  }

  if (error || !results) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-gray-950' : 'bg-white'} px-6 justify-center items-center`}>
        <AlertCircle size={48} color="#FF4444" strokeWidth={1.5} />
        <Text className={`text-lg font-bold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {error || 'Analysis failed'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className={`mt-6 px-8 py-3 rounded-lg ${isDark ? 'bg-white' : 'bg-black'}`}>
          <Text className={`font-semibold ${isDark ? 'text-black' : 'text-white'}`}>Try Again</Text>
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
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-950' : 'bg-white'}`}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className={`px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center mb-3">
          <ArrowLeft size={20} color={isDark ? '#fff' : '#000'} strokeWidth={2.5} />
        </Pressable>
        <Text className={`text-sm font-medium truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {url}
        </Text>
      </View>

      {/* Overall Score */}
      <View className={`px-6 py-8 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Competitor Strength Score
        </Text>
        <Text className={`text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {overallScore}
        </Text>
        <Text className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          out of 100
        </Text>
      </View>

      {/* Scores */}
      <View className={`px-6 py-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <Text className={`font-bold text-base mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Their Performance Breakdown
        </Text>
        <View className="gap-3">
          <ScoreRow label="SEO Strength" value={results.seo} isDark={isDark} />
          <ScoreRow label="Technical Performance" value={results.performance} isDark={isDark} />
          <ScoreRow label="Best Practices" value={results.bestPractices} isDark={isDark} />
          <ScoreRow label="Accessibility Score" value={results.accessibility} isDark={isDark} />
        </View>
      </View>

      {/* Strengths */}
      <View className={`px-6 py-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <Text className={`font-bold text-base mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Their Strengths
        </Text>
        <View className="gap-2">
          {results.mobileOptimized && (
            <StrengthRow text="Optimized for mobile devices" isDark={isDark} />
          )}
          {results.sslCertificate && (
            <StrengthRow text="Has SSL security certificate" isDark={isDark} />
          )}
          {results.performance && results.performance > 70 && (
            <StrengthRow text="Fast page loading speed" isDark={isDark} />
          )}
          {results.seo && results.seo > 70 && (
            <StrengthRow text="Strong SEO implementation" isDark={isDark} />
          )}
        </View>
      </View>

      {/* Weaknesses */}
      {results.issues && results.issues.length > 0 && (
        <View className={`px-6 py-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <Text className={`font-bold text-base mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Their Weaknesses
          </Text>
          <View className="gap-2">
            {results.issues.slice(0, 5).map((issue, idx) => (
              <View key={idx} className="flex-row gap-2">
                <AlertCircle size={16} color="#FF4444" className="mt-0.5 flex-shrink-0" />
                <Text className={`flex-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                  {issue}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Competitive Advantage */}
      <View className={`px-6 py-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Your Advantage
          </Text>
          {isLoadingAI && <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />}
        </View>

        {results.aiRecommendations && results.aiRecommendations.length > 0 ? (
          <View className="gap-3">
            {results.aiRecommendations.map((rec, idx) => (
              <View key={idx} className="flex-row gap-3">
                <Lightbulb size={18} color="#FFB800" fill="#FFB800" className="mt-0.5 flex-shrink-0" />
                <Text className={`flex-1 text-sm leading-5 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                  {rec}
                </Text>
              </View>
            ))}
          </View>
        ) : isLoadingAI ? (
          <View className="items-center gap-2 py-4">
            <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />
            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Analyzing gaps...
            </Text>
          </View>
        ) : (
          <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Analysis complete
          </Text>
        )}
      </View>

      {/* CTA */}
      <View className="px-6 py-6">
        <Pressable
          onPress={() => Linking.openURL('https://your-website.com/contact')}
          className={`py-3 px-4 rounded-lg items-center ${isDark ? 'bg-white' : 'bg-black'}`}>
          <Text className={`font-semibold text-base ${isDark ? 'text-black' : 'text-white'}`}>
            Get Your Strategy
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ScoreRow({ label, value, isDark }: { label: string; value?: number; isDark: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </Text>
      <Text className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

function StrengthRow({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <View className="flex-row gap-2">
      <CheckCircle size={16} color="#4ECDC4" className="mt-0.5 flex-shrink-0" />
      <Text className={`flex-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
        {text}
      </Text>
    </View>
  );
}
