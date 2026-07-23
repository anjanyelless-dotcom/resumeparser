import pool from "./db";

async function main() {
  const res = await pool.query(`
    SELECT
      p.display_name as parent_name,
      c.display_name as child_name,
      c.route,
      c.sort_order as child_order
    FROM sidebar_modules p
    LEFT JOIN sidebar_modules c ON c.parent_id = p.id AND c.is_active = true
    WHERE p.is_active = true AND p.parent_id IS NULL
    ORDER BY p.sort_order, c.sort_order;
  `);

  console.log("=== FINAL SIDEBAR STRUCTURE ===");
  let currentParent = "";
  res.rows.forEach(row => {
    if (row.parent_name !== currentParent) {
      console.log(`\n${row.parent_name}`);
      currentParent = row.parent_name;
    }
    if (row.child_name) {
      console.log(`  - ${row.child_name} (${row.route})`);
    }
  });

  process.exit(0);
}
main();
