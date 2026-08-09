# PRD — FisioPilates (Clínica de Fisioterapia & Pilates)

## Problema original (resumo)
App responsivo (Expo RN + FastAPI + MongoDB) para uma clínica de Fisioterapia e Pilates. Três perfis (Paciente/Aluno, Admin Fisio, Admin Pilates). Gestão de pacientes, prontuário/evoluções (privado), anamnese, avaliações com gráficos, agenda, presença, exercícios para casa, orientações, pagamentos e notificações. Interface em Português BR, R$, DD/MM/AAAA, 24h. Design moderno e minimalista.

## Arquitetura
- **Backend**: FastAPI (`/app/backend/server.py`), Motor/MongoDB, JWT (bcrypt), todos os endpoints sob `/api`.
- **Frontend**: Expo Router. `app/login.tsx`, `app/admin/*`, `app/patient/*`. Navegação responsiva via `src/components/AppShell.tsx` (sidebar em web ≥900px, bottom tabs no mobile). Gráficos com `react-native-gifted-charts`.
- **Auth**: JWT Bearer (7 dias), guardado em expo-secure-store (native) / localStorage (web). `src/context/AuthContext.tsx` + `src/hooks/useGuard.ts`.

## Personas
- **Admin Fisio / Admin Pilates**: gerenciam agenda, pacientes, prontuários, pagamentos e cadastros; filtram por área.
- **Paciente/Aluno**: vê próximo atendimento, agenda (regra 12h), exercícios, histórico, pagamentos e orientações. Não vê evoluções clínicas privadas.

## Contas demo
- fisio@demo.com / Demo123! (admin_fisio)
- pilates@demo.com / Demo123! (admin_pilates)
- joao@demo.com / Demo123! (patient)

## Requisitos centrais (estáticos)
- Controle de acesso por perfil (RBAC).
- Separação Fisio/Pilates em pacientes, atendimentos, pagamentos (com filtro Todos/Fisio/Pilates).
- Regra de agendamento: paciente ≥12h de antecedência; admin sem restrição; sem conflito de horário por profissional.
- Prontuário/evoluções visíveis apenas a profissionais.

## Implementado (2026-08-09)
- Login + "esqueci minha senha" (placeholder) + botões de demo.
- Seed idempotente: 2 admins, 9 procedimentos, 5 pacientes, agendamentos, avaliações, evoluções, exercícios, pagamentos, notificações.
- Dashboard admin (KPIs + próximos atendimentos + filtro de área).
- Agenda: visões Dia/Semana/Mês, criar agendamento, ações rápidas de presença (confirmado/presente/faltou/cancelar), filtro de área.
- Pacientes: busca (nome/telefone/email), filtro de área, cadastro (com opção de criar login), ficha com abas: Dados, Anamnese, Evoluções (privado), Avaliações (gráficos dor 0–10 e ADM), Exercícios (ativo/anterior), Orientações, Pagamentos, Presença.
- Pagamentos: lista com filtros, total em aberto, marcar como pago.
- Configurações: CRUD de procedimentos, logout.
- Área do paciente: dashboard, agendamento em 3 passos (regra 12h), exercícios, histórico (atendimentos/pagamentos/orientações + cancelar), notificações.
- Português BR, R$, DD/MM/AAAA, 24h em toda a UI.
- Testes: 32/32 backend passaram; fluxos web (sidebar) e mobile (tabs) verificados.

## Backlog priorizado
- **P1**: Reagendamento pelo paciente na própria UI (hoje só cancelar); edição de dados do paciente pela ficha; configuração de disponibilidade/horários (dias, almoço, folgas, feriados, bloqueios).
- **P1**: Pacotes de sessões (contratados x usados) e vínculo com pagamentos.
- **P2**: Lembretes automáticos ~24h antes (arquitetura pronta; hoje notificações in-app). Canais WhatsApp/Email/SMS futuros.
- **P2**: Restringir usuários a uma única área (arquitetura preparada).
- **P2**: Recuperação de senha por e-mail real; migrar `shadow*` → `boxShadow` (web).

## Próximas tarefas sugeridas
1. Reagendamento self-service do paciente respeitando a regra de 12h.
2. Tela de disponibilidade/horários por área.
3. Pacotes de sessões + baixa automática por presença.
