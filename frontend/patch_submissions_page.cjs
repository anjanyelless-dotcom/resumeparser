const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RecruiterSubmissionsPage.tsx');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/submission\.created_at/g, '(submission.submitted_at || submission.created_at)');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched RecruiterSubmissionsPage.tsx');
} else {
  console.log('RecruiterSubmissionsPage.tsx not found');
}
