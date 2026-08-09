import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";

const PREF_KEY = "ace.remindersEnabled.v1";
const MAP_KEY = "ace.reminders.map.v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getRemindersEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(PREF_KEY);
  return v === null ? true : v === "1";
}

export async function setRemindersEnabled(on: boolean) {
  await AsyncStorage.setItem(PREF_KEY, on ? "1" : "0");
}

export async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.status === "granted";
}

async function readMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(MAP_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeMap(m: Record<string, string>) {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(m));
}

export async function scheduleReminder(bookingId: string, title: string, body: string, whenISO: string) {
  if (Platform.OS === "web") return;
  const enabled = await getRemindersEnabled();
  if (!enabled) return;
  const ok = await ensurePermission();
  if (!ok) return;

  const fireAt = dayjs(whenISO).subtract(60, "minute");
  if (fireAt.isBefore(dayjs())) return;

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt.toDate(),
    },
  });
  const m = await readMap();
  m[bookingId] = id;
  await writeMap(m);
}

export async function cancelReminder(bookingId: string) {
  if (Platform.OS === "web") return;
  const m = await readMap();
  const id = m[bookingId];
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
    delete m[bookingId];
    await writeMap(m);
  }
}
