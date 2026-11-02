using System.Text.Json;

namespace PortfolioTools;

public static class ProbeReport
{
    public static readonly string Run = Guid.NewGuid().ToString("N");
    public static readonly string DirectoryPath = Path.Combine(".local", "security-probe", Run);
    private static readonly List<object> Responses = new();
    private static readonly Dictionary<string, bool> Assertions = new();
    public static bool Completed { get; set; }
    public static bool Cleaned { get; set; }
    public static bool OriginalStateRestored { get; set; }

    public static void Save()
    {
        Directory.CreateDirectory(DirectoryPath);
        File.WriteAllText(Path.Combine(DirectoryPath, "report.json"), JsonSerializer.Serialize(new
        {
            Run, Completed, Cleaned, OriginalStateRestored, Responses, Assertions
        }, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void Observe(string label, int status, int[] expected)
    {
        Responses.Add(new { Label = label, Status = status, Expected = expected });
        Save();
        Console.WriteLine($"HTTP {status} | {label}");
        Check(label + " status", expected.Contains(status));
    }

    public static void Check(string label, bool condition)
    {
        Assertions[label] = condition;
        Save();
        if (!condition) throw new InvalidOperationException("Assertion failed; details withheld.");
    }
}
