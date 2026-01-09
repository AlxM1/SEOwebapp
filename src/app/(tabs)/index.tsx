import { Text, View, ScrollView } from 'react-native';
import { Logo, LogoIcon } from '@/components/Logo';

export default function TabOneScreen() {
  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          TradeConnect Logo
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          Professional platform connecting customers with skilled tradesmen
        </Text>

        {/* Large version */}
        <View className="items-center mb-8">
          <Text className="text-xs text-gray-400 mb-3">Full Logo (120px)</Text>
          <Logo size={120} />
        </View>

        {/* Medium version */}
        <View className="items-center mb-8">
          <Text className="text-xs text-gray-400 mb-3">Medium (80px)</Text>
          <Logo size={80} />
        </View>

        {/* App icon version */}
        <View className="items-center mb-8">
          <Text className="text-xs text-gray-400 mb-3">App Icon (80px)</Text>
          <LogoIcon size={80} />
        </View>

        {/* Small version */}
        <View className="items-center mb-8">
          <Text className="text-xs text-gray-400 mb-3">Small (50px)</Text>
          <Logo size={50} />
        </View>

        <View className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg mt-4">
          <Text className="text-xs text-gray-600 dark:text-gray-300 text-center">
            Logo combines house (home services) with wrench (tradesmen tools).
            {'\n'}Professional navy blue & orange color scheme.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
