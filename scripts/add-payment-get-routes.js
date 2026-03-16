import fs from 'fs';
import path from 'path';

const routesFile = 'server/routes/order-to-cash-routes.ts';
const additionFile = 'server/routes/payment-get-routes-addition.ts';

console.log('🔧 Adding payment GET routes to order-to-cash-routes.ts\n');

try {
    // Read the main routes file
    const routesContent = fs.readFileSync(routesFile, 'utf8');

    // Read the routes to add (skip the router/db/sql declarations since they already exist)
    let additionContent = fs.readFileSync(additionFile, 'utf8');

    // Check if routes already added
    if (routesContent.includes('GET /order-to-cash/customer-payments')) {
        console.log('⚠️  Routes already added! Skipping.');
        process.exit(0);
    }

    // Find the export statement
    const exportIndex = routesContent.lastIndexOf('export default router;');

    if (exportIndex === -1) {
        throw new Error('Could not find "export default router;" in file');
    }

    // Create backup
    const backupFile = routesFile + `.backup-${Date.now()}`;
    fs.writeFileSync(backupFile, routesContent);
    console.log(`✅ Created backup: ${backupFile}`);

    // Insert the new routes before export
    const beforeExport = routesContent.substring(0, exportIndex);
    const exportStatement = routesContent.substring(exportIndex);

    const newContent = beforeExport + '\n\n' + additionContent + '\n\n' + exportStatement;

    // Write the updated file
    fs.writeFileSync(routesFile, newContent);

    console.log('✅ Successfully added payment GET routes!');
    console.log('\nAdded routes:');
    console.log('  - GET /api/order-to-cash/customer-payments');
    console.log('  - GET /api/order-to-cash/payment-applications');
    console.log('\n🎉 AR Payment processing fix is now complete!');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
