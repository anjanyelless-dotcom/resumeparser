const { Client } = require("pg");
async function run() {
  const client = new Client({ connectionString: "postgresql://postgres:Surya%40123@localhost:5432/resume_parser" });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'job_descriptions';
  `);
  console.log(res.rows);
  await client.end();
}
run();
