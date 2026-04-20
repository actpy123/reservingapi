import "../styles/NoSessionScreen.css";

interface NoSessionScreenProps {
  onNewSession: () => void;
}

function NoSessionScreen({ onNewSession }: NoSessionScreenProps) {
  return (
    <div className="no-session-container">
      <div className="no-session-content">
        <span className="material-symbols-outlined no-session-icon">
          do_not_disturb_on
        </span>
        <h1 className="no-session-title">No Active Session</h1>
        <p className="no-session-subtitle">
          You currently have no active session.
        </p>
        <p className="no-session-message">
          Please click on the
          <a className="no-session-button" onClick={onNewSession}>
            {` New Session  `}
          </a>
          button to create a new session.
        </p>
      </div>
    </div>
  );
}

export default NoSessionScreen;
