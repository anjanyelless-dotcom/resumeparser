const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: 'postgresql://postgres:Surya%40123@localhost:5432/resume_parser' });
const query = fs.readFileSync('c:/Lalataksha V Company/Main-branch/Lakshya-LLM-Resume-Parser/backend/src/database/migrations/081_add_recruiter_decision_to_match_scores.sql', 'utf8');
client.connect().then(() => client.query(query)).then(res => { 
  console.log('Migration executed successfully'); 
  client.end(); 
}).catch(err => { 
  console.error('DB Error:', err.message); 
  client.end(); 
});