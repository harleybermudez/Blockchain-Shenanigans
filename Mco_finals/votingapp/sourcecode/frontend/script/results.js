// Page actions for results.html. Shared wallet and contract logic loads first.
byId("refreshButton").onclick = app.read;
app.start(function () {
  const available = app.ready && app.data.phase === "closed";
  byId("resultsLocked").hidden = available;
  byId("resultsContent").hidden = !available;
  byId("refreshButton").disabled = !app.configured || app.working;
  if (!available) return;
  byId("position").textContent = app.data.position;
  byId("totalVotes").textContent = app.data.total;
  byId("resultRows").replaceChildren();
  for (const candidate of app.data.candidates) {
    const row = app.copy("resultRow");
    row.querySelector(".candidate-name").textContent = candidate.name;
    row.querySelector(".candidate-count").textContent = candidate.votes;
    byId("resultRows").append(row);
  }
});
