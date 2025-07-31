import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";

import Login from "./pages/Login";
import DashboardLayout from "./components/atomic/dashboardLayout/DashboardLayout";
import { AuthProvider } from "./contexts/AuthContext";

import RoleProtectedRoute from "./components/atomic/protectedRoute/RoleProtectedRoute";
import { RFCDashboard } from "./components/RFCDashboard";
import { DocumentCenter } from "./components/DocumentCenter";
import { ProjectsDashboard } from "./components/ProjectsDashboard";
import { DocumentationDashboard } from "./components/DocumentationTasks";
import { EstimationDashboard } from "./components/EstimationDashboard";
import Home from "./components/Home";

import AdminMembers from "./components/AdminMembers";

import { ConfirmDialogProvider } from "@/components/ui/alert-dialog";
import { Toaster } from "react-hot-toast";
import AuthVerification from "./components/AuthVerification";
import FileTypeSelection from "./components/FileTypeSelection";
import DocumentFiles from "./components/DocumentFiles";
import WorkerProjectList from "./components/WorkerProjectList";
import { WorkerTasks } from "./components/WorkerTasks";
import DocumentationProjectList from "./components/DocumentationProjectList";
import ProjectTrack from "./components/ProjectDetail";
import CreatePassword from "./pages/CreatePassword";
import ProjectPublicInfo from "./components/ProjectPublicInfo";
import SalaryManagement from "./components/SalaryManagement";
import AttendanceManagement from "./components/AttendanceManagement";
import LeaveManagement from "./components/LeaveManagement";

const CommonCalendar = () => (
  <div className="p-8 text-2xl text-blue-800">
    [Common Calendar Placeholder]
  </div>
);

const App = () => (
  <ConfirmDialogProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster position="top-center" />
        <AuthVerification>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/client/:token" element={<ProjectPublicInfo />} />
              <Route path="/create-password" element={<CreatePassword />} />

              {/* PM Team */}
              <Route path="/pm" element={<RoleProtectedRoute />}>
                <Route
                  path=""
                  element={
                    <DashboardLayout>
                      <ProjectsDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="project/:projectId"
                  element={
                    <DashboardLayout>
                      <ProjectTrack />
                    </DashboardLayout>
                  }
                />

                <Route
                  path="documents"
                  element={
                    <DashboardLayout>
                      <DocumentCenter />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <DashboardLayout>
                      <CommonCalendar />
                    </DashboardLayout>
                  }
                />
               
                <Route
                  path="documents/:project_id"
                  element={
                    <DashboardLayout>
                      <FileTypeSelection />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id/:type"
                  element={
                    <DashboardLayout>
                      <DocumentFiles />
                    </DashboardLayout>
                  }
                />
              </Route>

              {/* RFQ Team */}
              <Route path="/rfq" element={<RoleProtectedRoute />}>
                <Route
                  path=""
                  element={
                    <DashboardLayout>
                      <RFCDashboard />
                    </DashboardLayout>
                  }
                />

                <Route
                  path="documents"
                  element={
                    <DashboardLayout>
                      <DocumentCenter />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id"
                  element={
                    <DashboardLayout>
                      <FileTypeSelection />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id/:type"
                  element={
                    <DashboardLayout>
                      <DocumentFiles />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <DashboardLayout>
                      <CommonCalendar />
                    </DashboardLayout>
                  }
                />
              </Route>

              {/* Estimation Department */}
              <Route path="/estimation" element={<RoleProtectedRoute />}>
                <Route
                  path=""
                  element={
                    <DashboardLayout>
                      <EstimationDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents"
                  element={
                    <DashboardLayout>
                      <DocumentCenter />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id"
                  element={
                    <DashboardLayout>
                      <FileTypeSelection />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id/:type"
                  element={
                    <DashboardLayout>
                      <DocumentFiles />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <DashboardLayout>
                      <CommonCalendar />
                    </DashboardLayout>
                  }
                />
              </Route>

              {/* Documentation Team */}
              <Route path="/documentation" element={<RoleProtectedRoute />}>
                <Route
                  path=""
                  element={
                    <DashboardLayout>
                      <DocumentationProjectList />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="project/:projectId"
                  element={
                    <DashboardLayout>
                      <DocumentationDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents"
                  element={
                    <DashboardLayout>
                      <DocumentCenter />
                    </DashboardLayout>
                  }
                />

                <Route
                  path="calendar"
                  element={
                    <DashboardLayout>
                      <CommonCalendar />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id"
                  element={
                    <DashboardLayout>
                      <FileTypeSelection />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id/:type"
                  element={
                    <DashboardLayout>
                      <DocumentFiles />
                    </DashboardLayout>
                  }
                />
              </Route>

              {/* Working Team */}
              <Route path="/working" element={<RoleProtectedRoute />}>
                <Route
                  path=""
                  element={
                    <DashboardLayout>
                      <WorkerProjectList />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="project/:projectId"
                  element={
                    <DashboardLayout>
                      <WorkerTasks />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents"
                  element={
                    <DashboardLayout>
                      <DocumentCenter />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <DashboardLayout>
                      <CommonCalendar />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id"
                  element={
                    <DashboardLayout>
                      <FileTypeSelection />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id/:type"
                  element={
                    <DashboardLayout>
                      <DocumentFiles />
                    </DashboardLayout>
                  }
                />
              </Route>

              {/* Admin (example, can be expanded) */}
              <Route path="/admin" element={<RoleProtectedRoute />}>
                <Route
                  path=""
                  element={
                    <DashboardLayout>
                      <ProjectsDashboard />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="project/:projectId"
                  element={
                    <DashboardLayout>
                      <ProjectTrack />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="salary"
                  element={
                    <DashboardLayout>
                      <SalaryManagement />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="attendance"
                  element={
                    <DashboardLayout>
                      <AttendanceManagement />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="leave"
                  element={
                    <DashboardLayout>
                      <LeaveManagement />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents"
                  element={
                    <DashboardLayout>
                      <DocumentCenter />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents"
                  element={
                    <DashboardLayout>
                      <DocumentCenter />
                    </DashboardLayout>
                  }
                ></Route>
                <Route
                  path="documents/:project_id"
                  element={
                    <DashboardLayout>
                      <FileTypeSelection />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="documents/:project_id/:type"
                  element={
                    <DashboardLayout>
                      <DocumentFiles />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="members"
                  element={
                    <DashboardLayout>
                      <AdminMembers />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <DashboardLayout>
                      <CommonCalendar />
                    </DashboardLayout>
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthVerification>
      </TooltipProvider>
    </AuthProvider>
  </ConfirmDialogProvider>
);

export default App;
