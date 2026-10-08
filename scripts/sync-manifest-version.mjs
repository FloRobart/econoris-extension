/**
 * Recopie la version de package.json dans public/manifest.json.
 * Appelé automatiquement par `npm version <patch|minor|major>` (script "version" du package.json).
 * Avec `--check`, échoue si les deux versions diffèrent (utilisé par la CI).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = new URL('../public/manifest.json', import.meta.url);
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (process.argv.includes('--check')) {
  if (manifest.version !== version) {
    console.error(`❌ Version du manifest (${manifest.version}) différente de celle du package.json (${version}). Lancez "node scripts/sync-manifest-version.mjs".`);
    process.exit(1);
  }
  console.log(`✅ manifest.json et package.json sont en version ${version}.`);
} else {
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest.json mis à jour en version ${version}.`);
}
