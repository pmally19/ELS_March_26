import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Get real UI components from the codebase
router.get('/ui-components', async (req, res) => {
  try {
    const components = await scanUIComponents();
    res.json(components);
  } catch (error) {
    console.error('UI components scan error:', error);
    res.status(500).json({ error: 'Failed to scan UI components' });
  }
});

// Get real API endpoints from the codebase
router.get('/api-endpoints', async (req, res) => {
  try {
    const endpoints = await scanAPIEndpoints();
    res.json(endpoints);
  } catch (error) {
    console.error('API endpoints scan error:', error);
    res.status(500).json({ error: 'Failed to scan API endpoints' });
  }
});

// Get complete system architecture including database, UI, and APIs
router.get('/complete-architecture', async (req, res) => {
  try {
    const [uiComponents, apiEndpoints, fileStructure] = await Promise.all([
      scanUIComponents(),
      scanAPIEndpoints(),
      scanFileStructure()
    ]);

    res.json({
      uiComponents,
      apiEndpoints,
      fileStructure,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Complete architecture scan error:', error);
    res.status(500).json({ error: 'Failed to scan complete architecture' });
  }
});

async function scanUIComponents() {
  const components = {
    pages: [],
    reusableComponents: [],
    layouts: [],
    hooks: []
  };

  // Scan pages
  const pagesDir = path.join(process.cwd(), 'client/src/pages');
  if (fs.existsSync(pagesDir)) {
    const pageFiles = fs.readdirSync(pagesDir).filter(file => file.endsWith('.tsx') || file.endsWith('.jsx'));
    
    for (const file of pageFiles) {
      const filePath = path.join(pagesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract component exports and props
      const exportMatch = content.match(/export\s+(?:default\s+)?function\s+(\w+)|export\s+default\s+(\w+)/);
      const propsMatch = content.match(/interface\s+(\w+Props)/);
      const hooksUsed = content.match(/use\w+/g) || [];
      
      components.pages.push({
        name: file.replace(/\.(tsx|jsx)$/, ''),
        file: file,
        path: `/src/pages/${file}`,
        exportName: exportMatch ? (exportMatch[1] || exportMatch[2]) : null,
        propsInterface: propsMatch ? propsMatch[1] : null,
        hooksUsed: [...new Set(hooksUsed)],
        hasRouting: content.includes('useRoute') || content.includes('Route'),
        hasForm: content.includes('useForm') || content.includes('Form'),
        hasAPI: content.includes('fetch') || content.includes('useQuery')
      });
    }
  }

  // Scan reusable components
  const componentsDir = path.join(process.cwd(), 'client/src/components');
  if (fs.existsSync(componentsDir)) {
    const scanDirectory = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relPath = path.join(relativePath, item);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath, relPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const exportMatch = content.match(/export\s+(?:default\s+)?function\s+(\w+)|export\s+default\s+(\w+)/);
          
          components.reusableComponents.push({
            name: item.replace(/\.(tsx|jsx)$/, ''),
            file: item,
            path: `/src/components/${relPath}`,
            directory: relativePath || 'root',
            exportName: exportMatch ? (exportMatch[1] || exportMatch[2]) : null,
            isUIComponent: content.includes('className') || content.includes('styled'),
            hasProps: content.includes('Props') || content.includes('interface')
          });
        }
      });
    };
    scanDirectory(componentsDir);
  }

  // Scan custom hooks
  const hooksDir = path.join(process.cwd(), 'client/src/hooks');
  if (fs.existsSync(hooksDir)) {
    const hookFiles = fs.readdirSync(hooksDir).filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));
    
    for (const file of hookFiles) {
      const filePath = path.join(hooksDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const exportMatch = content.match(/export\s+(?:default\s+)?function\s+(use\w+)/);
      
      components.hooks.push({
        name: file.replace(/\.(ts|tsx)$/, ''),
        file: file,
        path: `/src/hooks/${file}`,
        hookName: exportMatch ? exportMatch[1] : null,
        dependencies: content.match(/from\s+['"`]([^'"`]+)['"`]/g) || []
      });
    }
  }

  return components;
}

async function scanAPIEndpoints() {
  const endpoints = [];
  
  // Scan server routes
  const routesDir = path.join(process.cwd(), 'server/routes');
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    
    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract route definitions with more detail
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const routeMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (routeMatch) {
          const method = routeMatch[1].toUpperCase();
          const path = routeMatch[2];
          
          // Look for comments or middleware
          const prevLine = lines[index - 1] || '';
          const comment = prevLine.match(/\/\/\s*(.+)/) ? prevLine.match(/\/\/\s*(.+)/)[1] : null;
          
          endpoints.push({
            method,
            path,
            file,
            lineNumber: index + 1,
            comment,
            hasAuth: content.includes('auth') || content.includes('authenticate'),
            hasValidation: content.includes('validate') || content.includes('schema'),
            module: file.replace(/(-routes?)?\.ts$/, '').replace(/-/g, '_')
          });
        }
      });
    }
  }
  
  return endpoints;
}

async function scanFileStructure() {
  const structure = {
    client: scanDirectoryStructure(path.join(process.cwd(), 'client')),
    server: scanDirectoryStructure(path.join(process.cwd(), 'server')),
    shared: scanDirectoryStructure(path.join(process.cwd(), 'shared')),
    config: []
  };
  
  // Scan config files
  const configFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', 'tailwind.config.ts'];
  configFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      structure.config.push({
        name: file,
        path: file,
        type: 'config'
      });
    }
  });
  
  return structure;
}

function scanDirectoryStructure(dirPath, maxDepth = 3, currentDepth = 0) {
  if (!fs.existsSync(dirPath) || currentDepth >= maxDepth) {
    return [];
  }
  
  const items = [];
  const dirContents = fs.readdirSync(dirPath);
  
  dirContents.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);
    const relativePath = path.relative(process.cwd(), fullPath);
    
    if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      items.push({
        name: item,
        path: relativePath,
        type: 'directory',
        children: scanDirectoryStructure(fullPath, maxDepth, currentDepth + 1)
      });
    } else if (stats.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
      items.push({
        name: item,
        path: relativePath,
        type: 'file',
        extension: path.extname(item)
      });
    }
  });
  
  return items;
}

export default router;