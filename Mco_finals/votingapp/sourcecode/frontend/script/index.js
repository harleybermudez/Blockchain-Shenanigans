// Page actions for index.html. Shared wallet and contract logic loads first.
byId("voterLoginButton").onclick = function () { app.connect("voter"); };
app.start(function () { byId("voterLoginButton").disabled = !app.configured || app.working; });
