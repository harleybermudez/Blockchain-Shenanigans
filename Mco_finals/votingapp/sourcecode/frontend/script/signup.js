// Page actions for signup.html. Shared wallet and contract logic loads first.
byId("connectButton").onclick = function () { app.connect("signup"); };
byId("registerButton").onclick = function () {
  if (!byId("registerButton").disabled) app.send("registerVoter", [], "Registration recorded. Waiting for admin approval.");
};
app.start(function () {
  byId("connectButton").disabled = !app.configured || app.working || !!app.account;
  byId("connectButton").textContent = app.account ? "Wallet connected" : "Connect MetaMask";
  byId("registerButton").disabled = !app.ready || app.working || !app.account || app.admin || app.registered || app.data.phase !== "setup";
  byId("registerButton").textContent = app.registered ? "Registration recorded" : "Submit registration";
});
