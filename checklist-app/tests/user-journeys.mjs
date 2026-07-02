// Minimal clean user-journeys runner
// Usage: node tests/user-journeys.mjs

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

const cleanup = { users: [], templates: [], groups: [], instances: [], actions: [] };
let pass = 0, fail = 0;

function ok(msg) { pass++; console.log('  ✅', msg); }
function err(msg, detail='') { fail++; console.log('  ❌', msg, detail); }

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, { method: opts.method || 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  let json = null; try { json = await res.json(); } catch {};
  return { status: res.status, json, headers: res.headers };
}

async function login(email, password) {
  const r = await req('/api/auth/login', { method: 'POST', body: { email, password } });
  if (r.status !== 200) throw new Error('login failed ' + r.status);
  const m = (r.headers.get('set-cookie') || '').match(/session_token=([^;]+)/);
  return { token: m ? m[1] : null, user: r.json?.user };
}

const uniqueEmail = (p) => `${p}+${Date.now()}+${Math.floor(Math.random()*1e6)}@test.local`;

async function run() {
  console.log('\nUser journeys runner → ' + BASE + '\n');
  let adminToken;
  try { ({ token: adminToken } = await login(ADMIN_EMAIL, ADMIN_PASSWORD)); ok('admin login'); }
  catch (e) { err('admin login', e.message); return finish(); }

  // Create worker
  const workerEmail = uniqueEmail('worker');
  let r = await req('/api/users', { method: 'POST', token: adminToken, body: { email: workerEmail, password: 'WorkerPass1!', role: 'USER' } });
  if (r.status === 201 && r.json?.user?.id) { cleanup.users.push(r.json.user.id); ok('create worker'); } else err('create worker', `status ${r.status}`);

  // Create group
  r = await req('/api/groups', { method: 'POST', token: adminToken, body: { name: 'JourneyGrp', description: 'test', type: 'CUSTOM' } });
  const groupId = r.json?.group?.id; if (r.status === 201 && groupId) { cleanup.groups.push(groupId); ok('create group'); } else err('create group', `status ${r.status}`);

  // Create template
  r = await req('/api/templates', { method: 'POST', token: adminToken, body: { name: 'JourneyTpl', isActive: true, defaultRoutingGroupId: groupId } });
  const templateId = r.json?.template?.id; if (r.status === 201 && templateId) { cleanup.templates.push(templateId); ok('create template'); } else err('create template', `status ${r.status}`);

  // Add nodes
  r = await req(`/api/templates/${templateId}/nodes`, { method: 'POST', token: adminToken, body: { title: 'Q1', nodeType: 'QUESTION', inputType: 'yes_no', isRequired: true } });
  const n1 = r.json?.node?.id; if (n1) ok('add node Q1'); else err('add node Q1', `status ${r.status}`);
  r = await req(`/api/templates/${templateId}/nodes`, { method: 'POST', token: adminToken, body: { title: 'Q2', nodeType: 'QUESTION', inputType: 'yes_no', isRequired: true } });
  const n2 = r.json?.node?.id; if (n2) ok('add node Q2'); else err('add node Q2', `status ${r.status}`);

  // Create instance
  r = await req('/api/instances', { method: 'POST', token: adminToken, body: { templateId, assignedToUserId: cleanup.users[0] } });
  const instanceId = r.json?.instance?.id; if (r.status === 201 && instanceId) { cleanup.instances.push(instanceId); ok('create instance'); } else err('create instance', `status ${r.status}`);

  // Save responses
  r = await req(`/api/instances/${instanceId}/responses`, { method: 'PUT', token: adminToken, body: { responses: [{ nodeId: n1, value: 'yes' }, { nodeId: n2, value: 'no' }] } });
  if (r.status === 200) ok('save responses'); else err('save responses', `status ${r.status}`);

  // Submit
  r = await req(`/api/instances/${instanceId}/submit`, { method: 'POST', token: adminToken, body: {} });
  if (r.status === 200 && r.json?.instance?.status === 'SUBMITTED') ok('submit instance'); else err('submit instance', `status ${r.status}`);

  // Approve
  r = await req(`/api/instances/${instanceId}/approve`, { method: 'POST', token: adminToken, body: { comments: 'ok' } });
  if (r.status === 200 && r.json?.instance?.status === 'APPROVED') ok('approve instance'); else err('approve instance', `status ${r.status}`);

  // Create corrective action
  r = await req('/api/actions', { method: 'POST', token: adminToken, body: { instanceId, title: 'Fix', description: 'Fix it', priority: 'HIGH', assignedToUserId: cleanup.users[0] } });
  if (r.status === 201 && r.json?.action?.id) { cleanup.actions.push(r.json.action.id); ok('create action'); } else err('create action', `status ${r.status}`);

  return finish();
}

async function finish() {
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log('Cleaning up (best-effort)...');
  try {
    const { token } = await login(ADMIN_EMAIL, ADMIN_PASSWORD).catch(() => ({ token: null }));
    if (token) {
      for (const id of cleanup.instances) await req(`/api/instances/${id}`, { method: 'DELETE', token }).catch(()=>{});
      for (const id of cleanup.templates) await req(`/api/templates/${id}`, { method: 'DELETE', token }).catch(()=>{});
      for (const id of cleanup.groups) await req(`/api/groups/${id}`, { method: 'DELETE', token }).catch(()=>{});
      for (const id of cleanup.users) await req(`/api/users/${id}`, { method: 'DELETE', token }).catch(()=>{});
    }
  } catch (e) {}
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(async (e) => { console.error('Fatal:', e); await finish(); });
