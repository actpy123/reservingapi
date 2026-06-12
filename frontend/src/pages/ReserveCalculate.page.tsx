import React, { useState } from "react";
import ControlSheetForm from "../components/ControlSheetForm";
import { ApiService } from "../services/api";
import type { Scenario } from "../services/api";
import { parseCsvToObjects } from "../utils/csv.utils";
import { useBackendStatus } from "../hooks";
import type { ControlSheet, Tab } from "../types/controlSheet";
import SessionHistory from "../components/SessionHistory";
import { apiFetch } from "../interceptor/auth.interceptor";
import { useNavigate } from "react-router-dom";
import SaveSessionModal from "../components/SaveSessionModal";
import NoSessionScreen from "../components/NoSessionScreen";
import Tabs from "../components/Tabs";
import Assumptions from "./Assumptions.page";
import Simulation from "../components/Simulations";

const ReserveCalculatePage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [controlSheets, setControlSheets] = useState<ControlSheet[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [defaultSessionName, setDefaultSessionName] = useState<string | null>(
    null,
  );

  const backendStatus = useBackendStatus();
  const navigate = useNavigate();

  const handleControlSheet = () => setIsFormOpen(true);
  const handleFormClose = () => setIsFormOpen(false);

  const handleFormSubmit = async (formData: any) => {
    const newRow: ControlSheet = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      runNo: String(formData.serialNo || ""),
      productCode: String(formData.productCode || ""),
      runIndicator: String(formData.isRunFlagTrue || "No"),
      inputFilePath: String(formData.inputFilePath || ""),
      data: formData.data ?? null,
      outputFilePath: String(formData.outputFilePath || ""),
      execution: "Pending",
      progress: 0,
    };
    try {
      await ApiService.createControlSheet({
        scenarioCode: newRow.productCode,
        inputFilePath: newRow.inputFilePath,
        data: newRow.data,
        sessionId: selectedSessionId!,
      });
      setControlSheets((prev) => [newRow, ...prev]);
      setIsFormOpen(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteRow = async (id: string) => {
    const ok = window.confirm("Delete this control sheet entry?");
    if (!ok) return;

    try {
      const res = await ApiService.deleteControlSheets(id);

      // optional backend success check
      if (res?.success === false) {
        alert("Failed to delete control sheet");
        return;
      }

      setControlSheets((prev) => prev.filter((row) => row.id !== id));
    } catch (error) {
      console.error(error);
      alert("Unable to delete control sheet. Please try again.");
    }
  };

  const runReserve = async (row: ControlSheet) => {
    try {
      const { controlSheetId } = row;
      if (backendStatus === "offline") {
        alert(
          "Backend is offline. Please check the backend connection and try again.",
        );
        return;
      }
      const startedAt = Date.now();

      const result = await ApiService.calculateReserve(
        controlSheetId!,
        selectedSessionId!,
      );

      const outputId = result.outputFile
        ? ApiService.extractIdFromUrl(result.outputFile)
        : null;
      const cashflowId = result.cashflows
        ? ApiService.extractIdFromUrl(result.cashflows)
        : null;

      const outputUrl = outputId
        ? ApiService.getOutputDownloadUrl(outputId)
        : undefined;
      const cashflowUrl = cashflowId
        ? ApiService.getCashflowDownloadUrl(cashflowId)
        : undefined;
      const execSeconds = Math.max(
        0,
        Math.round((Date.now() - startedAt) / 10) / 100,
      );

      setControlSheets((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                execution: "Completed",
                progress: 100,
                outputUrl,
                cashflowUrl,
                outputFilePath: result.outputFile || outputUrl || "",
                execSeconds,
                successfulPolicies: result.successfulPolicies,
                skippedPolicies: result.skippedPolicies,
              }
            : r,
        ),
      );

      if (!outputUrl || !cashflowUrl) {
        alert(
          "Calculation completed but download links were not provided by the server. This may indicate an error in the calculation process.",
        );
      }
    } catch (e: any) {
      console.error("Reserve calculation error:", e);
      setControlSheets((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, execution: "Failed", progress: 0 } : r,
        ),
      );

      let errorMessage = e?.message || "Unknown error";
      if (e?.message?.includes("Cannot read properties of undefined")) {
        errorMessage =
          "Data structure error: The mortality rates data is not in the expected format. Please check that your assumptions files contain properly formatted mortality tables with Age and Gender columns.";
      } else if (e?.message?.includes("HTTP error")) {
        errorMessage = `Backend error: ${e.message}`;
      }

      alert(`Failed to run reserve calculation: ${errorMessage}`);
    }
  };

  const handleDownload = async (url: string, filename?: string) => {
    const response = await apiFetch(url);

    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`,
      );
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || "";
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      setSelectedSessionId(sessionId);
      navigate(`${window.location.pathname}?session=${sessionId}`, {
        replace: true,
      });
      const res = await ApiService.getControlSheets(sessionId);
      setControlSheets(
        res.data.map((item: any, index: number) => ({
          id: item._id, // required
          runNo: item.rowNumber || index + 1,
          productCode: item.scenarioCode,
          runIndicator: "Yes",
          inputFilePath: item.inputFilePath,
          inputFile: { name: item.inputFile },
          outputFilePath: item.outPutUrl,
          execution: item.execution ?? "Pending",
          progress:
            item.execution === "Completed"
              ? 100
              : item.execution === "Running"
                ? 50
                : 0,
          execSeconds: null,
          successfulPolicies: item.success,
          skippedPolicies: null,
          outputUrl: item.outPutUrl,
          cashflowUrl: item.cashFlowUrl,
          controlSheetId: item._id,
        })),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to load control sheets for this session");
    }
  };

  const handleNewSession = () => {
    setSelectedSessionId(null);
    setControlSheets([]);
    setIsSessionFormOpen(true);
    // navigate(window.location.pathname, { replace: true });
  };

  const createSession = async (sessionName: string) => {
    try {
      const res = await ApiService.createSession({
        sessionName,
      });
      const newSessionId = res.data._id;
      setSelectedSessionId(newSessionId);
      navigate(`${window.location.pathname}?session=${newSessionId}`, {
        replace: true,
      });
      setIsSessionFormOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create session. Please try again.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
      }}
    >
      <div>
        <SessionHistory
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          currentSessionName={defaultSessionName}
          currentSessionId={selectedSessionId}
        />
      </div>
      <div style={{ width: "100%", height: "100vh" }}>
        {!selectedSessionId && (
          <NoSessionScreen onNewSession={handleNewSession} />
        )}
        {selectedSessionId && (
          <>
            <Tabs
              tabs={[
                {
                  label: "Assumptions",
                  content: <Assumptions sessionId={selectedSessionId} />,
                } as Tab,
                {
                  label: "Control Sheets",
                  content: (
                    <Simulation
                      controlSheets={controlSheets}
                      backendStatus={backendStatus}
                      handleControlSheet={handleControlSheet}
                      handleDownload={handleDownload}
                      handleDeleteRow={handleDeleteRow}
                      selectedSessionId={selectedSessionId}
                      setIsSessionFormOpen={setIsSessionFormOpen}
                      runReserve={runReserve}
                    />
                  ),
                } as Tab,
              ]}
            ></Tabs>
            {}
          </>
        )}
        {isSessionFormOpen && (
          <SaveSessionModal
            open={isSessionFormOpen}
            onClose={() => setIsSessionFormOpen(false)}
            sessionName={defaultSessionName}
            setSessionName={setDefaultSessionName}
            onSave={createSession}
          />
        )}
      </div>
      {isFormOpen && (
        <ControlSheetForm
          {...(selectedSessionId ? { sessionId: selectedSessionId } : {})}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default ReserveCalculatePage;
