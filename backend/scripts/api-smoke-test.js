const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = String(process.env.ADMIN_PASSWORD || '');
const authSecret = String(process.env.AUTH_SECRET || '');

if (!adminEmail || !adminPassword || !authSecret) {
  throw new Error('ADMIN_EMAIL, ADMIN_PASSWORD e AUTH_SECRET são obrigatórios.');
}

const toBasicAuthHeader = (email, password) => {
  const token = Buffer.from(`${email}:${password}`, 'utf8').toString('base64');
  return `Basic ${token}`;
};

const run = async () => {
  const tryUrls = [baseUrl, 'http://localhost:3001'].filter((value, index, arr) => arr.indexOf(value) === index);

  let selectedBaseUrl = null;
  let health = null;

  for (const candidate of tryUrls) {
    try {
      const response = await fetch(`${candidate}/api/health`);
      if (response.ok) {
        selectedBaseUrl = candidate;
        health = response;
        break;
      }
    } catch (_error) {
      // continue trying next candidate
    }
  }

  if (!selectedBaseUrl || !health) {
    throw new Error('Healthcheck falhou.');
  }

  const list = await fetch(`${selectedBaseUrl}/api/submissions`, {
    headers: {
      Authorization: toBasicAuthHeader(adminEmail, adminPassword),
    },
  });
  if (!list.ok) {
    throw new Error('Listagem de envios falhou. Verifique ADMIN_EMAIL/ADMIN_PASSWORD.');
  }

  console.log('Smoke test da API executado com sucesso.');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
