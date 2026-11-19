// Recheck the selected account and chain before restoring a session or requesting a signature.
async function walletMatches(wallet) {
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  const chain = await window.ethereum.request({ method: "eth_chainId" });
  return accounts.length > 0 && app.same(wallet, accounts[0]) && Number(chain) === settings.chainId;
}
// The app object holds shared state and methods. HTML templates define the rows.
function byId(id) { return document.getElementById(id); }
const app = {
  account: "", admin: false, registered: false, allowed: false, voted: false,
  configured: false, ready: false, working: false, revision: 0,
  reader: null, contract: null, update: function () {},
  data: { phase: "setup", candidates: [], voters: [], position: "", total: 0, approved: 0 },
  session: function () { return "voting-v2:" + settings.address; },
  same: function (a, b) { return a.toLowerCase() === b.toLowerCase(); },
  copy: function (id) { return byId(id).content.firstElementChild.cloneNode(true); },
  note: function (text, error = false) {
    byId("notice").hidden = false;
    byId("notice").classList.toggle("is-error", error);
    byId("notice").setAttribute("role", error ? "alert" : "status");
    byId("notice").textContent = text;
  },
  draw: function () {
    byId("electionStatus").hidden = !app.configured;
    byId("electionStatus").textContent = !app.ready ? "Election unavailable" :
      app.data.phase === "open" ? "Voting open" : app.data.phase === "closed" ? "Voting closed" : "Voting not started";
    byId("electionStatus").dataset.state = app.data.phase;
    byId("manageLink").hidden = !app.admin;
    byId("logoutButton").hidden = !app.account;
    byId("loginLink").hidden = !!app.account;
    app.update();
  },
  // Clear role and eligibility data and invalidate any outstanding read.
  reset: function () {
    app.revision++;
    sessionStorage.removeItem(app.session());
    app.account = "";
    app.admin = app.registered = app.allowed = app.voted = false;
    app.data.voters = [];
    if (byId("reviewDialog") && byId("reviewDialog").open) byId("reviewDialog").close();
    app.draw();
  },
  // Restore a saved wallet only when MetaMask still exposes it on the configured chain.
  restore: async function () {
    const saved = sessionStorage.getItem(app.session());
    if (!saved || !window.ethereum) return;
    if (await walletMatches(saved)) app.account = saved;
    else sessionStorage.removeItem(app.session());
  },
  // Read a single block and ignore stale responses after an account or network change.
  read: async function () {
    if (!app.configured || !app.contract) return;
    // A newer request or wallet change makes this response obsolete.
    const revision = ++app.revision;
    const wallet = app.account;
    try {
      const block = { blockTag: await app.reader.getBlockNumber() };
      const info = await Promise.all([
        app.contract.owner(block), app.contract.getElectionStatus(block), app.contract.electionClosed(block),
        app.contract.getCandidateCount(block), app.contract.getTotalVotes(block),
        app.contract.electionPosition(block), app.contract.authorizedVoterCount(block)
      ]);
      const candidates = [], voters = [];
      for (let id = 1; id <= Number(info[3]); id++) {
        const c = await app.contract.getCandidate(id, block);
        candidates.push({ id: Number(c.id), name: c.name, position: c.position, votes: Number(c.voteCount) });
      }
      const admin = !!wallet && app.same(wallet, info[0]);
      let flags = [false, false, false];
      if (wallet) flags = await Promise.all([
        app.contract.registeredVoters(wallet, block), app.contract.authorizedVoters(wallet, block), app.contract.hasVoted(wallet, block)
      ]);
      if (admin && document.body.dataset.page === "admin") {
        for (const address of await app.contract.getRegisteredVoters(block)) {
          voters.push({ address: address, approved: await app.contract.authorizedVoters(address, block) });
        }
      }
      if (revision !== app.revision || wallet !== app.account) return;
      app.data = { phase: info[2] ? "closed" : info[1] ? "open" : "setup", candidates: candidates,
        voters: voters, total: Number(info[4]), position: info[5], approved: Number(info[6]) };
      app.admin = admin;
      [app.registered, app.allowed, app.voted] = flags;
      app.ready = true;
      app.draw();
    } catch {
      if (revision !== app.revision || wallet !== app.account) return;
      app.ready = false;
      app.draw();
      app.note("Could not load the election. Refresh to try again.", true);
    }
  },
  // Connect MetaMask, verify the requested role, and route the voter or administrator.
  connect: async function (role) {
    if (app.working || !app.configured) return;
    app.working = true;
    app.draw();
    try {
      if (!window.ethereum) { app.note("Install MetaMask to continue.", true); return; }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      if (Number(chain) !== settings.chainId) { app.note("Select " + settings.network + " in MetaMask.", true); return; }
      const owner = await app.contract.owner();
      const ownerWallet = app.same(accounts[0], owner);
      if ((role === "admin") !== ownerWallet) {
        app.note(ownerWallet ? "Use electoral admin login." : "Select the admin wallet.", true);
        return;
      }
      app.account = accounts[0];
      sessionStorage.setItem(app.session(), app.account);
      await app.read();
      if (!app.ready) return;
      if (role === "signup") app.note(app.registered ? "Wallet already registered." : "Wallet connected.");
      else window.location.href = role === "admin" ? "admin.html" : app.registered ? "vote.html" : "signup.html";
    } catch { app.note("Could not connect. Check MetaMask and try again.", true); }
    finally { app.working = false; app.draw(); }
  },
  // Recheck wallet and chain, then wait for a successful transaction receipt.
  send: async function (method, args, success, after) {
    if (app.working || !app.ready || !app.account) return;
    const wallet = app.account;
    app.working = true;
    app.draw();
    try {
      if (!await walletMatches(wallet)) {
        app.reset(); app.note("Wallet changed. Log in again.", true); return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      const writer = app.contract.connect(provider.getSigner(wallet));
      app.note("Confirm in MetaMask.");
      const transaction = await writer[method](...args);
      app.note("Recording… Please wait.");
      const receipt = await transaction.wait();
      if (receipt.status !== 1) throw new Error();
      await app.read();
      app.note(wallet === app.account ? success : "Transaction confirmed. Log in again.");
      if (wallet === app.account && after) after();
    } catch {
      app.note("Action could not be confirmed. Refresh before trying again.", true);
      await app.read();
    } finally { app.working = false; app.draw(); }
  },
  // Ask the user to review an action before sending its transaction.
  confirm: function (title, description, action) {
    if (app.working) return;
    byId("reviewTitle").textContent = title;
    byId("reviewText").textContent = description;
    byId("confirmAction").onclick = function () { byId("reviewDialog").close(); action(); };
    byId("reviewDialog").showModal();
    byId("cancelAction").focus();
  },
  // Load frontend/abi.json and start the page after its render callback is registered.
  start: async function (update) {
    app.update = update;
    app.draw();
    if (!window.ethers) { app.note("Wallet library unavailable. Reload the page.", true); return; }
    app.configured = ethers.utils.isAddress(settings.address) && settings.address !== ethers.constants.AddressZero;
    if (app.configured) {
      app.reader = new ethers.providers.JsonRpcProvider(settings.rpc, settings.chainId);
      try {
        // Use the compiler-generated interface for both reads and signed calls.
      const response = await fetch("../abi.json");
        if (!response.ok) throw new Error();
        app.contract = new ethers.Contract(settings.address, await response.json(), app.reader);
      } catch { app.configured = false; app.draw(); app.note("Could not load the contract interface. Reload the page.", true); return; }
      try { await app.restore(); } catch { sessionStorage.removeItem(app.session()); }
      await app.read();
    }
    app.draw();
  }
};
byId("logoutButton").onclick = function () { app.reset(); window.location.href = "index.html"; };
if (byId("cancelAction")) byId("cancelAction").onclick = function () { byId("reviewDialog").close(); };
if (window.ethereum && window.ethereum.on) {
  for (const event of ["accountsChanged", "chainChanged", "disconnect"]) {
    window.ethereum.on(event, function () { app.reset(); app.note("Wallet connection changed. Log in again."); });
  }
}
let refreshing = false;
setInterval(async function () {
  if (app.working || document.hidden || refreshing) return;
  refreshing = true;
  try {
    await app.read();
  } finally {
    refreshing = false;
  }
}, 5000);
