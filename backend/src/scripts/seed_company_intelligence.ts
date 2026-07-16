import pool from "../database/db";

async function seedCompanyIntelligence() {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    console.log("🌱 Seeding company intelligence data...");

    // Insert sample companies
    const companies = [
      {
        name: "TechCorp Solutions",
        website: "https://techcorp.com",
        industry: "Technology",
        company_size: "1000-5000",
        about_text: "TechCorp is a leading technology company specializing in cloud infrastructure and enterprise software solutions.",
        hiring_score: 85,
        hiring_status: "actively_hiring",
        ats_provider: "greenhouse",
        career_url: "https://techcorp.com/careers",
        linkedin_url: "https://linkedin.com/company/techcorp"
      },
      {
        name: "InnovateLabs",
        website: "https://innovatelabs.io",
        industry: "Software",
        company_size: "100-500",
        about_text: "InnovateLabs builds cutting-edge AI and machine learning tools for businesses of all sizes.",
        hiring_score: 72,
        hiring_status: "hiring",
        ats_provider: "lever",
        career_url: "https://innovatelabs.io/jobs",
        linkedin_url: "https://linkedin.com/company/innovatelabs"
      },
      {
        name: "GlobalFinance Inc",
        website: "https://globalfinance.com",
        industry: "Financial Services",
        company_size: "5000-10000",
        about_text: "GlobalFinance provides comprehensive financial services and banking solutions to enterprises worldwide.",
        hiring_score: 45,
        hiring_status: "hiring",
        ats_provider: "workday",
        career_url: "https://globalfinance.com/careers",
        linkedin_url: "https://linkedin.com/company/globalfinance"
      }
    ];

    const insertedCompanies: any[] = [];
    
    for (const company of companies) {
      const result = await client.query(
        `INSERT INTO companies (name, website, industry, company_size, about_text, hiring_score, hiring_status, ats_provider, career_url, linkedin_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (website) DO NOTHING
         RETURNING id`,
        [
          company.name,
          company.website,
          company.industry,
          company.company_size,
          company.about_text,
          company.hiring_score,
          company.hiring_status,
          company.ats_provider,
          company.career_url,
          company.linkedin_url
        ]
      );
      
      if (result.rows.length > 0) {
        insertedCompanies.push({ ...company, id: result.rows[0].id });
        console.log(`✅ Inserted company: ${company.name}`);
      } else {
        // Company already exists, fetch its ID
        const existing = await client.query(
          'SELECT id FROM companies WHERE website = $1',
          [company.website]
        );
        insertedCompanies.push({ ...company, id: existing.rows[0].id });
        console.log(`ℹ️  Company already exists: ${company.name}`);
      }
    }

    // Insert contacts for each company
    const contacts = [
      { companyIndex: 0, email: "careers@techcorp.com", phone: "+1-555-0101", contact_type: "careers", source_page: "https://techcorp.com/careers" },
      { companyIndex: 0, email: "hr@techcorp.com", phone: "+1-555-0102", contact_type: "hr", source_page: "https://techcorp.com/about" },
      { companyIndex: 1, email: "jobs@innovatelabs.io", phone: "+1-555-0201", contact_type: "careers", source_page: "https://innovatelabs.io/jobs" },
      { companyIndex: 1, email: "team@innovatelabs.io", phone: "+1-555-0202", contact_type: "general", source_page: "https://innovatelabs.io/contact" },
      { companyIndex: 2, email: "recruiting@globalfinance.com", phone: "+1-555-0301", contact_type: "hr", source_page: "https://globalfinance.com/careers" },
    ];

    for (const contact of contacts) {
      const companyId = insertedCompanies[contact.companyIndex].id;
      await client.query(
        `INSERT INTO company_contacts (company_id, email, phone, contact_type, source_page)
         VALUES ($1, $2, $3, $4, $5)`,
        [companyId, contact.email, contact.phone, contact.contact_type, contact.source_page]
      );
      console.log(`✅ Inserted contact: ${contact.email}`);
    }

    // Insert sample jobs for each company
    const jobs = [
      { companyIndex: 0, title: "Senior Software Engineer", location: "San Francisco, CA", experience_level: "Senior", job_url: "https://techcorp.com/careers/swe-senior", posted_date: "2024-01-15" },
      { companyIndex: 0, title: "Product Manager", location: "Remote", experience_level: "Mid", job_url: "https://techcorp.com/careers/pm", posted_date: "2024-01-10" },
      { companyIndex: 0, title: "DevOps Engineer", location: "New York, NY", experience_level: "Senior", job_url: "https://techcorp.com/careers/devops", posted_date: "2024-01-08" },
      { companyIndex: 1, title: "Machine Learning Engineer", location: "Remote", experience_level: "Senior", job_url: "https://innovatelabs.io/jobs/ml-engineer", posted_date: "2024-01-12" },
      { companyIndex: 1, title: "Frontend Developer", location: "Austin, TX", experience_level: "Mid", job_url: "https://innovatelabs.io/jobs/frontend", posted_date: "2024-01-05" },
      { companyIndex: 2, title: "Financial Analyst", location: "New York, NY", experience_level: "Mid", job_url: "https://globalfinance.com/careers/analyst", posted_date: "2024-01-14" },
      { companyIndex: 2, title: "Risk Manager", location: "London, UK", experience_level: "Senior", job_url: "https://globalfinance.com/careers/risk-manager", posted_date: "2024-01-11" },
    ];

    for (const job of jobs) {
      const companyId = insertedCompanies[job.companyIndex].id;
      await client.query(
        `INSERT INTO company_jobs (company_id, title, location, experience_level, job_url, posted_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (company_id, job_url) DO NOTHING`,
        [companyId, job.title, job.location, job.experience_level, job.job_url, job.posted_date]
      );
      console.log(`✅ Inserted job: ${job.title}`);
    }

    // Insert sample scrape jobs
    for (let i = 0; i < insertedCompanies.length; i++) {
      const companyId = insertedCompanies[i].id;
      const status = i === 0 ? "success" : i === 1 ? "partial" : "queued";
      const levelReached = i === 0 ? 5 : i === 1 ? 3 : null;
      const startedAt = i === 0 ? new Date(Date.now() - 3600000) : i === 1 ? new Date(Date.now() - 7200000) : null;
      const completedAt = i === 0 ? new Date(Date.now() - 1800000) : i === 1 ? new Date(Date.now() - 5400000) : null;
      const errorMessage = i === 1 ? "Some job pages failed to load" : null;

      await client.query(
        `INSERT INTO scrape_jobs (company_id, status, level_reached, error_message, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, status, levelReached, errorMessage, startedAt, completedAt]
      );
      console.log(`✅ Inserted scrape job for: ${insertedCompanies[i].name}`);
    }

    await client.query("COMMIT");
    console.log("\n🎉 Company intelligence data seeded successfully!");
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding company intelligence:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedCompanyIntelligence()
  .then(() => {
    console.log("✅ Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed script failed:", error);
    process.exit(1);
  });
