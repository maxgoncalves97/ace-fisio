import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api, ProfessionalService } from "@/src/api/client";
import { Button, Card, Chip, Field, Input } from "./ui";
import { colors, spacing } from "@/src/theme/tokens";
import { BookingAvailabilitySettings } from "./BookingAvailabilitySettings";

export function ProfessionalSettings({ professionalId }: { professionalId?: string }) {
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [area, setArea] = useState<"fisio" | "pilates">("fisio");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.listProfessionalServices().then(setServices).catch(e => setMessage(e.message));
  }, []);
  const save = async (action: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await action(); setMessage("Salvo com sucesso."); } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  return <><Card style={{ marginBottom: spacing.lg, gap: spacing.md }}>
    <Text style={{ color: colors.onSurface, fontSize: 17, fontWeight: "600" }}>Meus serviços</Text>
    <Text style={{ color: colors.onSurfaceSecondary }}>Cada profissional mantém seus preços e sua própria agenda. Horários da clínica: America/Sao_Paulo.</Text>
    {services.filter(s => s.professional_id === professionalId).map(s => <Text key={s.id} style={{ color: colors.onSurface }}>{s.name} · {s.duration_min} min · {(s.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>)}
    <Field label="Serviço"><Input testID="service-name" value={name} onChangeText={setName} placeholder="Ex.: Reabilitação" /></Field>
    <View style={{ flexDirection: "row", gap: spacing.sm }}><Chip label="Fisioterapia" active={area === "fisio"} onPress={() => setArea("fisio")} /><Chip label="Pilates" active={area === "pilates"} onPress={() => setArea("pilates")} /></View>
    <Field label="Preço (R$)"><Input testID="service-price" keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="120,00" /></Field>
    <Field label="Duração em minutos"><Input testID="service-duration" keyboardType="number-pad" value={duration} onChangeText={setDuration} /></Field>
    <Button title="Adicionar meu serviço" loading={busy} testID="save-service" onPress={() => save(async () => {
      const amount = Number(price.replace(",", ".")), minutes = Number(duration);
      if (!name.trim() || !price.trim() || !Number.isFinite(amount) || amount < 0 || !Number.isInteger(minutes) || minutes < 5 || minutes > 240) throw new Error("Informe nome, preço e duração de 5 a 240 minutos.");
      const s = await api.createProfessionalService({ name: name.trim(), area, price_cents: Math.round(amount * 100), duration_min: minutes });
      setServices(old => [...old, s]); setName(""); setPrice("");
    })} />
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceSecondary }}>{message}</Text> : null}
  </Card><BookingAvailabilitySettings ownId={professionalId} /></>;
}
