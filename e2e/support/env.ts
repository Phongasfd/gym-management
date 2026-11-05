// One place for the ports, secrets and database the e2e stack uses. Nothing here is a real secret.
const apiPort = Number(process.env.E2E_API_PORT ?? 4000);
const webPort = Number(process.env.E2E_WEB_PORT ?? 4001);

const databaseUrl = process.env.E2E_DATABASE_URL ?? 'postgresql://test:test@localhost:5432/gym_e2e_test';
if (!/test/i.test(databaseUrl.split('/').pop() ?? '')) {
  throw new Error('E2E_DATABASE_URL must point at a database whose name contains "test" (it is wiped).');
}

export const E2E = {
  apiPort,
  webPort,
  apiUrl: `http://localhost:${apiPort}`,
  webUrl: `http://localhost:${webPort}`,
  databaseUrl,
  vnpHashSecret: 'e2e_vnpay_secret',
  vnpTmnCode: 'E2ETEST',
  staff: { email: 'staff@gym.local', password: 'e2e-staff-password' },
  backendEnv: {
    NODE_ENV: 'development',
    PORT: String(apiPort),
    DATABASE_URL: databaseUrl,
    JWT_SECRET: 'e2e_jwt_secret',
    RATE_LIMIT_DISABLED: 'true',
    FRONTEND_URL: `http://localhost:${webPort}`,
    CORS_ORIGINS: `http://localhost:${webPort}`,
    VNP_TMN_CODE: 'E2ETEST',
    VNP_HASH_SECRET: 'e2e_vnpay_secret',
    VNP_URL: 'https://sandbox.vnpayment.vn',
    VNP_RETURN_URL: `http://localhost:${apiPort}/api/vnpay/check-payment-vnpay`,
    SEED_STAFF_PASSWORD: 'e2e-staff-password',
    LOG_LEVEL: 'warn',
  } as Record<string, string>,
};
