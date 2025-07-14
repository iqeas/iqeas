import { useEffect, useRef, useState } from "react";
import { Search, Plus, Grid, List, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCard } from "@/components/ProjectCard";
import { Badge } from "@/components/ui/badge";
import ProjectSlidingPanel from "./ProjectSlidingPanel";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import Loading from "./atomic/Loading";
import { Project, ProjectListResponse } from "@/types/apiTypes";

export const ProjectsDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const { fetchType, fetching, isFetched, makeApiCall } = useAPICall();
  const { authToken } = useAuth();
  const totalPages = useRef(0);
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Disable global scroll when ProjectSlidingPanel is open
  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProject]);

  useEffect(() => {
    const getProjects = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_PM_PROJECTS,
        {},
        "application/json",
        authToken,
        "getProjects"
      );
      if (response.status === 200) {
        const data = response.data as ProjectListResponse;
        setProjects(data.projects);
        totalPages.current = data.total_pages;
      } else {
        toast.error("Failed to fetch projects");
      }
    };
    getProjects();
  }, []);

  if (fetching || !isFetched) {
    return <Loading full />;
  }

  return (
    <div className="p-6 relative ">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Projects Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Manage and track oil engineering projects
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Search projects by client, location, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Working">Working</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid size={16} />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-slate-600">
            Showing {filteredProjects.length} of {projects.length} projects
          </span>
          <div className="flex space-x-2">
            <Badge variant="outline">
              Working: {projects.filter((p) => p.status === "Working").length}
            </Badge>
            <Badge variant="outline">
              Pending: {projects.filter((p) => p.status === "Pending").length}
            </Badge>
            <Badge variant="outline">
              Completed:{" "}
              {projects.filter((p) => p.status === "Completed").length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }
      >
        {filteredProjects.map((project) => (
          <div key={project.id} className="relative">
            <ProjectCard
              project={project}
              onSelect={() => setSelectedProject(project)}
              viewMode={viewMode}
              userRole={""}
            />
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <Folder size={48} className="mx-auto mb-4" />
            <p className="text-lg font-medium">No projects found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        </div>
      )}

      {/* Sliding Panel */}
      {selectedProject && (
        <ProjectSlidingPanel
          selectedProject={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};
