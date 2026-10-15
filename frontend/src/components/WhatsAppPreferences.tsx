import { useEffect, useState } from "react";
import { Text, Switch, View } from "react-native";
import { api } from "@/src/api/client";
import { Button, Card, Field, Input } from "./ui";
import { colors, spacing } from "@/src/theme/tokens";

export function WhatsAppPreferences() {
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    api.notificationPreferences().then(p => { setEnabled(p.enabled); setPhone(p.phone); setLoaded(true); })
      .catch(e => setMessage(e.message));
  }, []);
  return <Card style={{ marginBottom: spacing.lg, gap: spacing.md }}>
    <Text style={{ color: colors.onSurface, fontWeight: "600", fontSize: 16 }}>Lembretes pelo WhatsApp</Text>
    <Text style={{ color: colors.onSurfaceSecondary }}>Integração futura: o envio ainda não está ativo. Você pode registrar sua preferência e revogar a autorização a qualquer momento.</Text>
    <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
      <Switch testID="whatsapp-consent" accessibilityLabel="Autorizar lembretes de agendamento pelo WhatsApp" value={enabled} onValueChange={setEnabled} disabled={!loaded || busy} />
      <Text style={{ color: colors.onSurface, flex: 1 }}>Autorizo receber confirmações e lembretes de agendamento pelo WhatsApp.</Text>
    </View>
    {enabled && <Field label="WhatsApp com 55 e DDD"><Input testID="whatsapp-phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="5511999999999" /></Field>}
    <Button title="Salvar preferência" testID="save-whatsapp" disabled={!loaded} loading={busy} onPress={async () => {
      setBusy(true); setMessage("");
      try { const p = await api.saveWhatsAppConsent(enabled, phone); setPhone(p.phone); setMessage("Preferência salva. O envio depende da ativação do serviço pela clínica."); }
      catch (e: any) { setMessage(e.message); }
      finally { setBusy(false); }
    }} />
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceSecondary }}>{message}</Text> : null}
  </Card>;
}
