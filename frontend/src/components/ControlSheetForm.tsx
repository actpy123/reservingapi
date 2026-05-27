import React, { useEffect, useState } from "react";
import { ApiService } from "../services/api";
import { useFileHandler } from "../hooks";

interface ControlSheetFormProps {
  sessionId?: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const ControlSheetForm: React.FC<ControlSheetFormProps> = ({
  sessionId,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    serialNo: "",
    productCode: "",
    inputFilePath: "",
    isRunFlagTrue: "No",
    isDBFlag: "No",
  });

  const inputFileHandler = useFileHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scenarioCodes, setScenarioCodes] = useState<string[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (sessionId) {
          setLoadingCodes(true);
          const assumptions = await ApiService.getAssumptions(sessionId);
          const productMaster = assumptions.find(
            (a: any) => a.name === "product_master",
          );
          const codes: string[] = Array.from(
            new Set(
              (productMaster?.data || [])
                .map((p: any) => String(p["Scenario Code"]).trim())
                .filter(Boolean),
            ),
          );
          setScenarioCodes(codes);
        }
      } catch {
        /* empty */
      } finally {
        setLoadingCodes(false);
      }
    })();
  }, [sessionId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await onSubmit({
      ...formData,
      inputFile: inputFileHandler.selectedFile,
    });

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-800 h-1"></div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <h2 className="text-bs font-bold text-center text-gray-900 mb-6">
            Control Sheet Entry
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serial No:
            </label>
            <input
              type="text"
              value={formData.serialNo}
              onChange={(e) => handleInputChange("serialNo", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter Run No"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scenario Code:
            </label>
            <select
              value={formData.productCode}
              onChange={(e) => handleInputChange("productCode", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="" disabled>
                {loadingCodes
                  ? "Loading scenario codes..."
                  : "Select scenario code"}
              </option>
              {scenarioCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="px-4 py-2 border border-gray-400 rounded text-gray-700 hover:bg-gray-50"
                onClick={() => document.getElementById("inputFile")?.click()}
              >
                Choose File
              </button>
              <span className="text-sm text-gray-500">
                {inputFileHandler.selectedFile
                  ? inputFileHandler.selectedFile.name
                  : "No file chosen"}
              </span>
            </div>
            <input
              id="inputFile"
              type="file"
              onChange={inputFileHandler.handleFileChange}
              className="hidden"
            />
            {inputFileHandler.error && (
              <p className="text-xs text-red-600 mt-1">
                {inputFileHandler.error}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:bg-gray-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ControlSheetForm;
