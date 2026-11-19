// Page actions for vote.html. Shared wallet and contract logic loads first.
let selectedCandidate = 0;
// Keep the ballot summary and review button aligned with the selected candidate.
function updateSelection() {
  const candidate = app.data.candidates.find(item => item.id === selectedCandidate);
  byId("selectionName").textContent = candidate ? candidate.name : "No candidate selected";
  byId("selectionPosition").textContent = app.data.position;
  byId("reviewButton").disabled = app.working || !app.ready || !app.allowed || app.voted || !candidate || app.data.phase !== "open";
  for (const radio of byId("candidateChoices").querySelectorAll("input")) radio.disabled = app.working;
}
byId("ballotForm").onsubmit = function (event) {
  event.preventDefault();
  if (byId("reviewButton").disabled) return;
  const candidate = app.data.candidates.find(item => item.id === selectedCandidate);
  app.confirm("Review your vote", candidate.name + " · " + candidate.position + ". A confirmed vote cannot be changed.", function () {
    app.send("vote", [candidate.id], "Your vote is recorded.", function () { selectedCandidate = 0; });
  });
};
app.start(function () {
  const eligible = app.ready && app.account && !app.admin && app.allowed && !app.voted && app.data.phase === "open";
  const recorded = app.ready && app.voted && !app.admin;
  byId("ballotForm").hidden = !eligible;
  byId("selectionPanel").hidden = !eligible;
  byId("voteGate").hidden = !!eligible || recorded;
  byId("voteSuccess").hidden = !recorded;
  byId("ballotLayout").classList.toggle("is-blocked", !eligible);
  byId("position").textContent = app.data.position || "Select one candidate.";
  byId("eligibility").textContent = recorded ? "Vote recorded" : eligible ? "Eligible to vote" : "";
  let status = ["Voting is not available yet", "View candidates", "candidates.html"];
  if (app.ready) {
    if (app.data.phase === "closed") status = ["Voting has closed", "View results", "results.html"];
    else if (!app.account) status = ["Log in to cast your vote", "Voter login", "index.html"];
    else if (app.admin) status = ["Use a separate voter wallet", "Manage election", "admin.html"];
    else if (!app.registered) status = ["Register before voting", "Sign up", "signup.html"];
    else if (!app.allowed) status = ["Waiting for admin approval", "View candidates", "candidates.html"];
    else if (app.data.phase === "setup") status = ["You are ready. Wait for voting to open.", "View candidates", "candidates.html"];
  }
  byId("gateTitle").textContent = status[0];
  byId("gateLink").textContent = status[1];
  byId("gateLink").href = status[2];
  if (!eligible) { selectedCandidate = 0; byId("candidateChoices").replaceChildren(); }
  if (eligible && !byId("candidateChoices").children.length) {
    for (const candidate of app.data.candidates) {
      const option = app.copy("candidateOption");
      option.querySelector(".candidate-name").textContent = candidate.name;
      option.querySelector(".candidate-position").textContent = candidate.position;
      const radio = option.querySelector("input");
      radio.value = candidate.id;
      radio.onchange = function () { selectedCandidate = candidate.id; updateSelection(); };
      byId("candidateChoices").append(option);
    }
  }
  updateSelection();
});
