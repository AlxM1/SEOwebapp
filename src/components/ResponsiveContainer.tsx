import { View, useWindowDimensions } from 'react-native';
import { useResponsive, getResponsivePadding, getMaxWidth } from '@/lib/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: any;
}

export function ResponsiveContainer({ children, className = '', style }: ResponsiveContainerProps) {
  const responsive = useResponsive();
  const paddingH = getResponsivePadding(responsive);
  const maxWidth = getMaxWidth(responsive);

  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: maxWidth as any,
          marginHorizontal: 'auto',
          paddingHorizontal: paddingH,
        },
        style,
      ]}
      className={className}>
      {children}
    </View>
  );
}

// Max width wrapper for web (centers content on desktop)
export function ContentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </View>
  );
}
