import { ApiService } from "../services/api";
import type { ControlSheet } from "../types/controlSheet";

interface SimulationProps {
  controlSheets: ControlSheet[];
  backendStatus: "checking" | "online" | "offline";
  handleControlSheet: () => void;
  handleDownload: (url: string, filename: string) => void;
  handleDeleteRow: (id: string) => void;
  selectedSessionId: string | null;
  setIsSessionFormOpen: (open: boolean) => void;
  runReserve: (row: ControlSheet) => void;
}

function Simulation({
  controlSheets,
  backendStatus,
  handleControlSheet,
  handleDownload,
  handleDeleteRow,
  selectedSessionId,
  setIsSessionFormOpen,
  runReserve,
}: SimulationProps) {
  return (
    <>
      <div className="flex items-center justify-between py-3 px-3">
        <div>
          {backendStatus === "offline" && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full inline-block">
              ⚠️ Backend Offline - Some features may not work
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
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

      <div className="bg-white border border-x-0">
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
            {controlSheets
              .sort(
                (a: any, b: any) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              )
              .map((row) => (
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
                        onClick={() => runReserve(row)}
                        className="text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-full border border-orange-500 shadow-sm"
                      >
                        Run
                      </button>

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
    </>
  );
}

export default Simulation;
