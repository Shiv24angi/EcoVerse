const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (
      filepath.includes('node_modules') ||
      filepath.includes('.git') ||
      filepath.includes('.next')
    )
      continue;

    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else {
      callback(filepath);
    }
  }
}

walk('.', (filepath) => {
  if (
    filepath.endsWith('.ts') ||
    filepath.endsWith('.tsx') ||
    filepath.endsWith('.js') ||
    filepath.endsWith('.cjs') ||
    filepath.endsWith('.mjs')
  ) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;

    // Fix 1: console.warn -> console.warn
    if (content.includes('console.warn')) {
      content = content.replace(/console\.log/g, 'console.warn');
      changed = true;
    }

    // Fix 2: no-explicit-any -> unknown
    if (content.includes('any')) {
      // Regex to match TypeScript type 'any'
      const newContent = content
        .replace(/:\s*any\b/g, ': unknown')
        .replace(/<\s*any\s*>/g, '<unknown>');
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }

    // Fix 3: require in tailwind.config.ts
    if (filepath.includes('tailwind.config.ts')) {
      if (content.includes("require('tailwindcss-animate')")) {
        content =
          "import tailwindcssAnimate from 'tailwindcss-animate';\n" +
          content.replace(
            /require\('tailwindcss-animate'\)/g,
            'tailwindcssAnimate'
          );
        changed = true;
      }
    }

    // Fix 4: export default array in eslint.config.mjs
    if (filepath.includes('eslint.config.mjs')) {
      if (content.includes('export default [')) {
        content =
          content.replace('export default [', 'const eslintConfig = [') +
          '\nexport default eslintConfig;\n';
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filepath, content, 'utf8');
      console.warn(`Updated ${filepath}`);
    }
  }
});
