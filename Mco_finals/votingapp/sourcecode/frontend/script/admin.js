// Page actions for admin.html. Shared wallet and contract logic loads first.
// Render candidate and voter lists and lock setup controls once voting starts.
function showAdmin() {
  byId("adminGate").hidden = app.ready && app.admin;
  byId("adminContent").hidden = !app.ready || !app.admin;
  const setup = app.ready && app.admin && app.data.phase === "setup" && !app.working;
  for (const control of document.querySelectorAll("form input, form button")) control.disabled = !setup;
  byId("refreshButton").disabled = !app.configured || app.working;
  byId("startButton").disabled = !setup || app.data.candidates.length < 2 || app.data.approved < 1;
  byId("closeButton").disabled = !app.ready || !app.admin || app.working || app.data.phase !== "open";
  if (!app.ready || !app.admin) return;
  byId("candidateCount").textContent = app.data.candidates.length + " added";
  byId("voterCount").textContent = app.data.approved + " approved";
  byId("phase").textContent = app.data.phase === "setup" ? "Setup" : app.data.phase === "open" ? "Open" : "Closed";
  if (app.data.position) byId("candidatePosition").value = app.data.position;
  byId("candidatePosition").readOnly = !!app.data.position;
  byId("adminCandidates").replaceChildren();
  for (const candidate of app.data.candidates) {
    const row = app.copy("adminCandidateRow");
    row.querySelector(".candidate-name").textContent = candidate.name;
    row.querySelector(".candidate-position").textContent = candidate.position;
    byId("adminCandidates").append(row);
  }
  byId("registeredVoters").replaceChildren();
  byId("emptyVoters").hidden = app.data.voters.length > 0;
  for (const voter of app.data.voters) {
    const row = app.copy("voterRow");
    row.querySelector(".wallet-address").textContent = voter.address;
    row.querySelector(".voter-status").textContent = voter.approved ? "Authorized" : "Awaiting approval";
    const button = row.querySelector("button");
    button.hidden = voter.approved || app.data.phase !== "setup";
    button.disabled = app.working;
    button.onclick = function () { byId("voterAddress").value = voter.address; byId("voterAddress").focus(); };
    byId("registeredVoters").append(row);
  }
}
byId("candidateForm").onsubmit = function (event) {
  event.preventDefault();
  if (byId("addCandidateButton").disabled) return;
  const name = byId("candidateName").value.trim().replace(/\s+/g, " ");
  const position = byId("candidatePosition").value.trim().replace(/\s+/g, " ");
  if (!name || !position) { app.note("Enter a name and position.", true); return; }
  if (ethers.utils.toUtf8Bytes(name).length > 120 || ethers.utils.toUtf8Bytes(position).length > 120) { app.note("Use shorter text.", true); return; }
  if (app.data.candidates.some(item => app.same(item.name, name))) { app.note("Candidate already added.", true); return; }
  app.confirm("Add this candidate?", name + " · " + position + ". Check spelling; this cannot be edited.", function () {
    app.send("addCandidate", [name, position], "Candidate added.", function () { byId("candidateName").value = ""; });
  });
};
byId("authorizeForm").onsubmit = function (event) {
  event.preventDefault();
  if (byId("authorizeButton").disabled) return;
  const address = byId("voterAddress").value.trim();
  if (!ethers.utils.isAddress(address) || address === ethers.constants.AddressZero) { app.note("Enter a valid voter wallet address.", true); return; }
  if (app.same(address, app.account)) { app.note("Use a separate voter wallet.", true); return; }
  if (app.data.voters.some(item => app.same(item.address, address) && item.approved)) { app.note("Wallet already authorized.", true); return; }
  app.confirm("Authorize this voter?", address + ". Verify one wallet per student.", function () {
    app.send("authorizeVoter", [address], "Voter authorized.", function () { byId("voterAddress").value = ""; });
  });
};
byId("startButton").onclick = function () {
  if (!byId("startButton").disabled) app.confirm("Start voting?", "Candidate and voter setup will be locked.", function () {
    app.send("startElection", [], "Voting is now open.");
  });
};
byId("closeButton").onclick = function () {
  if (!byId("closeButton").disabled) app.confirm("Close voting permanently?", "Voting cannot be reopened.", function () {
    app.send("endElection", [], "Voting is closed.");
  });
};
byId("refreshButton").onclick = app.read;
app.start(showAdmin);
