import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line, G, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
  variant?: 'full' | 'icon';
}

export function Logo({ size = 120, variant = 'full' }: LogoProps) {
  const iconSize = size;
  const strokeWidth = size * 0.06;

  return (
    <View style={{ width: iconSize, height: iconSize }}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="toolGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B35" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F7931E" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="houseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#004E89" stopOpacity="1" />
            <Stop offset="100%" stopColor="#1A659E" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Outer circle background */}
        <Circle
          cx="60"
          cy="60"
          r="55"
          fill="url(#houseGradient)"
        />

        {/* House/Home icon (top part) */}
        <Path
          d="M 35 55 L 60 35 L 85 55 L 85 80 L 35 80 Z"
          fill="white"
          opacity="0.15"
        />

        {/* House outline */}
        <Path
          d="M 60 35 L 85 55 M 60 35 L 35 55"
          stroke="white"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Wrench (main tool symbol) */}
        <G transform="translate(60, 60) rotate(-25)">
          {/* Wrench handle */}
          <Path
            d="M -5 10 L -5 30 L 5 30 L 5 10"
            fill="url(#toolGradient)"
            strokeWidth={strokeWidth * 0.5}
            stroke="white"
            strokeLinejoin="round"
          />

          {/* Wrench head */}
          <Circle
            cx="0"
            cy="0"
            r="10"
            fill="url(#toolGradient)"
            stroke="white"
            strokeWidth={strokeWidth * 0.5}
          />

          {/* Wrench opening */}
          <Path
            d="M -6 -8 L -6 0 L 6 0 L 6 -8"
            fill="#004E89"
            strokeWidth={strokeWidth * 0.3}
          />
        </G>

        {/* Connection dots - representing the platform connection */}
        <Circle cx="40" cy="50" r="3" fill="#FF6B35" opacity="0.8" />
        <Circle cx="80" cy="50" r="3" fill="#FF6B35" opacity="0.8" />
        <Circle cx="60" cy="85" r="3" fill="#FF6B35" opacity="0.8" />

        {/* Accent ring */}
        <Circle
          cx="60"
          cy="60"
          r="55"
          fill="none"
          stroke="white"
          strokeWidth={strokeWidth * 0.4}
          opacity="0.3"
        />
      </Svg>
    </View>
  );
}

// Export a simple flat icon version for app icons
export function LogoIcon({ size = 80 }: { size?: number }) {
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      overflow: 'hidden',
      backgroundColor: '#004E89'
    }}>
      <Logo size={size} variant="icon" />
    </View>
  );
}
