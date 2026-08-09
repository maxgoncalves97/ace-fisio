import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, isAdmin } from "@/src/context/AuthContext";
import { Loading } from "@/src/components/ui";
import { colors } from "@/src/theme/tokens";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (isAdmin(user)) {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/patient/dashboard");
    }
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Loading />
    </View>
  );
}
