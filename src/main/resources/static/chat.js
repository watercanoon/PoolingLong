document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    startLongPolling();

    // Soporte para tecla Enter en el input de mensaje
    const messageInput = document.getElementById('message');
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita saltos de línea indeseados
            sendMessage();
        }
    });
});

// 1. Cargar el historial desde el API REST
async function loadHistory() {
    try {
        const response = await fetch('/api/lp-chat/history');
        const messages = await response.json();
        // Al cargar historial no lanzamos notificaciones, solo pintamos
        messages.forEach(msg => displayMessage(msg, false));
    } catch (error) {
        console.error("Error cargando historial", error);
        showNotification("SISTEMA", "Fallo al conectar con DB", "bg-red-600 text-white");
    }
}

// 2. Bucle infinito de peticiones suspendidas (LONG POLLING)
async function startLongPolling() {
    updateStatus(true);
    try {
        const response = await fetch('/api/lp-chat/poll');
        if (response.ok) {
            const newMessages = await response.json();
            if (newMessages.length > 0) {
                // Al recibir mensaje nuevo, SI activamos notificaciones
                newMessages.forEach(msg => displayMessage(msg, true));
            }
        }
    } catch (error) {
        updateStatus(false);
        console.error("Reintentando conexión...", error);
        // Si hay error (ej. se cae el servidor), espera 5 seg antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 5000));
    } finally {
        // Ejecución recursiva: vuelve a iniciar la petición de inmediato
        startLongPolling();
    }
}

// 3. Enviar mensaje (POST REST)
async function sendMessage() {
    const user = document.getElementById('username').value.trim();
    const content = document.getElementById('message').value.trim();

    if (user && content) {
        const msgObj = { sender: user, content: content };
        try {
            await fetch('/api/lp-chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(msgObj)
            });
            document.getElementById('message').value = '';
        } catch (err) {
            showNotification("ERROR", "No se pudo enviar el mensaje", "bg-red-600 text-white");
        }
    } else {
        showNotification("AVISO", "Debes ingresar tu nombre y un mensaje", "bg-orange-500 text-white");
    }
}

// 4. Renderizado en pantalla
function displayMessage(msg, notify = false) {
    const chatBox = document.getElementById('chat-box');
    const currentUser = document.getElementById('username').value.trim();
    const isMe = currentUser === msg.sender;

    const div = document.createElement('div');
    div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} message-in`;

    div.innerHTML = `
        <div class="max-w-[80%] md:max-w-md p-3 rounded-2xl shadow-lg ${isMe ? 'bg-yellow-500 text-slate-900 rounded-tr-none' : 'bg-slate-700 text-white rounded-tl-none'}">
            <p class="text-[10px] font-mono font-bold uppercase tracking-widest ${isMe ? 'text-yellow-900' : 'text-yellow-400'}">${msg.sender}</p>
            <p class="text-sm mt-1">${msg.content}</p>
            <p class="text-[9px] text-right mt-1 font-mono ${isMe ? 'text-yellow-800' : 'text-slate-400'}">${msg.timestamp || ''}</p>
        </div>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Solo notificar si es un mensaje nuevo y NO es mío
    if (notify && !isMe) {
        showNotification("NUEVO MENSAJE", `${msg.sender} envió: ${msg.content.substring(0, 15)}...`, "bg-slate-800 border-l-4 border-yellow-500 text-white");
    }
}

// 5. Sistema de Notificaciones Toasts
function showNotification(title, text, styleClasses) {
    const container = document.getElementById('notifications');
    const toast = document.createElement('div');
    toast.className = `${styleClasses} p-3 rounded shadow-2xl animate__animated animate__fadeInRight flex flex-col min-w-[250px]`;

    toast.innerHTML = `
        <strong class="text-xs font-black tracking-tighter">${title}</strong>
        <span class="text-[11px] font-medium">${text}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
        setTimeout(() => toast.remove(), 500); // Borra del DOM tras animar
    }, 4000); // 4 segundos de visibilidad
}

// 6. Actualizador de estado UI
function updateStatus(isPolling) {
    const badge = document.getElementById('status-badge');
    if (isPolling) {
        // Texto que da seguridad al usuario
        badge.innerText = "En Línea";
        // Cambiamos de amarillo a esmeralda/verde para indicar éxito
        badge.className = "text-xs bg-emerald-900/30 border border-emerald-500 text-emerald-400 px-3 py-1 rounded-full transition-all";
    } else {
        // Mensaje claro de caída
        badge.innerText = "Reintentando conexión...";
        badge.className = "text-xs bg-red-900/30 border border-red-500 text-red-400 px-3 py-1 rounded-full transition-all";
    }
}