import fs from 'fs';

const mainRoutesFile = 'server/routes/order-to-cash-routes.ts';
const additionFile = 'server/routes/returns-routes-addition.ts';

console.log('🔧 Adding Returns Routes to Order-to-Cash Routes...\n');

// Read both files
const mainContent = fs.readFileSync(mainRoutesFile, 'utf8');
const additionContent = fs.readFileSync(additionFile, 'utf8');

// Find the last line (export default router;)
const lines = mainContent.split('\n');
const lastLine = lines[lines.length - 1];

if (!lastLine.includes('export default router')) {
    console.error('❌ Error: Could not find "export default router" at end of file');
    process.exit(1);
}

// Remove the last line
const contentWithoutExport = lines.slice(0, -1).join('\n');

// Add a separator comment, the new routes, and then the export
const newContent = contentWithoutExport + '\n\n' + additionContent + '\n\n' + lastLine;

// Backup original file
fs.writeFileSync(mainRoutesFile + '.backup', mainContent);
console.log(`✅ Backed up original to ${mainRoutesFile}.backup`);

// Write new content
fs.writeFileSync(mainRoutesFile, newContent);
console.log(`✅ Added returns routes to ${mainRoutesFile}`);

// Verify
const verifyContent = fs.readFileSync(mainRoutesFile, 'utf8');
const verifyLines = verifyContent.split('\n');
console.log(`✅ New file has ${verifyLines.length} lines (was ${lines.length})`);

console.log('\n✅ Integration complete!');
console.log('\nNew routes added:');
console.log('  - POST /sales-returns');
console.log('  - GET /sales-returns');
console.log('  - PUT /sales-returns/:id/approve');
console.log('  - POST /credit-memos');
console.log('  - POST /credit-memos/:id/post');
console.log('  - GET /credit-memos');
console.log('  - POST /return-deliveries');
