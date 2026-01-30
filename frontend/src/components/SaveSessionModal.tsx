import { useEffect, useRef, useState } from "react";
import "../styles/save-session.css";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  sessionName: string;
  setSessionName: (value: string) => void;
  onSave: () => void;
};

function SaveSessionModal({
  open,
  onClose,
  sessionName,
  setSessionName,
  onSave,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [sessionNameLocal, setSessionNameLocal] = useState(sessionName);

  // ✅ Open/Close controlled by props
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={() => {
        setSessionNameLocal(sessionName);
        onClose();
      }}
    >
      <div className="p-4 flex gap-4 flex-col">
        <h2 className="text-xm font-semibold">
          You need to save your session before running your control sheet
        </h2>
        <div className="flex gap-2 flex-col">
          <div className="flex gap-2 flex-col">
            <label
              className="text-sm font-medium text-gray-700"
              style={{ textAlign: "left" }}
            >
              Session Name
            </label>
            <input
              type="text"
              value={sessionNameLocal}
              onClick={() => {
                if (sessionNameLocal === "unsaved session") {
                  setSessionNameLocal("");
                }
              }}
              onChange={(e) => setSessionNameLocal(e.target.value)}
              placeholder="Enter session name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <span className="text-xs text-gray-500" style={{ textAlign: "left" }}>
            You can modify session name
          </span>
        </div>
        <div className="flex gap-4 pt-4 justify-end">
          <button
            className="bg-orange-500 text-white px-4 py-1 rounded-full font-semibold shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
            onClick={onSave}
          >
            Save Session
          </button>
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default SaveSessionModal;
