const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export type SessionType = "physio" | "pilates";

export interface Therapist {
  id: string;
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  photo_url: string;
  types: SessionType[];
}

export interface AceSession {
  id: string;
  type: SessionType;
  title: string;
  therapist_id: string;
  start_time: string;
  duration_min: number;
  capacity: number;
  booked_count: number;
  location: string;
  notes: string;
  therapist?: Therapist | null;
}

export interface Booking {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  status: "confirmed" | "cancelled";
  created_at: string;
  session?: AceSession | null;
  therapist?: Therapist | null;
}

export const api = {
  // Therapists
  listTherapists: (type?: SessionType) =>
    req<Therapist[]>(`/therapists${type ? `?type=${type}` : ""}`),
  getTherapist: (id: string) => req<Therapist>(`/therapists/${id}`),
  createTherapist: (body: Partial<Therapist>) =>
    req<Therapist>("/therapists", { method: "POST", body: JSON.stringify(body) }),
  deleteTherapist: (id: string) =>
    req<{ ok: boolean }>(`/therapists/${id}`, { method: "DELETE" }),

  // Sessions
  listSessions: (params: { type?: SessionType; date?: string } = {}) => {
    const p = new URLSearchParams();
    if (params.type) p.set("type", params.type);
    if (params.date) p.set("date", params.date);
    const qs = p.toString();
    return req<AceSession[]>(`/sessions${qs ? `?${qs}` : ""}`);
  },
  getSession: (id: string) => req<AceSession>(`/sessions/${id}`),
  createSession: (body: Partial<AceSession>) =>
    req<AceSession>("/sessions", { method: "POST", body: JSON.stringify(body) }),
  deleteSession: (id: string) =>
    req<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" }),

  // Bookings
  listBookings: (user_id: string) =>
    req<Booking[]>(`/bookings?user_id=${encodeURIComponent(user_id)}`),
  createBooking: (body: {
    session_id: string;
    user_id: string;
    user_name: string;
    user_phone?: string;
  }) => req<Booking>("/bookings", { method: "POST", body: JSON.stringify(body) }),
  cancelBooking: (id: string) =>
    req<{ ok: boolean }>(`/bookings/${id}`, { method: "DELETE" }),
  rescheduleBooking: (id: string, new_session_id: string) =>
    req<Booking>(`/bookings/${id}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ new_session_id }),
    }),
};
