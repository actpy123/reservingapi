import React from "react";
import "../styles/NoSessionScreen.css";

const NoSessionScreen: React.FC = () => {
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
          Please click on the{" "}
          <strong className="no-session-button">New Session</strong> button to
          create a new session.
        </p>
      </div>
    </div>
  );
};

export default NoSessionScreen;
