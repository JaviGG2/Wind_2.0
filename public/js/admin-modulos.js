document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('admin-modulos-listado');
  const mensaje = document.getElementById('admin-modulos-mensaje');

  async function cargarModulos() {
    try {
      const res = await fetch('/admin/api/modulos', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const modulos = await res.json();

      if (modulos.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#777;">Aún no has creado módulos.</p>';
        return;
      }

      container.innerHTML = modulos.map(m => `
        <div class="modulo-admin-item">
          <div>
            <strong>${m.nombre}</strong>
            <p style="margin:4px 0 0;font-size:0.85rem;color:#666;">${m.descripcion || ''} · ${m.total_niveles} nivel(es)</p>
          </div>
          <a href="/admin/editar-modulo?id=${m.id}" class="btn-outline" style="padding:6px 14px;font-size:0.85rem;">Gestionar</a>
        </div>
      `).join('');
    } catch (e) {
      mensaje.textContent = 'Error al cargar módulos.';
      mensaje.className = 'mensaje-alerta error';
    }
  }

  await cargarModulos();
});
