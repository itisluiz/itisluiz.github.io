const API_URL = 'https://prod-16.centralindia.logic.azure.com:443/workflows/91e202f4819f412fbd36f7e056901559/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=COwUkmojskX4x-bUaa2sDd3ItoBoiYnv2POUR-kBfdQ';
const SECRET_STORAGE_KEY = 'fujiko2-secret-code';

const stateTranslations = {
    'running': 'Executando',
    'stopped': 'Parado',
    'deallocated': 'Desalocado',
    'starting': 'Iniciando',
    'stopping': 'Parando',
    'deallocating': 'Desalocando',
    'restarting': 'Reiniciando',
    'unknown': 'Desconhecido'
};

const stateMap = {
    'running': 'state-running',
    'stopped': 'state-stopped',
    'deallocated': 'state-deallocated',
    'starting': 'state-starting',
    'stopping': 'state-stopping',
    'deallocating': 'state-deallocating',
    'restarting': 'state-restarting',
    'unknown': 'state-unknown'
};

// Available actions per state
const availableActions = {
    'running': ['status', 'stop', 'restart'],
    'stopped': ['status', 'start', 'restart'],
    'deallocated': ['status', 'start'],
    'starting': ['status'],
    'stopping': ['status'],
    'deallocating': ['status'],
    'restarting': ['status'],
    'unknown': ['status']
};

let currentState = null;
let isLoading = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const secretModal = document.getElementById('secretModal');
    const secretInput = document.getElementById('secretInput');
    const mainContent = document.getElementById('mainContent');

    // Load secret from storage
    const storedSecret = localStorage.getItem(SECRET_STORAGE_KEY);
    if (storedSecret) {
        secretInput.value = storedSecret;
        initializeApp();
    }

    // Handle secret input - save on blur or Enter
    secretInput.addEventListener('blur', () => {
        saveSecret();
    });

    secretInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveSecret();
        }
    });

    document.getElementById('secretConfirmBtn').addEventListener('click', () => {
        saveSecret();
    });

    document.getElementById('changeSecretBtn').addEventListener('click', () => {
        localStorage.removeItem(SECRET_STORAGE_KEY);
        secretInput.value = '';
        mainContent.classList.add('hidden');
        secretModal.classList.remove('hidden');
        secretInput.focus();
    });

    secretInput.focus();
});

function saveSecret() {
    const secret = document.getElementById('secretInput').value.trim();
    if (secret) {
        localStorage.setItem(SECRET_STORAGE_KEY, secret);
        initializeApp();
    }
}

function initializeApp() {
    const secretModal = document.getElementById('secretModal');
    const mainContent = document.getElementById('mainContent');
    secretModal.classList.add('hidden');
    mainContent.classList.remove('hidden');

    setupEventListeners();
    fetchStatus();
}

function setupEventListeners() {
    const btnStatus = document.getElementById('btnStatus');
    if (btnStatus && !btnStatus.hasListener) {
        btnStatus.addEventListener('click', () => {
            sendAction('status');
        });
        btnStatus.hasListener = true;
    }
}

async function sendAction(action) {
    if (isLoading) return;

    const secret = localStorage.getItem(SECRET_STORAGE_KEY);
    if (!secret) {
        showError('Código de segurança não configurado');
        return;
    }

    isLoading = true;
    showLoadingState(action);
    clearError();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Secret-Code': secret
            },
            body: JSON.stringify({ action })
        });

        if (response.status === 401) {
            showError('Código de segurança inválido');
            localStorage.removeItem(SECRET_STORAGE_KEY);
            location.reload();
            return;
        }

        if (!response.ok) {
            showError(`Erro: ${response.status}`);
            return;
        }

        const data = await response.json();
        updateState(data.state);
        refreshActions();
    } catch (error) {
        showError(`Erro na requisição: ${error.message}`);
    } finally {
        isLoading = false;
        hideLoadingState();
    }
}

async function fetchStatus() {
    await sendAction('status');
}

function updateState(state) {
    currentState = state;
    const stateBadge = document.getElementById('stateBadge');
    const stateLoading = document.getElementById('stateLoading');
    const stateClass = stateMap[state] || stateMap['unknown'];
    const stateText = stateTranslations[state] || stateTranslations['unknown'];

    stateBadge.className = `state-badge ${stateClass}`;
    stateBadge.textContent = stateText;
    stateBadge.classList.remove('hidden');
    stateLoading.style.display = 'none';

    // Update background image based on state
    const onStates = ['running', 'starting', 'restarting'];
    const isOn = onStates.includes(state);
    const backgroundImage = isOn 
        ? "url('/joker-on.jpg')" 
        : "url('/joker-off.jpg')";
    console.log(`State: ${state}, Is On: ${isOn}, Setting background: ${backgroundImage}`);
    document.documentElement.style.setProperty('--bg-image', backgroundImage);
}

function refreshActions() {
    const actionsContainer = document.getElementById('actionsContainer');
    const actions = availableActions[currentState] || ['status'];

    // Clear existing buttons except status
    const buttons = actionsContainer.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.id !== 'btnStatus') {
            btn.remove();
        }
    });

    // Set grid layout
    if (actions.length <= 2) {
        actionsContainer.classList.remove('full');
    } else {
        actionsContainer.classList.add('full');
    }

    // Create buttons for available actions
    actions.forEach(action => {
        if (action === 'status') return; // Already exists

        const button = document.createElement('button');
        button.id = `btn${action.charAt(0).toUpperCase() + action.slice(1)}`;
        button.className = `btn-${action}`;
        button.textContent = getActionLabel(action);
        button.addEventListener('click', () => {
            sendAction(action);
        });
        actionsContainer.appendChild(button);
    });

    // Disable action buttons while loading
    const allButtons = actionsContainer.querySelectorAll('button');
    allButtons.forEach(btn => {
        btn.disabled = isLoading;
    });
}

function getActionLabel(action) {
    const labels = {
        'status': 'Status',
        'start': 'Iniciar',
        'stop': 'Parar',
        'restart': 'Reiniciar'
    };
    return labels[action] || action;
}

function showLoadingState(action) {
    const loadingState = document.getElementById('loadingState');
    const loadingText = document.getElementById('loadingText');
    const actionLabel = getActionLabel(action);

    loadingText.textContent = `${actionLabel}...`;
    loadingState.classList.remove('hidden');

    // Disable all buttons
    document.querySelectorAll('.actions button').forEach(btn => {
        btn.disabled = true;
    });
}

function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    loadingState.classList.add('hidden');

    // Re-enable buttons
    document.querySelectorAll('.actions button').forEach(btn => {
        btn.disabled = false;
    });
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function clearError() {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.classList.remove('show');
}
// MC Server Copy Button
document.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById('copyBtn');
    const serverAddress = document.getElementById('serverAddress');

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const address = serverAddress.textContent;
            navigator.clipboard.writeText(address).then(() => {
                // Visual feedback
                copyBtn.classList.add('copied');
                const originalSvg = copyBtn.innerHTML;
                copyBtn.innerHTML = '✓';
                
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = originalSvg;
                }, 2000);
            });
        });
    }
});
