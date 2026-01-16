import { Text, View, ScrollView, Pressable, TextInput, useColorScheme } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Search, ArrowRight, TrendingUp, Zap, Gauge, Target, Brain, Moon, Sun } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';

export default function HomeScreen() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

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

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
      showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View className={`${isDark ? 'bg-gradient-to-b from-teal-950 to-gray-900' : 'bg-gray-50'} px-6 pt-16 pb-16`}>
        <View className="flex-row items-start justify-between mb-8">
          <View className="flex-1" />
          <Pressable
            onPress={toggleTheme}
            className={`w-12 h-12 rounded-full flex-row items-center justify-center ${
              isDark ? 'bg-gray-800 border border-teal-500/30' : 'bg-gray-200 border border-gray-300'
            }`}>
            {isDark ? (
              <Sun size={20} color="#FFD700" strokeWidth={2} />
            ) : (
              <Moon size={20} color="#4B5563" strokeWidth={2} />
            )}
          </Pressable>
        </View>

        <Text className={`text-sm font-semibold ${isDark ? 'text-teal-400' : 'text-gray-500'} mb-3 tracking-wide`}>
          COMPETITIVE INTELLIGENCE
        </Text>
        <Text className={`text-5xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-950'} mb-4`}>
          Analyze Your Competitors
        </Text>
        <Text className={`text-lg ${isDark ? 'text-teal-100/70' : 'text-gray-600'} leading-7`}>
          See what's holding your site back from ranking on Google
        </Text>
      </View>

      {/* Search Section */}
      <View className={`px-6 -mt-8 mb-12`}>
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
          className="mt-4">
          {isDark ? (
            <LinearGradient
              colors={['#0d9488', '#14b8a6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className={`px-6 py-4 rounded-xl flex-row items-center justify-center gap-2 ${
                isLoading || !url.trim() ? 'opacity-50' : ''
              }`}>
              <Text className="font-semibold text-base text-white">
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Text>
              {!isLoading && <ArrowRight size={18} color="#fff" strokeWidth={2} />}
            </LinearGradient>
          ) : (
            <View className={`px-6 py-4 rounded-xl flex-row items-center justify-center gap-2 ${
              isLoading || !url.trim() ? 'bg-gray-100' : 'bg-black'
            }`}>
              <Text className={`font-semibold text-base ${
                isLoading || !url.trim() ? 'text-gray-400' : 'text-white'
              }`}>
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Text>
              {!isLoading && (
                <ArrowRight size={18} color={isLoading || !url.trim() ? '#9ca3af' : '#fff'} strokeWidth={2} />
              )}
            </View>
          )}
        </Pressable>
      </View>

      {/* Features List */}
      <View className="px-6 mb-12">
        <Text className={`text-sm font-semibold ${isDark ? 'text-teal-400' : 'text-gray-500'} mb-6 tracking-wide`}>
          DISCOVER
        </Text>
        <View className="gap-4">
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

      {/* AI Providers */}
      <View className="px-6 mb-8">
        <View className={`${isDark ? 'bg-gray-800/50 border border-teal-500/20' : 'bg-gray-50 border border-gray-200'} rounded-xl p-4`}>
          <Text className={`text-xs font-semibold ${isDark ? 'text-teal-400' : 'text-gray-500'} mb-2 tracking-wide`}>
            POWERED BY
          </Text>
          <Text className={`text-sm ${isDark ? 'text-teal-100/80' : 'text-gray-700'} leading-5`}>
            Grok (xAI) • Claude (Anthropic) • ChatGPT (OpenAI)
          </Text>
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
