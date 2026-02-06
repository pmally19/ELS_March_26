
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Go up one level from scripts to root, then into server/routes
const searchDir = path.join(process.cwd(), 'server', 'routes');

console.log(`Scanning directory: ${searchDir}`);

const searchTerms = ['router.post', 'router.get', 'insert into goods_receipts', 'receipt'];

function searchFiles(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                searchFiles(filePath);
            } else if (file.endsWith('.ts') || file.endsWith('.js')) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');

                let hasMatch = false;
                const matches = [];

                lines.forEach((line, index) => {
                    const lowerLine = line.toLowerCase();
                    // Look for POST/GET routes that mention 'receipt' OR direct SQL inserts
                    // Or just "goods_receipts" table usage in a route file
                    if (
                        (line.includes('router.post') && lowerLine.includes('receipt')) ||
                        (line.includes('router.get') && lowerLine.includes('receipt')) ||
                        (lowerLine.includes('insert into goods_receipts')) ||
                        (lowerLine.includes('from goods_receipts'))
                    ) {
                        matches.push(`Line ${index + 1}: ${line.trim().substring(0, 100)}...`);
                        hasMatch = true;
                    }
                });

                if (hasMatch) {
                    console.log(`\nFound in: ${filePath}`);
                    matches.forEach(m => console.log(m));
                }
            }
        } catch (err) {
            console.error(`Error reading ${filePath}: ${err.message}`);
        }
    });
}

console.log('Searching for GR logic...');
searchFiles(searchDir);
