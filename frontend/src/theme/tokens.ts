// Light-first tokens from design_guidelines.json (Sage/Mint professional palette)
export const colors = {
  surface: "#F9FAFA",
  onSurface: "#181C1A",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#24332B",
  surfaceTertiary: "#F0F4F2",
  onSurfaceTertiary: "#374D41",
  surfaceInverse: "#181C1A",
  onSurfaceInverse: "#FFFFFF",
  brand: "#426B57",
  brandPrimary: "#426B57",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#C1D6CB",
  onBrandSecondary: "#24332B",
  brandTertiary: "#E2EDE7",
  onBrandTertiary: "#426B57",
  success: "#2F7A59",
  onSuccess: "#FFFFFF",
  warning: "#B37A2C",
  onWarning: "#FFFFFF",
  error: "#B84B4B",
  onError: "#FFFFFF",
  info: "#5C6B64",
  onInfo: "#FFFFFF",
  border: "#E2E8E4",
  borderStrong: "#A8BDB1",
  divider: "#EBF0ED",
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
  agendado: { bg: "#E2EDE7", fg: "#426B57", label: "Agendado" },
  confirmado: { bg: "#DCEBF5", fg: "#2C5B7A", label: "Confirmado" },
  presente: { bg: "#D6F0E2", fg: "#2F7A59", label: "Presente" },
  faltou: { bg: "#F5DCDC", fg: "#B84B4B", label: "Faltou" },
  cancelado: { bg: "#ECECEC", fg: "#6B6B6B", label: "Cancelado" },
  remarcado: { bg: "#F5EBD6", fg: "#B37A2C", label: "Remarcado" },
};

export const payStatusColors: Record<string, { bg: string; fg: string; label: string }> = {
  pago: { bg: "#D6F0E2", fg: "#2F7A59", label: "Pago" },
  pendente: { bg: "#F5EBD6", fg: "#B37A2C", label: "Pendente" },
  atrasado: { bg: "#F5DCDC", fg: "#B84B4B", label: "Atrasado" },
};

export const areaLabel: Record<string, string> = {
  fisio: "Fisioterapia",
  pilates: "Pilates",
  ambos: "Ambos",
};
