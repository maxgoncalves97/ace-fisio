import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { iconSvg, wordmarkSvg, palette } from '@/src/theme/brand-artwork';

export function AceLogo({ width = 180, variant = 'wordmark', onDark = false }: {
  width?: number; variant?: 'wordmark' | 'icon'; onDark?: boolean;
}) {
  const height = variant === 'icon' ? width : width * 340 / 720;
  return <View testID="ace-brand-logo" accessible accessibilityRole="image" accessibilityLabel="ACE Fisioterapia e Pilates" style={{ width, height }}>
    <SvgXml xml={variant === 'icon' ? iconSvg() : wordmarkSvg(onDark, false)} width={width} height={variant === 'icon' ? height : width * 290 / 720} />
    {variant === 'wordmark' && <Text style={{ color: onDark ? palette.white : palette.forest, textAlign: 'center', fontSize: width * 0.04, lineHeight: width * 40 / 720, letterSpacing: width * 0.001 }}>FISIOTERAPIA &amp; PILATES</Text>}
  </View>;
}
