import React, { useState } from 'react';
import ControlSheetForm from '../components/ControlSheetForm';
import { ApiService } from '../services/api';
import type { Scenario } from '../services/api';
import { parseCsvToObjects } from '../utils/csv.utils';
import { useBackendStatus } from '../hooks';
import type { ControlSheet } from '../types/controlSheet'


const ReserveCalculatePage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [controlSheets, setControlSheets] = useState<ControlSheet[]>([]);
  const backendStatus = useBackendStatus();

  const handleControlSheet = () => setIsFormOpen(true);
  const handleFormClose = () => setIsFormOpen(false);

  const handleFormSubmit = (formData: any) => {
    const newRow: ControlSheet = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      runNo: String(formData.serialNo || ''),
      productCode: String(formData.productCode || ''),
      runIndicator: String(formData.isRunFlagTrue || 'No'),
      inputFilePath: String(formData.inputFilePath || ''),
      inputFile: formData.inputFile ?? null,
      outputFilePath: String(formData.outputFilePath || ''),
      execution: 'Pending',
      progress: 0,
    };
    setControlSheets((prev) => [newRow, ...prev]);
    setIsFormOpen(false);
  };

  const handleDeleteRow = (id: string) => {
    const ok = window.confirm('Delete this control sheet entry?');
    if (!ok) return;
    setControlSheets((prev) => prev.filter((row) => row.id !== id));
  };
  
  const runReserve = async (row: ControlSheet) => {
    try {
      if (backendStatus === 'offline') {
        alert('Backend is offline. Please check the backend connection and try again.');
        return;
      }

      const scenarioValidation = await ApiService.validateScenarioCode(String(row.productCode || '').trim());
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
                execution: 'Running',
                progress: 10,
                outputUrl: undefined,
                cashflowUrl: undefined,
                outputFilePath: '',
                execSeconds: undefined,
                successfulPolicies: undefined,
                skippedPolicies: undefined,
              }
            : r
        )
      );

      let csvText = '';
      if (row.inputFile instanceof File) {
        csvText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(row.inputFile as File);
        });
      } else if (row.inputFilePath) {
        const resp = await fetch(row.inputFilePath);
        if (!resp.ok) {
          throw new Error(`Failed to fetch input file: ${resp.status} ${resp.statusText}`);
        }
        csvText = await resp.text();
      } else {
        throw new Error('No input file or URL provided');
      }

      const policies = parseCsvToObjects(csvText);
      if (policies.length === 0) {
        throw new Error('No policies found in input CSV');
      }

      setControlSheets((prev) => prev.map((r) => (r.id === row.id ? { ...r, progress: 40 } : r)));

      const scenarios: Scenario[] = [
        {
          scenarioCode: row.productCode,
          data: policies,
        },
      ];

      const result = await ApiService.calculateReserve(scenarios);

      const outputId = result.outputFile ? ApiService.extractIdFromUrl(result.outputFile) : null;
      const cashflowId = result.cashflows ? ApiService.extractIdFromUrl(result.cashflows) : null;

      const outputUrl = outputId ? ApiService.getOutputDownloadUrl(outputId) : undefined;
      const cashflowUrl = cashflowId ? ApiService.getCashflowDownloadUrl(cashflowId) : undefined;
      const execSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 10) / 100);

      setControlSheets((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                execution: 'Completed',
                progress: 100,
                outputUrl,
                cashflowUrl,
                outputFilePath: (result as any).outputFile || outputUrl || '',
                execSeconds,
                successfulPolicies: result.successfulPolicies,
                skippedPolicies: result.skippedPolicies,
              }
            : r
        )
      );

      if (!outputUrl || !cashflowUrl) {
        alert(
          'Calculation completed but download links were not provided by the server. This may indicate an error in the calculation process.'
        );
      }
    } catch (e: any) {
      console.error('Reserve calculation error:', e);
      setControlSheets((prev) => prev.map((r) => (r.id === row.id ? { ...r, execution: 'Failed', progress: 0 } : r)));

      let errorMessage = e?.message || 'Unknown error';
      if (e?.message?.includes('Cannot read properties of undefined')) {
        errorMessage =
          'Data structure error: The mortality rates data is not in the expected format. Please check that your assumptions files contain properly formatted mortality tables with Age and Gender columns.';
      } else if (e?.message?.includes('HTTP error')) {
        errorMessage = `Backend error: ${e.message}`;
      }

      alert(`Failed to run reserve calculation: ${errorMessage}`);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-bs font-bold text-gray-900 mb-2">Control Sheet Entry</h1>
          <div className="w-20 h-1 bg-blue-500 rounded-full"></div>
          {backendStatus === 'offline' && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full inline-block">
              ⚠️ Backend Offline - Some features may not work
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleControlSheet}
            className="bg-orange-500 text-white px-2 py-3 rounded-full font-semibold shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
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
            <h3 className="text-bs font-semibold text-gray-900 mb-2">No Control Sheet Found</h3>
            <p className="text-gray-500">To create reserver calculation please click on Create Control Sheet Entry</p>
          </div>
        )}

        {controlSheets.length > 0 && (
          <div className="divide-y divide-gray-200">
            {controlSheets.map((row) => (
              <div key={row.id} className="px-6 py-4 grid grid-cols-11 text-sm text-gray-900 divide-x divide-gray-100">
                <div className="text-center px-3">{row.runNo}</div>
                <div className="text-center px-3">{row.productCode}</div>
                <div className="text-center px-3 truncate" title={row.inputFilePath || (row.inputFile && row.inputFile.name) || ''}>
                  {row.inputFilePath ? (
                    <a href={row.inputFilePath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {row.inputFilePath}
                    </a>
                  ) : (
                    <span>{row.inputFile?.name || '-'}</span>
                  )}
                </div>
                <div className="text-center px-3 truncate" title={row.outputFilePath || ''}>
                  {row.outputFilePath ? (
                    <a href={row.outputFilePath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {row.outputFilePath}
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div className="text-center px-3">{row.execution}</div>
                <div className="text-center px-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, row.progress))}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{row.progress}%</span>
                </div>
                <div className="text-center px-3">{row.execSeconds ? `${row.execSeconds}s` : '-'}</div>
                <div className="text-center px-3">{row.successfulPolicies ?? '-'}</div>
                <div className="text-center px-3 col-span-2">
                  <div className="inline-flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="inline-flex items-center justify-center text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-full border border-red-200 shadow-sm"
                      title="Delete"
                      aria-label="Delete control sheet"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m1 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7m3 4v6m4-6v6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => runReserve(row)}
                      className="text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded-full border border-orange-500 shadow-sm"
                    >
                      Run
                    </button>
                    {ApiService.isValidUrl(row.outputUrl) && (
                      <a
                        href={row.outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-full border border-green-600 shadow-sm"
                      >
                        Download Output
                      </a>
                    )}
                    {ApiService.isValidUrl(row.cashflowUrl) && (
                      <a
                        href={row.cashflowUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full border border-blue-600 shadow-sm"
                      >
                        Download Cashflow
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isFormOpen && (
        <ControlSheetForm onSubmit={handleFormSubmit} onClose={handleFormClose} />
      )}
    </>
  );
};

export default ReserveCalculatePage;


