import dayjs from "dayjs";

export const fmtTime = (iso: string) => dayjs(iso).format("h:mm A");
export const fmtDate = (iso: string) => dayjs(iso).format("ddd, MMM D");
export const fmtDateLong = (iso: string) => dayjs(iso).format("dddd, MMMM D · h:mm A");
export const fmtYMD = (d: Date | dayjs.Dayjs) => dayjs(d).format("YYYY-MM-DD");

export function nextNDays(n: number): { label: string; date: dayjs.Dayjs; ymd: string }[] {
  const out = [];
  const today = dayjs().startOf("day");
  for (let i = 0; i < n; i++) {
    const d = today.add(i, "day");
    out.push({ label: i === 0 ? "Today" : d.format("ddd"), date: d, ymd: d.format("YYYY-MM-DD") });
  }
  return out;
}
