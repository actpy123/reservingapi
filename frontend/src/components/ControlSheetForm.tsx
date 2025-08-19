import React, { useState } from 'react';

interface ControlSheetFormProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const ControlSheetForm: React.FC<ControlSheetFormProps> = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    serialNo: '',
    productCode: '',
    inputFilePath: '',
    inputFile: null as File | null,
    assumptionsPath: '',
    assumptionsFile: null as File | null,
    isRunFlagTrue: 'No',
    isDBFlag: 'No'
  });

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="bg-blue-800 h-1"></div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Control Sheet Entry</h2>

          {/* Serial No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serial No:</label>
            <input
              type="text"
              value={formData.serialNo}
              onChange={(e) => handleInputChange('serialNo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter Run No"
            />
          </div>

          {/* Product Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Code:</label>
            <input
              type="text"
              value={formData.productCode}
              onChange={(e) => handleInputChange('productCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Input File Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Input File Path:</label>
            <input
              type="url"
              value={formData.inputFilePath}
              onChange={(e) => handleInputChange('inputFilePath', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              placeholder="Enter File URL"
            />
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="px-4 py-2 border border-gray-400 rounded text-gray-700 hover:bg-gray-50"
                onClick={() => document.getElementById('inputFile')?.click()}
              >
                Choose File
              </button>
              <span className="text-sm text-gray-500">
                {formData.inputFile ? formData.inputFile.name : 'No file chosen'}
              </span>
            </div>
            <input
              id="inputFile"
              type="file"
              onChange={(e) => handleFileChange('inputFile', e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          {/* Assumptions Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assumptions Path:</label>
            <input
              type="url"
              value={formData.assumptionsPath}
              onChange={(e) => handleInputChange('assumptionsPath', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              placeholder="Enter File URL"
            />
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="px-4 py-2 border border-gray-400 rounded text-gray-700 hover:bg-gray-50"
                onClick={() => document.getElementById('assumptionsFile')?.click()}
              >
                Choose File
              </button>
              <span className="text-sm text-gray-500">
                {formData.assumptionsFile ? formData.assumptionsFile.name : 'No file chosen'}
              </span>
            </div>
            <input
              id="assumptionsFile"
              type="file"
              onChange={(e) => handleFileChange('assumptionsFile', e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          {/* Run Indicator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">is_Run_Flag_True:</label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isRunFlagTrue"
                  value="Yes"
                  checked={formData.isRunFlagTrue === 'Yes'}
                  onChange={(e) => handleInputChange('isRunFlagTrue', e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isRunFlagTrue"
                  value="No"
                  checked={formData.isRunFlagTrue === 'No'}
                  onChange={(e) => handleInputChange('isRunFlagTrue', e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* is_DB_Flag (kept for parity if used later) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">is_DB_Flag:</label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isDBFlag"
                  value="Yes"
                  checked={formData.isDBFlag === 'Yes'}
                  onChange={(e) => handleInputChange('isDBFlag', e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isDBFlag"
                  value="No"
                  checked={formData.isDBFlag === 'No'}
                  onChange={(e) => handleInputChange('isDBFlag', e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ControlSheetForm; 