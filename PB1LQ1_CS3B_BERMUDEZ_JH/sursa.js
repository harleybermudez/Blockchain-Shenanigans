/**
 * ARCADE TERMINAL CONTROLLER
 * Handles live, real-time RSA cryptography (No Submit Button required)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Input Fields Form
    const form = document.getElementById('enrollmentForm');
    
    // Status UI
    const keyStatus = document.getElementById('keyStatus');
    
    // Console Outputs
    const pubKeyDisplay = document.getElementById('pubKeyDisplay');
    const privKeyDisplay = document.getElementById('privKeyDisplay');
    const rawJsonDisplay = document.getElementById('rawJsonDisplay');
    const encryptedDisplay = document.getElementById('encryptedDisplay');
    const decryptedDisplay = document.getElementById('decryptedDisplay');

    // Cryptographic Engine State
    let rsaEngine = null;
    let isMatrixReady = false;

    // 1. Boot up sequence: Generate keys on page load
    bootSystem();

    function bootSystem() {
        // Read requested key size from HTML, fallback to 1024
        const keySize = window.RSA_KEY_SIZE || 1024;
        rsaEngine = new JSEncrypt({ default_key_size: keySize });

        // Generate RSA Matrix asynchronously to avoid freezing the HUD
        rsaEngine.getKey(() => {
            const pubKey = rsaEngine.getPublicKey();
            const privKey = rsaEngine.getPrivateKey();

            // Populate the Key Matrix displays
            pubKeyDisplay.value = pubKey;
            privKeyDisplay.value = privKey;

            // Update terminal status
            keyStatus.textContent = "MATRIX_READY";
            keyStatus.className = "status-box ready";
            isMatrixReady = true;

            // Trigger a scan in case the browser auto-filled data
            processLiveData();
        });
    }

    // 2. Attach Live Keystroke Listeners
    // Binds 'input' event to the form, triggering every time the user types
    form.addEventListener('input', () => {
        if (isMatrixReady) {
            processLiveData();
        }
    });

    // 3. Core Engine: Encrypt and Decrypt in Real-Time
    function processLiveData() {
        // Fetch current values
        const fName = document.getElementById('fullName').value.trim();
        const dob = document.getElementById('dob').value;
        const level = document.getElementById('yearLevel').value;
        const avatar = document.getElementById('gender').value;
        const gamerTag = document.getElementById('username').value.trim();
        const access = document.getElementById('password').value;

        // If form is entirely empty, clear the output feeds
        if (!fName && !dob && !level && !avatar && !gamerTag && !access) {
            rawJsonDisplay.value = '';
            encryptedDisplay.value = '';
            decryptedDisplay.value = '';
            return;
        }

        // Construct minified JSON payload to stay within RSA byte limits
        const dataPayload = {
            n: fName,
            d: dob,
            l: level,
            a: avatar,
            g: gamerTag,
            p: access
        };

        const jsonString = JSON.stringify(dataPayload);
        rawJsonDisplay.value = jsonString;

        // --- ENCRYPTION MODULE ---
        rsaEngine.setPublicKey(pubKeyDisplay.value);
        const cipherData = rsaEngine.encrypt(jsonString);

        if (!cipherData) {
            // Buffer overflow (data too large for RSA key size)
            encryptedDisplay.value = "[ERR] BUFFER_OVERFLOW. DATA EXCEEDS RSA KEY LIMIT.";
            decryptedDisplay.value = "[ERR] ABORTING...";
            return;
        }

        encryptedDisplay.value = cipherData;

        // --- DECRYPTION MODULE ---
        // Create isolated engine instance to prove proper decryption
        const decryptEngine = new JSEncrypt();
        decryptEngine.setPrivateKey(privKeyDisplay.value);
        const decryptedRaw = decryptEngine.decrypt(cipherData);

        // Format the decrypted text for the Arcade HUD
        try {
            const parsed = JSON.parse(decryptedRaw);
            decryptedDisplay.value = 
                `> PLAYER_NAME : ${parsed.n}\n` +
                `> SPAWN_DATE  : ${parsed.d}\n` +
                `> LEVEL       : ${parsed.l}\n` +
                `> AVATAR_TYPE : ${parsed.a}\n` +
                `> GAMERTAG    : ${parsed.g}\n` +
                `> ACCESS_CODE : ${parsed.p}`;
        } catch (error) {
            decryptedDisplay.value = "[ERR] DATA_CORRUPTION DETECTED IN FEED.";
        }
    }
});