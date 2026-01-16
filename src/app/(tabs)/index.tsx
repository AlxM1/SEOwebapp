import { Text, View, ScrollView, Pressable, TextInput, useColorScheme } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Search, ArrowRight } from 'lucide-react-native';

export default function HomeScreen() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
      className={`flex-1 ${isDark ? 'bg-gray-950' : 'bg-white'}`}
      showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} px-6 pt-20 pb-16`}>
        <Text className={`text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-3 tracking-wide`}>
          COMPETITIVE INTELLIGENCE
        </Text>
        <Text className={`text-5xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-950'} mb-4`}>
          Analyze Your Competitors
        </Text>
        <Text className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-7`}>
          See what's holding your site back from ranking on Google
        </Text>
      </View>

      {/* Search Section */}
      <View className="px-6 -mt-8 mb-12">
        {/* Input */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl px-4 py-4 flex-row items-center gap-3 border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
          <Search size={20} color={isDark ? '#9ca3af' : '#d1d5db'} strokeWidth={1.5} />
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
          className={`mt-4 px-6 py-4 rounded-xl flex-row items-center justify-center gap-2 ${
            isLoading || !url.trim()
              ? isDark ? 'bg-gray-800' : 'bg-gray-100'
              : isDark ? 'bg-white' : 'bg-black'
          }`}>
          <Text className={`font-semibold text-base ${
            isLoading || !url.trim()
              ? isDark ? 'text-gray-500' : 'text-gray-400'
              : isDark ? 'text-black' : 'text-white'
          }`}>
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </Text>
          {!isLoading && <ArrowRight size={18} color={isDark ? '#000' : '#fff'} strokeWidth={2} />}
        </Pressable>
      </View>

      {/* Features Grid */}
      <View className="px-6 mb-12">
        <Text className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4 tracking-wide`}>
          DISCOVER
        </Text>
        <View className="gap-3">
          <FeatureItem
            title="Ranking Factors"
            description="How competitors rank on Google"
            isDark={isDark}
          />
          <FeatureItem
            title="Technical Strength"
            description="SEO and performance metrics"
            isDark={isDark}
          />
          <FeatureItem
            title="Speed & Core Web Vitals"
            description="Performance benchmarks"
            isDark={isDark}
          />
          <FeatureItem
            title="Strategic Gaps"
            description="Opportunities to outrank them"
            isDark={isDark}
          />
          <FeatureItem
            title="AI-Powered Insights"
            description="Actionable competitive strategies"
            isDark={isDark}
          />
        </View>
      </View>

      {/* AI Providers */}
      <View className="px-6 mb-8">
        <View className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-4 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <Text className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2 tracking-wide`}>
            POWERED BY
          </Text>
          <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-5`}>
            Grok (xAI) • Claude (Anthropic) • ChatGPT (OpenAI)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function FeatureItem({ title, description, isDark }: { title: string; description: string; isDark: boolean }) {
  return (
    <View className={`flex-row items-start gap-3 p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <View className={`w-2 h-2 rounded-full mt-2 ${isDark ? 'bg-gray-400' : 'bg-gray-400'}`} />
      <View className="flex-1">
        <Text className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </Text>
        <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </Text>
      </View>
    </View>
  );
}
