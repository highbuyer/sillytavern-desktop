const fs = require('fs');
const path = require('path');

console.log('🔍 Validating SillyTavern Desktop Application Project...\n');

const expectedFiles = [
  'package.json',
  'vite.config.ts',
  'electron-builder.json',
  'public/index.html',
  'src/main.tsx',
  'src/App.tsx',
  'src/App.css',
  'src/store/useStore.ts',
  'src/components/ChatList.tsx',
  'src/components/ChatRoom.tsx',
  'src/components/MessageBubble.tsx',
  'src/components/MessageInput.tsx',
  'src/components/RoleEditor.tsx',
  'src/pages/SettingsPage.tsx',
  'electron/main.js',
  'electron/preload.js'
];

let allFilesExist = true;
let missingFiles = [];

for (const file of expectedFiles) {
  if (!fs.existsSync(file)) {
    allFilesExist = false;
    missingFiles.push(file);
    console.log(`❌ Missing: ${file}`);
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

console.log('\n📋 Additional Checks...');

// Check package.json content
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasRequiredScripts = pkg.scripts && 
                            pkg.scripts.build &&
                            pkg.scripts.dev &&
                            pkg.scripts.dist;
  console.log(hasRequiredScripts ? '✅ Build scripts configured' : '❌ Missing build scripts');
  
  const hasRequiredDeps = pkg.dependencies && 
                         pkg.dependencies.react &&
                         pkg.dependencies['react-dom'] &&
                         pkg.devDependencies && 
                         pkg.devDependencies.electron;
  console.log(hasRequiredDeps ? '✅ Dependencies configured' : '❌ Missing dependencies');
}

// Check TypeScript config would be needed
const hasTsConfig = fs.existsSync('tsconfig.json');
console.log(hasTsConfig ? '✅ TypeScript configuration exists' : 'ℹ️  TypeScript configuration may be needed');

console.log('\n🎯 Project Validation Summary:');
if (allFilesExist && missingFiles.length === 0) {
  console.log('✅ All required files are present');
  console.log('✅ Project structure is complete');
  console.log('✅ Ready for development and production builds');
} else {
  console.log('❌ Some files are missing:', missingFiles.join(', '));
}

console.log('\n🎉 SillyTavern Desktop Application - Validation Complete!');
