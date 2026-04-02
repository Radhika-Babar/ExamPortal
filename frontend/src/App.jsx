/**
 * App.jsx
 *
 * Defines all routes and wraps the app in global providers.
 *
 * Provider order (inside out):
 *   AuthProvider  → must wrap everything (ProtectedRoute reads from it)
 *   Routes        → React Router's route definitions
 *
 * Route types:
 *   Public        → /login, /register (redirect to dashboard if already logged in)
 *   Protected     → all other routes, require auth
 *   Role-specific → student/* requires role="student", faculty/* requires role="faculty"
 *
 * ExamProvider wraps only the ExamRoom page because exam state is only
 * needed there — no point keeping it alive on other pages.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/auth.context";
import { ExamProvider } from "./context/exam.context";
import ProtectedRoute from "./components/protectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import ExamRoom from "./pages/ExamRoom";
import Result from "./pages/Result";
import FacultyDashboard from "./pages/FacultyDashboard";
import CreateExam from "./pages/CreateExam";
import ExamResults from "./pages/ExamResults";

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Student routes ── */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/exam/:examId"
          element={
            <ProtectedRoute role="student">
              <ExamProvider>
                {/* ExamProvider wraps only ExamRoom — exam state lives here */}
                <ExamRoom />
              </ExamProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/result/:sessionId"
          element={
            <ProtectedRoute role="student">
              <Result />
            </ProtectedRoute>
          }
        />

        {/* ── Faculty routes ── */}
        <Route
          path="/faculty/dashboard"
          element={
            <ProtectedRoute role="faculty">
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty/create-exam"
          element={
            <ProtectedRoute role="faculty">
              <CreateExam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty/exam/:examId/results"
          element={
            <ProtectedRoute role="faculty">
              <ExamResults />
            </ProtectedRoute>
          }
        />

        {/* ── Default redirect ── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
