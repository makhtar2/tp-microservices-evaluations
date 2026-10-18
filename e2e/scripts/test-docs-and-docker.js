const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

console.log('====================================================');
console.log('🧪 SUITE DE TESTS : DOCUMENTATION & CONTENEURISATION');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.log(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

const ROOT = path.resolve(__dirname, '../..');
const SERVICES = [
  'api-gateway',
  'user-service',
  'question-service',
  'assessment-service',
  'submission-service',
  'grading-service',
  'notification-service',
  'frontend',
];

// =========================================================================
// PARTIE 1 : TESTS DE LA DOCUMENTATION TECHNIQUE
// =========================================================================
console.log('--- 1. TESTS DE LA DOCUMENTATION TECHNIQUE ---');

// 1.1 Présence des README
const README_FILES = [
  'README.md',
  ...SERVICES.map((s) => `${s}/README.md`),
];

for (const relPath of README_FILES) {
  const fullPath = path.join(ROOT, relPath);
  const exists = fs.existsSync(fullPath);
  assert(exists, `README présent : ${relPath}`);
  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(content.length > 500, `Contenu détaillé (> 500 car.) : ${relPath}`, `${content.length} car.`);
  }
}

// 1.2 Vérification des sections obligatoires dans le README racine
const rootReadme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const expectedRootSections = [
  'Responsable',
  'Vue d\'Ensemble des Services',
  'Dépendances et Prérequis',
  'Matrice des Ports',
  'Comptes de Test',
  'Guide d\'Installation et de Démarrage',
  'Synthèse des API Principales',
  'Saga Métier',
];
for (const sec of expectedRootSections) {
  assert(rootReadme.includes(sec), `README racine inclut la section : "${sec}"`);
}

// 1.3 Vérification des comptes de test dans la doc
const expectedAccounts = [
  'admin@evaluations.local',
  'enseignant@evaluations.local',
  'etudiant@evaluations.local',
];
for (const acc of expectedAccounts) {
  assert(rootReadme.includes(acc), `README documente le compte de test : ${acc}`);
}

// 1.4 Vérification des ports documentés
const expectedPorts = ['3000', '3001', '3002', '3003', '3004', '3005', '50052', '5173', '5672', '15672'];
for (const p of expectedPorts) {
  assert(rootReadme.includes(p), `README documente le port : ${p}`);
}

// 1.5 Vérification des liens relatifs dans les README
console.log('\n--- 2. TESTS DES LIENS RELATIFS DE DOCUMENTATION ---');
for (const relPath of README_FILES) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');
  const baseDir = path.dirname(fullPath);
  
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.(?:md|proto|yaml|js))\)/g;
  let match;
  let linksChecked = 0;
  let linksValid = true;

  while ((match = linkRegex.exec(content)) !== null) {
    const target = match[2];
    if (target.startsWith('http://') || target.startsWith('https://')) continue;
    const targetPath = path.resolve(baseDir, target.split('#')[0]);
    if (!fs.existsSync(targetPath)) {
      linksValid = false;
      console.log(`     ⚠️ Lien rompu dans ${relPath} -> ${target}`);
    }
    linksChecked++;
  }
  if (linksChecked > 0) {
    assert(linksValid, `Liens internes valides dans ${relPath} (${linksChecked} vérifiés)`);
  }
}

// =========================================================================
// PARTIE 2 : TESTS DE LA CONTENEURISATION DES SERVICES
// =========================================================================
console.log('\n--- 3. TESTS DE LA CONTENEURISATION (DOCKERFILES) ---');

// 2.1 Présence et validité de chaque Dockerfile
for (const service of SERVICES) {
  const dockerfilePath = path.join(ROOT, service, 'Dockerfile');
  const exists = fs.existsSync(dockerfilePath);
  assert(exists, `Dockerfile présent pour : ${service}`);
  if (exists) {
    const content = fs.readFileSync(dockerfilePath, 'utf8');
    assert(content.includes('FROM '), `Dockerfile a une directive FROM : ${service}`);
    assert(content.includes('WORKDIR '), `Dockerfile définit un WORKDIR : ${service}`);
    assert(content.includes('COPY '), `Dockerfile copie les sources : ${service}`);
    assert(content.includes('CMD ') || content.includes('ENTRYPOINT '), `Dockerfile définit CMD/ENTRYPOINT : ${service}`);
  }
}

// 2.2 Fichier .dockerignore
const dockerignorePath = path.join(ROOT, '.dockerignore');
assert(fs.existsSync(dockerignorePath), '.dockerignore présent à la racine');
if (fs.existsSync(dockerignorePath)) {
  const content = fs.readFileSync(dockerignorePath, 'utf8');
  assert(content.includes('node_modules'), '.dockerignore exclut node_modules');
  assert(content.includes('.env'), '.dockerignore exclut .env');
  assert(content.includes('.git'), '.dockerignore exclut .git');
}

// =========================================================================
// PARTIE 3 : TESTS DE DOCKER-COMPOSE.YML
// =========================================================================
console.log('\n--- 4. TESTS DU FICHIER DOCKER-COMPOSE.YML ---');

const composePath = path.join(ROOT, 'docker-compose.yml');
assert(fs.existsSync(composePath), 'docker-compose.yml présent');

// Validation avec docker compose config
try {
  execSync('docker compose config --quiet', { cwd: ROOT, stdio: 'pipe' });
  assert(true, 'docker compose config : syntaxe YAML et dépendances 100% valides');
} catch (err) {
  assert(false, 'docker compose config', err.message);
}

// Vérification de la présence de tous les conteneurs requis
const composeContent = fs.readFileSync(composePath, 'utf8');

console.log('\n--- 5. VÉRIFICATION DES SERVICES DOCKER-COMPOSE ---');
const expectedContainers = [
  'rabbitmq',
  'user-db',
  'question-db',
  'assessment-db',
  'submission-db',
  'grading-db',
  'notification-db',
  'user-service',
  'question-service',
  'assessment-service',
  'submission-service',
  'grading-service',
  'notification-service',
  'api-gateway',
  'frontend',
];

for (const container of expectedContainers) {
  assert(composeContent.includes(`${container}:`), `Service présent dans docker-compose : ${container}`);
}

// Vérification des volumes persistants
console.log('\n--- 6. VÉRIFICATION DES VOLUMES PERSISTANTS DOCKER-COMPOSE ---');
const expectedVolumes = [
  'rabbitmq-data',
  'user-db-data',
  'question-db-data',
  'assessment-db-data',
  'submission-db-data',
  'grading-db-data',
  'notification-db-data',
  'submission-uploads',
];

for (const vol of expectedVolumes) {
  assert(composeContent.includes(`${vol}:`), `Volume déclaré : ${vol}`);
}

console.log('\n====================================================');
console.log(`📊 RÉSULTAT : ${passedTests}/${totalTests} tests réussis (${failedTests} échecs)`);
console.log('====================================================');

process.exit(failedTests > 0 ? 1 : 0);
