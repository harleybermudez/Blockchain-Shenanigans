// Page actions for candidates.html. Shared wallet and contract logic loads first.
app.start(function () {
  byId("position").textContent = app.data.position;
  byId("emptyCandidates").hidden = app.data.candidates.length > 0;
  byId("candidateList").replaceChildren();
  for (const candidate of app.data.candidates) {
    const row = app.copy("candidateRow");
    row.querySelector(".initials").textContent = candidate.name.trim().split(/\s+/).slice(0, 2).map(word => word[0] || "").join("").toUpperCase();
    row.querySelector(".candidate-name").textContent = candidate.name;
    row.querySelector(".candidate-position").textContent = candidate.position;
    row.querySelector(".candidate-votes").textContent = candidate.votes + " votes";
    row.querySelector(".candidate-votes").hidden = !app.ready || app.data.phase !== "closed";
    byId("candidateList").append(row);
  }
});
