import React, { useState } from 'react';
import ControlSheetForm from './ControlSheetForm';
import Assumptions from './Assumptions';

interface ControlSheet {
  id: string;
  runNo: string;
  productCode: string;
  runIndicator: string;
  inputFilePath: string;
  assumptionsPath: string;
  outputFilePath: string;
  execution: string;
  progress: number;
}

const Dashboard: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [controlSheets, setControlSheets] = useState<ControlSheet[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'Assumptions' | 'Reserve Calculate'>('Reserve Calculate');

  const handleControlSheet = () => {
    setIsFormOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    const newRow: ControlSheet = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      runNo: String(formData.serialNo || ''),
      productCode: String(formData.productCode || ''),
      runIndicator: String(formData.isRunFlagTrue || 'No'),
      inputFilePath: String(formData.inputFilePath || ''),
      assumptionsPath: String(formData.assumptionsPath || ''),
      outputFilePath: String(formData.outputFilePath || ''),
      execution: 'Pending',
      progress: 0,
    };
    setControlSheets(prev => [newRow, ...prev]);
    setIsFormOpen(false);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
  };

  const handleDeleteRow = (id: string) => {
    const ok = window.confirm('Delete this control sheet entry?');
    if (!ok) return;
    setControlSheets(prev => prev.filter(row => row.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-brand-50">
      <div className="flex">
        {/* Left Sidebar */}
        <aside className={`${isSidebarCollapsed ? 'w-14' : 'w-64'} bg-brand-900 text-white min-h-screen transition-all duration-200`}>
          <div className="p-4 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="truncate" title="Actuaria Consultants">
                <img
                  src="/Logo.png"
                  alt="Actuaria Consultants"
                  className="h-10 w-auto object-contain max-w-full"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((v) => !v)}
              className="ml-auto bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm"
              aria-label="Toggle menu"
              aria-expanded={!isSidebarCollapsed}
              title="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {!isSidebarCollapsed && (
            <nav className="px-2 space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('Assumptions')}
                className={`${activeTab === 'Assumptions' ? 'bg-white text-brand-800' : 'bg-white/0 hover:bg-white/10 text-white'} w-full rounded-full px-3 py-3 text-left transition-colors`}
                title="Assumptions"
              >
                Assumptions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Reserve Calculate')}
                className={`${activeTab === 'Reserve Calculate' ? 'bg-white text-brand-800' : 'bg-white/0 hover:bg-white/10 text-white'} w-full rounded-full px-3 py-3 text-left transition-colors`}
                title="Reserve Calculate"
              >
                Reserve Calculate
              </button>
            </nav>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'Assumptions' ? (
              <Assumptions />
            ) : (
              <>
                {/* Page Title */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Control Sheet Entry</h1>
                    <div className="w-20 h-1 bg-accent-500 rounded-full"></div>
                  </div>
                  <button
                    onClick={handleControlSheet}
                    className="bg-accent-500 text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-300"
                  >
                    + CONTROL SHEET ENTRY
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border shadow-sm">
                  <div className="bg-brand-50 px-6 py-4 rounded-t-xl">
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
                      <div className="w-16 h-16 mx-auto mb-4 text-brand-500"></div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Control Sheet Found</h3>
                      <p className="text-gray-500">To create reserver calculation please click on Create Control Sheet Entry</p>
                    </div>
                  )}

                  {/* Table Body */}
                  {controlSheets.length > 0 && (
                    <div className="divide-y divide-gray-200">
                      {controlSheets.map((row) => (
                        <div key={row.id} className="px-6 py-4 grid grid-cols-9 gap-4 text-sm text-gray-900">
                          <div className="text-center">{row.runNo}</div>
                          <div className="text-center">{row.productCode}</div>
                          <div className="text-center">{row.runIndicator}</div>
                          <div className="text-center truncate" title={row.inputFilePath}>{row.inputFilePath}</div>
                          <div className="text-center truncate" title={row.assumptionsPath}>{row.assumptionsPath}</div>
                          <div className="text-center truncate" title={row.outputFilePath}>{row.outputFilePath}</div>
                          <div className="text-center">{row.execution}</div>
                          <div className="text-center">{row.progress}%</div>
                          <div className="text-center">
                            <div className="inline-flex items-center gap-2">
                              <button className="text-brand-800 hover:text-brand-900 bg-accent-50 hover:bg-accent-100 px-3 py-1 rounded-full border border-accent-200 shadow-sm">
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full border border-red-200 shadow-sm"
                                title="Delete"
                                aria-label="Delete control sheet"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 0 0116.138 21H7.862a2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0l1-1h4l1 1m-7 0h8" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
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