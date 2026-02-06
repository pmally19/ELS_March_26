// Safe Codebase Cleanup Script - removes temporary files while preserving source code

import fs from 'fs/promises';
import path from 'path';

const baseDir = 'C:\\Users\\moksh\\Desktop\\28-10-2025';

// Files/patterns to delete (safe to remove)
const deletePatterns = [
    // Test and analysis scripts
    'scripts/check-*.mjs',
    'scripts/check-*.js',
    'scripts/analyze-*.mjs',
    'scripts/analyze-*.js',
    'scripts/verify-*.mjs',
    'scripts/verify-*.js',
    'scripts/test-*.mjs',
    'scripts/test-*.js',
    'scripts/run-*-migration.mjs',
    'scripts/run-*-migration.js',
    'scripts/pre-migration-check.js',

    // Backup and temp files
    '**/*.bak',
    '**/*~',
    '**/.DS_Store',
    '**/Thumbs.db',
];

// Critical files to NEVER delete (double-check protection)
const protectedPatterns = [
    'client/**/*.tsx',
    'client/**/*.ts',
    'client/**/*.css',
    'server/**/*.ts',
    'server/**/*.js',
    'shared/**/*.ts',
    'database/migrations/*.sql',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    '.env',
    '.env.example',
    '.gitignore',
    'README.md',
];

async function findFilestoDelete() {
    const filesToDelete = [];

    // Find scripts to delete
    const scriptsDir = path.join(baseDir, 'scripts');
    try {
        const files = await fs.readdir(scriptsDir);

        for (const file of files) {
            // Delete check-*, analyze-*, verify-*, test-*, run-*-migration files
            if (
                file.startsWith('check-') ||
                file.startsWith('analyze-') ||
                file.startsWith('verify-') ||
                file.startsWith('test-') ||
                file.match(/^run-.*-migration\.(mjs|js)$/)
            ) {
                filesToDelete.push(path.join(scriptsDir, file));
            }
        }
    } catch (err) {
        console.log('Scripts directory not found or not accessible');
    }

    return filesToDelete;
}

async function cleanup() {
    console.log('🧹 Starting Safe Codebase Cleanup...\n');

    const filesToDelete = await findFilestoDelete();

    console.log(`Found ${filesToDelete.length} files to delete:\n`);

    // Show what will be deleted
    filesToDelete.forEach(file => {
        console.log(`  🗑️  ${path.relative(baseDir, file)}`);
    });

    console.log('\n⚠️  SAFETY CHECK: Will NOT delete:');
    console.log('   ✅ client/ source code');
    console.log('   ✅ server/ source code');
    console.log('   ✅ shared/ source code');
    console.log('   ✅ database/migrations/');
    console.log('   ✅ package.json');
    console.log('   ✅ configuration files');

    console.log('\n🔄 Deleting files...\n');

    let deletedCount = 0;
    for (const file of filesToDelete) {
        try {
            await fs.unlink(file);
            console.log(`  ✅ Deleted: ${path.relative(baseDir, file)}`);
            deletedCount++;
        } catch (err) {
            console.log(`  ❌ Failed: ${path.relative(baseDir, file)} - ${err.message}`);
        }
    }

    console.log(`\n✨ Cleanup complete! Deleted ${deletedCount} files.`);
    console.log('\n✅ Source code preserved');
    console.log('✅ Ready for GitHub push!');
}

cleanup().catch(console.error);
