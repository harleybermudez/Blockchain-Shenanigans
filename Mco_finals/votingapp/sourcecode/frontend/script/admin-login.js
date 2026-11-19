// Page actions for admin-login.html. Shared wallet and contract logic loads first.
byId("adminLoginButton").onclick = function () { app.connect("admin"); };
app.start(function () { byId("adminLoginButton").disabled = !app.configured || app.working; });
