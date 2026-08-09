import { getToken } from "@/src/auth/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && data.detail) || `Erro ${res.status}`;
    const err: any = new Error(typeof msg === "string" ? msg : "Erro na requisição");
    err.status = res.status;
    throw err;
  }
  return data as T;
}

// ---------- Types ----------
export type Role = "patient" | "admin_fisio" | "admin_pilates";
export type Area = "fisio" | "pilates" | "ambos";
export type ApptStatus = "agendado" | "confirmado" | "presente" | "faltou" | "cancelado" | "remarcado";
export type PayStatus = "pago" | "pendente" | "atrasado";

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  patient_id?: string | null;
}

export interface Patient {
  id: string;
  name: string;
  birth_date?: string | null;
  phone: string;
  whatsapp: string;
  email: string;
  cpf: string;
  address: string;
  emergency_contact: string;
  area: Area;
  procedure_types: string[];
  user_id?: string | null;
  created_at: string;
}

export interface Procedure {
  id: string;
  name: string;
  area: Area;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  professional_id?: string | null;
  professional_name: string;
  area: Area;
  procedure: string;
  date: string;
  time: string;
  datetime: string;
  duration_min: number;
  status: ApptStatus;
  notes: string;
}

export interface Assessment {
  id: string;
  patient_id: string;
  date: string;
  dor: number;
  local_dor: string;
  amplitude_movimento: number;
  mobilidade: string;
  flexibilidade: string;
  forca: string;
  limitacoes: string;
  observacoes: string;
}

export interface Evolution {
  id: string;
  patient_id: string;
  date: string;
  professional: string;
  area: Area;
  tipo_atendimento: string;
  evolucao_clinica: string;
  observacoes: string;
  condutas: string;
  resposta_paciente: string;
  recomendacoes: string;
  proximos_passos: string;
}

export interface Exercise {
  id: string;
  patient_id: string;
  name: string;
  description: string;
  series: string;
  repetitions: string;
  frequency: string;
  duration: string;
  observacoes: string;
  active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  patient_id: string;
  patient_name: string;
  area: Area;
  description: string;
  amount: number;
  status: PayStatus;
  due_date?: string | null;
  paid_date?: string | null;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
}

// ---------- API ----------
export const api = {
  // auth
  login: (email: string, password: string) =>
    req<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<User>("/auth/me"),
  passwordReset: (email: string) =>
    req<{ message: string }>("/auth/password-reset", { method: "POST", body: JSON.stringify({ email }) }),

  // patients
  listPatients: (q?: string, area?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (area && area !== "todos") p.set("area", area);
    const qs = p.toString();
    return req<Patient[]>(`/patients${qs ? `?${qs}` : ""}`);
  },
  getPatient: (id: string) => req<Patient>(`/patients/${id}`),
  createPatient: (body: any) => req<Patient>("/patients", { method: "POST", body: JSON.stringify(body) }),
  updatePatient: (id: string, body: any) => req<Patient>(`/patients/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePatient: (id: string) => req<{ ok: boolean }>(`/patients/${id}`, { method: "DELETE" }),

  // procedures
  listProcedures: (area?: string) => req<Procedure[]>(`/procedures${area ? `?area=${area}` : ""}`),
  createProcedure: (body: { name: string; area: Area }) =>
    req<Procedure>("/procedures", { method: "POST", body: JSON.stringify(body) }),
  deleteProcedure: (id: string) => req<{ ok: boolean }>(`/procedures/${id}`, { method: "DELETE" }),

  // anamnese
  getAnamnese: (pid: string) => req<any>(`/patients/${pid}/anamnese`),
  saveAnamnese: (pid: string, body: any) => req<any>(`/patients/${pid}/anamnese`, { method: "PUT", body: JSON.stringify(body) }),

  // evolutions
  listEvolutions: (pid: string) => req<Evolution[]>(`/patients/${pid}/evolutions`),
  createEvolution: (pid: string, body: any) => req<Evolution>(`/patients/${pid}/evolutions`, { method: "POST", body: JSON.stringify(body) }),

  // assessments
  listAssessments: (pid: string) => req<Assessment[]>(`/patients/${pid}/assessments`),
  createAssessment: (pid: string, body: any) => req<Assessment>(`/patients/${pid}/assessments`, { method: "POST", body: JSON.stringify(body) }),

  // appointments
  listAppointments: (params: { date?: string; date_from?: string; date_to?: string; area?: string; patient_id?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "todos") p.set(k, v);
    });
    const qs = p.toString();
    return req<Appointment[]>(`/appointments${qs ? `?${qs}` : ""}`);
  },
  createAppointment: (body: any) => req<Appointment>("/appointments", { method: "POST", body: JSON.stringify(body) }),
  setApptStatus: (id: string, status: ApptStatus) =>
    req<Appointment>(`/appointments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  reschedule: (id: string, body: any) => req<Appointment>(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  cancelAppointment: (id: string) => req<{ ok: boolean }>(`/appointments/${id}`, { method: "DELETE" }),
  attendanceSummary: (pid: string) => req<any>(`/patients/${pid}/attendance-summary`),

  // exercises
  listExercises: (pid: string) => req<Exercise[]>(`/patients/${pid}/exercises`),
  createExercise: (pid: string, body: any) => req<Exercise>(`/patients/${pid}/exercises`, { method: "POST", body: JSON.stringify(body) }),
  updateExercise: (id: string, body: any) => req<Exercise>(`/exercises/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteExercise: (id: string) => req<{ ok: boolean }>(`/exercises/${id}`, { method: "DELETE" }),

  // notes
  listNotes: (pid: string) => req<any[]>(`/patients/${pid}/notes`),
  createNote: (pid: string, text: string) => req<any>(`/patients/${pid}/notes`, { method: "POST", body: JSON.stringify({ text }) }),

  // payments
  listPayments: (params: { status?: string; area?: string; patient_id?: string } = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "todos") p.set(k, v);
    });
    const qs = p.toString();
    return req<Payment[]>(`/payments${qs ? `?${qs}` : ""}`);
  },
  createPayment: (body: any) => req<Payment>("/payments", { method: "POST", body: JSON.stringify(body) }),
  payPayment: (id: string) => req<Payment>(`/payments/${id}/pay`, { method: "PATCH" }),

  // notifications
  listNotifications: () => req<Notification[]>("/notifications"),
  readNotification: (id: string) => req<{ ok: boolean }>(`/notifications/${id}/read`, { method: "PATCH" }),
  readAllNotifications: () => req<{ ok: boolean }>("/notifications/read-all", { method: "POST" }),

  // dashboards
  adminDashboard: (area?: string) => req<any>(`/admin/dashboard${area && area !== "todos" ? `?area=${area}` : ""}`),
  patientDashboard: () => req<any>("/patient/dashboard"),
  listProfessionals: () => req<User[]>("/professionals"),
};
