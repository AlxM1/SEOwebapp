import { Text, View, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function TabOneScreen() {
  return (
    <ScrollView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Testing SVG
        </Text>

        <View className="my-8">
          <Svg width="100" height="100" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="40" fill="blue" />
          </Svg>
        </View>

        <Text className="text-sm text-gray-500 dark:text-gray-400">
          Can you see a blue circle above?
        </Text>
      </View>
    </ScrollView>
  );
}
