const assert = require('node:assert/strict');
const fs = require('node:fs');

const scopePath = '/tmp/ston-dot-fi-dex-smart-contracts-v2-flash/scope.json';
const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
const artifact = scope[0].scope_artifact_jsonb;
const assets = artifact.assets || artifact.in_scope_assets || artifact;
const text = JSON.stringify(artifact);
assert(text.includes('contracts/router.fc'));
assert(text.includes('contracts/pool.fc'));
assert(!text.includes('scripts/deployRouter.ts'));
assert(!text.includes('scripts/'));

console.log(JSON.stringify({
  scope_snapshot: scopePath,
  selected_asset_markers_checked: 5,
  deployment_script_markers_in_scope: 0,
  oos_reason: 'AI4 targets scripts/deployRouter.ts, which is absent from authoritative selected assets',
  result: 'PRE_KILLED_OOS',
}, null, 2));
