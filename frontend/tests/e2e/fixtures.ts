import { test as base, expect, APIRequestContext, Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const API = 'http://127.0.0.1:8000/api';
export const UI = 'http://localhost:4173';
export const PASSWORD = 'Demo123!';
type Patient = { id: string; name: string; email: string; user_id?: string };
type Clinic = {
  admin: APIRequestContext;
  professionalId: string;
  professionalEmail: string;
  unique: string;
  createPatient: () => Promise<Patient>;
  trackPatient: (patient: Patient) => void;
  trackService: (service: {id: string; name: string}) => void;
  patientApi: (patient: Patient) => Promise<APIRequestContext>;
};
const execute = promisify(execFile);

export const test = base.extend<{ clinic: Clinic }>({
  clinic: async ({ playwright }, provide) => {
    const plain = await playwright.request.newContext();
    const health = await plain.get('http://127.0.0.1:8000/local-demo-health');
    expect(health.ok()).toBeTruthy();
    expect((await health.json()).mode).toBe('isolated-ui-test');
    const root = path.resolve(__dirname, '../..');
    const python = path.join(root, '../backend/venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const script = path.join(root, '../backend/cleanup_e2e.py');
    const unique = randomUUID().slice(0, 12);
    const provision = await execute(python, [path.join(root, '../backend/provision_e2e.py'), unique], { windowsHide: true, timeout: 20000 });
    const professional: {id: string; name: string; email: string} = JSON.parse(provision.stdout);
    const login = await plain.post(API + '/auth/login', { data: { email: professional.email, password: PASSWORD } });
    expect(login.ok()).toBeTruthy();
    const auth = await login.json();
    const admin = await playwright.request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${auth.access_token}` } });
    const patients: Patient[] = [];
    const services: {id: string; name: string}[] = [];
    const patientContexts: APIRequestContext[] = [];
    try {
      await provide({
        admin, professionalId: auth.user.id, professionalEmail: professional.email, unique,
        trackPatient: patient => patients.push(patient),
        trackService: service => services.push(service),
        createPatient: async () => {
          const suffix = randomUUID().slice(0, 8);
          const response = await admin.post(API + '/patients', { data: { name: `E2E-${unique}-${suffix}`, email: `e2e-${unique}-${suffix}@example.com`, area: 'fisio', create_login: true, login_password: PASSWORD } });
          expect(response.ok()).toBeTruthy();
          const patient: Patient = await response.json(); patients.push(patient); return patient;
        },
        patientApi: async patient => {
          const response = await plain.post(API + '/auth/login', { data: { email: patient.email, password: PASSWORD } });
          expect(response.ok()).toBeTruthy();
          const login = await response.json();
          const api = await playwright.request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${login.access_token}` } });
          patientContexts.push(api); return api;
        },
      });
    } finally {
      for (const [kind, docs] of [['patient', patients], ['service', services]] as const) {
        for (const doc of docs) await execute(python, [script, kind, doc.id, doc.name], { windowsHide: true, timeout: 20000 });
      }
      await execute(python, [script, 'professional', professional.id, professional.name], { windowsHide: true, timeout: 20000 });
      await Promise.all([...patientContexts, plain, admin].map(api => api.dispose()));
    }
  },
});
export { expect };

export async function login(page: Page, email = 'fisio@demo.com') {
  await page.goto(UI + '/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(PASSWORD);
  await page.getByTestId('login-submit-button').click();
  await expect(page).toHaveURL(/\/(admin|patient)\/dashboard$/);
}

export async function select(page: Page, id: string, value: string) {
  await page.getByTestId(id).click();
  await page.getByTestId(`${id}-option-${value}`).click();
}

export async function nav(page: Page, key: string) {
  const wide = (page.viewportSize()?.width || 0) >= 900;
  await page.getByTestId(`${wide ? 'sidebar' : 'tab'}-${key}`).click();
}

export function ymd(offset = 0) {
  const date = new Date(); date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
