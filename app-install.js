(function () {
    const button = document.getElementById('installAppButton');
    const help = document.getElementById('installAppHelp');
    let installPrompt = null;

    function showHelp(message) {
        help.textContent = message;
        help.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
    }

    function installed() {
        return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    }

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        installPrompt = event;
    });

    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        showHelp('App instalada. Puedes abrirla desde el inicio de tu dispositivo.');
    });

    button.addEventListener('click', async () => {
        if (installed()) {
            showHelp('Ya estás usando la app instalada.');
            return;
        }
        if (installPrompt) {
            const prompt = installPrompt;
            installPrompt = null;
            try {
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice.outcome !== 'accepted') {
                    showHelp('La instalación se canceló. Para intentarlo de nuevo, usa el menú de tu navegador.');
                }
            } catch (error) {
                console.error('No se pudo abrir la instalación:', error);
                showHelp('No se pudo abrir la instalación. Usa el menú del navegador y busca «Instalar» o «Agregar a pantalla de inicio».');
            }
            return;
        }
        showHelp('En iPhone o iPad, abre este sitio en Safari y elige Compartir → Agregar a pantalla de inicio. En Android o computadora, usa el menú del navegador y busca «Instalar» o «Agregar a pantalla de inicio». La disponibilidad depende del navegador.');
    });

    if ('serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js').catch(error => {
                console.error('No se pudo registrar la app:', error);
                showHelp('No se pudo preparar la instalación. Comprueba tu conexión e inténtalo de nuevo.');
            });
        });
    }
})();
