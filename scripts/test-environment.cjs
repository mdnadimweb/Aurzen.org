// Unit tests never inherit production service/database credentials.
for(const name of ['INTERNAL_API_TOKEN','ADMIN_PASSWORD','DATABASE_URL','TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','NETLIFY','VERCEL'])delete process.env[name];
process.env.SEED_DEMO='true';
