import React from "react";
import { ApiService } from "../services/api";
import { useAsyncEffect, useFileHandler, useFileUpload } from "../hooks";

const Assumptions: React.FC = () => {
  const {
    data: assumptions,
    loading,
    error: loadError,
    refetch,
  } = useAsyncEffect(() => ApiService.getAssumptions(), []);

  const {
    selectedFile,
    error: fileError,
    handleFileChange,
    clearFile,
  } = useFileHandler([".zip"]);

  const {
    upload,
    uploading,
    error: uploadError,
  } = useFileUpload(ApiService.uploadAssumptions, {
    clearFileOnSuccess: true,
    onSuccess: async () => {
      await refetch();
    },
  });

  const error = loadError || fileError || uploadError;

  const handleUpload = () => upload(selectedFile, clearFile);

  const formatDataPreview = (data: any[]) => {
    if (!data || data.length === 0) return "No data";
    console.log(data);

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const previewRows = data;
    return (
      <div className="overflow-auto max-h-[160px]">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-brand-50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-2 py-1 text-left font-medium text-gray-700 border"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {columns.map((col) => {
                  const normalize = (k: any) =>
                    String(k)
                      .trim()
                      .toLowerCase()
                      .replace(/[\s_]+/g, "");
                  const normalizedRow: Record<string, any> = {};
                  for (const key of Object.keys(row)) {
                    normalizedRow[normalize(key)] = row[key];
                  }
                  const value = normalizedRow[normalize(col)] ?? "";
                  const text = String(value);
                  return (
                    <td key={col} className="px-2 py-1 border text-gray-600">
                      {text.substring(0, 20)}
                      {text.length > 20 ? "..." : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-bs font-bold text-gray-900 mb-2">
            Assumptions Management
          </h1>
          <div className="w-20 h-1 bg-accent-500"></div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xs font-semibold text-gray-900 mb-4">
          Upload Assumptions
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="file-input"
              className="block text-xs font-medium text-gray-700 mb-2"
            >
              Select ZIP file containing CSV assumptions
            </label>
            <input
              id="file-input"
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100"
            />
          </div>
          {selectedFile && (
            <div className="text-xs text-gray-600">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="bg-orange-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload Assumptions"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-xs text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="bg-brand-50 px-6 py-4">
          <h2 className="text-xs font-semibold text-gray-900">
            Current Assumptions
          </h2>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
                  <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-24 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !assumptions || assumptions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2 2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Assumptions Found
            </h3>
            <p className="text-gray-500">
              Upload a ZIP file containing CSV assumptions to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {assumptions?.map((assumption, index) => (
              <div key={assumption.assumptionId || index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-gray-900">
                    {assumption.name}
                  </h3>
                  <span className="text-xs text-gray-500">
                    ID: {assumption.assumptionId}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Data Preview
                  </h4>
                  {formatDataPreview(assumption.data)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assumptions;
