import { useEffect, useState } from "react";
import { ApiService } from "../services/api";
import "../styles/session-history.style.css";
import { LOADING_STATUS } from "../types/controlSheet";

type Session = {
  name: string;
  id: string;
};

type SessionHistoryProps = {
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  currentSessionName?: string | null;
  currentSessionId?: string | null;
};

function SessionHistory({
  onSessionSelect,
  onNewSession,
  currentSessionId,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  const [sessionsApiStatus, setSessionsApiStatus] = useState<LOADING_STATUS>(
    LOADING_STATUS.IDLE,
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (currentSessionId) {
      setSelectedSessionId(currentSessionId);
      setSessionsApiStatus(LOADING_STATUS.IDLE);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (sessionsApiStatus === LOADING_STATUS.IDLE) {
      setSessionsApiStatus(LOADING_STATUS.LOADING);
      ApiService.getSessions()
        .then((res) => {
          const sessionList = res.data as Session[];
          setSessions(sessionList);
          setSessionsApiStatus(LOADING_STATUS.LOADED);

          const params = new URLSearchParams(window.location.search);
          const sessionIdFromUrl = params.get("session");
          if (
            sessionIdFromUrl &&
            sessionList.find((session) => session.id === sessionIdFromUrl)
          ) {
            setSelectedSessionId(sessionIdFromUrl);
            onSessionSelect(sessionIdFromUrl);
            // setHasAutoSelected(true);
          }
        })
        .catch(() => {
          setSessionsApiStatus(LOADING_STATUS.ERROR);
        });
    }
  }, [sessionsApiStatus, onSessionSelect]);

  const handleNewSession = () => {
    if (!currentSessionId) {
      onNewSession();
      return;
    }
    setSelectedSessionId(null);
    onNewSession();
    setSessionsApiStatus(LOADING_STATUS.IDLE);
  };

  const renderSessionList = () => {
    if (!Array.isArray(sessions)) return null;

    return sessions.map((session) => {
      const isSelected = selectedSessionId === session.id;
      return (
        <div
          key={session.id}
          className={`item ${isSelected ? "selected" : ""}`}
        >
          <span
            className="title"
            onClick={() => {
              setSelectedSessionId(session.id);
              onSessionSelect(session.id);
              // setShowUnsavedSession(false);
              setSessionsApiStatus(LOADING_STATUS.IDLE);
            }}
          >
            {session.name}
          </span>
          <button>
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      );
    });
  };

  return (
    <div className="session-history">
      <button
        onClick={handleNewSession}
        className="bg-orange-500 text-white px-2 py-1 rounded-full font-semibold shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
        style={{ fontSize: 14, marginBottom: 12, cursor: "pointer" }}
      >
        + New Session
      </button>

      <div className="session-list">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderSessionList()}
        </div>
      </div>
    </div>
  );
}

export default SessionHistory;
