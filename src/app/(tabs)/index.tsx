import { Text, View, ScrollView } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

function Logo({ size = 120 }: { size?: number }) {
  const scale = size / 120;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Background circle */}
        <Circle cx="60" cy="60" r="55" fill="#004E89" />

        {/* House shape */}
        <Path
          d="M 60 25 L 95 55 L 85 55 L 85 90 L 35 90 L 35 55 L 25 55 Z"
          fill="#1A659E"
        />

        {/* House roof outline */}
        <Path
          d="M 60 25 L 95 55 M 60 25 L 25 55"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Door */}
        <Rect x="50" y="65" width="20" height="25" rx="2" fill="white" />

        {/* Wrench handle */}
        <Rect
          x="56"
          y="40"
          width="8"
          height="30"
          rx="2"
          fill="#FF6B35"
        />

        {/* Wrench head */}
        <Circle cx="60" cy="38" r="10" fill="#FF6B35" />
        <Rect x="55" y="28" width="10" height="8" fill="#004E89" />

        {/* Outer ring */}
        <Circle cx="60" cy="60" r="55" fill="none" stroke="white" strokeWidth="2" opacity="0.4" />
      </Svg>
    </View>
  );
}

export default function TabOneScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-100">
      <View className="items-center pt-16 pb-8">
        <Text className="text-2xl font-bold text-slate-800 mb-1">
          TradeConnect
        </Text>
        <Text className="text-sm text-slate-500 mb-8">
          Your home services platform
        </Text>

        {/* Main logo */}
        <Logo size={160} />

        {/* Smaller versions */}
        <View className="flex-row items-center gap-6 mt-10">
          <View className="items-center">
            <Logo size={80} />
            <Text className="text-xs text-slate-400 mt-2">Medium</Text>
          </View>
          <View className="items-center">
            <Logo size={50} />
            <Text className="text-xs text-slate-400 mt-2">Small</Text>
          </View>
        </View>

        <View className="bg-white mx-6 mt-8 p-4 rounded-xl shadow-sm">
          <Text className="text-sm text-slate-600 text-center leading-5">
            House + Wrench = Home Services Platform
          </Text>
          <Text className="text-xs text-slate-400 text-center mt-1">
            Navy blue & orange color scheme
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
