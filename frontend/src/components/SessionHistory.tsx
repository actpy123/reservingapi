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
};

function SessionHistory({
  onSessionSelect,
  onNewSession,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sessionsApiStatus, setSessionsApiStatus] = useState<LOADING_STATUS>(
    LOADING_STATUS.IDLE
  );
  const [showUnsavedSession, setShowUnsavedSession] = useState(true);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (sessionsApiStatus === LOADING_STATUS.IDLE) {
      setSessionsApiStatus(LOADING_STATUS.LOADING);
      ApiService.getSessions()
        .then((res) => {
          const sessionList = res.data as Session[];
          setSessions(sessionList);
          setSessionsApiStatus(LOADING_STATUS.LOADED);

          // // auto-select latest session once
          // if (sessionList.length > 0 && !hasAutoSelected) {
          //   onSessionSelect(sessionList[0].id);
          //   setSelectedSessionId(sessionList[0].id);
          //   setHasAutoSelected(true);
          // }
        })
        .catch(() => {
          setSessionsApiStatus(LOADING_STATUS.ERROR);
        });
    }
  }, [sessionsApiStatus, hasAutoSelected, onSessionSelect]);

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
        onClick={() => {
          setShowUnsavedSession(true);
          setSelectedSessionId(null); // unsaved becomes active
          onNewSession();
        }}
        className="bg-orange-500 text-white px-2 py-1 rounded-full font-semibold shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
        style={{ fontSize: 14 }}
      >
        + New Session
      </button>

      <div className="title">
        <span className="material-symbols-outlined">view_headline</span>
        <h2>Your Sessions</h2>
      </div>

      <div className="session-list">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {showUnsavedSession && (
            <div
              className={`item ${
                selectedSessionId === null ? "selected" : ""
              }`}
              onClick={() => {
                setSelectedSessionId(null); // go back to unsaved
                onNewSession();
              }}
            >
              <span className="title">unsaved session</span>
              <button>
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          )}

          {renderSessionList()}
        </div>
      </div>
    </div>
  );
}

export default SessionHistory;
