import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type GuestUser = {
  id: string;
  name: string;
  phone: string;
};

type Ctx = {
  user: GuestUser | null;
  loading: boolean;
  saveUser: (u: { name: string; phone?: string }) => Promise<GuestUser>;
};

const UserContext = createContext<Ctx>({ user: null, loading: true, saveUser: async () => ({} as GuestUser) });

const KEY = "ace.guestUser.v1";

function makeId() {
  return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const saveUser = useCallback(async (u: { name: string; phone?: string }) => {
    const existing = user;
    const next: GuestUser = {
      id: existing?.id ?? makeId(),
      name: u.name.trim(),
      phone: (u.phone ?? existing?.phone ?? "").trim(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    setUser(next);
    return next;
  }, [user]);

  return (
    <UserContext.Provider value={{ user, loading, saveUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
