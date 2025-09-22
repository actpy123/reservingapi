import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/Dashboard';
import Assumptions from './pages/Assumptions.page';
import ReserveCalculatePage from './pages/ReserveCalculate.page';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/reserve" replace />} />
          <Route path="assumptions" element={<Assumptions />} />
          <Route path="reserve" element={<ReserveCalculatePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/reserve" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
