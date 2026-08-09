// Brazilian Portuguese formatting helpers
export function fmtBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Accepts "YYYY-MM-DD" or ISO datetime
export function fmtDate(input?: string | null): string {
  if (!input) return "—";
  const d = parse(input);
  if (!d) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtTime(input?: string | null): string {
  if (!input) return "—";
  const d = parse(input);
  if (!d) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateTime(input?: string | null): string {
  if (!input) return "—";
  return `${fmtDate(input)} às ${fmtTime(input)}`;
}

export function fmtWeekday(input?: string | null): string {
  if (!input) return "";
  const d = parse(input);
  if (!d) return "";
  const wd = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return wd[d.getDay()];
}

function parse(input: string): Date | null {
  // date-only string -> local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, dd] = input.split("-").map(Number);
    return new Date(y, m - 1, dd);
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ageFrom(birth?: string | null): string {
  if (!birth) return "";
  const d = parse(birth);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return years > 0 ? `${years} anos` : "";
}

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function nextDays(n: number): { date: Date; ymd: string; label: string; dayNum: string; weekday: string }[] {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      date: d,
      ymd: toYMD(d),
      label: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : WEEKDAYS_SHORT[d.getDay()],
      dayNum: pad(d.getDate()),
      weekday: WEEKDAYS_SHORT[d.getDay()],
    });
  }
  return out;
}
