import { Text, View, ScrollView, Pressable, TextInput, useColorScheme } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';

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
      {/* Spacer */}
      <View className="h-16" />

      {/* Main Content */}
      <View className="px-6">
        {/* Title */}
        <Text className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
          Check Your SEO Score
        </Text>
        <Text className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-6 mb-8`}>
          See what's holding your site back from ranking on Google
        </Text>

        {/* Search Bar */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg px-4 py-3 flex-row items-center gap-3 mb-6`}>
          <Search size={20} color={isDark ? '#666' : '#999'} strokeWidth={2} />
          <TextInput
            placeholder="Enter your website"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={url}
            onChangeText={setUrl}
            editable={!isLoading}
            returnKeyType="go"
            onSubmitEditing={handleSearch}
            className={`flex-1 text-base ${isDark ? 'text-white' : 'text-gray-900'} font-medium`}
          />
        </View>

        {/* Search Button */}
        <Pressable
          onPress={handleSearch}
          disabled={isLoading || !url.trim()}
          className={`py-3 px-4 rounded-lg flex-row items-center justify-center gap-2 mb-12 ${
            isLoading || !url.trim()
              ? isDark ? 'bg-gray-700' : 'bg-gray-300'
              : isDark ? 'bg-white' : 'bg-black'
          }`}>
          <Text className={`font-semibold text-base ${
            isLoading || !url.trim()
              ? isDark ? 'text-gray-400' : 'text-gray-600'
              : isDark ? 'text-black' : 'text-white'
          }`}>
            {isLoading ? 'Analyzing...' : 'Check Now'}
          </Text>
        </Pressable>

        {/* What We Check */}
        <View className="mb-8">
          <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
            What you'll see
          </Text>
          <View className="gap-3">
            <CheckLine text="Your overall SEO score" isDark={isDark} />
            <CheckLine text="Page speed & performance" isDark={isDark} />
            <CheckLine text="Mobile friendliness" isDark={isDark} />
            <CheckLine text="Common issues to fix" isDark={isDark} />
            <CheckLine text="AI tips to rank better" isDark={isDark} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function CheckLine({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className={`w-5 h-5 rounded-full ${isDark ? 'bg-white' : 'bg-black'} items-center justify-center`}>
        <Text className={`text-xs font-bold ${isDark ? 'text-black' : 'text-white'}`}>✓</Text>
      </View>
      <Text className={`text-sm flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{text}</Text>
    </View>
  );
}
