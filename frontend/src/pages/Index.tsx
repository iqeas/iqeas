import { useState, createContext, useContext } from "react";
import { ProjectsDashboard } from "@/components/ProjectsDashboard";
import { ProjectDetail } from "@/components/ProjectDetail";
import { RFCDashboard } from "@/components/RFCDashboard";
import { EstimationDashboard } from "@/components/EstimationDashboard";
import { WorkerDashboard } from "@/components/WorkerTasks";
import { DocumentationDashboard } from "@/components/DocumentationDashboard";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Trash2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TasksAssignment } from "@/components/TasksAssignment";
import { ProjectOverview } from "@/components/ProjectOverview";
import { TeamActivity } from "@/components/TeamActivity";
import { DocumentCenter } from "@/components/DocumentCenter";
import { ProjectTimeline } from "@/components/ProjectTimeline";
import { ProjectExecutionFlow } from "@/components/ProjectExecutionFlow";
import TaskSection from "@/components/TaskAssignmentPage";
import { Deliverables } from "@/components/Deliverables";

export const MeetingsTabContext = createContext({ setMeetingsTab: () => {} });

// Placeholder components for PM Team sections
const PMDeliverables = ({ onStageClick }: { onStageClick: (deliverable: string, stage: string) => void }) => {
  const deliverables = [
    { name: "Piping Layout - Zone 1", stages: ["IDC", "IFR", "IFA", "AFC"], assigned: ["Anand", "", "", ""] },
    { name: "Electrical SLD - Main Panel", stages: ["IDC", "IFR", "IFA", "AFC"], assigned: ["Priya", "", "", ""] },
    { name: "Civil GA Drawing", stages: ["IDC", "IFR", "IFA", "AFC"], assigned: ["Rahul", "", "", ""] }
  ];
  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Project Deliverables</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow border">
          <thead>
            <tr className="bg-blue-50 text-blue-900">
              <th className="px-4 py-3 text-left">Deliverable</th>
              <th className="px-4 py-3">IDC</th>
              <th className="px-4 py-3">IFR</th>
              <th className="px-4 py-3">IFA</th>
              <th className="px-4 py-3">AFC</th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d, i) => (
              <tr key={d.name} className="border-b hover:bg-blue-50 transition">
                <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                {d.stages.map((stage, idx) => (
                  <td key={stage} className="px-4 py-3 text-center">
                    <Button variant="outline" className="w-24" onClick={() => onStageClick(d.name, stage)}>
                      {stage}
                      {d.assigned[idx] && <span className="block text-xs text-blue-700">{d.assigned[idx]}</span>}
                    </Button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const PMTimeline = () => <div className="max-w-3xl mx-auto mt-8 text-xl text-blue-700">[Timeline View Placeholder]</div>;
const PMTeam = () => <div className="max-w-3xl mx-auto mt-8 text-xl text-blue-700">[Team Management Placeholder]</div>;
const PMDocsHandoff = () => <div className="max-w-3xl mx-auto mt-8 text-xl text-blue-700">[Docs Handoff Placeholder]</div>;
const PMReports = () => <div className="max-w-3xl mx-auto mt-8 text-xl text-blue-700">[Reports & Analytics Placeholder]</div>;

const PMStagePanel = ({ deliverable, stage, onClose }: { deliverable: string, stage: string, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg relative">
      <button className="absolute top-3 right-3 text-slate-400 hover:text-blue-600" onClick={onClose}>&times;</button>
      <h3 className="text-xl font-bold mb-4 text-blue-800">{deliverable} - {stage} Stage</h3>
      <div className="text-slate-700 mb-4">[Panel for uploads, comments, time logging, status, and submit to docs]</div>
      <Button className="bg-blue-600 hover:bg-blue-700">Submit to Docs</Button>
    </div>
  </div>
);

const PMDashboard = () => <div className="p-8 text-2xl text-blue-800">[Dashboard Overview Placeholder]</div>;
const PMProjects = () => <div className="p-8 text-2xl text-blue-800">[Projects List Placeholder]</div>;
const PMStageTracker = () => <div className="p-8 text-2xl text-blue-800">[Stage Tracker Placeholder]</div>;
const PMDocumentationSubmissions = () => <div className="p-8 text-2xl text-blue-800">[Documentation Submissions Placeholder]</div>;
const PMTeamCommunication = () => <div className="p-8 text-2xl text-blue-800">[Team Communication Placeholder]</div>;
const PMReportsLogs = () => <div className="p-8 text-2xl text-blue-800">[Reports & Logs Placeholder]</div>;
const PMSettings = () => <div className="p-8 text-2xl text-blue-800">[Settings Placeholder]</div>;

const CommonCalendar = () => <div className="p-8 text-2xl text-blue-800">[Common Calendar Placeholder]</div>;

const Index = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("projects");
  const [currentUser, setCurrentUser] = useState({
    id: "1",
    name: "John Smith",
    role: "PM Team",
    avatar: "/placeholder.svg"
  });
  const [estimationTab, setEstimationTab] = useState('estimation');
  const [meetings, setMeetings] = useState([]);
  const [meetingForm, setMeetingForm] = useState({ title: '', date: '', time: '', participants: '', notes: '' });

  const roleViews = {
    "RFC Team": "rfc",
    "Estimation Department": "estimation", 
    "PM Team": "pm",
    "Working Team": "worker",
    "Documentation Team": "documentation"
  };

  const handleRoleChange = (newRole: string) => {
    setCurrentUser(prev => ({ ...prev, role: newRole }));
    setActiveSection(roleViews[newRole as keyof typeof roleViews] || "projects");
  };

  const renderMainContent = () => {
    if (selectedProject) {
      return (
        <ProjectDetail 
          projectId={selectedProject} 
          onBack={() => setSelectedProject(null)}
          userRole={currentUser.role}
        />
      );
    }

    if (currentUser.role === "PM Team") {
      switch (activeSection) {
        case "dashboard":
          return <PMDashboard />;
        case "projects":
          return <ProjectsDashboard onProjectSelect={setSelectedProject} userRole={currentUser.role} />;
        case "documents":
          return <DocumentCenter userRole={currentUser.role} projectId={selectedProject || ''} />;
        case "deliverables":
          return <Deliverables />;
        case "stage-tracker":
          return <PMStageTracker />;
        case "task-assignment":
          return <TaskSection user={currentUser} />;
        case "documentation-submissions":
          return <DocumentationDashboard userRole={currentUser.role} />;
        case "team-communication":
          return <PMTeamCommunication />;
        case "reports-logs":
          return <PMReportsLogs />;
        case "settings":
          return <PMSettings />;
        case "calendar":
          return <CommonCalendar />;
        default:
          return <div className="text-center text-slate-500">Select a section from the navigation.</div>;
      }
    }

    if (currentUser.role === "Estimation Department") {
      switch (activeSection) {
        case "dashboard":
          return <EstimationDashboard />;
        case "documents":
          return <DocumentCenter userRole={currentUser.role} projectId={selectedProject || ''} />;
        default:
          return <EstimationDashboard />;
      }
    }

    // RFC Team: always show RFCDashboard
    if (currentUser.role === "RFC Team") {
      switch (activeSection) {
        case "documents":
          return <DocumentCenter userRole={currentUser.role} projectId={selectedProject || ''} />;
        case "calendar":
          return <CommonCalendar />;
        default:
          return <RFCDashboard />;
      }
    }

    switch (activeSection) {
      case "documents":
        return <DocumentCenter userRole={currentUser.role} projectId={selectedProject || ''} />;
      case "deliverables":
      case "timeline":
      case "team":
      case "docs-handoff":
      case "reports":
        if (currentUser.role === "PM Team") {
          return <ProjectExecutionFlow section={activeSection} user={currentUser} />;
        }
        break;
      case "calendar":
        return <CommonCalendar />;
      default:
        return <div className="text-center text-slate-500">Select a section from the navigation.</div>;
    }
  };

  // Add state for PM stage panel
  const [pmStagePanel, setPmStagePanel] = useState<{ deliverable: string, stage: string } | null>(null);

  return (
    <MeetingsTabContext.Provider value={{ setMeetingsTab: () => {} }}>
      <div className="min-h-screen bg-slate-50">
        <Header user={currentUser} />
        {/* Move Role Selector to top right and ensure full visibility */}
        <div className="role-switcher-container">
          <div className="flex items-center space-x-4 justify-end p-4">
            <span className="text-sm font-medium text-slate-600">Switch Role:</span>
            <Select value={currentUser.role} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RFC Team">RFC Team</SelectItem>
                <SelectItem value="Estimation Department">Estimation Department</SelectItem>
                <SelectItem value="PM Team">PM Team</SelectItem>
                <SelectItem value="Working Team">Working Team</SelectItem>
                <SelectItem value="Documentation Team">Documentation Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex">
          <Sidebar userRole={currentUser.role} activeSection={activeSection} onSectionChange={setActiveSection} />
          <main className="flex-1 ml-64">
            {renderMainContent()}
            {pmStagePanel && (
              <PMStagePanel deliverable={pmStagePanel.deliverable} stage={pmStagePanel.stage} onClose={() => setPmStagePanel(null)} />
            )}
          </main>
        </div>
      </div>
    </MeetingsTabContext.Provider>
  );
};

export default Index;
