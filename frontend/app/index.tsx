import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUser } from "@/src/context/UserContext";
import { colors, spacing, radii, type, images } from "@/src/theme/tokens";

export default function Welcome() {
  const router = useRouter();
  const { user, loading, saveUser } = useUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/(tabs)");
    }
  }, [loading, user, router]);

  const onContinue = async () => {
    if (!name.trim()) {
      setErr("Please enter your name");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await saveUser({ name, phone });
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  return (
    <View style={styles.root} testID="welcome-screen">
      <Image
        source={{ uri: images.homePilates }}
        style={styles.hero}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={["transparent", "rgba(28,38,28,0.85)", colors.surfaceInverse]}
        style={styles.scrim}
      />
      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.brand}>ACE</Text>
          <Text style={styles.tagline}>Physiotherapy · Pilates</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.formWrap}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formInner}>
            <Text style={styles.display}>Welcome to a{"\n"}restorative studio.</Text>
            <Text style={styles.sub}>
              Book physio appointments and pilates classes with our specialists. Tell us who to
              save this device under.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                testID="welcome-name-input"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Priya S."
                placeholderTextColor="rgba(253,253,251,0.4)"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                testID="welcome-phone-input"
                value={phone}
                onChangeText={setPhone}
                placeholder="For appointment reminders"
                placeholderTextColor="rgba(253,253,251,0.4)"
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>

            {err && <Text style={styles.err}>{err}</Text>}

            <Pressable
              testID="welcome-continue-button"
              onPress={onContinue}
              disabled={submitting}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.ctaText}>{submitting ? "Please wait…" : "Continue"}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  hero: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1, justifyContent: "space-between" },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  brand: {
    fontFamily: type.displayLG.fontFamily,
    color: colors.onSurfaceInverse,
    fontSize: 40,
    letterSpacing: 6,
  },
  tagline: {
    color: "rgba(253,253,251,0.7)",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: spacing.xs,
  },
  formWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  formInner: { paddingBottom: spacing.lg },
  display: {
    fontFamily: type.displayXL.fontFamily,
    color: colors.onSurfaceInverse,
    fontSize: 34,
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  sub: {
    color: "rgba(253,253,251,0.75)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  field: { marginBottom: spacing.lg },
  label: {
    color: "rgba(253,253,251,0.6)",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(253,253,251,0.3)",
    color: colors.onSurfaceInverse,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.onSurfaceInverse,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
  },
  ctaText: {
    color: colors.brandPrimary,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  err: { color: "#F5B0B0", marginTop: spacing.sm },
});
