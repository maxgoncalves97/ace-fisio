import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth, isAdmin } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { Button, Field, Input } from "@/src/components/ui";
import { colors, spacing, radii, images } from "@/src/theme/tokens";

export default function Login() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 900 && Platform.OS === "web";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(isAdmin(user) ? "/admin/dashboard" : "/patient/dashboard");
    }
  }, [user, loading, router]);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      setErr("Preencha email e senha");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const u = await signIn(email.trim(), password);
      router.replace(isAdmin(u) ? "/admin/dashboard" : "/patient/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao entrar");
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async () => {
    setForgotMsg(null);
    try {
      const r = await api.passwordReset(email.trim() || "exemplo@demo.com");
      setForgotMsg(r.message);
    } catch {
      setForgotMsg("Se o email existir, enviaremos instruções.");
    }
  };

  const form = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.formInner}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoRow}>
        <View style={styles.logoDot}>
          <Feather name="plus" size={22} color={colors.onBrandPrimary} />
        </View>
        <Text style={styles.logoText}>FisioPilates</Text>
      </View>
      <Text style={styles.title}>Bem-vindo de volta</Text>
      <Text style={styles.subtitle}>Acesse sua conta para gerenciar atendimentos e evoluções.</Text>

      {!forgot ? (
        <>
          <Field label="Email">
            <Input
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </Field>
          <Field label="Senha">
            <Input
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </Field>

          {err ? <Text style={styles.err} testID="login-error">{err}</Text> : null}

          <Button title="Entrar" onPress={onLogin} loading={busy} testID="login-submit-button" />

          <Pressable testID="forgot-link" onPress={() => setForgot(true)} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Contas de demonstração</Text>
            <DemoRow label="Admin Fisioterapia" email="fisio@demo.com" onFill={() => { setEmail("fisio@demo.com"); setPassword("Demo123!"); }} />
            <DemoRow label="Admin Pilates" email="pilates@demo.com" onFill={() => { setEmail("pilates@demo.com"); setPassword("Demo123!"); }} />
            <DemoRow label="Paciente" email="joao@demo.com" onFill={() => { setEmail("joao@demo.com"); setPassword("Demo123!"); }} />
            <Text style={styles.demoHint}>Senha: Demo123!</Text>
          </View>
        </>
      ) : (
        <>
          <Field label="Email">
            <Input
              testID="forgot-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </Field>
          {forgotMsg ? <Text style={styles.info}>{forgotMsg}</Text> : null}
          <Button title="Enviar instruções" onPress={onForgot} testID="forgot-submit-button" />
          <Pressable testID="back-to-login" onPress={() => setForgot(false)} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Voltar ao login</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );

  if (wide) {
    return (
      <View style={styles.wideRoot} testID="login-screen">
        <View style={styles.wideHero}>
          <Image source={{ uri: images.heroPhysio }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(24,28,26,0.25)", "rgba(24,28,26,0.85)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Cuidado e movimento{"\n"}em um só lugar.</Text>
            <Text style={styles.heroSub}>Gestão completa de fisioterapia e pilates.</Text>
          </View>
        </View>
        <View style={styles.wideForm}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
            {form}
          </KeyboardAvoidingView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} testID="login-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {form}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DemoRow({ label, email, onFill }: { label: string; email: string; onFill: () => void }) {
  return (
    <Pressable testID={`demo-fill-${email}`} onPress={onFill} style={styles.demoRow}>
      <View>
        <Text style={styles.demoLabel}>{label}</Text>
        <Text style={styles.demoEmail}>{email}</Text>
      </View>
      <Feather name="arrow-right" size={16} color={colors.brandPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  formInner: { padding: spacing.xl, maxWidth: 460, width: "100%", alignSelf: "center", flexGrow: 1, justifyContent: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  logoDot: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 20, fontWeight: "600", color: colors.onSurface },
  title: { fontSize: 26, fontWeight: "600", color: colors.onSurface, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.onSurfaceTertiary, marginBottom: spacing.xl, lineHeight: 20 },
  err: { color: colors.error, marginBottom: spacing.md, fontSize: 14 },
  info: { color: colors.brandPrimary, marginBottom: spacing.md, fontSize: 14 },
  forgotLink: { alignSelf: "center", paddingVertical: spacing.lg },
  forgotText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "500" },
  demoBox: { marginTop: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radii.md, padding: spacing.lg },
  demoTitle: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: spacing.md, textTransform: "uppercase", letterSpacing: 0.5 },
  demoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  demoLabel: { fontSize: 14, color: colors.onSurface, fontWeight: "500" },
  demoEmail: { fontSize: 12, color: colors.onSurfaceTertiary },
  demoHint: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: spacing.sm },
  // wide
  wideRoot: { flex: 1, flexDirection: "row", backgroundColor: colors.surface },
  wideHero: { flex: 1, backgroundColor: colors.surfaceInverse },
  heroContent: { position: "absolute", left: spacing.xxl, right: spacing.xxl, bottom: spacing.xxxl },
  heroTitle: { fontSize: 34, fontWeight: "600", color: "#FFFFFF", lineHeight: 42 },
  heroSub: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginTop: spacing.md },
  wideForm: { width: 520, maxWidth: "50%", backgroundColor: colors.surface },
});
