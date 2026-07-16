const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
let cache = {};
let recargarTimeout = null;

// --- Login ---
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const user = $('#login-user').value.trim();
  const pass = $('#login-pass').value.trim();
  const err = $('#login-error');
  const btn = e.target.querySelector('.login-btn');
  btn.disabled = true; btn.textContent = 'Verificando...'; err.textContent = '';
  try {
    const r = await fetch('/0505/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: user, contrasena: pass })
    });
    const d = await r.json();
    if (r.ok) {
      $('#login-overlay').style.display = 'none';
      $('#panel-root').style.display = 'flex';
      iniciarPanel();
    } else {
      err.textContent = d.mensaje || 'Credenciales incorrectas.';
      btn.disabled = false; btn.textContent = 'Ingresar';
    }
  } catch { err.textContent = 'Error de conexión.'; btn.disabled = false; btn.textContent = 'Ingresar'; }
});

$('#btn-logout').addEventListener('click', async () => {
  await fetch('/0505/logout', { method: 'POST' });
  location.reload();
});

// --- Panel ---
async function iniciarPanel() {
  $('#panel-content').innerHTML = '<img src="/images/loading.svg" class="anim-loading" alt="Cargando...">';
  try {
    const [usuarios, categorias, juegos, temas, relatos, modulos, feedback, solicitudes, recientes] = await Promise.all([
      fetch('/0505/api/usuarios').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/categorias').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/juegos').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/temas').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/relatos').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/modulos').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/feedback').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/solicitudes').then(r => r.ok ? r.json() : []),
      fetch('/0505/api/temas/recientes').then(r => r.ok ? r.json() : []),
      new Promise(r => setTimeout(r, 1000))
    ]);
    cache = { usuarios, categorias, juegos, temas, relatos, modulos, feedback, solicitudes, recientes };
    mostrarResumen();
    configurarNavegacion();
  } catch { $('#panel-content').innerHTML = '<div style="color:#ef4444;padding:40px;text-align:center;">Error al cargar datos.</div>'; }
}

function programarRecarga() {
  if (recargarTimeout) clearTimeout(recargarTimeout);
  recargarTimeout = setTimeout(async () => {
    const active = $('.panel-nav-item.active');
    const tab = active ? active.dataset.tab : 'resumen';
    try {
      const [usuarios, categorias, juegos, temas, relatos, modulos, feedback, solicitudes, recientes] = await Promise.all([
        fetch('/0505/api/usuarios').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/categorias').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/juegos').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/temas').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/relatos').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/modulos').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/feedback').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/solicitudes').then(r => r.ok ? r.json() : []),
        fetch('/0505/api/temas/recientes').then(r => r.ok ? r.json() : [])
      ]);
      cache = { usuarios, categorias, juegos, temas, relatos, modulos, feedback, solicitudes, recientes };
      if (tab === 'resumen') mostrarResumen();
      else if (tab === 'usuarios') mostrarUsuarios();
      else if (tab === 'temas') mostrarTemas();
      else if (tab === 'recientes') mostrarRecientes();
      else if (tab === 'juegos') mostrarJuegos();
      else if (tab === 'relatos') mostrarRelatos();
      else if (tab === 'modulos') mostrarModulos();
      else if (tab === 'categorias') mostrarCategorias();
      else if (tab === 'solicitudes') mostrarSolicitudes();
      else if (tab === 'feedback') mostrarFeedback();
    } catch {}
  }, 100);
}

function configurarNavegacion() {
  $$('.panel-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.panel-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'resumen') mostrarResumen();
      else if (tab === 'usuarios') mostrarUsuarios();
      else if (tab === 'temas') mostrarTemas();
      else if (tab === 'recientes') mostrarRecientes();
      else if (tab === 'juegos') mostrarJuegos();
      else if (tab === 'relatos') mostrarRelatos();
      else if (tab === 'modulos') mostrarModulos();
      else if (tab === 'categorias') mostrarCategorias();
      else if (tab === 'solicitudes') mostrarSolicitudes();
      else if (tab === 'feedback') mostrarFeedback();
    });
  });
}

// --- Modales ---
function modal(html) {
  const div = document.createElement('div');
  div.className = 'modal-overlay';
  div.innerHTML = `<div class="modal-card">${html}</div>`;
  div.addEventListener('click', e => { if (e.target === div) div.remove(); });
  document.body.appendChild(div);
  return div.querySelector('.modal-card');
}

function cerrarModal() {
  const ov = document.querySelector('.modal-overlay');
  if (ov) ov.remove();
}

function confirmar(mensaje) {
  return new Promise(resolve => {
    const card = modal(`
      <h3>Confirmar</h3>
      <p class="modal-desc">${mensaje}</p>
      <div class="modal-actions">
        <button class="modal-btn secondary" id="modal-cancel">Cancelar</button>
        <button class="modal-btn danger" id="modal-confirm">Eliminar</button>
      </div>
    `);
    card.querySelector('#modal-confirm').addEventListener('click', () => { cerrarModal(); resolve(true); });
    card.querySelector('#modal-cancel').addEventListener('click', () => { cerrarModal(); resolve(false); });
  });
}

function apiCall(method, url, body) {
  return fetch(url, {
    method, headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function eliminar(url, label) {
  if (!await confirmar(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
  try {
    const r = await apiCall('DELETE', url);
    const d = await r.json();
    if (r.ok) { notificar(d.mensaje || 'Eliminado.', 'success'); programarRecarga(); }
    else { notificar(d.mensaje || 'Error.', 'error'); }
  } catch { notificar('Error de conexión.', 'error'); }
}

function notificar(texto, tipo) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:10px;font-size:0.88rem;font-weight:600;z-index:30000;animation:fadeIn 0.2s;background:${tipo === 'success' ? '#10b981' : '#ef4444'};color:#fff;max-width:340px;box-shadow:0 8px 24px rgba(0,0,0,0.3);`;
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// --- Resumen ---
function mostrarResumen() {
  const { usuarios, categorias, juegos, temas, relatos, modulos, feedback } = cache;
  const e = (usuarios||[]).filter(u => u.rol === 'Especialista').length;
  const n = (usuarios||[]).filter(u => u.rol === 'Natural').length;
  const pts = (usuarios||[]).reduce((s, u) => s + (u.puntos || 0), 0);
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">dashboard</span>Resumen</h2>
      <div class="ctrl-stat-grid">
        <div class="ctrl-stat"><div class="ctrl-stat-num">${(usuarios||[]).length}</div><div class="ctrl-stat-label">Usuarios</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${e}</div><div class="ctrl-stat-label">Especialistas</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${n}</div><div class="ctrl-stat-label">Naturales</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${pts}</div><div class="ctrl-stat-label">Puntos totales</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${(temas||[]).length}</div><div class="ctrl-stat-label">Temas</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${(juegos||[]).length}</div><div class="ctrl-stat-label">Juegos</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${(relatos||[]).length}</div><div class="ctrl-stat-label">Relatos</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${(modulos||[]).length}</div><div class="ctrl-stat-label">Módulos</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${(categorias||[]).length}</div><div class="ctrl-stat-label">Categorías</div></div>
        <div class="ctrl-stat"><div class="ctrl-stat-num">${(feedback||[]).length}</div><div class="ctrl-stat-label">Feedbacks</div></div>
      </div>
    </div>`;
}

// --- Usuarios ---
function mostrarUsuarios() {
  const list = cache.usuarios || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">group</span>Usuarios (${list.length})</h2>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin datos.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Nombre</th><th>Username</th><th>Rol</th><th>Puntos</th><th>Activo</th><th style="width:100px;">Acción</th></tr></thead>
          <tbody>${list.map(u => `
            <tr>
              <td>${u.id}</td>
              <td>${esc(u.nombre)}</td>
              <td>${esc(u.username)}</td>
              <td><span class="ctrl-badge-rol ${(u.rol||'').toLowerCase()}">${esc(u.rol)}</span></td>
              <td>${u.puntos || 0}</td>
              <td>${u.cuenta_activa ? '✓' : '✗'}</td>
              <td><div class="ctrl-actions">
                <button class="ctrl-btn edit" onclick='editarUsuario(${u.id},"${escAttr(u.nombre)}","${escAttr(u.username)}","${escAttr(u.rol)}")' title="Editar"><span class="material-symbols-outlined">edit</span></button>
                <button class="ctrl-btn warn" onclick='advertirUsuario(${u.id},"${escAttr(u.nombre)}")' title="Advertir"><span class="material-symbols-outlined">warning</span></button>
                <button class="ctrl-btn delete" onclick="eliminar('/0505/api/usuarios/${u.id}','usuario #${u.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

function editarUsuario(id, nombre, username, rol) {
  const card = modal(`
    <button class="modal-close" onclick="cerrarModal()"><span class="material-symbols-outlined">close</span></button>
    <h3>Editar Usuario #${id}</h3>
    <p class="modal-desc">Actualiza los datos del usuario.</p>
    <form class="modal-form" id="form-edit-usuario">
      <div class="modal-field"><label>Nombre</label><input class="modal-input" id="eu-nombre" value="${nombre}"></div>
      <div class="modal-field"><label>Username</label><input class="modal-input" id="eu-username" value="${username}"></div>
      <div class="modal-field"><label>Rol</label>
        <select class="modal-input" id="eu-rol">
          <option value="Natural" ${rol==='Natural'?'selected':''}>Natural</option>
          <option value="Especialista" ${rol==='Especialista'?'selected':''}>Especialista</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="modal-btn secondary" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="modal-btn primary">Guardar</button>
      </div>
      <div id="eu-msg" class="modal-msg"></div>
    </form>
  `);
  card.querySelector('#form-edit-usuario').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('.modal-btn.primary');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      const r = await apiCall('PUT', `/0505/api/usuarios/${id}`, {
        nombre: $('#eu-nombre').value.trim(),
        username: $('#eu-username').value.trim(),
        rol: $('#eu-rol').value
      });
      const d = await r.json();
      if (r.ok) { cerrarModal(); notificar('Usuario actualizado.', 'success'); programarRecarga(); }
      else { $('#eu-msg').textContent = d.mensaje; $('#eu-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Guardar'; }
    } catch { $('#eu-msg').textContent = 'Error de conexión.'; $('#eu-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Guardar'; }
  });
}

function advertirUsuario(id, nombre) {
  const card = modal(`
    <button class="modal-close" onclick="cerrarModal()"><span class="material-symbols-outlined">close</span></button>
    <h3>Advertir a ${nombre}</h3>
    <p class="modal-desc">Se enviará una notificación al usuario.</p>
    <form class="modal-form" id="form-advertir">
      <div class="modal-field"><label>Título</label><input class="modal-input" id="aw-titulo" placeholder="Ej: Comportamiento inadecuado"></div>
      <div class="modal-field"><label>Mensaje</label><textarea class="modal-textarea" id="aw-mensaje" placeholder="Describe la advertencia..."></textarea></div>
      <div class="modal-actions">
        <button type="button" class="modal-btn secondary" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="modal-btn primary" style="background:#f59e0b;">Enviar advertencia</button>
      </div>
      <div id="aw-msg" class="modal-msg"></div>
    </form>
  `);
  card.querySelector('#form-advertir').addEventListener('submit', async e => {
    e.preventDefault();
    const titulo = $('#aw-titulo').value.trim();
    const mensaje = $('#aw-mensaje').value.trim();
    if (!titulo || !mensaje) { $('#aw-msg').textContent = 'Completa todos los campos.'; $('#aw-msg').className = 'modal-msg error'; return; }
    const btn = e.target.querySelector('.modal-btn.primary');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const r = await apiCall('POST', `/0505/api/usuarios/${id}/advertir`, { titulo, mensaje });
      const d = await r.json();
      if (r.ok) { cerrarModal(); notificar('Advertencia enviada.', 'success'); }
      else { $('#aw-msg').textContent = d.mensaje; $('#aw-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Enviar advertencia'; }
    } catch { $('#aw-msg').textContent = 'Error.'; $('#aw-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Enviar advertencia'; }
  });
}

// --- Categorías ---
function mostrarCategorias() {
  const list = cache.categorias || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">category</span>Categorías (${list.length})</h2>
      <div style="margin-bottom:14px;"><button class="ctrl-btn add" onclick="agregarCategoria()"><span class="material-symbols-outlined">add</span> Agregar categoría</button></div>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin datos.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Nombre</th><th>Temas</th><th>Juegos</th><th style="width:80px;">Acción</th></tr></thead>
          <tbody>${list.map(c => `
            <tr>
              <td>${c.id}</td>
              <td>${esc(c.nombre)}</td>
              <td><span class="ctrl-badge temas">${c.conteo_temas || 0}</span></td>
              <td><span class="ctrl-badge juegos">${c.conteo_juegos || 0}</span></td>
              <td><div class="ctrl-actions">
                <button class="ctrl-btn edit" onclick='editarCategoria(${c.id},"${escAttr(c.nombre)}")' title="Editar"><span class="material-symbols-outlined">edit</span></button>
                <button class="ctrl-btn delete" onclick="eliminar('/0505/api/categorias/${c.id}','categoría #${c.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

function agregarCategoria() {
  const card = modal(`
    <button class="modal-close" onclick="cerrarModal()"><span class="material-symbols-outlined">close</span></button>
    <h3>Agregar Categoría</h3>
    <p class="modal-desc">Crea una nueva categoría temática.</p>
    <form class="modal-form" id="form-add-categoria">
      <div class="modal-field"><label>Nombre</label><input class="modal-input" id="ac-nombre" placeholder="Ej: Arquitectura"></div>
      <div class="modal-actions">
        <button type="button" class="modal-btn secondary" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="modal-btn primary">Crear</button>
      </div>
      <div id="ac-msg" class="modal-msg"></div>
    </form>
  `);
  card.querySelector('#form-add-categoria').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('#ac-nombre').value.trim();
    if (!nombre) { $('#ac-msg').textContent = 'Escribe un nombre.'; $('#ac-msg').className = 'modal-msg error'; return; }
    const btn = e.target.querySelector('.modal-btn.primary');
    btn.disabled = true; btn.textContent = 'Creando...';
    try {
      const r = await apiCall('POST', '/0505/api/categorias', { nombre });
      if (r.ok) { cerrarModal(); notificar('Categoría creada.', 'success'); programarRecarga(); }
      else { const d = await r.json(); $('#ac-msg').textContent = d.mensaje; $('#ac-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Crear'; }
    } catch { $('#ac-msg').textContent = 'Error.'; $('#ac-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Crear'; }
  });
}

function editarCategoria(id, nombre) {
  const card = modal(`
    <button class="modal-close" onclick="cerrarModal()"><span class="material-symbols-outlined">close</span></button>
    <h3>Editar Categoría #${id}</h3>
    <p class="modal-desc">Cambia el nombre de la categoría.</p>
    <form class="modal-form" id="form-edit-categoria">
      <div class="modal-field"><label>Nombre</label><input class="modal-input" id="ec-nombre" value="${nombre}"></div>
      <div class="modal-actions">
        <button type="button" class="modal-btn secondary" onclick="cerrarModal()">Cancelar</button>
        <button type="submit" class="modal-btn primary">Guardar</button>
      </div>
      <div id="ec-msg" class="modal-msg"></div>
    </form>
  `);
  card.querySelector('#form-edit-categoria').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('#ec-nombre').value.trim();
    if (!nombre) { $('#ec-msg').textContent = 'Escribe un nombre.'; $('#ec-msg').className = 'modal-msg error'; return; }
    const btn = e.target.querySelector('.modal-btn.primary');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      const r = await apiCall('PUT', `/0505/api/categorias/${id}`, { nombre });
      if (r.ok) { cerrarModal(); notificar('Categoría actualizada.', 'success'); programarRecarga(); }
      else { $('#ec-msg').textContent = 'Error.'; $('#ec-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Guardar'; }
    } catch { $('#ec-msg').textContent = 'Error.'; $('#ec-msg').className = 'modal-msg error'; btn.disabled = false; btn.textContent = 'Guardar'; }
  });
}

// --- Temas ---
function mostrarTemas() {
  const list = cache.temas || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">article</span>Temas (${list.length})</h2>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin datos.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Título</th><th>Categoría</th><th>Creador</th><th>Likes</th><th>Estado</th><th style="width:60px;">Acción</th></tr></thead>
          <tbody>${list.map(t => `
            <tr>
              <td>${t.id}</td>
              <td class="truncate">${esc(t.titulo)}</td>
              <td>${esc(t.categoria_nombre || '—')}</td>
              <td>${esc(t.creador_nombre || t.creador_username || '—')}</td>
              <td>${t.likes || 0}</td>
              <td><span class="ctrl-estado ${t.estado}">${t.estado || 'aprobado'}</span></td>
              <td><div class="ctrl-actions">
                <button class="ctrl-btn delete" onclick="eliminar('/0505/api/temas/${t.id}','tema #${t.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

// --- Revisar temas ---
function mostrarRecientes() {
  const list = cache.recientes || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">rate_review</span>Revisar Temas (${list.length})</h2>
      ${list.length === 0 ? '<div class="ctrl-empty">No hay temas para revisar.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Título</th><th>Categoría</th><th>Creador</th><th>Estado</th><th>Fecha</th><th style="width:100px;">Acción</th></tr></thead>
          <tbody>${list.map(t => `
            <tr>
              <td>${t.id}</td>
              <td class="truncate">${esc(t.titulo)}</td>
              <td>${esc(t.categoria_nombre || '—')}</td>
              <td>${esc(t.creador_nombre || t.creador_username || '—')}</td>
              <td><span class="ctrl-estado ${t.estado}">${t.estado || 'aprobado'}</span></td>
              <td>${t.fecha_publicacion ? new Date(t.fecha_publicacion).toLocaleDateString() : '—'}</td>
              <td><div class="ctrl-actions">
                ${t.estado !== 'rechazado' ? `<button class="ctrl-btn reject" onclick="rechazarTema(${t.id})" title="Rechazar"><span class="material-symbols-outlined">close</span></button>` : ''}
                <button class="ctrl-btn delete" onclick="eliminar('/0505/api/temas/${t.id}','tema #${t.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

async function rechazarTema(id) {
  if (!await confirmar('¿Rechazar este tema? Se notificará al creador y el tema dejará de ser visible.')) return;
  try {
    const r = await apiCall('POST', `/0505/api/temas/${id}/rechazar`);
    const d = await r.json();
    if (r.ok) { notificar(d.mensaje || 'Rechazado.', 'success'); programarRecarga(); }
    else { notificar(d.mensaje || 'Error.', 'error'); }
  } catch { notificar('Error de conexión.', 'error'); }
}

// --- Juegos ---
function mostrarJuegos() {
  const list = cache.juegos || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">sports_esports</span>Juegos (${list.length})</h2>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin datos.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Título</th><th>Tipo</th><th>Categoría</th><th>Pts</th><th style="width:60px;">Acción</th></tr></thead>
          <tbody>${list.map(j => `
            <tr>
              <td>${j.id}</td>
              <td class="truncate">${esc(j.titulo || j.pregunta)}</td>
              <td>${esc(j.tipo)}</td>
              <td>${esc(j.categoria_nombre || '—')}</td>
              <td>${j.puntos_recompensa || 10}</td>
              <td><div class="ctrl-actions">
                <button class="ctrl-btn delete" onclick="eliminar('/0505/api/juegos/${j.id}','juego #${j.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

// --- Relatos ---
function mostrarRelatos() {
  const list = cache.relatos || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">book</span>Relatos (${list.length})</h2>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin datos.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Título</th><th>Autor</th><th>Fecha</th><th style="width:60px;">Acción</th></tr></thead>
          <tbody>${list.map(r => `
            <tr>
              <td>${r.id}</td>
              <td class="truncate">${esc(r.titulo)}</td>
              <td>${esc(r.autor_nombre || r.autor_username || '—')}</td>
              <td>${r.fecha_publicacion ? new Date(r.fecha_publicacion).toLocaleDateString() : '—'}</td>
              <td><div class="ctrl-actions">
                <button class="ctrl-btn delete" onclick="eliminar('/0505/api/relatos/${r.id}','relato #${r.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

// --- Módulos ---
function mostrarModulos() {
  const list = cache.modulos || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">layers</span>Módulos (${list.length})</h2>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin datos.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Nombre</th><th>Creador</th><th>Niveles</th></tr></thead>
          <tbody>${list.map(m => `
            <tr><td>${m.id}</td><td class="truncate">${esc(m.nombre)}</td><td>${esc(m.creador_nombre || '—')}</td><td>${m.total_niveles || 0}</td></tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

// --- Solicitudes ---
async function mostrarSolicitudes() {
  const list = cache.solicitudes || [];
  const pendientes = list.filter(s => s.estado === 'pendiente').length;
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">person_add</span>Solicitudes de Especialista <span class="ctrl-badge solicitudes">${pendientes} pendientes</span></h2>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin solicitudes.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Mensaje</th><th>Foto</th><th>Estado</th><th>Fecha</th><th style="width:100px;">Acción</th></tr></thead>
          <tbody>${list.map(s => `
            <tr>
              <td>${s.id}</td>
              <td>${esc(s.username)}</td>
              <td>${esc(s.nombre)}</td>
              <td>${esc(s.correo)}</td>
              <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.mensaje || '—')}</td>
              <td>${s.foto_url ? `<a href="${escAttr(s.foto_url)}" target="_blank" title="Ver foto"><span class="material-symbols-outlined" style="font-size:18px;color:#64b5f6;">image</span></a>` : '—'}</td>
              <td><span class="ctrl-estado ${s.estado}">${s.estado}</span></td>
              <td style="font-size:0.75rem;">${s.fecha_creacion ? new Date(s.fecha_creacion).toLocaleDateString() : '—'}</td>
              <td><div class="ctrl-actions">
                ${s.estado === 'pendiente' ? `
                  <button class="ctrl-btn approve" onclick="aprobarSolicitud(${s.id})" title="Aprobar"><span class="material-symbols-outlined">check</span></button>
                  <button class="ctrl-btn reject" onclick="rechazarSolicitud(${s.id})" title="Rechazar"><span class="material-symbols-outlined">close</span></button>
                ` : '—'}
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

async function aprobarSolicitud(id) {
  if (!await confirmar('¿Aprobar esta solicitud? El usuario se convertirá en Especialista.')) return;
  try {
    const r = await apiCall('PUT', `/0505/api/solicitudes/${id}/aprobar`);
    const d = await r.json();
    if (r.ok) { notificar(d.mensaje || 'Aprobada.', 'success'); programarRecarga(); }
    else { notificar(d.mensaje || 'Error.', 'error'); }
  } catch { notificar('Error de conexión.', 'error'); }
}

async function rechazarSolicitud(id) {
  if (!await confirmar('¿Rechazar esta solicitud?')) return;
  try {
    const r = await apiCall('PUT', `/0505/api/solicitudes/${id}/rechazar`);
    const d = await r.json();
    if (r.ok) { notificar(d.mensaje || 'Rechazada.', 'success'); programarRecarga(); }
    else { notificar(d.mensaje || 'Error.', 'error'); }
  } catch { notificar('Error de conexión.', 'error'); }
}

// --- Feedback ---
function mostrarFeedback() {
  const list = cache.feedback || [];
  $('#panel-content').innerHTML = `
    <div class="panel-tab">
      <h2><span class="material-symbols-outlined">feedback</span>Feedback (${list.length})</h2>
      ${list.length === 0 ? '<div class="ctrl-empty">Sin datos.</div>' : `
      <div class="ctrl-card" style="overflow-x:auto;">
        <table class="ctrl-table">
          <thead><tr><th>ID</th><th>Usuario</th><th>Mensaje</th><th>Fecha</th><th style="width:60px;">Acción</th></tr></thead>
          <tbody>${list.map(f => `
            <tr>
              <td>${f.id}</td>
              <td>${esc(f.usuario_nombre || f.usuario_username || '—')}</td>
              <td class="truncate">${esc(f.mensaje)}</td>
              <td>${f.fecha_creacion ? new Date(f.fecha_creacion).toLocaleDateString() : '—'}</td>
              <td><div class="ctrl-actions">
                <button class="ctrl-btn delete" onclick="eliminar('/0505/api/feedback/${f.id}','feedback #${f.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
              </div></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`}
    </div>`;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
function escAttr(s) {
  return esc(s).replace(/'/g, '&#39;');
}
