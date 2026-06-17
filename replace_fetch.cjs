const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  if (file.includes('utils/api.ts')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if fetch is used
  if (content.includes('fetch(') || content.includes('fetch (')) {
    // Replace fetch( with apiFetch(
    content = content.replace(/\bfetch\s*\(/g, 'apiFetch(');
    
    // Add import if not present
    if (!content.includes('import { apiFetch }')) {
      // Calculate relative path to src/utils/api.ts
      const dir = path.dirname(file);
      let relativePath = path.relative(dir, './src/utils/api');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      // Replace backslashes with forward slashes for Windows compatibility (though we are on Linux)
      relativePath = relativePath.replace(/\\/g, '/');
      
      const importStatement = `import { apiFetch } from '${relativePath}';\n`;
      content = importStatement + content;
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
