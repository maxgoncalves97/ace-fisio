import { Platform } from "react-native";

export const colors = {
  surface: "#FDFDFB",
  onSurface: "#181C18",
  surfaceSecondary: "#F3F4EF",
  onSurfaceSecondary: "#333A33",
  surfaceTertiary: "#E7EAE1",
  onSurfaceTertiary: "#4F594F",
  surfaceInverse: "#1C261C",
  onSurfaceInverse: "#FDFDFB",
  brand: "#213621",
  brandPrimary: "#213621",
  onBrandPrimary: "#FDFDFB",
  brandSecondary: "#466346",
  onBrandSecondary: "#FDFDFB",
  brandTertiary: "#DCE3D3",
  onBrandTertiary: "#181C18",
  success: "#365936",
  onSuccess: "#FFFFFF",
  warning: "#C28327",
  onWarning: "#FFFFFF",
  error: "#8C3333",
  onError: "#FFFFFF",
  border: "#E7EAE1",
  borderStrong: "#A6B3A6",
  divider: "#E7EAE1",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 0,
  md: 4,
  lg: 8,
  pill: 999,
};

// Editorial serif fallback (no @expo-google-fonts allowed per environment rules)
export const fonts = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }) as string,
  serifItalic: Platform.select({ ios: "Georgia-Italic", android: "serif", default: "serif" }) as string,
  body: Platform.select({ ios: "System", android: "sans-serif", default: "System" }) as string,
};

export const type = {
  displayXL: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: colors.onSurface },
  displayLG: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34, color: colors.onSurface },
  displayMD: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.onSurface },
  overline: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    color: colors.onSurfaceTertiary,
  },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.onSurface },
  bodySm: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.onSurfaceSecondary },
  label: { fontFamily: fonts.body, fontSize: 13, letterSpacing: 0.5, color: colors.onSurface },
};

export const images = {
  homePilates:
    "https://images.pexels.com/photos/25596894/pexels-photo-25596894.jpeg",
  homePhysio:
    "https://images.pexels.com/photos/20860588/pexels-photo-20860588.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  emptyLeaf:
    "https://images.unsplash.com/photo-1599332470261-61f657e5d9cc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwxfHxjYWxtJTIwbWluaW1hbGlzdCUyMG5hdHVyZSUyMGdyZWVuJTIwbGVhZnxlbnwwfHx8fDE3ODE5NDEyODF8MA&ixlib=rb-4.1.0&q=85",
};
