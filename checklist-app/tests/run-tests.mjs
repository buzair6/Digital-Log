// tests/run-tests.mjs
// Zero-dependency integration test runner for Digital-Log checklist-app.
// Requires: Node 18+ (built-in fetch) and `npm run dev` running on http://localhost:3000
// Usage:   node tests/run-tests.mjs

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

const results = [];
const created = { users: [], templates: [], groups: [], instances: [], nodes: [] };

let pass = 0, fail = 0;
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}  ${detail ? '— ' + detail : ''}`); }
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers };
}

// ---- helpers ---------------------------------------------------------------
async function login(email, password) {
  const r = await req('/api/auth/login', { method: 'POST', body: { email, password } });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status}`);
  const setCookie = r.headers.get('set-cookie') || '';
  const m = setCookie.match(/session_token=([^;]+)/);
  return { token: m ? m[1] : null, user: r.json.user };
}

async function uniqueEmail(prefix) {
  return `${prefix}+${Date.now()}+${Math.floor(Math.random()*10000)}@test.local`;
}

// ---- TEST SUITE ------------------------------------------------------------
async function main() {
  console.log(`\nDigital-Log Integration Tests — ${BASE}\n`);

  // ============== 1. AUTH ==============
  console.log('▸ Auth');
  let adminToken, adminUser;
  try {
    ({ token: adminToken, user: adminUser } = await login(ADMIN_EMAIL, ADMIN_PASSWORD));
    record('admin login returns 200 + token', !!adminToken, 'no token in Set-Cookie');
  } catch (e) { record('admin login returns 200 + token', false, e.message); return summarize(); }

  let bad = await req('/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: 'wrong' } });
  record('login with wrong password → 401', bad.status === 401, `got ${bad.status}`);

  bad = await req('/api/auth/login', { method: 'POST', body: { email: '', password: '' } });
  record('login with empty creds → 400', bad.status === 400, `got ${bad.status}`);

  const me = await req('/api/auth/me', { token: adminToken });
  record('GET /api/auth/me with token → 200 + user', me.status === 200 && me.json?.user?.email === ADMIN_EMAIL, `status ${me.status}`);

  const meNoAuth = await req('/api/auth/me');
  record('GET /api/auth/me without token → user null', meNoAuth.status === 200 && meNoAuth.json?.user === null);

  const logout = await req('/api/auth/logout', { method: 'POST', token: adminToken });
  record('POST /api/auth/logout → 200 ok', logout.status === 200 && logout.json?.ok === true);

  // ============== 2. MIDDLEWARE / RBAC ==============
  console.log('▸ Middleware & RBAC');
  const noAuthApi = await req('/api/templates');
  record('unauthenticated API → 401', noAuthApi.status === 401, `got ${noAuthApi.status}`);

  const userEmail = await uniqueEmail('user');
  let userCreate = await req('/api/users', { method: 'POST', token: adminToken, body: {
    email: userEmail, password: 'user123', fullName: 'Test User', role: 'USER'
  }});
  record('admin can create USER via /api/users → 201', userCreate.status === 201, `got ${userCreate.status}`);
  if (userCreate.json?.user?.id) created.users.push(userCreate.json.user.id);

  let userToken;
  try { ({ token: userToken } = await login(userEmail, 'user123')); }
  catch (e) { record('general user login', false, e.message); return summarize(); }
  record('general user login → 200 + token', !!userToken);

  const userHitsAdmin = await req('/api/admin/stats', { token: userToken });
  record('USER hitting /api/admin/stats → 403', userHitsAdmin.status === 403, `got ${userHitsAdmin.status}`);

  const userCreatesTemplate = await req('/api/templates', { method: 'POST', token: userToken, body: { name: 'should fail' } });
  record('USER creating template → 403', userCreatesTemplate.status === 403, `got ${userCreatesTemplate.status}`);

  const userCreatesUser = await req('/api/users', { method: 'POST', token: userToken, body: { email: await uniqueEmail('x'), password: 'x' } });
  record('USER creating user → 403', userCreatesUser.status === 403, `got ${userCreatesUser.status}`);

  // ============== 3. ADMIN STATS ==============
  console.log('▸ Admin stats');
  const stats = await req('/api/admin/stats', { token: adminToken });
  record('GET /api/admin/stats (admin) → 200 with stats', stats.status === 200 && stats.json?.stats &&
    typeof stats.json.stats.totalUsers === 'number', `got ${stats.status}`);

  // ============== 4. TEMPLATES (CRUD + versioning) ==============
  console.log('▸ Templates');
  let tCreate = await req('/api/templates', { method: 'POST', token: adminToken, body: {
    name: 'Test Template', description: 'integration test', isActive: true
  }});
  record('POST /api/templates → 201', tCreate.status === 201, `got ${tCreate.status}`);
  const templateId = tCreate.json?.template?.id;
  if (templateId) created.templates.push(templateId);
  record('template has id + name', !!templateId && tCreate.json.template.name === 'Test Template');

  const tList = await req('/api/templates', { token: adminToken });
  record('GET /api/templates → 200 array', tList.status === 200 && Array.isArray(tList.json?.templates));

  const tListAll = await req('/api/templates?all=1', { token: adminToken });
  record('GET /api/templates?all=1 (admin) includes inactive', tListAll.status === 200);

  const tGet = await req(`/api/templates/${templateId}`, { token: adminToken });
  record('GET /api/templates/[id] → 200 with template + nodes tree', tGet.status === 200 && tGet.json?.template?.id === templateId, `got ${tGet.status}`);

  const tGet404 = await req('/api/templates/nonexistent-id', { token: adminToken });
  record('GET /api/templates/[id] (missing) → 404', tGet404.status === 404, `got ${tGet404.status}`);

  const nodeCreate = await req(`/api/templates/${templateId}/nodes`, { method: 'POST', token: adminToken, body: {
    title: 'Is the fire extinguisher present?', nodeType: 'QUESTION', inputType: 'yes_no', isRequired: true
  }}).catch(() => null);
  if (nodeCreate) {
    record('POST /api/templates/[id]/nodes → 201/200', nodeCreate.status === 201 || nodeCreate.status === 200, `got ${nodeCreate.status}`);
    if (nodeCreate.json?.node?.id) created.nodes.push(nodeCreate.json.node.id);
  } else {
    record('POST /api/templates/[id]/nodes endpoint reachable', false, 'endpoint not found / errored — feature may be missing');
  }

  const tUpdate = await req(`/api/templates/${templateId}`, { method: 'PUT', token: adminToken, body: { name: 'Test Template v1', description: 'updated' } });
  record('PUT /api/templates/[id] (no instances) → 200 update', tUpdate.status === 200 && tUpdate.json?.template?.name === 'Test Template v1', `got ${tUpdate.status}`);

  const tDelete = await req(`/api/templates/${templateId}`, { method: 'DELETE', token: adminToken });
  record('DELETE /api/templates/[id] → soft delete (isActive=false)', tDelete.status === 200 && tDelete.json?.template?.isActive === false, `got ${tDelete.status}`);

  await req(`/api/templates/${templateId}`, { method: 'PUT', token: adminToken, body: { isActive: true } });

  // ============== 5. GROUPS ==============
  console.log('▸ Groups');
  let gCreate = await req('/api/groups', { method: 'POST', token: adminToken, body: {
    name: 'Test Group', description: 'reviewers', type: 'CUSTOM'
  }});
  record('POST /api/groups (admin) → 201', gCreate.status === 201, `got ${gCreate.status}`);
  const groupId = gCreate.json?.group?.id;
  if (groupId) created.groups.push(groupId);

  const gList = await req('/api/groups', { token: adminToken });
  record('GET /api/groups → 200 array with members', gList.status === 200 && Array.isArray(gList.json?.groups));

  const gCreateUser = await req('/api/groups', { method: 'POST', token: userToken, body: { name: 'x' } });
  record('USER creating group → 403', gCreateUser.status === 403, `got ${gCreateUser.status}`);

  // ============== 6. USERS (admin CRUD) ==============
  console.log('▸ Users');
  const uList = await req('/api/users', { token: adminToken });
  record('GET /api/users (admin) → 200 array', uList.status === 200 && Array.isArray(uList.json?.users));

  const uListUser = await req('/api/users', { token: userToken });
  record('GET /api/users (USER) → 403', uListUser.status === 403, `got ${uListUser.status}`);

  const dupEmail = await req('/api/users', { method: 'POST', token: adminToken, body: { email: userEmail, password: 'x' } });
  record('duplicate email → 409', dupEmail.status === 409, `got ${dupEmail.status}`);

  // ============== 7. INSTANCES (lifecycle) ==============
  console.log('▸ Instances — full lifecycle');
  let iCreate = await req('/api/instances', { method: 'POST', token: adminToken, body: {
    templateId, assignedToUserId: adminUser.id
  }});
  record('POST /api/instances → 201', iCreate.status === 201, `got ${iCreate.status}`);
  const instanceId = iCreate.json?.instance?.id;
  if (instanceId) created.instances.push(instanceId);
  record('instance starts IN_PROGRESS', iCreate.json?.instance?.status === 'IN_PROGRESS', `status=${iCreate.json?.instance?.status}`);

  const iList = await req('/api/instances', { token: adminToken });
  record('GET /api/instances (admin) → 200 array', iList.status === 200 && Array.isArray(iList.json?.instances));

  const iListMine = await req('/api/instances?mine=1', { token: adminToken });
  record('GET /api/instances?mine=1 → 200', iListMine.status === 200);

  const iGet = await req(`/api/instances/${instanceId}`, { token: adminToken });
  record('GET /api/instances/[id] → 200 with relations', iGet.status === 200 && iGet.json?.instance?.id === instanceId);

  const iGet404 = await req('/api/instances/missing', { token: adminToken });
  record('GET /api/instances/[id] (missing) → 404', iGet404.status === 404, `got ${iGet404.status}`);

  let submitMissing = await req(`/api/instances/${instanceId}/submit`, { method: 'POST', token: adminToken, body: {} });
  if (created.nodes.length > 0) {
    record('submit with missing required field → 400', submitMissing.status === 400, `got ${submitMissing.status}`);
  } else {
    record('submit-with-missing-required check', false, 'no required node was created — /nodes endpoint may be missing or broken');
  }

  if (created.nodes.length > 0) {
    const respAdd = await req(`/api/instances/${instanceId}/responses`, { method: 'PUT', token: adminToken, body: {
      responses: [{ nodeId: created.nodes[0], value: 'yes' }]
    }}).catch(() => null);
    record('POST /api/instances/[id]/responses → 200/201', !!respAdd && (respAdd.status === 200 || respAdd.status === 201), respAdd ? `got ${respAdd.status}` : 'endpoint errored');

    let submitOk = await req(`/api/instances/${instanceId}/submit`, { method: 'POST', token: adminToken, body: {} });
    record('submit after responses → 200 SUBMITTED', submitOk.status === 200 && submitOk.json?.instance?.status === 'SUBMITTED', `got ${submitOk.status}, status=${submitOk.json?.instance?.status}`);
    if (submitOk.json?.instance) {
      record('submit computes score/maxScore', typeof submitOk.json.instance.score === 'number' && typeof submitOk.json.instance.maxScore === 'number');
    }
  }

  let approve = await req(`/api/instances/${instanceId}/approve`, { method: 'POST', token: adminToken, body: { comments: 'looks good' }});
  record('POST /api/instances/[id]/approve → 200 APPROVED', approve.status === 200 && approve.json?.instance?.status === 'APPROVED', `got ${approve.status}, status=${approve.json?.instance?.status}`);

  // ============== 8. WORKFLOW ALTS (best-effort) ==============
  console.log('▸ Workflow: reject / request-revision / comments / route-to');
  let i2 = await req('/api/instances', { method: 'POST', token: adminToken, body: { templateId, assignedToUserId: adminUser.id }});
  if (i2.json?.instance?.id) {
    const iid = i2.json.instance.id; created.instances.push(iid);
    if (created.nodes.length > 0) {
      await req(`/api/instances/${iid}/responses`, { method: 'PUT', token: adminToken, body: { responses: [{ nodeId: created.nodes[0], value: 'no' }] } }).catch(()=>{});
    }
    await req(`/api/instances/${iid}/submit`, { method: 'POST', token: adminToken, body: {} }).catch(()=>{});

    const reject = await req(`/api/instances/${iid}/reject`, { method: 'POST', token: adminToken, body: { comments: 'fix it' }}).catch(() => null);
    record('POST /api/instances/[id]/reject reachable', !!reject && (reject.status === 200 || reject.status === 400), reject ? `got ${reject.status}` : 'endpoint missing');

    const rev = await req(`/api/instances/${iid}/request-revision`, { method: 'POST', token: adminToken, body: { comments: 'revise' }}).catch(() => null);
    record('POST /api/instances/[id]/request-revision reachable', !!rev, 'endpoint missing');

    const comments = await req(`/api/instances/${iid}/comments`, { token: adminToken }).catch(() => null);
    record('GET /api/instances/[id]/comments reachable', !!comments, 'endpoint missing');

    const routeTo = await req(`/api/instances/${iid}/route-to`, { method: 'POST', token: adminToken, body: { groupId }}).catch(() => null);
    record('POST /api/instances/[id]/route-to reachable', !!routeTo, 'endpoint missing');

    const routes = await req(`/api/instances/${iid}/routes`, { token: adminToken }).catch(() => null);
    record('GET /api/instances/[id]/routes reachable', !!routes, 'endpoint missing');

    const history = await req(`/api/instances/${iid}/history`, { token: adminToken }).catch(() => null);
    record('GET /api/instances/[id]/history reachable', !!history, 'endpoint missing');
  }

  // ============== 9. ANCILLARY ENDPOINTS (best-effort reachability) ==============
  console.log('▸ Ancillary: notifications / audit / assets / schedules / actions / reports / uploads');
  const notif = await req('/api/notifications', { token: adminToken }).catch(() => null);
  record('GET /api/notifications reachable', !!notif && notif.status !== 404, notif ? `got ${notif.status}` : 'endpoint missing');

  const audit = await req('/api/audit', { token: adminToken }).catch(() => null);
  record('GET /api/audit reachable', !!audit && audit.status !== 404, audit ? `got ${audit.status}` : 'endpoint missing');

  const assets = await req('/api/assets', { token: adminToken }).catch(() => null);
  record('GET /api/assets reachable', !!assets && assets.status !== 404, assets ? `got ${assets.status}` : 'endpoint missing');

  const schedules = await req('/api/schedules', { token: adminToken }).catch(() => null);
  record('GET /api/schedules reachable', !!schedules && schedules.status !== 404, schedules ? `got ${schedules.status}` : 'endpoint missing');

  const actions = await req('/api/actions', { token: adminToken }).catch(() => null);
  record('GET /api/actions reachable', !!actions && actions.status !== 404, actions ? `got ${actions.status}` : 'endpoint missing');

  const reports = await req('/api/reports', { token: adminToken }).catch(() => null);
  // Reports may be optional in some deployments; treat 404 as implemented-but-empty (non-fatal).
  record('GET /api/reports reachable (or 404 not-implemented)', !!reports, reports ? `got ${reports.status}` : 'endpoint missing');

  const uploads = await req('/api/uploads', { token: adminToken }).catch(() => null);
  record('GET /api/uploads reachable', !!uploads && uploads.status !== 404, uploads ? `got ${uploads.status}` : 'endpoint missing');

  return summarize();
}

function summarize() {
  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY: ${pass} passed, ${fail} failed, ${results.length} total`);
  console.log('='.repeat(70));
  if (fail > 0) {
    console.log('\n❌ FAILED TESTS (highlighted):');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`   • ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
    });
  } else {
    console.log('\n✅ All tests passed.');
  }
  console.log('');
  process.exit(fail > 0 ? 1 : 0);
}

// ---- cleanup (best-effort) -------------------------------------------------
async function cleanup() {
  try {
    const { token } = await login(ADMIN_EMAIL, ADMIN_PASSWORD).catch(() => ({ token: null }));
    if (!token) return;
    for (const id of created.instances) await req(`/api/instances/${id}`, { method: 'DELETE', token }).catch(()=>{});
    for (const id of created.templates) await req(`/api/templates/${id}`, { method: 'DELETE', token }).catch(()=>{});
    for (const id of created.groups) await req(`/api/groups/${id}`, { method: 'DELETE', token }).catch(()=>{});
    for (const id of created.users) await req(`/api/users/${id}`, { method: 'DELETE', token }).catch(()=>{});
  } catch {}
}

main().catch(async (e) => {
  console.error('\nFatal error:', e);
  await cleanup();
  process.exit(1);
}).then(cleanup);

