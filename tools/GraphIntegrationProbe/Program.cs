// October 2026 real SQL/HTTP verification; synthetic values stay in process memory. No external requests.
using System.Diagnostics;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Text.Json.Nodes;
using Npgsql;
using PortfolioTools;
using ZitaDataSystem.Services;

try { return await Run(args); }
catch (Exception exception)
{
    ProbeReport.FailureCategory = exception.GetType().Name;
    ProbeReport.Save();
    Console.Error.WriteLine("Graph verification failed ("+exception.GetType().Name+"); inspect sanitized report. Sensitive details withheld.");
    return 1;
}

static async Task<int> Run(string[] args)
{
    if (args.Length == 2 && args[0] == "--cleanup-owned-run") return await GraphProbeRecovery.Cleanup(args[1]);
    if (args.Length != 1 || !int.TryParse(args[0], out var apiPid)) throw new InvalidOperationException();
    var process = Process.GetProcessById(apiPid);
    if (process.HasExited || process.MainModule?.ModuleName != "dotnet.exe") throw new InvalidOperationException();
    // Caller must independently verify this PID's workspace command line and sole loopback socket.
    ApiClient.ApiAlive = () => !process.HasExited;
    using var certificate = X509Certificate2.CreateFromPem(File.ReadAllText(".local/https/localhost.pem"));
    await using var database = LocalDatabase.CreateSource();
    await LocalDatabase.ValidateAsync(database);
    var baseline = await LocalDatabase.BusinessFingerprintAsync(database);
    var run = ProbeReport.Run; var a = "org_" + run; var b = "org_" + Guid.NewGuid().ToString("N");
    var password = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
    var email = "graph-admin-" + run + "@example.test";
    using var admin = new ApiClient("admin", certificate);
    using var rival = new ApiClient("competing admin session", certificate);
    using var foreign = new ApiClient("foreign admin", certificate);
    using var developer = new ApiClient("assigned developer", certificate);
    using var unassigned = new ApiClient("unassigned developer", certificate);
    using var anonymous = new ApiClient("anonymous", certificate);
    ProbeReport.Save();
    try
    {
        await LocalDatabase.ProvisionAdministratorAsync(database, a, "Synthetic M4B Organization A", "Synthetic M4B Administrator", email, password);
        await LocalDatabase.ProvisionAdministratorAsync(database, b, "Synthetic M4B Organization B", "Synthetic M4B Administrator", "graph-other-" + run + "@example.test", password);
        await admin.Login(email, password); await rival.Login(email, password);
        await foreign.Login("graph-other-" + run + "@example.test", password);
        async Task<string> Register(ApiClient client, string suffix)
        {
            var devEmail = "graph-" + suffix + "-" + run + "@example.test";
            var invitation = await admin.Send("issue " + suffix + " invitation", "POST", "/api/auth/invitations", new { email = devEmail });
            await anonymous.RefreshCsrf();
            var registration = await anonymous.Send("register " + suffix, "POST", "/api/auth/register", new {
                name = "Synthetic M4B Developer", email = devEmail, password, role = "developer", accessCode = invitation.Json.GetProperty("accessCode").GetString() });
            await client.Login(devEmail, password);
            return registration.Json.GetProperty("userId").GetString()!;
        }
        var developerId = await Register(developer, "assigned"); await Register(unassigned, "unassigned");
        var created = await admin.Send("create owned project", "POST", "/api/auth/projects", new {
            name = "Synthetic M4B Graph Project", assignedTo = developerId, status = "active" });
        var id = created.Json.GetProperty("id").GetGuid(); var route = "/api/auth/projects/" + id + "/graph";
        var empty = JsonNode.Parse(GraphDocument.Empty)!;
        var initial = await admin.Send("authorized unsaved graph", "GET", route);
        ProbeReport.Check("Unsaved graph has revision zero and null timestamps", initial.Json.GetProperty("revision").GetInt64() == 0 &&
            initial.Json.GetProperty("createdAt").ValueKind == JsonValueKind.Null && initial.Json.GetProperty("graph").GetProperty("nodes").GetArrayLength() == 0);
        object Save(long revision, JsonNode graph) => new { expectedRevision = revision, graph };
        await anonymous.Send("anonymous read denied", "GET", route, expected: 401);
        await anonymous.Send("anonymous write denied", "PUT", route, Save(0, empty), expected: 401);
        await developer.Send("assigned read unsaved", "GET", route);
        await developer.Send("developer write denied", "PUT", route, Save(0, empty), expected: 403);
        await unassigned.Send("unassigned read concealed", "GET", route, expected: 404);
        await foreign.Send("foreign read concealed", "GET", route, expected: 404);
        await foreign.Send("foreign write concealed", "PUT", route, Save(0, empty), expected: 404);
        await admin.Send("missing project read concealed", "GET", "/api/auth/projects/" + Guid.NewGuid() + "/graph", expected: 404);
        await admin.Send("missing project write concealed", "PUT", "/api/auth/projects/" + Guid.NewGuid() + "/graph", Save(0, empty), expected: 404);
        await admin.Send("missing CSRF denied", "PUT", route, Save(0, empty), expected: 400, csrf: false);
        await admin.Send("incorrect CSRF denied", "PUT", route, Save(0, empty), expected: 400, csrf: false,
            headers: new() { ["X-CSRF-TOKEN"] = "invalid-synthetic-value" });
        var preflight = await anonymous.Send("localhost PUT CORS", "OPTIONS", route, expected: 204, headers: new() {
            ["Origin"] = "https://localhost:3000", ["Access-Control-Request-Method"] = "PUT", ["Access-Control-Request-Headers"] = "Content-Type,X-CSRF-TOKEN" });
        ProbeReport.Check("PUT retains explicit credentialed localhost origin", preflight.AllowedOrigin == "https://localhost:3000" && preflight.CredentialsAllowed);
        var races = await Task.WhenAll(admin.Send("competing initial save A", "PUT", route, Save(0, empty), allowed: [200,409]),
            rival.Send("competing initial save B", "PUT", route, Save(0, empty), allowed: [200,409]));
        ProbeReport.Check("Exactly one initial save wins", races.Count(r => r.Status == 200) == 1 && races.Count(r => r.Status == 409) == 1);
        ProbeReport.Check("One empty row revision one committed", await Scalar<bool>(database,
            "SELECT revision=1 AND document->'nodes'='[]'::jsonb AND created_at=updated_at FROM project_graphs WHERE project_id=@id", id));
        var graph = ValidGraph();
        var saved = await admin.Send("save six design categories", "PUT", route, Save(1, graph));
        var createdAt = saved.Json.GetProperty("createdAt").GetDateTimeOffset();
        ProbeReport.Check("Valid graph advances revision", saved.Json.GetProperty("revision").GetInt64() == 2);
        var read = await developer.Send("assigned developer reads populated graph", "GET", route);
        ProbeReport.Check("HTTP read equals committed JSONB", JsonNode.DeepEquals(graph, JsonNode.Parse(read.Json.GetProperty("graph").GetRawText())) &&
            await Scalar<bool>(database, "SELECT revision=2 AND document->'nodes'->0->'position'->>'x'='123.5' FROM project_graphs WHERE project_id=@id", id));
        await admin.Send("stale revision rejected", "PUT", route, Save(1, empty), expected: 409);
        var invalid = new List<(string, JsonNode)>();
        void Invalid(string label, Action<JsonNode> change) { var copy = graph.DeepClone(); change(copy); invalid.Add((label, copy)); }
        Invalid("unknown node type", g => g["nodes"]![0]!["type"] = "executable");
        Invalid("duplicate node ID", g => g["nodes"]![1]!["id"] = "trigger");
        Invalid("invalid node ID", g => g["nodes"]![0]!["id"] = "../x");
        Invalid("runtime node field", g => g["nodes"]![0]!["selected"] = true);
        Invalid("unknown document property", g => g["organizationId"] = a);
        Invalid("unlisted node data", g => g["nodes"]![0]!["data"]!["password"] = "synthetic-placeholder");
        Invalid("non-string label", g => g["nodes"]![0]!["data"]!["label"] = 42);
        Invalid("empty label", g => g["nodes"]![0]!["data"]!["label"] = " ");
        Invalid("long label", g => g["nodes"]![0]!["data"]!["label"] = new string('x',101));
        Invalid("out of bounds position", g => g["nodes"]![0]!["position"]!["x"] = 100001);
        Invalid("non-number position", g => g["nodes"]![0]!["position"]!["x"] = "NaN");
        Invalid("missing position coordinate", g => g["nodes"]![0]!["position"]!.AsObject().Remove("y"));
        Invalid("unsupported graph version", g => g["schemaVersion"] = 2);
        Invalid("dangling edge", g => g["edges"]![0]!["target"] = "missing");
        Invalid("invalid handle", g => g["edges"]![0]!["sourceHandle"] = "execute");
        Invalid("self link", g => g["edges"]![0]!["target"] = "trigger");
        Invalid("duplicate edge ID", g => g["edges"]!.AsArray().Add(g["edges"]![0]!.DeepClone()));
        Invalid("duplicate connection", g => { var edge = g["edges"]![0]!.DeepClone(); edge["id"] = "second"; g["edges"]!.AsArray().Add(edge); });
        Invalid("response output", g => { g["edges"]![0]!["source"] = "response"; g["edges"]![0]!["target"] = "request"; });
        Invalid("cycle", g => { g["edges"]!.AsArray().Add(Edge("to-code","request","code")); g["edges"]!.AsArray().Add(Edge("to-request","code","request")); });
        Invalid("raw SQL excluded", g => g["nodes"]![2]!["data"]!["query"] = "SELECT synthetic_metadata");
        Invalid("code excluded", g => g["nodes"]![3]!["data"]!["code"] = "window.synthetic=true");
        Invalid("body excluded", g => g["nodes"]![1]!["data"]!["body"] = "{}");
        Invalid("credential URL excluded", g => g["nodes"]![1]!["data"]!["url"] = "https://synthetic:placeholder@example.invalid/design");
        Invalid("URL query excluded", g => g["nodes"]![1]!["data"]!["url"] = "https://example.invalid/design?key=synthetic");
        Invalid("unsafe headers excluded", g => g["nodes"]![1]!["data"]!["headers"] = "{\"Authorization\":\"synthetic-placeholder\"}");
        Invalid("arbitrary header value excluded", g => g["nodes"]![1]!["data"]!["headers"] = "{\"Accept\":\"synthetic-placeholder\"}");
        Invalid("column expression excluded", g => g["nodes"]![5]!["data"]!["columns"] = "[{\"name\":\"id\",\"type\":\"INTEGER\",\"default\":\"execute()\"}]");
        Invalid("duplicate column names", g => g["nodes"]![5]!["data"]!["columns"] = "[{\"name\":\"id\",\"type\":\"INTEGER\"},{\"name\":\"ID\",\"type\":\"TEXT\"}]");
        Invalid("bad column flag", g => g["nodes"]![5]!["data"]!["columns"] = "[{\"name\":\"id\",\"type\":\"INTEGER\",\"primaryKey\":\"yes\"}]");
        Invalid("overlong property", g => g["nodes"]![0]!["data"]!["path"] = "/" + new string('x',4096));
        Invalid("too many nodes", g => { g["nodes"] = new JsonArray(Enumerable.Range(0,101).Select(i => (JsonNode)new JsonObject {
            ["id"] = "n"+i, ["type"] = "customLogic", ["position"] = new JsonObject { ["x"]=0,["y"]=0 }, ["data"] = new JsonObject { ["label"]="n" } }).ToArray()); g["edges"] = new JsonArray(); });
        Invalid("too many edges", g => g["edges"] = new JsonArray(Enumerable.Range(0,201).Select(i => Edge("e"+i,"trigger","request")).ToArray()));
        foreach (var (label, bad) in invalid) await admin.Send(label + " rejected", "PUT", route, Save(2,bad),
            expected: System.Text.Encoding.UTF8.GetByteCount(bad.ToJsonString()) > GraphDocument.MaxBytes ? 413 : 400);
        await admin.Send("non-number expected revision", "PUT", route, new { expectedRevision="2", graph }, expected:400);
        await admin.Send("negative expected revision", "PUT", route, Save(-1,graph), expected:400);
        await admin.Send("client ownership field rejected", "PUT", route, new { expectedRevision=2, graph, organizationId=a }, expected:400);
        await admin.Send("malformed JSON rejected", "PUT", route, expected:400, rawJson:"{bad");
        await admin.Send("duplicate JSON property rejected", "PUT", route, expected:400,
            rawJson:"{\"expectedRevision\":2,\"expectedRevision\":2,\"graph\":"+graph.ToJsonString()+"}");
        await admin.Send("nested unexpected document rejected", "PUT", route, expected:400,
            rawJson:"{\"expectedRevision\":2,\"graph\":{\"schemaVersion\":1,\"nodes\":[],\"edges\":[],\"extra\":"+new string('[',17)+"0"+new string(']',17)+"}}");
        var oversized = empty.DeepClone(); oversized["extra"] = new string('x',12500);
        await admin.Send("aggregate graph limit rejected", "PUT", route, Save(2,oversized), expected:413);
        oversized["extra"] = new string('x',18000);
        await admin.Send("global request limit retained", "PUT", route, Save(2,oversized), expected:413);
        read = await admin.Send("valid graph intact after invalid saves", "GET", route);
        ProbeReport.Check("Invalid requests leave document and revision unchanged", read.Json.GetProperty("revision").GetInt64() == 2 &&
            JsonNode.DeepEquals(graph,JsonNode.Parse(read.Json.GetProperty("graph").GetRawText())));
        var contenderA = graph.DeepClone(); contenderA["nodes"]![0]!["data"]!["label"] = "Synthetic winner A";
        var contenderB = graph.DeepClone(); contenderB["nodes"]![0]!["data"]!["label"] = "Synthetic winner B";
        races = await Task.WhenAll(admin.Send("concurrent update A", "PUT", route, Save(2,contenderA), allowed:[200,409]),
            rival.Send("concurrent update B", "PUT", route, Save(2,contenderB), allowed:[200,409]));
        var winning = races[0].Status == 200 ? contenderA : contenderB;
        read = await admin.Send("read concurrent winner", "GET", route);
        ProbeReport.Check("One concurrent update wins without overwrite", races.Count(r=>r.Status==200)==1 && races.Count(r=>r.Status==409)==1 &&
            read.Json.GetProperty("revision").GetInt64()==3 && JsonNode.DeepEquals(winning,JsonNode.Parse(read.Json.GetProperty("graph").GetRawText())) &&
            read.Json.GetProperty("createdAt").GetDateTimeOffset()==createdAt && read.Json.GetProperty("updatedAt").GetDateTimeOffset()>=createdAt);
        foreach (var (label, sql, state) in new[] {
            ("foreign-key", "INSERT INTO project_graphs(project_id,schema_version,revision,document) VALUES(gen_random_uuid(),1,1,'{\"schemaVersion\":1,\"nodes\":[],\"edges\":[]}')", "23503"),
            ("schema version", "UPDATE project_graphs SET schema_version=2 WHERE project_id=@id", "23514"),
            ("revision", "UPDATE project_graphs SET revision=0 WHERE project_id=@id", "23514"),
            ("document object", "UPDATE project_graphs SET document='[]'::jsonb WHERE project_id=@id", "23514"),
            ("required arrays", "UPDATE project_graphs SET document='{}'::jsonb WHERE project_id=@id", "23514"),
            ("timestamp", "UPDATE project_graphs SET updated_at=created_at-interval '1 second' WHERE project_id=@id", "23514"),
            ("uniqueness", "INSERT INTO project_graphs SELECT * FROM project_graphs WHERE project_id=@id", "23505"),
            ("least privilege", "ALTER TABLE project_graphs ADD COLUMN forbidden text", "42501") })
        {
            await using var connection = await database.OpenConnectionAsync(); await using var transaction = await connection.BeginTransactionAsync();
            var rejected = false;
            try { await using var command = new NpgsqlCommand(sql,connection,transaction); command.Parameters.AddWithValue("id",id); await command.ExecuteNonQueryAsync(); }
            catch (PostgresException exception) when (exception.SqlState==state) { rejected=true; }
            await transaction.RollbackAsync(); ProbeReport.Check("Database "+label+" constraint enforced",rejected);
        }
        await Execute(database,"UPDATE projects SET assignedto=NULL WHERE id=@id",id);
        await developer.Send("removed assignment concealed on next request","GET",route,expected:404);
        await using (var assign = database.CreateCommand("UPDATE projects SET assignedto=@user WHERE id=@id")) {
            assign.Parameters.AddWithValue("user",developerId); assign.Parameters.AddWithValue("id",id); await assign.ExecuteNonQueryAsync(); }
        // Separate API-only and database checkpoints prove each requested durability boundary.
        // Continuation files contain ONLY independently verified process IDs, never credentials.
        foreach (var (label, file, instructions) in new[] {
            ("API-only restart", "continue-api-pid.txt", "stop/restart only the verified task API"),
            ("database and API restart", "continue-pid.txt", "stop the task API; normally restart only the guarded project database; start the API") })
        {
            var continuation = Path.Combine(ProbeReport.DirectoryPath,file);
            Console.WriteLine("RESTART CHECKPOINT: "+instructions+"; independently verify its new PID; write that PID to "+continuation);
            var deadline = DateTime.UtcNow.AddMinutes(4);
            while (!File.Exists(continuation) && DateTime.UtcNow<deadline) await Task.Delay(1000);
            if (!File.Exists(continuation) || !int.TryParse(File.ReadAllText(continuation),out var newPid) || newPid==process.Id || !process.HasExited) throw new InvalidOperationException();
            process.Dispose(); process=Process.GetProcessById(newPid);
            if (process.HasExited || process.MainModule?.ModuleName!="dotnet.exe") throw new InvalidOperationException();
            await admin.Send(label+" revoked old session", "GET",route,expected:401);
            await admin.Login(email,password);
            read=await admin.Send("read after "+label,"GET",route);
            ProbeReport.Check("Complete document and revision survive "+label,read.Json.GetProperty("revision").GetInt64()==3 &&
                read.Json.GetProperty("createdAt").GetDateTimeOffset()==createdAt &&
                JsonNode.DeepEquals(winning,JsonNode.Parse(read.Json.GetProperty("graph").GetRawText())));
        }
        // The operator intentionally restarted PostgreSQL. Retire this probe's idle physical
        // connections before SQL readback; do not retry writes or touch other data-source pools.
        database.Clear();
        await LocalDatabase.ValidateAsync(database);
        ProbeReport.Check("SQL revision survives database restart",await Scalar<bool>(database,"SELECT revision=3 FROM project_graphs WHERE project_id=@id",id));
        await admin.Send("empty graph replacement", "PUT",route,Save(3,empty));
        read=await admin.Send("read persisted empty replacement","GET",route);
        ProbeReport.Check("Empty replacement retains row and advances revision",read.Json.GetProperty("revision").GetInt64()==4 && read.Json.GetProperty("graph").GetProperty("nodes").GetArrayLength()==0);
        await admin.Send("delete owned project", "DELETE","/api/auth/projects/"+id);
        ProbeReport.Check("Project deletion cascades only its graph",!await Scalar<bool>(database,"SELECT EXISTS(SELECT 1 FROM project_graphs WHERE project_id=@id)",id));
        await admin.Send("deleted project graph concealed","GET",route,expected:404);
        ProbeReport.Completed=true;
        return 0;
    }
    finally
    {
        try
        {
            await using var connection=await database.OpenConnectionAsync(); await using var transaction=await connection.BeginTransactionAsync();
            await using var cleanup=new NpgsqlCommand("""
                SELECT NOT EXISTS(SELECT 1 FROM users WHERE organizationid IN (@a,@b) AND (email NOT LIKE @pattern OR name NOT LIKE 'Synthetic M4B%'))
                AND NOT EXISTS(SELECT 1 FROM projects WHERE organizationid IN (@a,@b) AND name NOT LIKE 'Synthetic M4B%')
                AND NOT EXISTS(SELECT 1 FROM invitations WHERE organizationid IN (@a,@b) AND email NOT LIKE @pattern)
                AND NOT EXISTS(SELECT 1 FROM companycodes WHERE organizationid IN (@a,@b) AND code NOT LIKE 'retired_%')
                """,connection,transaction);
            cleanup.Parameters.AddWithValue("a",a); cleanup.Parameters.AddWithValue("b",b); cleanup.Parameters.AddWithValue("pattern","graph-%-"+run+"@example.test");
            if(await cleanup.ExecuteScalarAsync() is not true) throw new InvalidOperationException("Unknown rows; cleanup refused.");
            cleanup.CommandText="DELETE FROM invitations WHERE organizationid IN (@a,@b); DELETE FROM projects WHERE organizationid IN (@a,@b); DELETE FROM users WHERE organizationid IN (@a,@b); DELETE FROM companycodes WHERE organizationid IN (@a,@b) AND code LIKE 'retired_%'";
            await cleanup.ExecuteNonQueryAsync(); await transaction.CommitAsync();
            ProbeReport.Cleaned=true; ProbeReport.OriginalStateRestored=baseline==await LocalDatabase.BusinessFingerprintAsync(database);
            ProbeReport.Check("Original six-table business state restored",ProbeReport.OriginalStateRestored);
        }
        finally { ProbeReport.Save(); Console.WriteLine("Sanitized report: "+Path.Combine(ProbeReport.DirectoryPath,"report.json")); process.Dispose(); }
    }
}
static JsonNode Edge(string id,string source,string target)=>new JsonObject { ["id"]=id,["source"]=source,["target"]=target,["sourceHandle"]="out",["targetHandle"]="in",["type"]="default" };
static JsonNode ValidGraph()
{
    JsonNode Node(string id,string type,JsonObject data)=>new JsonObject { ["id"]=id,["type"]=type,["position"]=new JsonObject { ["x"]=123.5,["y"]=-45 },["data"]=data };
    return new JsonObject { ["schemaVersion"]=1,["nodes"]=new JsonArray(
        Node("trigger","apiTrigger",new() { ["label"]="Synthetic trigger",["path"]="/synthetic/design",["method"]="GET" }),
        Node("request","httpRequest",new() { ["label"]="Synthetic request",["url"]="https://example.invalid/design",["method"]="POST",["headers"]="{\"Content-Type\":\"application/json\"}" }),
        Node("query","databaseQuery",new() { ["label"]="Disabled query placeholder" }),
        Node("code","customLogic",new() { ["label"]="<img src=x onerror=synthetic()>" }),
        Node("response","sendResponse",new() { ["label"]="Synthetic response",["statusCode"]="201",["headers"]="{}" }),
        Node("table","sqlTable",new() { ["label"]="Synthetic table metadata",["tableName"]="synthetic_metadata",["columns"]="[{\"name\":\"id\",\"type\":\"INTEGER\",\"primaryKey\":true}]" })),
        ["edges"]=new JsonArray(Edge("trigger_request","trigger","request"),Edge("request_response","request","response")) };
}
static async Task<T> Scalar<T>(NpgsqlDataSource db,string sql,Guid id) { await using var command=db.CreateCommand(sql); command.Parameters.AddWithValue("id",id); return (T)(await command.ExecuteScalarAsync())!; }
static async Task Execute(NpgsqlDataSource db,string sql,Guid id) { await using var command=db.CreateCommand(sql); command.Parameters.AddWithValue("id",id); if(await command.ExecuteNonQueryAsync()!=1) throw new InvalidOperationException(); }
