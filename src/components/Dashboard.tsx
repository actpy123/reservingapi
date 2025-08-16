import React, { useState } from 'react';
import ControlSheetForm from './ControlSheetForm';

interface ControlSheet {
  id: string;
  requestName: string;
  reason: string;
  percentage: number;
  createDate: string;
  startDate: string;
  endDate: string;
  syncDate: string;
}

const Dashboard: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [controlSheets, setControlSheets] = useState<ControlSheet[]>([]);

  const handleControlSheet = () => {
    setIsFormOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    // Handle form submission here
    console.log('Form submitted:', formData);
    setIsFormOpen(false);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 bg-blue-600 text-white min-h-screen">
          <div className="p-6">
            <div className="text-xl font-bold text-white mb-8">
              Actuaria Consultants
            </div>
            <nav className="space-y-2">
              <div className="p-3 bg-blue-700 rounded">
                <span>Reserve Calculate</span>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Title */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Control Sheet Entry</h1>
                <div className="w-20 h-1 bg-blue-500"></div>
              </div>
              <button
                onClick={handleControlSheet}
                className="bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700"
              >
                + CONTROL SHEET ENTRY
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded border">
              <div className="bg-blue-50 px-6 py-4">
                <div className="grid grid-cols-9 gap-4 text-sm font-semibold text-gray-700">
                  <div className="text-center">
                    <span>Run NO.</span>
                  </div>
                  <div className="text-center">
                    <span>Product Code</span>
                  </div>
                  <div className="text-center">
                    <span>Run Indicator</span>
                  </div>
                  <div className="text-center">
                    <span>Input File Path</span>
                  </div>
                  <div className="text-center">
                    <span>Assumptions Path</span>
                  </div>
                  <div className="text-center">
                    <span>Output File Path</span>
                  </div>
                  <div className="text-center">
                    <span>Execution</span>
                  </div>
                  <div className="text-center">
                    <span>Progress</span>
                  </div>
                  <div className="text-center">
                    <span>Actions</span>
                  </div>
                </div>
              </div>

              {/* Empty State */}
              {controlSheets.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-blue-500">
                    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Control Sheet Found</h3>
                  <p className="text-gray-500">To create reserver calculation please click on Create Control Sheet Entry</p>
                </div>
              )}

              {/* Table Body */}
              {controlSheets.length > 0 && (
                <div className="divide-y divide-gray-200">
                  {controlSheets.map((controlSheet) => (
                    <div key={controlSheet.id} className="px-6 py-4 grid grid-cols-9 gap-4 text-sm text-gray-900">
                      <div className="text-center">{controlSheet.requestName}</div>
                      <div className="text-center">{controlSheet.reason}</div>
                      <div className="text-center">{controlSheet.percentage}%</div>
                      <div className="text-center">{controlSheet.createDate}</div>
                      <div className="text-center">{controlSheet.startDate}</div>
                      <div className="text-center">{controlSheet.endDate}</div>
                      <div className="text-center">{controlSheet.syncDate}</div>
                      <div className="text-center">{controlSheet.syncDate}</div>
                      <div className="text-center">
                        <button className="text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Control Sheet Form Modal */}
      {isFormOpen && (
        <ControlSheetForm
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default Dashboard; 