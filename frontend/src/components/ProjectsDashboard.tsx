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
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const { fetchType, fetching, isFetched, makeApiCall } = useAPICall();
  const { authToken, user } = useAuth();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const isAdmin = user.role == "admin";
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

  // Fetch projects only when searchTerm, page, or statusFilter changes
  useEffect(() => {
    const getProjects = async () => {
      const url = isAdmin
        ? API_ENDPOINT.GET_ALL_ADMIN_PROJECTS(searchTerm, page, 20)
        : API_ENDPOINT.GET_ALL_PM_PROJECTS(searchTerm, page, 20);
      const response = await makeApiCall(
        "get",
        url,
        {},
        "application/json",
        authToken,
        "getProjects"
      );
      if (response.status === 200) {
        const data = response.data as ProjectListResponse;
        setProjects(data.projects);
        setTotalPages(data.total_pages);
      } else {
        toast.error("Failed to fetch projects");
      }
    };
    getProjects();
  }, [searchTerm, page, statusFilter]);

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
            <div className="relative flex items-center gap-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Search projects by client, location, or ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setSearchTerm(searchInput);
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPage(1);
                  setSearchTerm(searchInput);
                }}
                className="px-2"
                aria-label="Search"
              >
                <Search size={18} />
              </Button>
            </div>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setPage(1);
              setStatusFilter(val);
            }}
          >
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
      {fetching || !isFetched ? (
        <Loading full={false} />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {filteredProjects.map((project) => {
            // Map snake_case to camelCase for ProjectCard and provide defaults for missing fields
            // Type as 'any' to suppress linter error due to type mismatch between API and ProjectCard
            const mappedProject: any = {
              ...project,
              clientName: project.client_name,
              createdDate: project.created_at,
              progress: 20,
              status: project.status || "",
            };
            return (
              <div key={project.id} className="relative">
                <ProjectCard
                  project={mappedProject}
                  onSelect={() => setSelectedProject(project)}
                  viewMode={viewMode}
                  userRole={""}
                />
              </div>
            );
          })}
        </div>
      )}

      {!fetching && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <Folder size={48} className="mx-auto mb-4" />
            <p className="text-lg font-medium">No projects found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!fetching && totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          {[...Array(totalPages)].map((_, idx) => (
            <Button
              key={idx + 1}
              size="sm"
              variant={page === idx + 1 ? "default" : "outline"}
              onClick={() => setPage(idx + 1)}
            >
              {idx + 1}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
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
