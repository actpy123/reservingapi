import "../styles/session-history.style.css";

function SessionHistory() {
  return (
    <div className="session-history">
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
          <div className="item">
            <span className="title">list</span>
            <button>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          <div className="item selected">
            <span className="title">list</span>
            <button>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionHistory;
