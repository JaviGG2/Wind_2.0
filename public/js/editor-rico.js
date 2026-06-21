function inicializarEditor(textareaId, editorId) {
    const textarea = document.getElementById(textareaId);
    const editor = document.getElementById(editorId);

    if (!textarea || !editor) return;

    // Pasar contenido inicial del textarea al editor
    if (textarea.value) {
        editor.innerHTML = textarea.value;
    }

    // Sincronizar editor → textarea antes del submit
    const form = textarea.closest('form');
    if (form) {
        form.addEventListener('submit', () => {
            textarea.value = editor.innerHTML;
        });
    }

    // Atajos de teclado
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    });
}

function ejecutarComando(comando, valor) {
    document.execCommand(comando, false, valor || null);
    document.getElementById('editor-contenido').focus();
}

function insertarEnlace() {
    const url = prompt('URL del enlace:');
    if (url) {
        document.execCommand('createLink', false, url);
        document.getElementById('editor-contenido').focus();
    }
}
