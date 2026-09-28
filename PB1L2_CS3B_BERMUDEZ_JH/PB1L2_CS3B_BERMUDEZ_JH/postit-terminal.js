/*
  postit-terminal.js
  ---------------------------------------------------------------------
  Rebuilt with a different structure than the paper/dossier version:
    - state + behavior live on a single class (SecureChannel) instead
      of loose closures over module-level variables
    - posts are kept in a Map (id -> record) instead of only existing
      as rendered DOM + closures
    - the feed is re-drawn from that Map on every change, rather than
      individual cards being prepended and wired up one at a time
    - the "verify" buttons use one delegated click listener on the feed
      container, instead of a listener per button
    - the AES-192 key comes from PBKDF2 (password + random salt) rather
      than manually padding the password string to 24 bytes

  Still uses CryptoJS 4.2.0 (see <script> tag in the HTML) for the
  actual AES work.
  ---------------------------------------------------------------------
*/

class SecureChannel {
  constructor() {
    // session-only state; nothing here survives a page reload
    this.operator = null;   // { fullName, dob, yearLevel, gender, username }
    this.key = null;        // CryptoJS WordArray, 192 bits
    this.salt = null;       // CryptoJS WordArray, used to re-derive the key if needed
    this.posts = new Map(); // id -> { username, caption, isoDate, cipherText, ivBase64 }
    this.nextId = 1;

    this.cacheDom();
    this.bindEvents();
  }

  /* ---- wire up references to the elements this class touches ---- */
  cacheDom() {
    this.authPanel = document.getElementById("panel-auth");
    this.authForm = document.getElementById("auth-form");

    this.composePanel = document.getElementById("panel-compose");
    this.signedInAs = document.getElementById("signed-in-as");
    this.captionInput = document.getElementById("f-caption");
    this.charCounter = document.getElementById("f-count");
    this.postButton = document.getElementById("btn-post");

    this.feedPanel = document.getElementById("panel-feed");
    this.feedEl = document.getElementById("feed");
    this.feedEmpty = document.getElementById("feed-empty");
  }

  bindEvents() {
    this.authForm.addEventListener("submit", (e) => this.onLogin(e));
    this.captionInput.addEventListener("input", () => this.onCaptionInput());
    this.postButton.addEventListener("click", () => this.onPost());

    // one listener for every "verify" button, present or future
    this.feedEl.addEventListener("click", (e) => {
      const trigger = e.target.closest('[data-verify-id]');
      if (trigger) this.onVerify(Number(trigger.dataset.verifyId));
    });
  }

  /* ------------------------------------------------------------------
     Login / one-time intake. After this runs once, the auth panel is
     removed from flow entirely for the rest of the session.
     ------------------------------------------------------------------ */
  onLogin(event) {
    event.preventDefault();

    this.operator = {
      fullName: document.getElementById("f-name").value.trim(),
      dob: document.getElementById("f-dob").value,
      yearLevel: document.getElementById("f-year").value,
      gender: document.getElementById("f-gender").value,
      username: document.getElementById("f-user").value.trim(),
    };

    const passkey = document.getElementById("f-pass").value;
    this.salt = CryptoJS.lib.WordArray.random(16);
    this.key = this.deriveKey(passkey, this.salt);

    this.authPanel.classList.add("panel--hidden");
    this.composePanel.classList.remove("panel--hidden");
    this.feedPanel.classList.remove("panel--hidden");
    this.signedInAs.textContent = this.operator.username;
    this.captionInput.focus();
  }

  /* ------------------------------------------------------------------
     Turn a password into a strict 192-bit AES key via PBKDF2, rather
     than padding/truncating the raw string. keySize is expressed in
     32-bit words, so 192/32 = 6 words = 24 bytes = 192 bits.
     ------------------------------------------------------------------ */
  deriveKey(passkey, salt) {
    return CryptoJS.PBKDF2(passkey, salt, {
      keySize: 192 / 32,
      iterations: 1000,
      hasher: CryptoJS.algo.SHA256,
    });
  }

  /* ---- composer character count + enabling the post button ---- */
  onCaptionInput() {
    const remaining = 280 - this.captionInput.value.length;
    this.charCounter.textContent = `${remaining} chars left`;
    this.postButton.disabled = this.captionInput.value.trim().length === 0;
  }

  /* ------------------------------------------------------------------
     Build + store a post: encrypt (username + caption + date) as AES-192
     ciphertext, keep the record in the Map, then redraw the feed.
     ------------------------------------------------------------------ */
  onPost() {
    const caption = this.captionInput.value.trim();
    if (!caption) return;

    const now = new Date();
    const isoDate = now.toISOString();

    // "stringified username + post + date" as a plain delimited string
    // (a different flavor of "stringified" than JSON — still a single
    // string combining all three fields, which is what gets encrypted)
    const payload = `${this.operator.username}::${caption}::${isoDate}`;

    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(payload, this.key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const id = this.nextId++;
    this.posts.set(id, {
      username: this.operator.username,
      caption,
      isoDate,
      cipherText: encrypted.toString(),
      ivBase64: CryptoJS.enc.Base64.stringify(iv),
    });

    this.captionInput.value = "";
    this.charCounter.textContent = "280 chars left";
    this.postButton.disabled = true;
    this.captionInput.focus();

    this.renderFeed();
  }

  /* ------------------------------------------------------------------
     Decrypt a stored post's ciphertext back to the delimited payload,
     used only when the operator hits "verify" on that entry.
     ------------------------------------------------------------------ */
  decryptPost(record) {
    const iv = CryptoJS.enc.Base64.parse(record.ivBase64);
    const bytes = CryptoJS.AES.decrypt(record.cipherText, this.key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  onVerify(id) {
    const record = this.posts.get(id);
    if (!record) return;

    const outEl = document.querySelector(`[data-verify-out="${id}"]`);
    const plain = this.decryptPost(record);
    const [, decryptedCaption] = plain.split("::");

    outEl.textContent = decryptedCaption === record.caption
      ? "decrypted ok — matches original"
      : "decrypted, but mismatch found";
  }

  /* ------------------------------------------------------------------
     Redraw the whole feed from this.posts (newest id first). Simpler
     to reason about than incremental DOM patching for a list this size.
     ------------------------------------------------------------------ */
  renderFeed() {
    const ids = Array.from(this.posts.keys()).sort((a, b) => b - a);
    this.feedEmpty.classList.toggle("hidden", ids.length > 0);

    this.feedEl.innerHTML = ids.map((id) => this.postMarkup(id)).join("");
  }

  postMarkup(id) {
    const record = this.posts.get(id);
    const when = new Date(record.isoDate).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

    return `
      <article class="entry" data-id="${id}">
        <p class="entry__meta">posted by <b>${escapeHtml(record.username)}</b> — ${when}</p>

        <p class="entry__tag entry__tag--raw">// ORIGINAL POST</p>
        <p class="entry__raw">${escapeHtml(record.caption)}</p>

        <hr class="entry__rule" />

        <p class="entry__tag entry__tag--cipher">// ENCRYPTED — AES-192 / CBC</p>
        <div class="entry__cipher-box">
          <p class="entry__cipher">${escapeHtml(record.cipherText)}</p>
        </div>

        <div class="entry__verify">
          <button type="button" class="btn btn--outline" data-verify-id="${id}">$ decrypt --check</button>
          <span class="entry__verify-out" data-verify-out="${id}"></span>
        </div>
      </article>
    `;
  }
}

/* small helper kept outside the class since it doesn't touch any state */
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// boot the app once the DOM is parsed
document.addEventListener("DOMContentLoaded", () => {
  new SecureChannel();
});
