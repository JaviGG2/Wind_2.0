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
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <a href="/admin/editar-modulo?id=${m.id}" class="btn-outline" style="padding:6px 14px;font-size:0.85rem;">Gestionar</a>
            <button type="button" class="btn-outline btn-eliminar-admin-modulo" data-id="${m.id}" style="padding:6px 14px;font-size:0.85rem;color:#dc2626;border-color:#dc2626;">
              <span class="material-symbols-outlined" style="font-size:1rem;">delete</span>
            </button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.btn-eliminar-admin-modulo').forEach(btn => {
        btn.addEventListener('click', async function() {
          if (!confirm('¿Eliminar este módulo? Se borrarán todos sus niveles y juegos.')) return;
          try {
            const res = await fetch(`/admin/api/modulos/${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) { const d = await res.json(); alert(d.mensaje || 'Error'); return; }
            await cargarModulos();
          } catch { alert('Error de conexión.'); }
        });
      });
    } catch (e) {
      mensaje.textContent = 'Error al cargar módulos.';
      mensaje.className = 'mensaje-alerta error';
    }
  }

  await cargarModulos();
});
