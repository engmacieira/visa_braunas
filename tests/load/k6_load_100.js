import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Rampa de subida até 50 VUs
    { duration: '30s', target: 100 }, // Rampa até 100 VUs
    { duration: '1m', target: 100 },  // Sustentação em 100 VUs
    { duration: '20s', target: 0 },   // Desaceleração
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'], // Asserção P95 < 300ms conforme regra de ouro
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export function setup() {
  // Autenticação isolada no setup() para perfil fiscal/digitador
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
  // Simula IPs distintos por Virtual User via X-Forwarded-For para respeitar o rate-limiter por cliente
  const clientIp = `192.168.10.${(__VU % 250) + 1}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': clientIp,
  };
  if (data && data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  // 1. Busca textual de estabelecimentos regulados
  const resBusca = http.get(`${BASE_URL}/api/v1/estabelecimentos?busca=Padaria&limit=10`, { headers });
  check(resBusca, {
    'busca estab status 200': (r) => r.status === 200,
  });

  // 2. Consulta de alvará sanitário por autenticidade (Endpoint público protegido por rate limit isolado por IP)
  const resAlvara = http.get(`${BASE_URL}/api/v1/alvaras/validar/BRN2026A-2026`, { headers });
  check(resAlvara, {
    'consulta alvara respondida (200, 404 ou 429)': (r) => r.status === 200 || r.status === 404 || r.status === 429,
  });

  // 3. Carregamento do Dashboard de Indicadores Regulatórios (Endpoint cacheado)
  const resDashboard = http.get(`${BASE_URL}/api/v1/indicadores/dashboard?ano=2026`, { headers });
  check(resDashboard, {
    'dashboard status 200': (r) => r.status === 200,
  });

  // 4. Configuração Institucional Municipal (Endpoint cacheado)
  const resConfig = http.get(`${BASE_URL}/api/v1/estabelecimentos/configuracao`, { headers });
  check(resConfig, {
    'configuracao institucional status 200': (r) => r.status === 200,
  });

  sleep(0.05);
}
