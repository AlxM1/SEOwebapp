import { Text, View, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzePageSpeed, analyzeSEO, generateAIRecommendations } from '@/lib/seo-api';
import { useTheme } from '@/lib/ThemeContext';

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
  const { isDark } = useTheme();
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

        if (!pageSpeedResult.overall) {
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
      <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'} justify-center items-center`}>
        <ActivityIndicator size="large" color={isDark ? '#14b8a6' : '#000'} />
        <Text className={`mt-4 font-medium ${isDark ? 'text-teal-100/70' : 'text-gray-600'}`}>
          Analyzing website...
        </Text>
      </View>
    );
  }

  if (error || !results) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'} px-6 justify-center items-center`}>
        <AlertCircle size={48} color="#FF4444" strokeWidth={1.5} />
        <Text className={`text-lg font-bold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {error || 'Analysis failed'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className={`mt-6 px-8 py-3 rounded-xl ${isDark ? 'bg-teal-600' : 'bg-black'}`}>
          <Text className="font-semibold text-white">Try Again</Text>
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
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className={`px-6 py-4 border-b ${isDark ? 'border-teal-500/20' : 'border-gray-100'}`}>
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center mb-3">
          <ArrowLeft size={20} color={isDark ? '#14b8a6' : '#000'} strokeWidth={2} />
        </Pressable>
        <Text className={`text-xs font-semibold ${isDark ? 'text-teal-400' : 'text-gray-500'} tracking-wide mb-1`}>
          ANALYSIS
        </Text>
        <Text className={`text-sm font-medium truncate ${isDark ? 'text-teal-100/70' : 'text-gray-700'}`}>
          {url}
        </Text>
      </View>

      {/* Score Card */}
      <View className="px-6 pt-8 pb-4">
        {isDark ? (
          <LinearGradient
            colors={['#134e4a', '#0f766e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl p-8 items-center">
            <Text className="text-xs font-semibold text-teal-200 mb-3 tracking-wide">
              WEBSITE STRENGTH
            </Text>
            <Text className="text-7xl font-bold text-white mb-2">
              {overallScore}
            </Text>
            <Text className="text-sm text-teal-100/60">
              out of 100
            </Text>
          </LinearGradient>
        ) : (
          <View className="bg-gray-50 rounded-2xl p-8 border border-gray-200 items-center">
            <Text className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">
              WEBSITE STRENGTH
            </Text>
            <Text className="text-7xl font-bold text-gray-950 mb-2">
              {overallScore}
            </Text>
            <Text className="text-sm text-gray-600">
              out of 100
            </Text>
          </View>
        )}
      </View>

      {/* Metrics Grid */}
      <View className="px-6 py-4 gap-3">
        <View className="flex-row gap-3">
          <MetricCard
            label="SEO Strength"
            value={results.seo}
            isDark={isDark}
          />
          <MetricCard
            label="Performance"
            value={results.performance}
            isDark={isDark}
          />
        </View>
        <View className="flex-row gap-3">
          <MetricCard
            label="Best Practices"
            value={results.bestPractices}
            isDark={isDark}
          />
          <MetricCard
            label="Accessibility"
            value={results.accessibility}
            isDark={isDark}
          />
        </View>
      </View>

      {/* Strengths */}
      <View className={`px-6 py-6 border-t ${isDark ? 'border-teal-500/20' : 'border-gray-100'}`}>
        <Text className={`text-sm font-semibold ${isDark ? 'text-teal-300' : 'text-gray-900'} mb-4 tracking-wide`}>
          STRENGTHS
        </Text>
        <View className="gap-2">
          {results.mobileOptimized && (
            <StrengthRow text="Mobile optimized" isDark={isDark} />
          )}
          {results.sslCertificate && (
            <StrengthRow text="SSL security active" isDark={isDark} />
          )}
          {results.performance && results.performance > 70 && (
            <StrengthRow text="Fast loading speed" isDark={isDark} />
          )}
          {results.seo && results.seo > 70 && (
            <StrengthRow text="Strong SEO foundation" isDark={isDark} />
          )}
        </View>
      </View>

      {/* Weaknesses */}
      {results.issues && results.issues.length > 0 && (
        <View className={`px-6 py-6 border-t ${isDark ? 'border-teal-500/20' : 'border-gray-100'}`}>
          <Text className={`text-sm font-semibold ${isDark ? 'text-teal-300' : 'text-gray-900'} mb-4 tracking-wide`}>
            WEAKNESSES
          </Text>
          <View className="gap-2">
            {results.issues.slice(0, 4).map((issue, idx) => (
              <View key={idx} className="flex-row gap-2">
                <AlertCircle size={16} color="#FF4444" className="mt-0.5 flex-shrink-0" />
                <Text className={`flex-1 text-sm ${isDark ? 'text-teal-100/80' : 'text-gray-700'}`}>
                  {issue}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* AI Insights - Advantages */}
      <View className={`px-6 py-6 border-t ${isDark ? 'border-teal-500/20' : 'border-gray-100'}`}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-teal-300' : 'text-gray-900'} tracking-wide`}>
            ADVANTAGE
          </Text>
          {isLoadingAI && <ActivityIndicator size="small" color={isDark ? '#14b8a6' : '#000'} />}
        </View>

        {results.aiRecommendations && results.aiRecommendations.length > 0 ? (
          <View className="gap-3">
            {results.aiRecommendations
              .filter((rec) => rec.includes('Advantage'))
              .map((rec, idx) => (
                <View key={idx} className={`flex-row gap-3 p-3 rounded-xl ${isDark ? 'bg-teal-950/40 border border-teal-500/30' : 'bg-gray-50 border border-gray-200'}`}>
                  <Lightbulb size={16} color="#FFB800" fill="#FFB800" className="mt-1 flex-shrink-0" />
                  <Text className={`flex-1 text-xs leading-5 ${isDark ? 'text-teal-100/80' : 'text-gray-700'}`}>
                    {rec}
                  </Text>
                </View>
              ))}
            {results.aiRecommendations.filter((rec) => rec.includes('Advantage')).length === 0 && !isLoadingAI && (
              <Text className={`text-xs ${isDark ? 'text-teal-100/60' : 'text-gray-600'}`}>
                No advantages identified yet
              </Text>
            )}
          </View>
        ) : isLoadingAI ? (
          <View className="items-center gap-2 py-4">
            <ActivityIndicator size="small" color={isDark ? '#14b8a6' : '#000'} />
            <Text className={`text-xs ${isDark ? 'text-teal-100/60' : 'text-gray-600'}`}>
              Generating insights...
            </Text>
          </View>
        ) : (
          <Text className={`text-xs ${isDark ? 'text-teal-100/60' : 'text-gray-600'}`}>
            Analysis ready
          </Text>
        )}
      </View>

      {/* AI Insights - Opportunities Identified */}
      <View className={`px-6 py-6 border-t ${isDark ? 'border-teal-500/20' : 'border-gray-100'}`}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className={`text-sm font-semibold ${isDark ? 'text-teal-300' : 'text-gray-900'} tracking-wide`}>
            OPPORTUNITIES IDENTIFIED
          </Text>
          {isLoadingAI && <ActivityIndicator size="small" color={isDark ? '#14b8a6' : '#000'} />}
        </View>

        {results.aiRecommendations && results.aiRecommendations.length > 0 ? (
          <View className="gap-3">
            {results.aiRecommendations
              .filter((rec) => rec.includes('Opportunities Identified'))
              .map((rec, idx) => (
                <View key={idx} className={`flex-row gap-3 p-3 rounded-xl ${isDark ? 'bg-teal-950/40 border border-teal-500/30' : 'bg-gray-50 border border-gray-200'}`}>
                  <Lightbulb size={16} color="#FFB800" fill="#FFB800" className="mt-1 flex-shrink-0" />
                  <Text className={`flex-1 text-xs leading-5 ${isDark ? 'text-teal-100/80' : 'text-gray-700'}`}>
                    {rec}
                  </Text>
                </View>
              ))}
            {results.aiRecommendations.filter((rec) => rec.includes('Opportunities Identified')).length === 0 && !isLoadingAI && (
              <Text className={`text-xs ${isDark ? 'text-teal-100/60' : 'text-gray-600'}`}>
                No opportunities identified yet
              </Text>
            )}
          </View>
        ) : isLoadingAI ? (
          <View className="items-center gap-2 py-4">
            <ActivityIndicator size="small" color={isDark ? '#14b8a6' : '#000'} />
            <Text className={`text-xs ${isDark ? 'text-teal-100/60' : 'text-gray-600'}`}>
              Generating insights...
            </Text>
          </View>
        ) : (
          <Text className={`text-xs ${isDark ? 'text-teal-100/60' : 'text-gray-600'}`}>
            Analysis ready
          </Text>
        )}
      </View>

      {/* CTA */}
      <View className="px-6 py-8">
        {isDark ? (
          <LinearGradient
            colors={['#0d9488', '#14b8a6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-xl overflow-hidden">
            <Pressable
              onPress={() => Linking.openURL('https://your-website.com/contact')}
              className="py-4 px-6 items-center">
              <Text className="font-semibold text-base text-white">
                We fix it for less than you think
              </Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <Pressable
            onPress={() => Linking.openURL('https://your-website.com/contact')}
            className="py-4 px-6 rounded-xl items-center bg-black">
            <Text className="font-semibold text-base text-white">
              We fix it for less than you think
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, isDark }: { label: string; value?: number; isDark: boolean }) {
  return (
    <View className={`flex-1 ${isDark ? 'bg-teal-950/30 border border-teal-500/30 rounded-xl' : 'bg-gray-50 border border-gray-200 rounded-xl'} p-4`}>
      <Text className={`text-xs font-semibold ${isDark ? 'text-teal-400' : 'text-gray-600'} mb-2`}>
        {label}
      </Text>
      <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-950'}`}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

function StrengthRow({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <View className="flex-row gap-2 items-center">
      <CheckCircle size={16} color={isDark ? '#14b8a6' : '#4ECDC4'} className="flex-shrink-0" />
      <Text className={`text-sm ${isDark ? 'text-teal-100/80' : 'text-gray-700'}`}>
        {text}
      </Text>
    </View>
  );
}
