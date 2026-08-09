import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "clinic_access_token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch {}
    return;
  }
  if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
}
