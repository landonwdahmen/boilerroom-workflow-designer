using System;
using System.Xml.Linq;
using System.Collections.Concurrent;

namespace ZitaDataSystem.Services
{
    public class SessionManager
    {
        private readonly ConcurrentDictionary<string, XDocument> _sessions = new ConcurrentDictionary<string, XDocument>();
        // Starts a session with the given XML document and returns a session ID.
    public string StartSession(XDocument data)
    {
        string sessionId = Guid.NewGuid().ToString();

        _sessions[sessionId] = data;

        return sessionId;
    }

    // Retrieves a session without removing it.
    public XDocument? GetSession(string sessionHash)
    {
        if (_sessions.TryGetValue(sessionHash, out var data))
        {

            return data;
        }

        return null;
    }

    // EndSession: Retrieves and removes the session.
    public XDocument? EndSession(string sessionHash)
    {
        if (_sessions.TryRemove(sessionHash, out var data))
        {

            return data;
        }

        return null;
    }

    // Stores or updates a session.
    public void StoreSession(string sessionHash, XDocument sessionData)
    {

        _sessions[sessionHash] = sessionData;
    }
}
}
