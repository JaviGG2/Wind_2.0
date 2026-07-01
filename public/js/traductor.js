(function () {
    const idioma = localStorage.getItem('wind_idioma');
    if (!idioma) return;

    const excluir = ['STYLE', 'SCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE'];

    function recolectarTextos(nodo) {
        const textos = [];
        const walker = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT, null, false);
        while (walker.nextNode()) {
            const padre = walker.currentNode.parentElement;
            if (!padre) continue;
            if (padre.classList && padre.classList.contains('material-symbols-outlined')) continue;
            const texto = walker.currentNode.textContent.trim();
            if (texto.length > 1 && !excluir.includes(padre.nodeName)) {
                textos.push({ nodo: walker.currentNode, texto });
            }
        }
        return textos;
    }

    async function traducirTodo() {
        const textos = recolectarTextos(document.body);
        if (textos.length === 0) return;

        const fragmentos = [];
        let lote = [];
        let charCount = 0;

        for (const t of textos) {
            if (charCount + t.texto.length > 3000 && lote.length > 0) {
                fragmentos.push(lote);
                lote = [];
                charCount = 0;
            }
            lote.push(t);
            charCount += t.texto.length;
        }
        if (lote.length > 0) fragmentos.push(lote);

        for (const lote of fragmentos) {
            try {
                const res = await fetch('/api/traducir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        textos: lote.map(t => t.texto),
                        idioma
                    })
                });
                if (!res.ok) continue;
                const data = await res.json();
                if (data.traducciones) {
                    lote.forEach((t, i) => {
                        if (data.traducciones[i] && data.traducciones[i] !== t.texto) {
                            t.nodo.textContent = data.traducciones[i];
                        }
                    });
                }
            } catch {}
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', traducirTodo);
    } else {
        traducirTodo();
    }
})();
