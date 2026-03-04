import React, { useState } from "react";
import ControlSheetForm from "../components/ControlSheetForm";
import { ApiService } from "../services/api";
import type { Scenario } from "../services/api";
import { parseCsvToObjects } from "../utils/csv.utils";
import { useBackendStatus } from "../hooks";
import type { ControlSheet } from "../types/controlSheet";
import SessionHistory from "../components/SessionHistory";
import { apiFetch } from "../interceptor/auth.interceptor";
import { useNavigate } from "react-router-dom";
import SaveSessionModal from "../components/SaveSessionModal";

const ReserveCalculatePage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [controlSheets, setControlSheets] = useState<ControlSheet[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [defaultSessionName, setDefaultSessionName] =
    useState<string>("unsaved session");

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

        setControlSheets((prev) =>
          prev.filter((row) => row.id !== id)
        );
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
        payload.sessionName = updatedSessionName?? defaultSessionName;
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
          inputFile: row?.inputFile?.name
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
        res.data.map((item: any, index: number) => ({
          id: item._id, // required
          runNo: item.rowNumber || String(totalLength--),
          productCode: item.scenarioCode,
          runIndicator: "Yes",
          inputFilePath: item.inputFilePath,
          inputFile: {name: item.inputFile},
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
    navigate(window.location.pathname, { replace: true });
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
      <div style={{ padding: "16px" }}>
        <div className="flex items-center justify-between mb-6">
          <div></div>
          <div>
            <h1 className="text-bs font-bold text-gray-900 mb-2">
              Control Sheet Entry
            </h1>
            <div className="w-20 h-1 bg-blue-500 rounded-full"></div>
            {backendStatus === "offline" && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full inline-block">
                ⚠️ Backend Offline - Some features may not work
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleControlSheet}
              className="bg-orange-500 text-white px-2 py-1 rounded-full font-semibold shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
              style={{
                fontSize: 14,
              }}
            >
              + CONTROL SHEET ENTRY
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm">
          <div className="bg-gray-50 px-6 py-4 rounded-t-xl">
            <div className="grid grid-cols-11 text-sm font-semibold text-gray-700 divide-x divide-gray-200">
              <div className="text-center px-3">
                <span>Run NO.</span>
              </div>
              <div className="text-center px-3">
                <span>Scenario Code</span>
              </div>
              <div className="text-center px-3">
                <span>Input File Path</span>
              </div>
              <div className="text-center px-3">
                <span>Output File Path</span>
              </div>
              <div className="text-center px-3">
                <span>Execution</span>
              </div>
              <div className="text-center px-3">
                <span>Progress</span>
              </div>
              <div className="text-center px-3">
                <span>Exec Time</span>
              </div>
              <div className="text-center px-3">
                <span>Success</span>
              </div>
              <div className="text-center px-3 col-span-2">
                <span>Actions</span>
              </div>
            </div>
          </div>

          {controlSheets.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-500"></div>
              <h3 className="text-bs font-semibold text-gray-900 mb-2">
                No Control Sheet Found
              </h3>
              <p className="text-gray-500">
                To create reserver calculation please click on Create Control
                Sheet Entry
              </p>
            </div>
          )}

          {controlSheets.length > 0 && (
            <div className="divide-y divide-gray-200">
              {controlSheets.map((row) => (
                <div
                  key={row.id}
                  className="px-6 py-4 grid grid-cols-11 text-sm text-gray-900 divide-x divide-gray-100"
                >
                  <div className="text-center px-3">{row.runNo}</div>
                  <div className="text-center px-3">{row.productCode}</div>
                  <div
                    className="text-center px-3 truncate"
                    title={
                      row.inputFilePath ||
                      (row.inputFile && row.inputFile.name) ||
                      ""
                    }
                  >
                    {row.inputFilePath ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(row.inputFilePath, "reserve-output")
                        }
                        className="text-blue-600 hover:underline bg-transparent p-0 border-0 cursor-pointer"
                      >
                        {row.inputFilePath}
                      </button>
                    ) : (
                      <span>{row.inputFile?.name || "-"}</span>
                    )}
                  </div>
                  <div
                    className="text-center px-3 truncate"
                    title={row.outputFilePath || ""}
                  >
                    {row.outputFilePath ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(row.outputFilePath, "reserve-output")
                        }
                        className="text-blue-600 hover:underline bg-transparent p-0 border-0 cursor-pointer"
                      >
                        {row.outputFilePath}
                      </button>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                  <div className="text-center px-3">{row.execution}</div>
                  <div className="text-center px-3">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, row.progress))}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {row.progress}%
                    </span>
                  </div>
                  <div className="text-center px-3">
                    {row.execSeconds ? `${row.execSeconds}s` : "-"}
                  </div>
                  <div className="text-center px-3">
                    {row.successfulPolicies ?? "-"}
                  </div>
                  <div className="text-center px-3 col-span-2">
                    <div className="inline-flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="inline-flex items-center justify-center text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-full border border-red-200 shadow-sm"
                        title="Delete"
                        aria-label="Delete control sheet"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m1 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7m3 4v6m4-6v6"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          selectedSessionId
                            ? runReserve(row)
                            : setIsSessionFormOpen(true)
                        }
                        className="text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-full border border-orange-500 shadow-sm"
                      >
                        Run
                      </button>
                      {isSessionFormOpen && (
                        <SaveSessionModal
                          open={isSessionFormOpen}
                          onClose={() => setIsSessionFormOpen(false)}
                          sessionName={defaultSessionName}
                          setSessionName={setDefaultSessionName}
                          onSave={(sessionName) => {
                            setDefaultSessionName(sessionName);
                            runReserve(row,sessionName); // runs ONLY once
                            // handleSessionSelect(selectedSessionId!)
                            // setPendingRow(null);
                            
                            setIsSessionFormOpen(false);
                          }}
                        />
                      )}

                      {ApiService.isValidUrl(row.outputUrl) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(row.outputUrl!, "reserve-output.csv")
                          }
                          className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-full border border-green-600 shadow-sm"
                        >
                          Download Output
                        </button>
                      )}
                      {ApiService.isValidUrl(row.cashflowUrl) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(row.cashflowUrl!, "cashflow.csv")
                          }
                          className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full border border-blue-600 shadow-sm"
                        >
                          Download Cashflow
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
