import { Text, View, ScrollView, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Search, ArrowRight, TrendingUp, Zap, Gauge, Target, Brain, Moon, Sun } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { useResponsive } from '@/lib/responsive';

export default function HomeScreen() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const responsive = useResponsive();

  const handleSearch = async () => {
    if (!url.trim()) return;

    let urlToAnalyze = url.trim();
    if (!urlToAnalyze.startsWith('http://') && !urlToAnalyze.startsWith('https://')) {
      urlToAnalyze = 'https://' + urlToAnalyze;
    }

    setIsLoading(true);
    router.push({
      pathname: '/report',
      params: { url: urlToAnalyze }
    });
    setIsLoading(false);
  };

  // Responsive sizes
  const heroTitleSize = responsive.isMobile ? 36 : responsive.isTablet ? 48 : 56;
  const heroSubtitleSize = responsive.isMobile ? 16 : 18;
  const containerPadding = responsive.isMobile ? 16 : responsive.isTablet ? 24 : 32;
  const containerMaxWidth = responsive.isMobile ? '100%' : '1200px';

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-slate-50'}`}
      showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      {isDark ? (
        <View className="bg-gradient-to-b from-teal-950 to-gray-900 items-center w-full" style={{ paddingHorizontal: containerPadding, paddingTop: 64, paddingBottom: 64 }}>
          <View style={{ width: containerMaxWidth as any, maxWidth: '100%' }}>
            <View className="flex-row items-start justify-between mb-8">
              <View className="flex-1" />
              <Pressable
                onPress={toggleTheme}
                className="w-12 h-12 rounded-full flex-row items-center justify-center bg-gray-800 border border-teal-500/30">
                <Sun size={20} color="#FFD700" strokeWidth={2} />
              </Pressable>
            </View>

            <Text className="text-sm font-semibold text-teal-400 mb-3 tracking-wide">
              COMPETITIVE INTELLIGENCE
            </Text>
            <Text style={{ fontSize: heroTitleSize }} className="font-bold leading-tight text-white mb-4">
              Analyze Any Website
            </Text>
            <Text style={{ fontSize: heroSubtitleSize }} className="text-teal-100/70 leading-7">
              See what's holding your site back from ranking on Google
            </Text>
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={['#eff6ff', '#dbeafe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: containerPadding, paddingTop: 64, paddingBottom: 64, alignItems: 'center', width: '100%' }}>
          <View style={{ width: containerMaxWidth as any, maxWidth: '100%' }}>
            <View className="flex-row items-start justify-between mb-8">
              <View className="flex-1" />
              <Pressable
                onPress={toggleTheme}
                className="w-12 h-12 rounded-full flex-row items-center justify-center bg-white border border-gray-300">
                <Moon size={20} color="#4B5563" strokeWidth={2} />
              </Pressable>
            </View>

            <Text className="text-sm font-semibold text-gray-500 mb-3 tracking-wide">
              COMPETITIVE INTELLIGENCE
            </Text>
            <Text style={{ fontSize: heroTitleSize }} className="font-bold leading-tight text-gray-950 mb-4">
              Analyze Any Website
            </Text>
            <Text style={{ fontSize: heroSubtitleSize }} className="text-gray-600 leading-7">
              See what's holding your site back from ranking on Google
            </Text>
          </View>
        </LinearGradient>
      )}

      {/* Search Section */}
      <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: containerPadding, marginTop: -32, marginBottom: 48 }}>
        <View style={{ width: containerMaxWidth as any, maxWidth: '100%' }}>
          {/* Input */}
          <View className={`${isDark ? 'bg-gray-800/50 border border-teal-500/30' : 'bg-white border border-gray-200'} rounded-xl px-4 py-4 flex-row items-center gap-3 shadow-sm`}>
            <Search size={20} color={isDark ? '#14b8a6' : '#d1d5db'} strokeWidth={1.5} />
            <TextInput
              placeholder="Enter any website you want checked"
              placeholderTextColor={isDark ? '#6b7280' : '#d1d5db'}
              value={url}
              onChangeText={setUrl}
              editable={!isLoading}
              returnKeyType="go"
              onSubmitEditing={handleSearch}
              className={`flex-1 text-base ${isDark ? 'text-white' : 'text-gray-900'} font-medium`}
            />
          </View>

          {/* Button */}
          <Pressable
            onPress={handleSearch}
            disabled={isLoading || !url.trim()}
            style={{ marginTop: 16 }}>
            {isDark ? (
              <LinearGradient
                colors={['#0d9488', '#14b8a6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: isLoading || !url.trim() ? 0.5 : 1,
                }}>
                <Text className="font-semibold text-base text-white">
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </Text>
                {!isLoading && <ArrowRight size={18} color="#fff" strokeWidth={2} />}
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['#eff6ff', '#dbeafe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: isLoading || !url.trim() ? 0.5 : 1,
                }}>
                <Text className={`font-semibold text-base ${isLoading || !url.trim() ? 'text-gray-400' : 'text-gray-900'}`}>
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </Text>
                {!isLoading && (
                  <ArrowRight size={18} color={isLoading || !url.trim() ? '#9ca3af' : '#1f2937'} strokeWidth={2} />
                )}
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </View>

      {/* Features List */}
      <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: containerPadding }}>
        <View style={{ width: containerMaxWidth as any, maxWidth: '100%', marginBottom: 48 }}>
          <Text className={`text-sm font-semibold ${isDark ? 'text-teal-400' : 'text-gray-500'} mb-6 tracking-wide`}>
            DISCOVER
          </Text>
          <View className={`${responsive.isMobile ? 'gap-4' : 'gap-6'}`} style={{ flexDirection: responsive.isMobile ? 'column' : responsive.isTablet ? 'column' : 'column' }}>
            <FeatureItem
              icon={<TrendingUp size={20} color="#FF6B6B" strokeWidth={2} />}
              title="Ranking Factors"
              description="How competitors rank on Google"
              isDark={isDark}
            />
            <FeatureItem
              icon={<Gauge size={20} color="#4ECDC4" strokeWidth={2} />}
              title="Technical Strength"
              description="SEO and performance metrics"
              isDark={isDark}
            />
            <FeatureItem
              icon={<Zap size={20} color="#FFD700" strokeWidth={2} />}
              title="Speed & Core Web Vitals"
              description="Performance benchmarks"
              isDark={isDark}
            />
            <FeatureItem
              icon={<Target size={20} color="#FF8C42" strokeWidth={2} />}
              title="Strategic Gaps"
              description="Opportunities to outrank them"
              isDark={isDark}
            />
            <FeatureItem
              icon={<Brain size={20} color="#9D4EDD" strokeWidth={2} />}
              title="AI-Powered Insights"
              description="Actionable competitive strategies"
              isDark={isDark}
            />
          </View>
        </View>
      </View>

      {/* AI Providers */}
      <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: containerPadding, paddingBottom: 32 }}>
        <View style={{ width: containerMaxWidth as any, maxWidth: '100%' }}>
          <View className={`${isDark ? 'bg-gray-800/50 border border-teal-500/20' : 'bg-sky-50 border border-sky-200'} rounded-xl p-4`}>
            <Text className={`text-xs font-semibold ${isDark ? 'text-teal-400' : 'text-sky-600'} mb-2 tracking-wide`}>
              POWERED BY
            </Text>
            <Text className={`text-sm ${isDark ? 'text-teal-100/80' : 'text-gray-700'} leading-5`}>
              Grok (xAI) • Claude (Anthropic) • ChatGPT (OpenAI)
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function FeatureItem({ icon, title, description, isDark }: { icon: React.ReactNode; title: string; description: string; isDark: boolean }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-1 flex-shrink-0">
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </Text>
        <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </Text>
      </View>
    </View>
  );
}
