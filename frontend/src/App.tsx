import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/Dashboard";
import Assumptions from "./pages/Assumptions.page";
import ReserveCalculatePage from "./pages/ReserveCalculate.page";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
const isLoggedIn = false; // example
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute
              isAuthenticated={isLoggedIn}
              component={DashboardLayout}
            />
          }
        >
          <Route index element={<Navigate to="/reserve" replace />} />
          <Route path="assumptions" element={<Assumptions />} />
          <Route path="reserve" element={<ReserveCalculatePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
