import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { View, StyleSheet, Platform } from "react-native";
import { colors, spacing } from "@/src/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.onSurfaceTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.sm,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size ?? 20} color={color} />,
          tabBarButtonTestID: "tab-home",
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: "Book",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size ?? 20} color={color} />
          ),
          tabBarButtonTestID: "tab-book",
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Mine",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bookmark" size={size ?? 20} color={color} />
          ),
          tabBarButtonTestID: "tab-mine",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Studio",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size ?? 20} color={color} />
          ),
          tabBarButtonTestID: "tab-admin",
        }}
      />
    </Tabs>
  );
}

// Not used, kept to avoid lint unused import warning
const _s = StyleSheet.create({ v: { flex: 1 } });
void _s;
void View;
