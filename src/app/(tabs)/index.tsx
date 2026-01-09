import { Text, View, ScrollView } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

function Logo({ size = 120 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="toolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B35" />
            <Stop offset="100%" stopColor="#F7931E" />
          </LinearGradient>
          <LinearGradient id="houseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#004E89" />
            <Stop offset="100%" stopColor="#1A659E" />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle cx="60" cy="60" r="55" fill="url(#houseGrad)" />

        {/* House roof */}
        <Path
          d="M 60 28 L 90 52 L 85 52 L 85 85 L 35 85 L 35 52 L 30 52 Z"
          fill="white"
          opacity={0.2}
        />
        <Path
          d="M 60 28 L 90 52 M 60 28 L 30 52"
          stroke="white"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />

        {/* Wrench */}
        <G transform="translate(60, 62) rotate(-30)">
          <Path
            d="M -4 8 L -4 28 L 4 28 L 4 8 Z"
            fill="url(#toolGrad)"
          />
          <Circle cx="0" cy="2" r="12" fill="url(#toolGrad)" />
          <Path
            d="M -5 -8 L -5 2 L 5 2 L 5 -8"
            fill="#004E89"
          />
        </G>

        {/* Connection dots */}
        <Circle cx="38" cy="48" r="4" fill="#FF6B35" />
        <Circle cx="82" cy="48" r="4" fill="#FF6B35" />
        <Circle cx="60" cy="92" r="4" fill="#FF6B35" />

        {/* Outer ring */}
        <Circle cx="60" cy="60" r="55" fill="none" stroke="white" strokeWidth={2} opacity={0.3} />
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
