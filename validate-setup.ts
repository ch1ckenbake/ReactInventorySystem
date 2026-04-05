#!/usr/bin/env node

/**
 * Environment Setup Validator
 * Checks if all required environment variables and dependencies are configured
 * Usage: npx tsx validate-setup.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const required = [
  'VITE_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const warnings: string[] = [];
const errors: string[] = [];
const info: string[] = [];

console.log('🔍 Validating React Inventory System Setup\n');

// Check .env file exists
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath) && !fs.existsSync(envLocalPath)) {
  errors.push('.env or .env.local file not found');
} else {
  info.push(`.env file found: ${fs.existsSync(envPath) ? '.env' : '.env.local'}`);
}

// Read environment variables
const envContent = fs.existsSync(envPath) 
  ? fs.readFileSync(envPath, 'utf-8')
  : fs.existsSync(envLocalPath)
  ? fs.readFileSync(envLocalPath, 'utf-8')
  : '';

// Parse .env file
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const [, key, value] = match;
    envVars[key.trim()] = value.trim();
  }
});

// Check required variables
console.log('📋 Required Environment Variables:\n');
required.forEach(varName => {
  const value = envVars[varName];
  if (!value) {
    errors.push(`${varName} is not set`);
    console.log(`❌ ${varName}: NOT SET`);
  } else if (value.includes('your_') || value === 'YOUR_PLACEHOLDER' || value.startsWith('PLACEHOLDER')) {
    warnings.push(`${varName} appears to be a placeholder value`);
    console.log(`⚠️  ${varName}: Placeholder value (needs real credentials)`);
  } else if (value.length < 10) {
    warnings.push(`${varName} might be too short`);
    console.log(`⚠️  ${varName}: Might be incomplete`);
  } else {
    console.log(`✅ ${varName}: Set`);
  }
});

// Check package.json dependencies
console.log('\n📦 Checking Dependencies:\n');
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const requiredDeps = [
    '@supabase/supabase-js',
    '@react-oauth/google',
    '@vercel/node',
    'react',
    'vite'
  ];
  
  requiredDeps.forEach(dep => {
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (allDeps[dep]) {
      console.log(`✅ ${dep}: ${allDeps[dep]}`);
    } else {
      errors.push(`${dep} not found in package.json`);
      console.log(`❌ ${dep}: NOT FOUND`);
    }
  });
} else {
  errors.push('package.json not found');
}

// Check API files
console.log('\n🔌 Checking API Routes:\n');
const apiDir = path.join(process.cwd(), 'api');
if (fs.existsSync(apiDir)) {
  console.log(`✅ API directory exists`);
  const routes = ['inventory', 'categories', 'varieties', 'packaging', 'auth'];
  routes.forEach(route => {
    const routePath = path.join(apiDir, route);
    if (fs.existsSync(routePath)) {
      console.log(`  ✅ /api/${route}`);
    } else {
      warnings.push(`/api/${route} endpoint might be missing`);
      console.log(`  ⚠️  /api/${route} might be missing`);
    }
  });
} else {
  errors.push('api/ directory not found');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 SUMMARY\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Your setup looks good.');
  console.log('\nNext steps:');
  console.log('  1. npm install');
  console.log('  2. npm run dev');
  console.log('  3. Visit http://localhost:5173');
} else {
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} ERROR(S):`);
    errors.forEach(err => console.log(`   • ${err}`));
    console.log('');
  }
  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} WARNING(S):`);
    warnings.forEach(warn => console.log(`   • ${warn}`));
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('🔧 FIXES NEEDED:');
    console.log('  1. Copy .env.example to .env.local');
    console.log('  2. Fill in your actual credentials');
    console.log('  3. See setup guides in the documentation');
    process.exit(1);
  }
}

console.log('\n' + '='.repeat(50) + '\n');
