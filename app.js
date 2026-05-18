// ===== CONSTANTS & STATE =====
const SUPABASE_URL =
'https://nidpucteliuhybjfzqwv.supabase.co';

const SUPABASE_ANON_KEY =
'sb_publishable_okrQaDIABMWFukv5L-S_Wg_gE7OlnLU';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
const ADMIN_EMAIL = 'lukeferrer11@gmail.com';
const ADMIN_PASS = 'lf3517lf';

// Input sanitization
function clean(s) {
  if (s === null || s === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().slice(0, 10); }
function todayDisplay() { return new Date().toLocaleDateString('ca', { weekday:'long', year:'numeric', month:'long', day:'numeric' }); }
function calcAge(birth) {
  if (!birth) return '-';
  const b = new Date(birth), now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

let state = {
  users: JSON.parse(localStorage.getItem('cp_users') || 'null') || [
    { id:'admin', email:ADMIN_EMAIL, pass:ADMIN_PASS, role:'admin', nom:'Luka', cognoms:'Ferrer', tel:'000' }
  ],
  courses:    JSON.parse(localStorage.getItem('cp_courses')    || '[]'),
  groups:     JSON.parse(localStorage.getItem('cp_groups')     || '[]'),
  finances:   JSON.parse(localStorage.getItem('cp_finances')   || '[]'),
  events:     JSON.parse(localStorage.getItem('cp_events')     || '[]'),
  attendance: JSON.parse(localStorage.getItem('cp_attendance') || '{}'),
  notes:      JSON.parse(localStorage.getItem('cp_notes')      || '{}')
};

let currentUser = null;
let activeGroup = null;
let calendar = null;
let editingUserIdx = null;
let editingCourseIdx = null;
let editingGroupIdx = null;
let editingEventId = null;

function save() {
  try {
    localStorage.setItem('cp_users',      JSON.stringify(state.users));
    localStorage.setItem('cp_courses',    JSON.stringify(state.courses));
    localStorage.setItem('cp_groups',     JSON.stringify(state.groups));
    localStorage.setItem('cp_finances',   JSON.stringify(state.finances));
    localStorage.setItem('cp_events',     JSON.stringify(state.events));
    localStorage.setItem('cp_attendance', JSON.stringify(state.attendance));
    localStorage.setItem('cp_notes',      JSON.stringify(state.notes));
  } catch(e) { console.error('Error guardant dades:', e); }
}

// ===== LOGIN =====
document.getElementById('loginBtn').onclick = doLogin;
document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {

  const email =
    document.getElementById('loginEmail').value;

  const password =
    document.getElementById('loginPassword').value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    alert('Login incorrecte');
    return;
  }

  currentUser = {
    email: data.user.email,
    role: 'admin'
  };

  document
    .getElementById('loginPage')
    .classList.add('hidden');

  document
    .getElementById('app')
    .classList.remove('hidden');

navigate('dashboard');
}

function startSession(u)
  currentUser = u;
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('roleBadge').textContent = u.role === 'admin' ? 'Administrador' : u.role === 'teacher' ? 'Professor' : 'Alumne';
  document.getElementById('sidebarUserName').textContent = `${u.nom} ${u.cognoms || ''}`.trim();
  document.getElementById('sidebarUserEmail').textContent = u.email;
  renderSidebar();
  // Navigate to first menu item
  const first = (MENU[u.role] || [])[0];
  if (first) navigate(first.id);
}

document.getElementById('logoutBtn').onclick = () => {
  currentUser = null;
  activeGroup = null;
  if (calendar) { try { calendar.destroy(); } catch(e){} calendar = null; }
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.remove('show');
};

// ===== NAVIGATION =====
const NAV_ICONS = {
  dashboard: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  scheduleView: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  adminUsers: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  adminAcademy: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>',
  adminFinance: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  classroomView: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  studentHome: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
};

const MENU = {
  admin: [
    { id: 'dashboard',     label: 'Tauler de Control' },
    { id: 'scheduleView',  label: 'Horari' },
    { id: 'adminUsers',    label: 'Usuaris' },
    { id: 'adminAcademy',  label: 'Acadèmia' },
    { id: 'adminFinance',  label: 'Finances' },
  ],
  teacher: [
    { id: 'scheduleView',  label: 'Horari' },
    { id: 'classroomView', label: 'Els Meus Grups' },
  ],
  student: [
    { id: 'scheduleView',  label: 'Horari' },
    { id: 'studentHome',   label: 'Els Meus Grups' },
  ]
};

function renderSidebar() {
  const nav = document.getElementById('mainNav');
  nav.innerHTML = '';
  (MENU[currentUser.role] || []).forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.dataset.id = m.id;
    btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:9px;">${NAV_ICONS[m.id]||''} ${m.label}</span>`;
    btn.onclick = () => navigate(m.id);
    nav.appendChild(btn);
  });
}

function navigate(id) {
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('hidden'));
  const sec = document.getElementById('section-' + id);
  if (sec) sec.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.id === id));

  if (id === 'dashboard')     renderDashboard();
  if (id === 'adminUsers')    renderUsersSection();
  if (id === 'adminAcademy')  renderAcademySection();
  if (id === 'adminFinance')  { renderFinanceStats(); renderFinanceTable(); }
  if (id === 'scheduleView')  initCalendar();
  if (id === 'classroomView') renderClassroom();
  if (id === 'studentHome')   renderStudentHome();
}

// ===== DASHBOARD =====
function renderDashboard() {
  document.getElementById('dashDate').textContent = todayDisplay();
  const students = state.users.filter(u => u.role === 'student');
  const teachers = state.users.filter(u => u.role === 'teacher');
  const totalIncome = state.finances.reduce((s, f) => s + (parseFloat(f.final) || 0), 0);
  const pending = state.finances.filter(f => f.matricula === 'Pendent').length;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Alumnes Total</div>
      <div class="stat-value">${students.length}</div>
      <div class="stat-sub">${state.groups.length} grups actius</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Professors</div>
      <div class="stat-value">${teachers.length}</div>
      <div class="stat-sub">${state.courses.length} cursos impartits</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Ingressos Totals</div>
      <div class="stat-value" style="font-size:24px;">${totalIncome.toLocaleString('ca')} €</div>
      <div class="stat-sub">${state.finances.length} registres</div>
    </div>
    <div class="stat-card ${pending > 0 ? 'red' : 'green'}">
      <div class="stat-label">Pagaments Pendents</div>
      <div class="stat-value">${pending}</div>
      <div class="stat-sub">${pending > 0 ? 'Requereix atenció' : 'Tot al dia'}</div>
    </div>
  `;

  const recentStudents = students.slice(-5).reverse();
  const upcomingEvents = state.events.filter(e => new Date(e.start) >= new Date()).sort((a,b) => new Date(a.start)-new Date(b.start)).slice(0,5);

  document.getElementById('dashLists').innerHTML = `
    <div class="dash-card">
      <div class="dash-card-header">
        <h3>Últims Alumnes Registrats</h3>
        <button class="btn btn-xs btn-secondary" onclick="navigate('adminUsers');switchUserTab('alumnes')">Veure tots</button>
      </div>
      <div class="dash-card-body">
        ${recentStudents.length === 0 ? '<div class="dash-item text-muted">Cap alumne registrat</div>' :
          recentStudents.map(u => `
            <div class="dash-item">
              <div>
                <div class="dash-item-name">${u.nom} ${u.cognoms||''}</div>
                <div class="dash-item-meta">${(u.cursos||[]).join(', ') || 'Sense curs'}</div>
              </div>
              <span class="badge badge-green">Actiu</span>
            </div>
          `).join('')
        }
      </div>
    </div>
    <div class="dash-card">
      <div class="dash-card-header">
        <h3>Propers Esdeveniments</h3>
        <button class="btn btn-xs btn-secondary" onclick="navigate('scheduleView')">Veure horari</button>
      </div>
      <div class="dash-card-body">
        ${upcomingEvents.length === 0 ? '<div class="dash-item text-muted">Cap esdeveniment pròxim</div>' :
          upcomingEvents.map(e => `
            <div class="dash-item">
              <div>
                <div class="dash-item-name">${e.title}</div>
                <div class="dash-item-meta">${e.start ? new Date(e.start).toLocaleString('ca', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</div>
              </div>
              <span class="badge badge-blue">${e.groupId || 'General'}</span>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

// ===== USER MANAGEMENT =====
function switchUserTab(tab) {
  document.querySelectorAll('#section-adminUsers .tab').forEach((t,i) => t.classList.toggle('active', i === (tab==='professors'?0:1)));
  document.getElementById('tabProfessors').classList.toggle('hidden', tab !== 'professors');
  document.getElementById('tabAlumnes').classList.toggle('hidden', tab !== 'alumnes');
  if (tab === 'alumnes') populateStudentForm();
}

function populateStudentForm() {
  document.getElementById('aCursos').innerHTML = state.courses.map(c => `<option value="${c.nom}">${c.nom}</option>`).join('');
  document.getElementById('aGrups').innerHTML = state.groups.map(g => `<option value="${g.nom}">${g.nom} (${g.course})</option>`).join('');
}

function saveTeacher() {
  const nom    = document.getElementById('tNom').value.trim();
  const cognoms= document.getElementById('tCognoms').value.trim();
  const email  = document.getElementById('tEmail').value.trim().toLowerCase();
  const pass   = document.getElementById('tPass').value.trim();
  if (!nom || !email || !pass) return alert('Nom, correu i contrasenya són obligatoris.');
  if (!email.includes('@')) return alert('El correu no és vàlid.');
  if (state.users.find(u => u.email.toLowerCase() === email)) return alert('Ja existeix un usuari amb aquest correu.');
  if (pass.length < 4) return alert('La contrasenya ha de tenir almenys 4 caràcters.');
  state.users.push({
    id: uid(), nom: clean(nom), cognoms: clean(cognoms),
    email: clean(email), pass: clean(pass),
    tel: clean(document.getElementById('tTel').value),
    especialitat: clean(document.getElementById('tEspec').value),
    role: 'teacher', groups: []
  });
  save(); renderUsersSection();
  ['tNom','tCognoms','tEmail','tPass','tTel','tEspec'].forEach(id => document.getElementById(id).value = '');
}

function saveStudent() {
  const nom     = document.getElementById('aNom').value.trim();
  const cognoms = document.getElementById('aCognoms').value.trim();
  const email   = document.getElementById('aEmail').value.trim().toLowerCase();
  const pass    = document.getElementById('aPass').value.trim();
  if (!nom || !email || !pass) return alert('Nom, correu i contrasenya són obligatoris.');
  if (!email.includes('@')) return alert('El correu no és vàlid.');
  if (state.users.find(u => u.email.toLowerCase() === email)) return alert('Ja existeix un usuari amb aquest correu.');
  if (pass.length < 4) return alert('La contrasenya ha de tenir almenys 4 caràcters.');

  const cursos = Array.from(document.getElementById('aCursos').selectedOptions).map(o => o.value);
  const grups  = Array.from(document.getElementById('aGrups').selectedOptions).map(o => o.value);
  const matricula = parseFloat(document.getElementById('aMatricula').value) || 0;

  const u = {
    id: uid(), nom: clean(nom), cognoms: clean(cognoms),
    email: clean(email), pass: clean(pass),
    tel: clean(document.getElementById('aTel').value),
    birth: document.getElementById('aBirth').value,
    parentNom: clean(document.getElementById('aParentNom').value),
    parentEmail: clean(document.getElementById('aParentEmail').value),
    parentTel: clean(document.getElementById('aParentTel').value),
    matricula, cursos, groups: grups, role: 'student',
    createdAt: new Date().toLocaleDateString('ca')
  };
  state.users.push(u);

  // Auto-finances per cada curs
  cursos.forEach(c => {
    const curs = state.courses.find(x => x.nom === c);
    state.finances.push({
      id: uid(), alumne: `${u.nom} ${u.cognoms}`, curs: c,
      import: curs ? curs.preu : matricula,
      data: new Date().toLocaleDateString('ca'),
      matricula: 'Matriculat',
      final: curs ? curs.preu : matricula
    });
  });

  save(); renderUsersSection();
  ['aNom','aCognoms','aEmail','aPass','aTel','aParentNom','aParentEmail','aParentTel','aMatricula','aBirth'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('aCursos').selectedIndex = -1;
  document.getElementById('aGrups').selectedIndex = -1;
}

function renderUsersSection() {
  // Teachers
  const teachers = state.users.filter(u => u.role === 'teacher');
  const tbody = document.getElementById('teacherTableBody');
  if (teachers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:32px;">Cap professor registrat</td></tr>';
  } else {
    tbody.innerHTML = teachers.map(u => {
      const myGroups = state.groups.filter(g => (g.teachers||[]).includes(u.email));
      return `<tr>
        <td style="font-weight:600;">${u.nom} ${u.cognoms||''}</td>
        <td class="text-muted">${u.email}</td>
        <td>${u.tel || '-'}</td>
        <td>${u.especialitat || '-'}</td>
        <td>${myGroups.map(g=>`<span class="chip">${g.nom}</span>`).join('')||'<span class="text-muted">Cap</span>'}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-secondary" onclick="openEditUser('${u.email}')">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.email}')">Eliminar</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // Students
  const students = state.users.filter(u => u.role === 'student');
  const sbody = document.getElementById('studentTableBody');
  if (students.length === 0) {
    sbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="padding:32px;">Cap alumne registrat</td></tr>';
  } else {
    sbody.innerHTML = students.map(u => `<tr>
      <td>
        <button style="background:none;border:none;cursor:pointer;color:var(--accent2);font-weight:600;text-decoration:underline;font-size:13px;" onclick="showStudentDetail('${u.email}')">
          ${u.nom} ${u.cognoms||''}
        </button>
      </td>
      <td class="text-muted">${u.email}</td>
      <td class="text-muted">${calcAge(u.birth)} anys</td>
      <td>${(u.cursos||[]).map(c=>`<span class="chip">${c}</span>`).join('')||'-'}</td>
      <td>${(u.groups||[]).map(g=>`<span class="chip">${g}</span>`).join('')||'-'}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:600;">${(u.matricula||0).toLocaleString('ca')} €</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-secondary" onclick="openEditUser('${u.email}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.email}')">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');
  }
}

function deleteUser(email) {
  const u = state.users.find(x => x.email === email);
  if (!u) return;
  if (!confirm(`Segur que vols eliminar ${u.nom} ${u.cognoms||''}? Aquesta acció és irreversible.`)) return;
  state.users = state.users.filter(x => x.email !== email);
  // Remove from groups
  state.groups.forEach(g => { g.teachers = (g.teachers||[]).filter(e => e !== email); });
  save(); renderUsersSection();
}

function showStudentDetail(email) {
  const u = state.users.find(x => x.email === email);
  if (!u) return;
  document.getElementById('modalStudentDetailBody').innerHTML = `
    <div class="profile-row mb-4">
      <div class="profile-field"><label>Nom Complet</label><p style="font-size:18px;font-weight:700;font-family:'Libre Baskerville',serif;">${u.nom} ${u.cognoms||''}</p></div>
      <div class="profile-field"><label>Data Naixement</label><p>${u.birth ? new Date(u.birth).toLocaleDateString('ca') : '-'} ${u.birth ? `(${calcAge(u.birth)} anys)` : ''}</p></div>
      <div class="profile-field"><label>Correu Electrònic</label><p>${u.email}</p></div>
      <div class="profile-field"><label>Contrasenya</label><p style="font-family:'DM Mono',monospace;">${u.pass}</p></div>
      <div class="profile-field"><label>Telèfon</label><p>${u.tel || '-'}</p></div>
      <div class="profile-field"><label>Matrícula</label><p style="font-family:'DM Mono',monospace;font-weight:700;color:var(--accent);">${(u.matricula||0).toLocaleString('ca')} €</p></div>
    </div>
    <hr class="divider">
    <div class="profile-row mb-4">
      <div class="profile-field"><label>Tutor / Pare / Mare</label><p>${u.parentNom || '-'}</p></div>
      <div class="profile-field"><label>Tel. Tutor</label><p>${u.parentTel || '-'}</p></div>
      <div class="profile-field"><label>Correu Tutor</label><p>${u.parentEmail || '-'}</p></div>
      <div class="profile-field"><label>Registrat el</label><p>${u.createdAt || '-'}</p></div>
    </div>
    <hr class="divider">
    <div class="profile-row">
      <div class="profile-field"><label>Cursos</label><p>${(u.cursos||[]).map(c=>`<span class="chip">${c}</span>`).join('')||'Cap'}</p></div>
      <div class="profile-field"><label>Grups</label><p>${(u.groups||[]).map(g=>`<span class="chip">${g}</span>`).join('')||'Cap'}</p></div>
    </div>
  `;
  document.getElementById('btnEditFromDetail').onclick = () => { closeModal('modalStudentDetail'); openEditUser(email); };
  openModal('modalStudentDetail');
}

function openEditUser(email) {
  const idx = state.users.findIndex(u => u.email === email);
  if (idx === -1) return;
  editingUserIdx = idx;
  const u = state.users[idx];
  document.getElementById('modalEditUserTitle').textContent = `Editar: ${u.nom} ${u.cognoms||''}`;

  let extra = '';
  if (u.role === 'student') {
    const cursosOpts = state.courses.map(c=>`<option value="${c.nom}" ${(u.cursos||[]).includes(c.nom)?'selected':''}>${c.nom}</option>`).join('');
    const grupOpts   = state.groups.map(g=>`<option value="${g.nom}" ${(u.groups||[]).includes(g.nom)?'selected':''}>${g.nom} (${g.course})</option>`).join('');
    extra = `
      <hr class="divider">
      <div class="form-grid form-grid-2">
        <div class="form-field"><label>Tutor/Pare/Mare</label><input id="eu_parentNom" value="${u.parentNom||''}"></div>
        <div class="form-field"><label>Email Tutor</label><input id="eu_parentEmail" value="${u.parentEmail||''}"></div>
        <div class="form-field"><label>Tel. Tutor</label><input id="eu_parentTel" value="${u.parentTel||''}"></div>
        <div class="form-field"><label>Data Naixement</label><input id="eu_birth" type="date" value="${u.birth||''}"></div>
        <div class="form-field"><label>Matrícula (€)</label><input id="eu_matricula" type="number" value="${u.matricula||0}"></div>
      </div>
      <div class="form-grid form-grid-2" style="margin-top:12px;">
        <div class="form-field"><label>Cursos (múltiple)</label><select id="eu_cursos" multiple style="height:80px;">${cursosOpts}</select></div>
        <div class="form-field"><label>Grups (múltiple)</label><select id="eu_grups" multiple style="height:80px;">${grupOpts}</select></div>
      </div>
    `;
  } else if (u.role === 'teacher') {
    extra = `<div class="form-field" style="margin-top:8px;"><label>Especialitat</label><input id="eu_espec" value="${u.especialitat||''}"></div>`;
  }

  document.getElementById('modalEditUserBody').innerHTML = `
    <div class="form-grid form-grid-2">
      <div class="form-field"><label>Nom</label><input id="eu_nom" value="${u.nom}"></div>
      <div class="form-field"><label>Cognoms</label><input id="eu_cognoms" value="${u.cognoms||''}"></div>
      <div class="form-field"><label>Correu</label><input id="eu_email" value="${u.email}"></div>
      <div class="form-field"><label>Contrasenya</label><input id="eu_pass" value="${u.pass}"></div>
      <div class="form-field"><label>Telèfon</label><input id="eu_tel" value="${u.tel||''}"></div>
    </div>
    ${extra}
  `;
  openModal('modalEditUser');
}

function saveEditUser() {
  const u = state.users[editingUserIdx];
  const newEmail = document.getElementById('eu_email').value.trim().toLowerCase();
  if (!newEmail.includes('@')) return alert('Correu no vàlid.');
  // Check for duplicate email (excluding self)
  if (state.users.some((x, i) => x.email.toLowerCase() === newEmail && i !== editingUserIdx)) return alert('Ja existeix un usuari amb aquest correu.');

  u.nom     = clean(document.getElementById('eu_nom').value);
  u.cognoms = clean(document.getElementById('eu_cognoms').value);
  u.email   = clean(newEmail);
  u.pass    = clean(document.getElementById('eu_pass').value);
  u.tel     = clean(document.getElementById('eu_tel').value);

  if (u.role === 'student') {
    u.parentNom   = clean(document.getElementById('eu_parentNom').value);
    u.parentEmail = clean(document.getElementById('eu_parentEmail').value);
    u.parentTel   = clean(document.getElementById('eu_parentTel').value);
    u.birth       = document.getElementById('eu_birth').value;
    u.matricula   = parseFloat(document.getElementById('eu_matricula').value) || 0;
    u.cursos      = Array.from(document.getElementById('eu_cursos').selectedOptions).map(o => o.value);
    u.groups      = Array.from(document.getElementById('eu_grups').selectedOptions).map(o => o.value);
  } else if (u.role === 'teacher') {
    u.especialitat = clean(document.getElementById('eu_espec').value);
  }

  save(); renderUsersSection(); closeModal('modalEditUser');
}

// ===== ACADEMY (COURSES & GROUPS) =====
function switchAcademyTab(tab) {
  document.querySelectorAll('#section-adminAcademy .tab').forEach((t,i) => t.classList.toggle('active', i === (tab==='cursos'?0:1)));
  document.getElementById('tabCursos').classList.toggle('hidden', tab !== 'cursos');
  document.getElementById('tabGrups').classList.toggle('hidden', tab !== 'grups');
  if (tab === 'grups') {
    document.getElementById('gCourse').innerHTML = '<option value="">-- Selecciona un curs --</option>' + state.courses.map(c=>`<option value="${c.nom}">${c.nom}</option>`).join('');
    document.getElementById('gTeachers').innerHTML = state.users.filter(u=>u.role==='teacher').map(t=>`<option value="${t.email}">${t.nom} ${t.cognoms||''}</option>`).join('');
  }
}

function saveCourse() {
  const nom = document.getElementById('cNom').value.trim();
  if (!nom) return alert('El nom del curs és obligatori.');
  if (state.courses.find(c => c.nom.toLowerCase() === nom.toLowerCase())) return alert('Ja existeix un curs amb aquest nom.');
  state.courses.push({
    id: uid(), nom: clean(nom),
    preu: parseFloat(document.getElementById('cPreu').value) || 0,
    horari: clean(document.getElementById('cHorari').value),
    maxAlumnes: parseInt(document.getElementById('cMax').value) || 0,
    desc: clean(document.getElementById('cDesc').value)
  });
  save(); renderAcademySection();
  ['cNom','cPreu','cHorari','cMax','cDesc'].forEach(id => document.getElementById(id).value = '');
}

function saveGroup() {
  const nom = document.getElementById('gNom').value.trim();
  const course = document.getElementById('gCourse').value;
  if (!nom) return alert('El nom del grup és obligatori.');
  if (!course) return alert('Has de seleccionar un curs.');
  if (state.groups.find(g => g.nom.toLowerCase() === nom.toLowerCase())) return alert('Ja existeix un grup amb aquest nom.');
  const teachers = Array.from(document.getElementById('gTeachers').selectedOptions).map(o => o.value);
  state.groups.push({ id: uid(), nom: clean(nom), course, teachers });
  save(); renderAcademySection();
  document.getElementById('gNom').value = '';
}

function renderAcademySection() {
  // Courses
  const ct = document.getElementById('courseTableBody');
  if (state.courses.length === 0) {
    ct.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:32px;">Cap curs creat</td></tr>';
  } else {
    ct.innerHTML = state.courses.map((c, i) => {
      const enrolled = state.users.filter(u => u.role==='student' && (u.cursos||[]).includes(c.nom)).length;
      const pct = c.maxAlumnes ? Math.round(enrolled/c.maxAlumnes*100) : null;
      return `<tr>
        <td style="font-weight:600;">${c.nom}</td>
        <td style="font-family:'DM Mono',monospace;">${c.preu.toLocaleString('ca')} €</td>
        <td>${c.horari || '-'}</td>
        <td>${c.maxAlumnes || '∞'}</td>
        <td>
          <span class="badge ${enrolled>0?'badge-green':'badge-blue'}">${enrolled} inscrits</span>
          ${pct !== null ? `<span class="text-xs text-muted" style="margin-left:6px;">${pct}%</span>` : ''}
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-secondary" onclick="openEditCourse(${i})">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCourse(${i})">Eliminar</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // Groups
  const gt = document.getElementById('groupTableBody');
  if (state.groups.length === 0) {
    gt.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:32px;">Cap grup creat</td></tr>';
  } else {
    gt.innerHTML = state.groups.map((g, i) => {
      const alumnes = state.users.filter(u => u.role==='student' && (u.groups||[]).includes(g.nom));
      const profs   = state.users.filter(u => (g.teachers||[]).includes(u.email));
      return `<tr>
        <td style="font-weight:600;">${g.nom}</td>
        <td>${g.course}</td>
        <td>${profs.map(p=>`<span class="chip">${p.nom} ${p.cognoms||''}</span>`).join('')||'<span class="text-muted">Cap professor</span>'}</td>
        <td><span class="badge badge-blue">${alumnes.length} alumnes</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-secondary" onclick="openEditGroup(${i})">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteGroup(${i})">Eliminar</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
}

function deleteCourse(i) {
  if (!confirm(`Eliminar el curs "${state.courses[i].nom}"? Els alumnes inscrits perdran la referència.`)) return;
  state.courses.splice(i, 1); save(); renderAcademySection();
}
function deleteGroup(i) {
  if (!confirm(`Eliminar el grup "${state.groups[i].nom}"?`)) return;
  state.groups.splice(i, 1); save(); renderAcademySection();
}

function openEditCourse(i) {
  editingCourseIdx = i;
  const c = state.courses[i];
  document.getElementById('modalEditCourseBody').innerHTML = `
    <div class="form-grid form-grid-2">
      <div class="form-field"><label>Nom</label><input id="ec_nom" value="${c.nom}"></div>
      <div class="form-field"><label>Preu (€)</label><input id="ec_preu" type="number" value="${c.preu}"></div>
      <div class="form-field"><label>Horari</label><input id="ec_horari" value="${c.horari||''}"></div>
      <div class="form-field"><label>Màx. Alumnes</label><input id="ec_max" type="number" value="${c.maxAlumnes||''}"></div>
    </div>
    <div class="form-field" style="margin-top:12px;"><label>Descripció</label><textarea id="ec_desc" rows="2" style="width:100%;">${c.desc||''}</textarea></div>
  `;
  openModal('modalEditCourse');
}
function saveEditCourse() {
  const c = state.courses[editingCourseIdx];
  c.nom = clean(document.getElementById('ec_nom').value);
  c.preu = parseFloat(document.getElementById('ec_preu').value) || 0;
  c.horari = clean(document.getElementById('ec_horari').value);
  c.maxAlumnes = parseInt(document.getElementById('ec_max').value) || 0;
  c.desc = clean(document.getElementById('ec_desc').value);
  save(); renderAcademySection(); closeModal('modalEditCourse');
}

function openEditGroup(i) {
  editingGroupIdx = i;
  const g = state.groups[i];
  const courseOpts   = state.courses.map(c=>`<option value="${c.nom}" ${g.course===c.nom?'selected':''}>${c.nom}</option>`).join('');
  const teacherOpts  = state.users.filter(u=>u.role==='teacher').map(t=>`<option value="${t.email}" ${(g.teachers||[]).includes(t.email)?'selected':''}>${t.nom} ${t.cognoms||''}</option>`).join('');
  const studentOpts  = state.users.filter(u=>u.role==='student').map(s=>`<option value="${s.email}" ${(s.groups||[]).includes(g.nom)?'selected':''}>${s.nom} ${s.cognoms||''}</option>`).join('');
  document.getElementById('modalEditGroupBody').innerHTML = `
    <div class="form-grid form-grid-2">
      <div class="form-field"><label>Nom del Grup</label><input id="eg_nom" value="${g.nom}"></div>
      <div class="form-field"><label>Curs</label><select id="eg_course">${courseOpts}</select></div>
    </div>
    <div class="form-grid form-grid-2" style="margin-top:12px;">
      <div class="form-field"><label>Professors (múltiple)</label><select id="eg_teachers" multiple style="height:100px;">${teacherOpts}</select></div>
      <div class="form-field"><label>Alumnes del Grup</label><select id="eg_students" multiple style="height:100px;">${studentOpts}</select></div>
    </div>
    <p class="text-xs text-muted mt-2">Ctrl+Click per seleccionar múltiples</p>
  `;
  openModal('modalEditGroup');
}
function saveEditGroup() {
  const g = state.groups[editingGroupIdx];
  const oldNom = g.nom;
  g.nom      = clean(document.getElementById('eg_nom').value);
  g.course   = document.getElementById('eg_course').value;
  g.teachers = Array.from(document.getElementById('eg_teachers').selectedOptions).map(o => o.value);

  // Update student group memberships
  const selectedStudents = Array.from(document.getElementById('eg_students').selectedOptions).map(o => o.value);
  state.users.forEach(u => {
    if (u.role !== 'student') return;
    const hasOld = (u.groups||[]).includes(oldNom);
    const selected = selectedStudents.includes(u.email);
    if (selected && !hasOld) {
      u.groups = [...(u.groups||[]).filter(x=>x!==oldNom), g.nom];
    } else if (!selected && hasOld) {
      u.groups = (u.groups||[]).filter(x => x !== oldNom && x !== g.nom);
    } else if (hasOld && g.nom !== oldNom) {
      u.groups = (u.groups||[]).map(x => x === oldNom ? g.nom : x);
    }
  });

  save(); renderAcademySection(); closeModal('modalEditGroup');
}

// ===== FINANCES =====
function renderFinanceStats() {
  const total = state.finances.reduce((s,f) => s+(parseFloat(f.final)||0), 0);
  const pagat = state.finances.filter(f=>f.matricula==='Pagat').reduce((s,f)=>s+(parseFloat(f.final)||0),0);
  const pendent = state.finances.filter(f=>f.matricula==='Pendent').length;
  const matriculat = state.finances.filter(f=>f.matricula==='Matriculat').length;
  document.getElementById('financeStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Facturat</div><div class="stat-value" style="font-size:22px;">${total.toLocaleString('ca')} €</div><div class="stat-sub">${state.finances.length} registres</div></div>
    <div class="stat-card green"><div class="stat-label">Total Cobrat</div><div class="stat-value" style="font-size:22px;">${pagat.toLocaleString('ca')} €</div><div class="stat-sub">Pagaments confirmats</div></div>
    <div class="stat-card red"><div class="stat-label">Pendents de Pagament</div><div class="stat-value">${pendent}</div><div class="stat-sub">Requereix seguiment</div></div>
    <div class="stat-card yellow"><div class="stat-label">Matriculats</div><div class="stat-value">${matriculat}</div><div class="stat-sub">Sense confirmar pagament</div></div>
  `;
}

function addFinanceRow() {
  const concepte = document.getElementById('fConcepte').value.trim();
  if (!concepte) return alert('El concepte és obligatori.');
  state.finances.push({
    id: uid(),
    alumne: clean(concepte),
    curs: clean(document.getElementById('fTipus').value),
    import: parseFloat(document.getElementById('fImport').value) || 0,
    data: new Date().toLocaleDateString('ca'),
    matricula: document.getElementById('fMatricula').value,
    final: parseFloat(document.getElementById('fImport').value) || 0
  });
  save(); renderFinanceStats(); renderFinanceTable();
  ['fConcepte','fTipus','fImport'].forEach(id => document.getElementById(id).value = '');
}

function renderFinanceTable() {
  const tbody = document.getElementById('financeTableBody');
  if (state.finances.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="padding:40px;">Sense entrades de finances</td></tr>';
    return;
  }
  tbody.innerHTML = state.finances.map((f, i) => {
    const badgeCls = f.matricula==='Pagat'?'badge-green': f.matricula==='Pendent'?'badge-red': f.matricula==='Baixa'?'badge-orange':'badge-blue';
    return `<tr>
      <td style="font-weight:600;">${f.alumne}</td>
      <td>${f.curs||'-'}</td>
      <td>
        <input class="finance-editable" type="number" value="${f.import}" min="0"
          onchange="state.finances[${i}].import=parseFloat(this.value)||0;save();renderFinanceStats();" title="Edita l'import">
      </td>
      <td class="text-muted">${f.data}</td>
      <td>
        <select onchange="state.finances[${i}].matricula=this.value;save();renderFinanceStats();renderFinanceTable();" style="border:1px solid var(--border);border-radius:4px;padding:4px 8px;font-size:12px;font-weight:600;background:var(--surface);">
          <option value="Matriculat" ${f.matricula==='Matriculat'?'selected':''}>Matriculat</option>
          <option value="Pendent"    ${f.matricula==='Pendent'?'selected':''}>Pendent</option>
          <option value="Pagat"      ${f.matricula==='Pagat'?'selected':''}>Pagat</option>
          <option value="Baixa"      ${f.matricula==='Baixa'?'selected':''}>Baixa</option>
        </select>
      </td>
      <td>
        <input class="finance-editable" type="number" value="${f.final}" min="0"
          onchange="state.finances[${i}].final=parseFloat(this.value)||0;save();renderFinanceStats();" title="Edita el preu final">
      </td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteFinance(${i})">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

function deleteFinance(i) {
  if (!confirm('Eliminar aquesta entrada de finances?')) return;
  state.finances.splice(i, 1); save(); renderFinanceStats(); renderFinanceTable();
}

function exportFinanceCSV() {
  let csv = '\uFEFF'; // BOM for Excel
  csv += 'Alumne,Curs,Import,Data,Matr\u00edcula,Preu Final\n';
  state.finances.forEach(f => csv += `"${f.alumne}","${f.curs||''}",${f.import},"${f.data}","${f.matricula}",${f.final}\n`);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `finances_${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ===== CALENDAR =====
function initCalendar() {
  const el = document.getElementById('calendar');
  if (calendar) { try { calendar.destroy(); } catch(e){} calendar = null; }

  const isAdmin   = currentUser.role === 'admin';
  const isTeacher = currentUser.role === 'teacher';

  document.getElementById('calAdminControls').classList.toggle('hidden', !isAdmin);
  document.getElementById('teacherCalControls').classList.add('hidden');

  if (isTeacher) {
    const myGroups = state.groups.filter(g => (g.teachers||[]).includes(currentUser.email));
    if (myGroups.length > 0) {
      document.getElementById('teacherCalControls').classList.remove('hidden');
      document.getElementById('tEvGroup').innerHTML = myGroups.map(g=>`<option value="${g.nom}">${g.nom}</option>`).join('');
    }
  }

  // Filter events by role
  let visibleEvents = state.events;
  if (currentUser.role === 'student') {
    const myGroups = currentUser.groups || [];
    visibleEvents = state.events.filter(e => !e.groupId || myGroups.includes(e.groupId));
  } else if (isTeacher) {
    const myGroups = state.groups.filter(g=>(g.teachers||[]).includes(currentUser.email)).map(g=>g.nom);
    visibleEvents = state.events.filter(e => !e.groupId || myGroups.includes(e.groupId));
  }

  const calEvents = visibleEvents.map(e => ({ ...e, editable: false }));

  calendar = new FullCalendar.Calendar(el, {
    initialView: 'timeGridWeek',
    locale: 'ca',
    height: 'auto',
    events: calEvents,
    firstDay: 1,
    nowIndicator: true,
    slotMinTime: '07:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
    buttonText: { today:'Avui', month:'Mes', week:'Setmana', day:'Dia', list:'Llista' },
    allDayText: 'Tot el dia',
    eventClick: (info) => {
      const ev = state.events.find(e => e.id === info.event.id);
      if (!ev) return;
      editingEventId = ev.id;
      document.getElementById('modalEditEventTitle').textContent = ev.title;
      document.getElementById('modalEditEventBody').innerHTML = `
        <div class="profile-row">
          <div class="profile-field"><label>Títol</label><p style="font-weight:600;">${ev.title}</p></div>
          <div class="profile-field"><label>Inici</label><p>${ev.start ? new Date(ev.start).toLocaleString('ca') : '-'}</p></div>
          ${ev.end && ev.end !== ev.start ? `<div class="profile-field"><label>Final</label><p>${new Date(ev.end).toLocaleString('ca')}</p></div>` : ''}
          ${ev.groupId ? `<div class="profile-field"><label>Grup</label><p><span class="chip">${ev.groupId}</span></p></div>` : ''}
          ${ev.desc ? `<div class="profile-field" style="grid-column:1/-1;"><label>Descripció</label><p>${ev.desc}</p></div>` : ''}
        </div>
      `;
      const canDelete = isAdmin || (isTeacher && ev.groupId && state.groups.filter(g=>(g.teachers||[]).includes(currentUser.email)).map(g=>g.nom).includes(ev.groupId));
      document.getElementById('btnDeleteEvent').classList.toggle('hidden', !canDelete);
      document.getElementById('btnDeleteEvent').onclick = () => deleteCalendarEvent(ev.id);
      openModal('modalEditEvent');
    },
    eventContent: (arg) => {
      const icon = arg.event.extendedProps.groupId ? '📌 ' : '';
      return { html: `<div style="padding:2px 5px;font-size:11px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${arg.event.title}</div>` };
    }
  });
  calendar.render();
}

function deleteCalendarEvent(id) {
  if (!confirm('Eliminar aquest esdeveniment del calendari?')) return;
  state.events = state.events.filter(e => e.id !== id);
  save(); closeModal('modalEditEvent'); initCalendar();
}

function addCalendarEvent() {
  const title = document.getElementById('evTitle').value.trim();
  const start = document.getElementById('evStart').value;
  const end   = document.getElementById('evEnd').value;
  const desc  = document.getElementById('evDesc').value.trim();
  if (!title || !start) return alert('Títol i data d\'inici són obligatoris.');
  state.events.push({ id: uid(), title: clean(title), start, end: end || start, color: document.getElementById('evColor').value, desc: clean(desc) });
  save(); initCalendar();
  ['evTitle','evDesc'].forEach(id => document.getElementById(id).value = '');
}

function addTeacherTask() {
  const title   = document.getElementById('tEvTitle').value.trim();
  const groupId = document.getElementById('tEvGroup').value;
  const start   = document.getElementById('tEvStart').value;
  const end     = document.getElementById('tEvEnd').value;
  const desc    = document.getElementById('tEvDesc').value.trim();
  if (!title || !start) return alert('Títol i data d\'inici són obligatoris.');
  state.events.push({ id: uid(), title: `[${groupId}] ${clean(title)}`, start, end: end || start, color: '#1a6e42', groupId, desc: clean(desc) });
  save(); initCalendar();
  ['tEvTitle','tEvDesc'].forEach(id => document.getElementById(id).value = '');
}

// ===== CLASSROOM (PROFESSOR) =====
function renderClassroom() {
  const grid = document.getElementById('classroomSelectionGrid');
  document.getElementById('classroomDetail').classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = '';

  let myGroups = currentUser.role === 'teacher'
    ? state.groups.filter(g => (g.teachers||[]).includes(currentUser.email))
    : state.groups;

  if (myGroups.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>Cap grup assignat. L\'administrador t\'ha d\'afegir a un grup.</p></div>';
    return;
  }

  const colors = ['#1b3055','#1a6e42','#7a5800','#6a0a7a','#b52d22','#0a5e6a'];
  myGroups.forEach((g, idx) => {
    const alumnes = state.users.filter(u => u.role==='student' && (u.groups||[]).includes(g.nom));
    const tasques = state.events.filter(e => e.groupId === g.nom);
    const color   = colors[idx % colors.length];
    const d = document.createElement('div');
    d.className = 'classroom-card';
    d.style.borderTop = `3px solid ${color}`;
    d.innerHTML = `
      <div class="classroom-card-icon" style="background:${color}15;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="${color}" width="22" height="22"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
      </div>
      <h4>${g.nom}</h4>
      <p class="cc-course">${g.course}</p>
      <div class="meta">
        <span class="badge badge-blue">${alumnes.length} alumnes</span>
        <span class="badge badge-green">${tasques.length} tasques</span>
      </div>
    `;
    d.onclick = () => openGroupDetail(g);
    grid.appendChild(d);
  });
}

function openGroupDetail(g) {
  activeGroup = g;
  const grid = document.getElementById('classroomSelectionGrid');
  grid.classList.add('hidden');
  document.getElementById('classroomDetail').classList.remove('hidden');

  const alumnes = state.users.filter(u => u.role==='student' && (u.groups||[]).includes(g.nom));
  const todayStr = new Date().toLocaleDateString('ca');
  const groupTasks = state.events.filter(e => e.groupId === g.nom).sort((a,b) => new Date(a.start)-new Date(b.start));
  const profs = state.users.filter(u => (g.teachers||[]).includes(u.email));

  document.getElementById('groupDetailContent').innerHTML = `
    <div class="group-header">
      <div class="group-icon">${g.nom.charAt(0).toUpperCase()}</div>
      <div>
        <div class="group-title">${g.nom}</div>
        <div class="group-subtitle">${g.course} &bull; ${profs.map(p=>`${p.nom} ${p.cognoms||''}`).join(', ')||'Sense professor'} &bull; ${alumnes.length} alumnes</div>
      </div>
    </div>

    <div class="tabs" id="groupTabs">
      <button class="tab active" onclick="showGroupTab('attend')">Assistència</button>
      <button class="tab" onclick="showGroupTab('members')">Membres</button>
      <button class="tab" onclick="showGroupTab('tasks')">Tasques</button>
      ${currentUser.role === 'teacher' ? '<button class="tab" onclick="showGroupTab(\'notes\')">Notes</button>' : ''}
    </div>

    <!-- ASSISTÈNCIA -->
    <div id="groupTabAttend">
      ${renderAttendanceTab(g, alumnes, todayStr)}
    </div>

    <!-- MEMBRES -->
    <div id="groupTabMembers" class="hidden">
      <div class="card">
        <div class="card-header"><h3>Alumnes del Grup (${alumnes.length})</h3></div>
        <div class="card-body p-0">
          ${alumnes.length === 0 ? '<div class="empty-state"><p>Cap alumne assignat a aquest grup.</p></div>' : `
          <table class="tbl">
            <thead><tr><th>Nom Complet</th><th>Correu Electrònic</th><th>Assistència Avui</th></tr></thead>
            <tbody>${alumnes.map(s => {
              const key = `${todayStr}_${g.nom}`;
              const att = (state.attendance[key] && state.attendance[key][s.email]) || 'present';
              const attBadge = {'present':'badge-green','falta':'badge-red','retard':'badge-yellow','justificada':'badge-blue','injustificada':'badge-orange','expulsio':'badge-red'};
              const attLabel = {'present':'Present','falta':'Falta','retard':'Retard','justificada':'Just.','injustificada':'Injust.','expulsio':'Expulsió'};
              return `<tr><td style="font-weight:600;">${s.nom} ${s.cognoms||''}</td><td class="text-muted">${s.email}</td><td><span class="badge ${attBadge[att]||'badge-blue'}">${attLabel[att]||att}</span></td></tr>`;
            }).join('')}</tbody>
          </table>`}
        </div>
      </div>
      ${currentUser.role === 'teacher' ? `
      <div style="margin-top:12px;text-align:right;">
        <button class="btn btn-sm btn-secondary" onclick="openAttendHistory('${g.nom}')">Veure Historial Complet</button>
      </div>` : ''}
    </div>

    <!-- TASQUES -->
    <div id="groupTabTasks" class="hidden">
      ${currentUser.role === 'teacher' ? `
      <div class="card mb-4">
        <div class="card-header"><h3>Publicar Nova Tasca</h3></div>
        <div class="card-body">
          <div class="form-grid form-grid-3">
            <div class="form-field p-0"><label>Títol</label><input id="gt_title" placeholder="Títol de la tasca"></div>
            <div class="form-field p-0"><label>Data Lliurament</label><input id="gt_start" type="datetime-local"></div>
            <div class="form-field p-0"><label>Final (opcional)</label><input id="gt_end" type="datetime-local"></div>
          </div>
          <div class="form-field" style="margin-top:12px;"><label>Descripció</label><textarea id="gt_desc" rows="2" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);" placeholder="Descripció detallada..."></textarea></div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="addGroupTask('${g.nom}')">Publicar al Calendari</button>
          </div>
        </div>
      </div>` : ''}
      <div class="card">
        <div class="card-header"><h3>Tasques Publicades (${groupTasks.length})</h3></div>
        <div class="card-body">
          ${groupTasks.length === 0 ? '<div class="empty-state"><p>Cap tasca publicada per aquest grup.</p></div>' :
            groupTasks.map(t => `
              <div class="task-card">
                <div class="flex justify-between items-center">
                  <div class="task-card-title">${t.title.replace(`[${g.nom}] `, '')}</div>
                  ${currentUser.role === 'teacher' ? `<button class="btn btn-xs btn-danger" onclick="deleteGroupTask('${t.id}','${g.nom}')">Eliminar</button>` : ''}
                </div>
                <div class="task-card-date">${t.start ? '📅 ' + new Date(t.start).toLocaleString('ca', {day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'}) : ''}</div>
                ${t.desc ? `<div class="task-card-desc">${t.desc}</div>` : ''}
              </div>
            `).join('')
          }
        </div>
      </div>
    </div>

    <!-- NOTES (PROFESSOR ONLY) -->
    ${currentUser.role === 'teacher' ? `<div id="groupTabNotes" class="hidden">${renderNotesForGroup(g.nom, alumnes)}</div>` : ''}
  `;
}

function renderAttendanceTab(g, alumnes, todayStr) {
  const key = `${todayStr}_${g.nom}`;
  const isAdmin = currentUser.role === 'admin';

  const attendTypes = [
    { val: 'present',       label: 'Present',    color: '#1a6e42' },
    { val: 'falta',         label: 'Falta',      color: '#b52d22' },
    { val: 'retard',        label: 'Retard',     color: '#7a5800' },
    { val: 'justificada',   label: 'F. Justificada', color: '#274580' },
    { val: 'injustificada', label: 'F. Injustificada', color: '#b84a10' },
    { val: 'expulsio',      label: 'Expulsió',   color: '#6a0a0a' },
  ];

  if (alumnes.length === 0) return '<div class="card"><div class="card-body"><p class="text-muted">Cap alumne assignat a aquest grup.</p></div></div>';

  return `
    <div class="card">
      <div class="card-header">
        <h3>Assistència — ${todayStr}</h3>
        ${currentUser.role === 'teacher' ? `<button class="btn btn-sm btn-secondary" onclick="openAttendHistory('${g.nom}')">Historial</button>` : ''}
      </div>
      <div class="card-body overflow-x-auto" style="padding:0;">
        <table class="attend-table">
          <thead>
            <tr>
              <th style="text-align:left;padding-left:16px;">Alumne</th>
              ${attendTypes.map(t => `<th>${t.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${alumnes.map(s => {
              const val = (state.attendance[key] && state.attendance[key][s.email]) || 'present';
              const name = `attend_${s.email.replace(/[@.]/g, '_')}_${g.nom.replace(/\s/g,'_')}`;
              return `<tr>
                <td style="font-weight:600;padding-left:16px;">${s.nom} ${s.cognoms||''}</td>
                ${attendTypes.map(t => `
                  <td class="attend-type-${t.val}">
                    <input type="radio" class="attend-radio" id="${name}_${t.val}" name="${name}" value="${t.val}" ${val===t.val?'checked':''} onchange="markAttend('${s.email}','${t.val}','${g.nom}')">
                    <label class="attend-label" for="${name}_${t.val}" style="cursor:pointer;">${val===t.val?'✓':''}</label>
                  </td>
                `).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openAttendHistory(groupNom) {
  const g = state.groups.find(x => x.nom === groupNom);
  const alumnes = state.users.filter(u => u.role==='student' && (u.groups||[]).includes(groupNom));
  
  // Get all attendance keys for this group
  const groupKeys = Object.keys(state.attendance).filter(k => k.endsWith(`_${groupNom}`)).sort().reverse();
  
  if (groupKeys.length === 0) {
    document.getElementById('modalAttendHistoryBody').innerHTML = '<div class="empty-state"><p>No hi ha registres d\'assistència per aquest grup.</p></div>';
    openModal('modalAttendHistory');
    return;
  }

  const attendLabels = {'present':'Present','falta':'Falta','retard':'Retard','justificada':'F.Just.','injustificada':'F.Injust.','expulsio':'Expulsió'};
  const attendColors = {'present':'badge-green','falta':'badge-red','retard':'badge-yellow','justificada':'badge-blue','injustificada':'badge-orange','expulsio':'badge-red'};

  document.getElementById('modalAttendHistoryBody').innerHTML = `
    <div class="overflow-x-auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>Alumne</th>
            ${groupKeys.map(k => `<th>${k.replace(`_${groupNom}`, '')}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${alumnes.map(s => `
            <tr>
              <td style="font-weight:600;white-space:nowrap;">${s.nom} ${s.cognoms||''}</td>
              ${groupKeys.map(k => {
                const val = (state.attendance[k] && state.attendance[k][s.email]) || '-';
                return `<td><span class="badge ${attendColors[val]||''}">${attendLabels[val]||val}</span></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  openModal('modalAttendHistory');
}

function markAttend(email, val, groupNom) {
  const todayStr = new Date().toLocaleDateString('ca');
  const key = `${todayStr}_${groupNom}`;
  if (!state.attendance[key]) state.attendance[key] = {};
  state.attendance[key][email] = val;
  save();
  // Update the checkmarks visually
  const name = `attend_${email.replace(/[@.]/g,'_')}_${groupNom.replace(/\s/g,'_')}`;
  document.querySelectorAll(`[name="${name}"]`).forEach(radio => {
    const lbl = document.querySelector(`label[for="${radio.id}"]`);
    if (lbl) lbl.textContent = radio.value === val ? '✓' : '';
  });
}

function backToGroups() {
  document.getElementById('classroomSelectionGrid').classList.remove('hidden');
  document.getElementById('classroomDetail').classList.add('hidden');
}

function showGroupTab(tab) {
  const tabMap = { attend: 'groupTabAttend', members: 'groupTabMembers', tasks: 'groupTabTasks', notes: 'groupTabNotes' };
  Object.entries(tabMap).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', k !== tab);
  });
  const tabBtns = document.querySelectorAll('#groupTabs .tab');
  const order   = ['attend','members','tasks','notes'];
  tabBtns.forEach((btn, i) => btn.classList.toggle('active', order[i] === tab));
}

function addGroupTask(groupNom) {
  const title = document.getElementById('gt_title').value.trim();
  if (!title) return alert('El títol és obligatori.');
  const start = document.getElementById('gt_start').value;
  const end   = document.getElementById('gt_end').value;
  const desc  = document.getElementById('gt_desc').value.trim();
  if (!start) return alert('La data de lliurament és obligatòria.');
  state.events.push({ id: uid(), title: `[${groupNom}] ${clean(title)}`, start, end: end||start, color: '#1a6e42', groupId: groupNom, desc: clean(desc) });
  save(); openGroupDetail(activeGroup); showGroupTab('tasks');
}

function deleteGroupTask(taskId, groupNom) {
  if (!confirm('Eliminar la tasca?')) return;
  state.events = state.events.filter(e => e.id !== taskId);
  save(); openGroupDetail(activeGroup); showGroupTab('tasks');
}

// ===== NOTES (PROFESSOR) =====
function renderNotesForGroup(groupNom, alumnes) {
  const key = `notes_${groupNom}`;
  if (!state.notes[key]) state.notes[key] = { tasques: [], data: {} };
  const n = state.notes[key];
  const tasquesCols = n.tasques || [];

  return `
    <div class="card">
      <div class="card-header">
        <h3>Notes del Grup — ${groupNom}</h3>
        <div class="flex gap-2 items-center">
          <input id="newTaskName" placeholder="Nova tasca..." style="padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;width:160px;">
          <button class="btn btn-sm btn-primary" onclick="addNoteTask('${groupNom}')">+ Afegir Tasca</button>
        </div>
      </div>
      <div class="card-body overflow-x-auto" style="padding:0;">
        ${alumnes.length === 0 ? '<div class="empty-state"><p>Cap alumne en aquest grup.</p></div>' : `
        <table class="notes-table">
          <thead>
            <tr>
              <th style="min-width:180px;text-align:left;padding-left:14px;">Alumne</th>
              ${tasquesCols.map((t, ti) => `
                <th class="task-header">
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <span>${t}</span>
                    <button onclick="removeNoteTask('${groupNom}',${ti})" title="Eliminar tasca" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:14px;line-height:1;padding:0 2px;">×</button>
                  </div>
                </th>
              `).join('')}
              <th style="min-width:90px;">Nota Final</th>
            </tr>
          </thead>
          <tbody>
            ${alumnes.map(s => {
              const scores = tasquesCols.map((t, ti) => {
                const val = (n.data[s.email] && n.data[s.email][ti] !== undefined) ? n.data[s.email][ti] : '';
                return `<td><input type="number" min="0" max="10" step="0.1" value="${val}" placeholder="—"
                  onchange="saveNote('${groupNom}','${s.email}',${ti},this.value)"></td>`;
              }).join('');
              const vals = tasquesCols.map((_,ti) => (n.data[s.email]&&n.data[s.email][ti]!==undefined) ? parseFloat(n.data[s.email][ti]) : null).filter(v=>v!==null);
              const avg  = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : null;
              const avgStr = avg !== null ? avg.toFixed(1) : '—';
              const notaCls = avg !== null ? (avg>=7?'high':avg>=5?'mid':'low') : '';
              return `<tr>
                <td style="font-weight:600;padding-left:14px;">${s.nom} ${s.cognoms||''}</td>
                ${scores}
                <td class="nota-final ${notaCls}">${avgStr}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
  `;
}

function addNoteTask(groupNom) {
  const key = `notes_${groupNom}`;
  if (!state.notes[key]) state.notes[key] = { tasques: [], data: {} };
  const name = document.getElementById('newTaskName').value.trim();
  if (!name) return alert('Introdueix un nom per la tasca.');
  state.notes[key].tasques.push(name);
  save(); openGroupDetail(activeGroup); showGroupTab('notes');
}

function removeNoteTask(groupNom, ti) {
  if (!confirm('Eliminar aquesta tasca i les seves notes?')) return;
  const key = `notes_${groupNom}`;
  state.notes[key].tasques.splice(ti, 1);
  Object.keys(state.notes[key].data).forEach(email => {
    if (Array.isArray(state.notes[key].data[email])) state.notes[key].data[email].splice(ti, 1);
    else if (typeof state.notes[key].data[email] === 'object') {
      const newData = {};
      Object.keys(state.notes[key].data[email]).forEach(k => {
        const ki = parseInt(k);
        if (ki < ti) newData[k] = state.notes[key].data[email][k];
        else if (ki > ti) newData[ki-1] = state.notes[key].data[email][k];
      });
      state.notes[key].data[email] = newData;
    }
  });
  save(); openGroupDetail(activeGroup); showGroupTab('notes');
}

function saveNote(groupNom, email, taskIdx, val) {
  const key = `notes_${groupNom}`;
  if (!state.notes[key]) state.notes[key] = { tasques: [], data: {} };
  if (!state.notes[key].data[email]) state.notes[key].data[email] = {};
  const parsed = parseFloat(val);
  if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
    state.notes[key].data[email][taskIdx] = parsed;
  } else {
    delete state.notes[key].data[email][taskIdx];
  }
  save();
}

// ===== STUDENT HOME =====
function renderStudentHome() {
  const grid = document.getElementById('studentGroupsView');
  document.getElementById('studentGroupDetail').classList.add('hidden');
  grid.style.display = 'grid';
  grid.innerHTML = '';

  const myGroups = state.groups.filter(g => (currentUser.groups||[]).includes(g.nom));
  if (myGroups.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><p>No estàs assignat a cap grup. Posa\'t en contacte amb l\'administrador.</p></div>';
    return;
  }

  const colors = ['#1b3055','#1a6e42','#7a5800','#6a0a7a','#b52d22','#0a5e6a'];
  myGroups.forEach((g, idx) => {
    const alumnes = state.users.filter(u => u.role==='student' && (u.groups||[]).includes(g.nom));
    const tasques = state.events.filter(e => e.groupId === g.nom);
    const upcoming = tasques.filter(t => t.start && new Date(t.start) >= new Date());
    const color = colors[idx % colors.length];
    const d = document.createElement('div');
    d.className = 'classroom-card';
    d.style.borderTop = `3px solid ${color}`;
    d.innerHTML = `
      <div class="classroom-card-icon" style="background:${color}15;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="${color}" width="22" height="22"><path d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
      </div>
      <h4>${g.nom}</h4>
      <p class="cc-course">${g.course}</p>
      <div class="meta">
        <span class="badge badge-blue">${alumnes.length} companys</span>
        <span class="badge badge-green">${tasques.length} tasques</span>
        ${upcoming.length > 0 ? `<span class="badge badge-orange">${upcoming.length} pendent${upcoming.length>1?'s':''}</span>` : ''}
      </div>
    `;
    d.onclick = () => openStudentGroupDetail(g);
    grid.appendChild(d);
  });
}

function openStudentGroupDetail(g) {
  document.getElementById('studentGroupsView').style.display = 'none';
  document.getElementById('studentGroupDetail').classList.remove('hidden');

  const alumnes = state.users.filter(u => u.role==='student' && (u.groups||[]).includes(g.nom));
  const tasques = state.events.filter(e => e.groupId === g.nom).sort((a,b) => new Date(a.start)-new Date(b.start));

  document.getElementById('studentGroupContent').innerHTML = `
    <div class="group-header">
      <div class="group-icon">${g.nom.charAt(0).toUpperCase()}</div>
      <div>
        <div class="group-title">${g.nom}</div>
        <div class="group-subtitle">${g.course} &bull; ${alumnes.length} companys</div>
      </div>
    </div>
    <div class="tabs" id="studentGroupTabs">
      <button class="tab active" onclick="switchStudentGroupTab('tasques')">Tasques</button>
      <button class="tab" onclick="switchStudentGroupTab('companys')">Companys</button>
    </div>
    <div id="sgTabTasques">
      ${tasques.length === 0
        ? '<div class="empty-state"><p>Cap tasca publicada en aquest grup.</p></div>'
        : tasques.map(t => `
          <div class="task-card" style="${new Date(t.start) < new Date() ? 'border-left-color:var(--text3);' : ''}">
            <div class="task-card-title">${t.title.replace(`[${g.nom}] `, '')}</div>
            <div class="task-card-date">${t.start ? '📅 ' + new Date(t.start).toLocaleString('ca', {day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'}) : ''}</div>
            ${t.desc ? `<div class="task-card-desc">${t.desc}</div>` : ''}
          </div>
        `).join('')
      }
    </div>
    <div id="sgTabCompanys" class="hidden">
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Nom Complet</th><th>Correu</th></tr></thead>
          <tbody>
            ${alumnes.filter(a=>a.email!==currentUser.email).map(s=>`<tr><td style="font-weight:600;">${s.nom} ${s.cognoms||''}</td><td class="text-muted">${s.email}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function switchStudentGroupTab(tab) {
  document.getElementById('sgTabTasques').classList.toggle('hidden', tab !== 'tasques');
  document.getElementById('sgTabCompanys').classList.toggle('hidden', tab !== 'companys');
  document.querySelectorAll('#studentGroupTabs .tab').forEach((b,i) => b.classList.toggle('active', i===(tab==='tasques'?0:1)));
}

function backToStudentGroups() {
  document.getElementById('studentGroupsView').style.display = 'grid';
  document.getElementById('studentGroupDetail').classList.add('hidden');
}

// ===== MODAL UTILS =====
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); m.focus && m.focus(); }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// Close on outside click
document.addEventListener('click', e => {
  document.querySelectorAll('.modal-overlay.open').forEach(m => {
    if (e.target === m) m.classList.remove('open');
  });
});

// Close on ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ===== SECURITY: Input validation helpers =====
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== INIT =====
// Check for existing admin user (ensure it always exists)
if (!state.users.find(u => u.role === 'admin')) {
  state.users.unshift({ id:'admin', email:ADMIN_EMAIL, pass:ADMIN_PASS, role:'admin', nom:'Luka', cognoms:'Ferrer', tel:'000' });
  save();
}

console.log('%cCampus Gestió Pro v2.0 — Sistema de Gestió Acadèmica', 'font-family:serif;font-size:14px;color:#1b3055;font-weight:bold;');