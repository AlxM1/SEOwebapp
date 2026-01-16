import { Text, View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Zap } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const scaleValue = useSharedValue(1);

  const handleSearch = async () => {
    if (!url.trim()) return;

    // Validate URL
    let urlToAnalyze = url.trim();
    if (!urlToAnalyze.startsWith('http://') && !urlToAnalyze.startsWith('https://')) {
      urlToAnalyze = 'https://' + urlToAnalyze;
    }

    setIsLoading(true);

    // Navigate to results screen with URL
    router.push({
      pathname: '/report',
      params: { url: urlToAnalyze }
    });

    setIsLoading(false);
  };

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1);
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }]
  }));

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#0066FF', '#0052CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-16 pb-12 px-6">

        <Animated.View entering={FadeInDown.delay(100)}>
          <Text className="text-white text-5xl font-bold mb-3">
            See Your <Text className="text-blue-200">SEO Power</Text>
          </Text>
          <Text className="text-blue-100 text-base leading-6 mb-6">
            You're <Text className="font-bold text-white">1 click away</Text> from discovering how your business can rank among the top Google results
          </Text>
        </Animated.View>

        {/* Animated Zap Icon */}
        <Animated.View
          entering={FadeInUp.delay(200)}
          className="mb-8">
          <View className="flex-row items-center gap-2 bg-white/20 px-4 py-3 rounded-full w-fit">
            <Zap size={20} color="#FFD700" fill="#FFD700" />
            <Text className="text-white font-semibold text-sm">Instant Analysis</Text>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInUp.delay(300)}>
          <View className="bg-white rounded-2xl px-4 py-4 flex-row items-center gap-3 shadow-lg"
            style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}>
            <Search size={24} color="#0066FF" strokeWidth={2.5} />
            <TextInput
              placeholder="Enter website URL..."
              placeholderTextColor="#999"
              value={url}
              onChangeText={setUrl}
              editable={!isLoading}
              returnKeyType="go"
              onSubmitEditing={handleSearch}
              className="flex-1 text-base text-gray-900 font-medium"
            />
          </View>
        </Animated.View>
      </LinearGradient>

      {/* CTA Button */}
      <Animated.View
        entering={FadeInUp.delay(400)}
        className="px-6 mt-8">
        <AnimatedPressable
          onPress={handleSearch}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isLoading || !url.trim()}
          style={animatedButtonStyle}
          className={`py-4 px-6 rounded-2xl flex-row items-center justify-center gap-2 ${
            isLoading || !url.trim() ? 'bg-gray-200' : 'bg-gradient-to-r from-blue-600 to-blue-500'
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Zap size={20} color="#fff" fill="#fff" />
              <Text className="text-white font-bold text-base">Analyze Now</Text>
            </>
          )}
        </AnimatedPressable>
      </Animated.View>

      {/* Info Section */}
      <Animated.View entering={FadeInUp.delay(500)} className="mt-12 px-6 pb-12">
        <View className="bg-blue-50 rounded-2xl p-6">
          <Text className="text-gray-800 font-bold text-lg mb-4">What We Check</Text>

          <View className="gap-3">
            <CheckItem title="On-Page SEO" description="Meta tags, headings, content optimization" />
            <CheckItem title="Performance" description="Page speed, Core Web Vitals" />
            <CheckItem title="Mobile Ready" description="Mobile-friendly design & responsiveness" />
            <CheckItem title="Technical SEO" description="Schema markup, structured data" />
            <CheckItem title="AI Recommendations" description="Personalized tips to improve rankings" />
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function CheckItem({ title, description }: { title: string; description: string }) {
  return (
    <View className="flex-row gap-3">
      <View className="w-6 h-6 bg-blue-600 rounded-full flex-row items-center justify-center mt-1">
        <Text className="text-white font-bold text-sm">✓</Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-semibold text-sm">{title}</Text>
        <Text className="text-gray-600 text-xs mt-1">{description}</Text>
      </View>
    </View>
  );
}
