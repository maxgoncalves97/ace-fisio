// ACE palette: lime and leaf greens, deep forest green, and white.
import { palette } from './brand-artwork';
export const colors = {
  surface: "#FFFFFF",
  onSurface: palette.forest,
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#31574A",
  surfaceTertiary: "#F3F8EA",
  onSurfaceTertiary: "#4D6658",
  surfaceInverse: palette.forest,
  onSurfaceInverse: "#FFFFFF",
  brand: palette.primary,
  brandPrimary: palette.primary,
  onBrandPrimary: "#FFFFFF",
  brandSecondary: palette.lime,
  onBrandSecondary: palette.forest,
  brandTertiary: "#EAF4D7",
  onBrandTertiary: palette.primary,
  brandLime: palette.lime,
  brandLeaf: palette.leaf,
  success: "#397A3E",
  onSuccess: "#FFFFFF",
  warning: "#B37A2C",
  onWarning: "#FFFFFF",
  error: "#B84B4B",
  onError: "#FFFFFF",
  info: palette.primary,
  onInfo: "#FFFFFF",
  border: "#DDE8D5",
  borderStrong: "#9CAF89",
  divider: "#EDF3E7",
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
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#0A1F16",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
};

export const images = {
  heroPilates: "https://images.pexels.com/photos/11036674/pexels-photo-11036674.jpeg",
  heroPhysio: "https://images.pexels.com/photos/20860597/pexels-photo-20860597.jpeg",
  patientHero: "https://images.pexels.com/photos/20860586/pexels-photo-20860586.jpeg",
};

export const statusColors: Record<string, { bg: string; fg: string; label: string }> = {
  agendado: { bg: "#EDF5DF", fg: palette.primary, label: "Agendado" },
  confirmado: { bg: "#E1EFC7", fg: palette.forest, label: "Confirmado" },
  presente: { bg: "#E1F0DD", fg: "#397A3E", label: "Presente" },
  faltou: { bg: "#F5DCDC", fg: "#B84B4B", label: "Faltou" },
  cancelado: { bg: "#ECECEC", fg: "#6B6B6B", label: "Cancelado" },
  remarcado: { bg: "#F5EBD6", fg: "#B37A2C", label: "Remarcado" },
};

export const payStatusColors: Record<string, { bg: string; fg: string; label: string }> = {
  pago: { bg: "#E1F0DD", fg: "#397A3E", label: "Pago" },
  pendente: { bg: "#F5EBD6", fg: "#B37A2C", label: "Pendente" },
  atrasado: { bg: "#F5DCDC", fg: "#B84B4B", label: "Atrasado" },
};

export const areaLabel: Record<string, string> = {
  fisio: "Fisioterapia",
  pilates: "Pilates",
  ambos: "Ambos",
};
