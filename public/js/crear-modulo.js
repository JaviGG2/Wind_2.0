document.getElementById('form-crear-modulo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  try {
    const res = await fetch('/admin/api/modulos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value
      })
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = '/admin/modulos';
    } else {
      alert(data.mensaje || 'Error');
    }
  } catch (e) {
    alert('Error de conexión.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear Módulo';
  }
});
