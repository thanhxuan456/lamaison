import pg from "pg";

const { Client } = pg;

const c = new Client({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await c.connect();

const sql = `
  INSERT INTO user_roles (clerk_user_id, email, name, role)
  VALUES ($1, $2, $3, 'superadmin')
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET role = 'superadmin',
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = NOW()
  RETURNING id, clerk_user_id, role
`;

const r = await c.query(sql, [
  process.env.SEED_CLERK_ID,
  process.env.SEED_EMAIL,
  process.env.SEED_NAME,
]);

console.log("user_roles row:", JSON.stringify(r.rows[0]));

await c.end();
