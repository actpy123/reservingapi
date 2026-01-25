import { useEffect, useState } from "react";
import { ApiService } from "../services/api";
import "../styles/session-history.style.css";
import { LOADING_STATUS } from "../types/controlSheet";

type Session = {
  name: string;
};
function SessionHistory() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sessionsApiStatus, setSessionsApiStatus] = useState<LOADING_STATUS>(
    LOADING_STATUS.IDLE,
  );

  useEffect(() => {
    if (sessionsApiStatus === LOADING_STATUS.IDLE) {
      setSessionsApiStatus(LOADING_STATUS.LOADING);
      ApiService.getSessions()
        .then((res) => {
          setSessionsApiStatus(LOADING_STATUS.LOADED);
          setSessions(res.data as Session[]);
        })
        .catch(() => {
          setSessionsApiStatus(LOADING_STATUS.ERROR);
        });
    }
  }, [sessions, sessionsApiStatus]);

  const renderSessionList = () => {
    if (Array.isArray(sessions) && sessions.length) {
      return sessions.map((session) => {
        return (
          <div className="item">
            <span className="title">{session.name}</span>
            <button>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        );
      });
    }
    return null;
  };

  return (
    <div className="session-history">
      <button
        className="bg-orange-500 text-white px-2 py-1 rounded-full font-semibold shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
        style={{
          fontSize: 14,
        }}
      >
        + New Session
      </button>
      <div className="title">
        <span className="material-symbols-outlined">view_headline</span>
        <h2>Your Sessions</h2>
      </div>
      <div className="session-list">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className="item selected">
            <span className="title">unsaved session</span>
            <button>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          {renderSessionList()}
        </div>
      </div>
    </div>
  );
}

export default SessionHistory;
