using PortfolioTools;

// Deliberately an interactive local operator command, not a remote/admin-registration API.
if (Console.IsInputRedirected)
{
    Console.Error.WriteLine("Use an interactive terminal; credentials must not appear in CLI arguments or command output.");
    return 1;
}
try
{
    Console.Write("Synthetic administrator name: ");
    var name = Console.ReadLine() ?? "";
    Console.Write("Synthetic email (@example.test): ");
    var email = Console.ReadLine() ?? "";
    Console.Write("New organization name: ");
    var organization = Console.ReadLine() ?? "";
    Console.Write("Password (hidden, 12+ characters, <=72 UTF-8 bytes): ");
    var password = HiddenPassword();
    Console.Write("Confirm password (hidden): ");
    if (password != HiddenPassword()) throw new InvalidOperationException();
    await using var database = LocalDatabase.CreateSource();
    await LocalDatabase.ProvisionAdministratorAsync(database, "org_" + Guid.NewGuid().ToString("N"),
        organization, name, email, password);
    Console.WriteLine("Created the new local organization and administrator. Sign in with the credentials entered.");
    return 0;
}
catch
{
    Console.Error.WriteLine("Provisioning failed; details withheld. Check local setup and synthetic input; existing rows were not overwritten.");
    return 1;
}

static string HiddenPassword()
{
    var value = new System.Text.StringBuilder();
    while (true)
    {
        var key = Console.ReadKey(intercept: true);
        if (key.Key == ConsoleKey.Enter) { Console.WriteLine(); return value.ToString(); }
        if (key.Key == ConsoleKey.Backspace) { if (value.Length > 0) value.Length--; }
        else if (!char.IsControl(key.KeyChar) && value.Length < 73) value.Append(key.KeyChar);
    }
}
