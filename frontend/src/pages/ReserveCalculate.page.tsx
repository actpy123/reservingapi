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

  const handleFormSubmit = (formData: any) => {
    const newRow: ControlSheet = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      runNo: String(formData.serialNo || ""),
      productCode: String(formData.productCode || ""),
      runIndicator: String(formData.isRunFlagTrue || "No"),
      inputFilePath: String(formData.inputFilePath || ""),
      inputFile: formData.inputFile ?? null,
      outputFilePath: String(formData.outputFilePath || ""),
      execution: "Pending",
      progress: 0,
    };
    setControlSheets((prev) => [newRow, ...prev]);
    setIsFormOpen(false);
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

  const runReserve = async (row: ControlSheet, updatedSessionName?: string) => {
    try {
      if (backendStatus === "offline") {
        alert(
          "Backend is offline. Please check the backend connection and try again.",
        );
        return;
      }

      let sessionId = new URLSearchParams(window.location.search).get(
        "session",
      );
      let controlSheetId: any = row.controlSheetId;

      const payload: any = {
        scenarioCode: row.productCode,
      };

      if (!sessionId) {
        setIsSessionFormOpen(true);
        payload.sessionName = updatedSessionName ?? defaultSessionName;
      } else {
        payload.sessionId = sessionId;
      }

      if (!row.controlSheetId) {
        const res = await ApiService.createSessionSimulation(payload);
        sessionId = sessionId ?? res.data.session._id;
        controlSheetId = res.data.controlSheet._id;
        row.controlSheetId = controlSheetId;
      } else {
        controlSheetId = row.controlSheetId;
      }

      if (!new URLSearchParams(window.location.search).get("session")) {
        navigate(`${window.location.pathname}?session=${sessionId}`, {
          replace: true,
        });
      }

      setSelectedSessionId(sessionId);

      const scenarioValidation = await ApiService.validateScenarioCode(
        String(row.productCode || "").trim(),
      );
      if (!scenarioValidation.isValid) {
        alert(scenarioValidation.message);
        return;
      }

      const startedAt = Date.now();
      setControlSheets((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                execution: "Running",
                progress: 10,
                outputUrl: undefined,
                cashflowUrl: undefined,
                outputFilePath: "",
                execSeconds: undefined,
                successfulPolicies: undefined,
                skippedPolicies: undefined,
              }
            : r,
        ),
      );

      let csvText = "";
      let policies: any[] | null = null;

      // 🔹 Read CSV only if source exists
      if (row.inputFile instanceof File) {
        csvText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(row.inputFile!);
        });
      } else if (row.inputFilePath) {
        const resp = await fetch(row.inputFilePath);
        if (resp.ok) {
          csvText = await resp.text();
        }
      }

      // 🔹 Parse only if csvText has content
      if (csvText.trim().length > 0) {
        const parsed = parseCsvToObjects(csvText);
        policies = parsed.length > 0 ? parsed : null;
      }

      // 🔹 Update progress only when data exists
      if (policies) {
        setControlSheets((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, progress: 40 } : r)),
        );
      }

      // 🔹 Build scenarios
      const scenarios: Scenario[] = [
        {
          scenarioCode: row.productCode,
          data: policies,
          controlSheetId,
          inputFile: row?.inputFile?.name,
        },
      ];

      const result = await ApiService.calculateReserve(scenarios);

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
      let totalLength = res.data?.length || 0;
      setControlSheets(
        res.data.map((item: any) => ({
          id: item._id, // required
          runNo: item.rowNumber || String(totalLength--),
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
