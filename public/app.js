/* Проект разработан: Мадрахимов Сарвар */

document.addEventListener('DOMContentLoaded', () => {
    // Set default date for verification
    document.getElementById('verify-date').valueAsDate = new Date();

    // Event Listeners for UI interaction
    document.getElementById('key-algo').addEventListener('change', toggleKeyAlgoOptions);

    // Button actions
    document.getElementById('btn-generate-key').addEventListener('click', generateKeyCommand);
    document.getElementById('btn-generate-csr').addEventListener('click', generateCSRCommand);
    document.getElementById('btn-cert-self').addEventListener('click', () => generateCertificateCommand('self'));
    document.getElementById('btn-cert-ca').addEventListener('click', () => generateCertificateCommand('ca'));
    
    document.getElementById('btn-verify-struct').addEventListener('click', showCertificateStructure);
    document.getElementById('btn-verify-dates').addEventListener('click', checkCertificateValidity);
    document.getElementById('btn-verify-ca').addEventListener('click', verifyCertificate);
    document.getElementById('btn-verify-hash').addEventListener('click', generateFingerprintCommand);
    
    document.getElementById('btn-clear-log').addEventListener('click', clearResultLog);

    // Render static command list
    renderCommandsList();
});

// Logs State
let successCount = 0;
let errorCount = 0;

// UI Helpers
function toggleKeyAlgoOptions() {
    const algo = document.getElementById('key-algo').value;
    if (algo === 'rsa') {
        document.getElementById('rsa-size-group').style.display = 'block';
        document.getElementById('ec-curve-group').style.display = 'none';
    } else {
        document.getElementById('rsa-size-group').style.display = 'none';
        document.getElementById('ec-curve-group').style.display = 'block';
    }
}

function showResult(boxId) {
    document.getElementById(boxId).style.display = 'block';
}

function showStatusMessage(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    if(type === 'error') {
        toast.style.borderLeftColor = 'var(--error)';
    }
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if(toastContainer.contains(toast)) {
            toastContainer.removeChild(toast);
        }
    }, 3000);
}

window.copyCommand = function(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => {
        showStatusMessage('Команда скопирована в буфер обмена');
    }).catch(err => {
        console.error('Copy failed', err);
        showStatusMessage('Ошибка копирования', 'error');
    });
};

function addResultLog(operation, cmd, status, desc) {
    if (status === 'success') {
        successCount++;
        document.getElementById('stat-success').innerText = successCount;
    } else {
        errorCount++;
        document.getElementById('stat-error').innerText = errorCount;
    }

    const logContainer = document.getElementById('operations-log');
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    const time = new Date().toLocaleTimeString();
    const statusClass = status === 'success' ? 'status-success' : 'status-error';
    const statusText = status === 'success' ? 'Успешно' : 'Ошибка';

    logItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${operation}</strong>
            <span class="log-status ${statusClass}">${statusText}</span>
        </div>
        <div class="log-cmd">$ ${cmd}</div>
        <div class="log-time">${time} - ${desc}</div>
    `;
    
    logContainer.prepend(logItem); // Add to top
}

function clearResultLog() {
    document.getElementById('operations-log').innerHTML = '';
    successCount = 0;
    errorCount = 0;
    document.getElementById('stat-success').innerText = 0;
    document.getElementById('stat-error').innerText = 0;
    showStatusMessage('Журнал результатов очищен');
}

// 1. Key Generation
function generateKeyCommand() {
    const algo = document.getElementById('key-algo').value;
    const filename = document.getElementById('key-filename').value || 'private.key';
    let cmd = '';
    let desc = '';

    if (algo === 'rsa') {
        const size = document.getElementById('key-size').value;
        cmd = `openssl genrsa -out ${filename} ${size}`;
        desc = `Генерация RSA ключа длиной ${size} бит.`;
    } else {
        const curve = document.getElementById('ec-curve').value;
        cmd = `openssl ecparam -genkey -name ${curve} -out ${filename}`;
        desc = `Генерация EC ключа с кривой ${curve}.`;
    }

    document.getElementById('keygen-cmd-text').innerText = cmd;
    document.getElementById('keygen-desc').innerText = desc;
    showResult('keygen-result');
    showStatusMessage('Команда генерации ключа создана');
    addResultLog('Генерация ключа', cmd, 'success', 'Private key generated successfully');
}

// 2. CSR Generation
function generateCSRCommand() {
    const cn = document.getElementById('csr-cn').value || 'example.com';
    const o = document.getElementById('csr-o').value || 'My Company';
    const ou = document.getElementById('csr-ou').value || 'IT';
    const c = document.getElementById('csr-c').value || 'RU';
    const st = document.getElementById('csr-st').value || 'Moscow';
    const l = document.getElementById('csr-l').value || 'Moscow';
    const email = document.getElementById('csr-email').value || 'admin@example.com';
    const keyFile = document.getElementById('csr-key-file').value || 'private.key';
    const csrFile = document.getElementById('csr-file').value || 'request.csr';

    const cmd = `openssl req -new -key ${keyFile} -out ${csrFile}`;
    
    document.getElementById('csr-cmd-text').innerText = cmd;

    const tableHTML = `
        <tr><td>Common Name:</td><td>${cn}</td></tr>
        <tr><td>Organization:</td><td>${o}</td></tr>
        <tr><td>Organizational Unit:</td><td>${ou}</td></tr>
        <tr><td>Country:</td><td>${c}</td></tr>
        <tr><td>State:</td><td>${st}</td></tr>
        <tr><td>Locality:</td><td>${l}</td></tr>
        <tr><td>Email:</td><td>${email}</td></tr>
        <tr><td>Public Key Algorithm:</td><td>RSA/EC (Based on key)</td></tr>
        <tr><td>CSR filename:</td><td>${csrFile}</td></tr>
    `;
    
    document.getElementById('csr-profile-table').innerHTML = tableHTML;
    showResult('csr-result');
    showStatusMessage('Команда CSR создана');
    addResultLog('Создание CSR', cmd, 'success', `CSR profile created for ${cn}`);
}

// 3. Certificate Generation
function generateCertificateCommand(type) {
    const certFile = document.getElementById('cert-file').value || 'certificate.crt';
    const days = document.getElementById('cert-days').value || '365';
    let cmd = '';
    let opName = '';

    if (type === 'self') {
        const keyFile = document.getElementById('csr-key-file').value || 'private.key';
        cmd = `openssl req -x509 -new -nodes -key ${keyFile} -sha256 -days ${days} -out ${certFile}`;
        opName = 'Выпуск самоподписанного сертификата';
    } else {
        const csrFile = document.getElementById('csr-file').value || 'request.csr';
        const caFile = document.getElementById('cert-ca-file').value || 'ca.crt';
        const caKey = document.getElementById('cert-ca-key').value || 'ca.key';
        cmd = `openssl x509 -req -in ${csrFile} -CA ${caFile} -CAkey ${caKey} -CAcreateserial -out ${certFile} -days ${days} -sha256`;
        opName = 'Выпуск сертификата через CA';
    }

    document.getElementById('cert-cmd-text').innerText = cmd;

    const cn = document.getElementById('csr-cn').value || 'example.com';
    const o = document.getElementById('csr-o').value || 'My Company';
    const issuer = type === 'self' ? cn : 'Root CA';
    
    const validFrom = new Date();
    const validTo = new Date();
    validTo.setDate(validTo.getDate() + parseInt(days));

    const tableHTML = `
        <tr><td>Subject:</td><td>CN=${cn}, O=${o}</td></tr>
        <tr><td>Issuer:</td><td>CN=${issuer}</td></tr>
        <tr><td>Serial Number:</td><td>${Math.floor(Math.random() * 1000000000000000).toString(16).toUpperCase()}</td></tr>
        <tr><td>Valid From:</td><td>${validFrom.toDateString()}</td></tr>
        <tr><td>Valid To:</td><td>${validTo.toDateString()}</td></tr>
        <tr><td>Signature Algorithm:</td><td>sha256WithRSAEncryption</td></tr>
        <tr><td>Certificate filename:</td><td>${certFile}</td></tr>
        <tr><td>Status:</td><td><span style="color: var(--success); font-weight: bold;">Valid</span></td></tr>
    `;

    document.getElementById('cert-profile-table').innerHTML = tableHTML;
    showResult('cert-result');
    showStatusMessage(opName + ' успешно симулирован');
    addResultLog(opName, cmd, 'success', `Certificate ${certFile} issued successfully`);
}

// 4. Verification Functions
function showCertificateStructure() {
    const certFile = document.getElementById('verify-cert-file').value || 'certificate.crt';
    const cmd = `openssl x509 -in ${certFile} -text -noout`;
    
    document.getElementById('verify-cmd-text').innerText = cmd;
    document.getElementById('verify-output-text').innerHTML = `<strong>Certificate:</strong><br>Data:<br>&nbsp;&nbsp;Version: 3 (0x2)<br>&nbsp;&nbsp;Serial Number: ...<br>&nbsp;&nbsp;Signature Algorithm: sha256WithRSAEncryption<br>&nbsp;&nbsp;Issuer: C=RU, O=CA, CN=Root CA<br>&nbsp;&nbsp;Subject: C=RU, O=My Company, CN=example.com<br>...структура сертификата успешно прочитана.`;
    
    showResult('verify-result');
    showStatusMessage('Структура сертификата прочитана');
    addResultLog('Просмотр структуры', cmd, 'success', 'Certificate structure decoded');
}

function checkCertificateValidity() {
    const certFile = document.getElementById('verify-cert-file').value || 'certificate.crt';
    const cmd = `openssl x509 -in ${certFile} -noout -dates`;
    
    const verifyDate = new Date(document.getElementById('verify-date').value);
    
    // Simulate validity
    const isValid = verifyDate.getFullYear() <= new Date().getFullYear() + 1; // Arbitrary logic for sim

    document.getElementById('verify-cmd-text').innerText = cmd;
    
    if (isValid) {
        document.getElementById('verify-output-text').innerHTML = `notBefore=Jan 1 00:00:00 2024 GMT<br>notAfter=Jan 1 00:00:00 2025 GMT<br><br><span style="color:var(--success)">Сертификат действителен на указанную дату.</span>`;
        addResultLog('Проверка срока действия', cmd, 'success', 'Сертификат действителен');
    } else {
        document.getElementById('verify-output-text').innerHTML = `notBefore=Jan 1 00:00:00 2024 GMT<br>notAfter=Jan 1 00:00:00 2025 GMT<br><br><span style="color:var(--error)">Сертификат просрочен!</span>`;
        addResultLog('Проверка срока действия', cmd, 'error', 'Сертификат просрочен');
    }
    
    showResult('verify-result');
}

function verifyCertificate() {
    const certFile = document.getElementById('verify-cert-file').value || 'certificate.crt';
    const caFile = document.getElementById('verify-ca-file').value || 'ca.crt';
    const cmd = `openssl verify -CAfile ${caFile} ${certFile}`;
    
    document.getElementById('verify-cmd-text').innerText = cmd;
    
    if (caFile.includes('ca')) {
        document.getElementById('verify-output-text').innerHTML = `${certFile}: OK<br><span style="color:var(--success)">Цепочка доверия подтверждена.</span>`;
        addResultLog('Проверка цепочки (CA)', cmd, 'success', 'CA verification successful');
    } else {
        document.getElementById('verify-output-text').innerHTML = `error 20 at 0 depth lookup: unable to get local issuer certificate<br><span style="color:var(--error)">CA не найден или недействителен.</span>`;
        addResultLog('Проверка цепочки (CA)', cmd, 'error', 'CA not found or invalid');
    }
    
    showResult('verify-result');
}

function generateFingerprintCommand() {
    const certFile = document.getElementById('verify-cert-file').value || 'certificate.crt';
    const cmd = `openssl x509 -in ${certFile} -noout -fingerprint -sha256`;
    
    document.getElementById('verify-cmd-text').innerText = cmd;
    
    const fakeHash = Array.from({length: 32}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':');
    
    document.getElementById('verify-output-text').innerHTML = `SHA256 Fingerprint=${fakeHash}`;
    addResultLog('Генерация Fingerprint', cmd, 'success', 'Fingerprint сформирован');
    
    showResult('verify-result');
}

// Commands Directory Data
const commandsData = [
    { title: "Генерация RSA-ключа", cmd: "openssl genrsa -out private.key 2048", desc: "Создает новый закрытый ключ RSA длиной 2048 бит." },
    { title: "Генерация EC-ключа", cmd: "openssl ecparam -genkey -name prime256v1 -out private.key", desc: "Создает новый закрытый ключ на эллиптических кривых (EC) с параметром prime256v1." },
    { title: "Создание CSR", cmd: "openssl req -new -key private.key -out request.csr", desc: "Генерирует запрос на подпись сертификата (CSR), используя существующий закрытый ключ." },
    { title: "Создание самоподписанного сертификата", cmd: "openssl req -x509 -new -nodes -key private.key -sha256 -days 365 -out certificate.crt", desc: "Генерирует X.509 сертификат, подписанный собственным ключом." },
    { title: "Выпуск сертификата через CA", cmd: "openssl x509 -req -in request.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out certificate.crt -days 365 -sha256", desc: "Подписывает CSR-запрос ключом центра сертификации (CA)." },
    { title: "Просмотр сертификата", cmd: "openssl x509 -in certificate.crt -text -noout", desc: "Выводит текстовое представление структуры X.509 сертификата." },
    { title: "Проверка сертификата", cmd: "openssl verify -CAfile ca.crt certificate.crt", desc: "Проверяет цепочку доверия сертификата относительно указанного корневого CA." },
    { title: "SHA-256 fingerprint", cmd: "openssl x509 -in certificate.crt -noout -fingerprint -sha256", desc: "Вычисляет SHA-256 отпечаток сертификата для быстрой сверки." }
];

function renderCommandsList() {
    const container = document.querySelector('.command-list');
    if (!container) return;
    
    commandsData.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'cmd-card';
        card.innerHTML = `
            <h3>${item.title}</h3>
            <p style="margin-bottom: 10px; color: var(--text-muted);">${item.desc}</p>
            <div class="terminal-block">
                <span class="prompt">$</span> <span id="dict-cmd-${index}">${item.cmd}</span>
                <button class="btn-copy" onclick="copyCommand('dict-cmd-${index}')">Копировать</button>
            </div>
        `;
        container.appendChild(card);
    });
}
