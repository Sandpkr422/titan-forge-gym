const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

console.log('Building static distribution to:', distDir);

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy html files
const htmlFiles = ['index.html', 'admin.html'];
for (const file of htmlFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, path.join(distDir, file));
    console.log(`✓ Copied ${file}`);
  }
}

// Copy directories
const folders = ['css', 'js', 'assets', 'gyms'];
for (const folder of folders) {
  const src = path.join(rootDir, folder);
  const dest = path.join(distDir, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied ${folder}/ -> dist/${folder}/`);
  }
}

// Copy vercel.json
if (fs.existsSync(path.join(rootDir, 'vercel.json'))) {
  fs.copyFileSync(path.join(rootDir, 'vercel.json'), path.join(distDir, 'vercel.json'));
}

// Generate static HTML entrypoints for every gym in gyms/
const gymsDir = path.join(rootDir, 'gyms');
if (fs.existsSync(gymsDir)) {
  const gymFiles = fs.readdirSync(gymsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'));
  gymFiles.forEach(file => {
    const slug = path.basename(file, '.json');
    const slugDir = path.join(distDir, 'gym', slug);
    if (!fs.existsSync(slugDir)) {
      fs.mkdirSync(slugDir, { recursive: true });
    }
    fs.writeFileSync(path.join(slugDir, 'index.html'), indexContent);
    console.log(`✓ Generated static page for /gym/${slug}`);
  });
}

console.log('Build completed successfully! All assets, styles, and scripts bundled into dist.');
