//Sets the request payload for the information coming in
using System.Collections.Generic;

namespace ZitaDataSystem.Models
{
    public class RequestPayload
    {
        // Historical payload, unused by the retired HTTP handler. Missing rows are not an empty batch.
        public required List<Dictionary<string, string>> rows { get; set; }
    }
}
