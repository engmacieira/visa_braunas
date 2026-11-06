import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'], // menos de 1% de falha
    http_req_duration: ['p(95)<300', 'avg<200'], // P95 abaixo de 300ms, média < 200ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export function setup() {
  // Autenticação única no bloco setup() para evitar mutações concorrentes ou sobrecarga
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

  // 1. Healthcheck operacional
  const resHealth = http.get(`${BASE_URL}/health`);
  check(resHealth, {
    'health status 200': (r) => r.status === 200,
    'health database online': (r) => {
      try {
        return r.json('database') === 'online';
      } catch (e) {
        return false;
      }
    },
    'has x-response-time header': (r) => r.headers['X-Response-Time'] !== undefined,
  });

  // 2. Catálogo de CNAEs (Endpoint cacheado)
  const resCnaes = http.get(`${BASE_URL}/api/v1/cnaes?limit=20`, { headers });
  check(resCnaes, {
    'cnaes status 200': (r) => r.status === 200,
  });

  // 3. Listagem de Estabelecimentos
  const resEstab = http.get(`${BASE_URL}/api/v1/estabelecimentos?limit=10`, { headers });
  check(resEstab, {
    'estabelecimentos status 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
