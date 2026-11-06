import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Rampa inicial: 100 VUs
    { duration: '1m', target: 500 },   // Escalada agressiva: 500 VUs
    { duration: '1m', target: 1000 },  // Pico máximo: 1.000 VUs
    { duration: '30s', target: 0 },    // Resfriamento e recuperação pós-pico
  ],
  thresholds: {
    // Avalia resiliência e estabilidade sob pico extremo
    http_req_failed: ['rate<0.05'], // tolerância a saturação controlada de conexão (< 5%)
    http_req_duration: ['p(95)<1000'], // Latência P95 sob estresse severo
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: 'admin@braunas.mg.gov.br',
      senha: 'AdminMaster@2026',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  let token = null;
  if (loginRes.status === 200) {
    token = loginRes.json('access_token');
  }

  return { token: token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (data && data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  // Requisições concorrentes de alta frequência (Leitura de catálogo e dashboard)
  const resCnaes = http.get(`${BASE_URL}/api/v1/cnaes?limit=50`, { headers });
  check(resCnaes, {
    'cnaes respondeu': (r) => r.status === 200 || r.status === 429,
  });

  const resDashboard = http.get(`${BASE_URL}/api/v1/indicadores/dashboard`, { headers });
  check(resDashboard, {
    'dashboard respondeu': (r) => r.status === 200 || r.status === 429,
  });

  const resHealth = http.get(`${BASE_URL}/health`);
  check(resHealth, {
    'health respondeu': (r) => r.status === 200 || r.status === 503,
  });

  sleep(0.01);
}
