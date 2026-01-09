import { Text, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';

export default function TabOneScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-100">
      <View className="items-center pt-16 pb-8">
        {/* Main logo */}
        <Image
          source={require('../../../assets/gemini-generated-image-3o919q3o919q3o91.png')}
          style={{ width: 280, height: 180 }}
          contentFit="contain"
        />

        {/* Smaller versions */}
        <View className="flex-row items-center gap-8 mt-10">
          <View className="items-center">
            <Image
              source={require('../../../assets/gemini-generated-image-3o919q3o919q3o91.png')}
              style={{ width: 140, height: 90 }}
              contentFit="contain"
            />
            <Text className="text-xs text-slate-400 mt-2">Medium</Text>
          </View>
          <View className="items-center">
            <Image
              source={require('../../../assets/gemini-generated-image-3o919q3o919q3o91.png')}
              style={{ width: 80, height: 52 }}
              contentFit="contain"
            />
            <Text className="text-xs text-slate-400 mt-2">Small</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
