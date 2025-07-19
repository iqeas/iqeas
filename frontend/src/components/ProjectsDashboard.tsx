import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Grid,
  List,
  Folder,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
} from "lucide-react";
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
import ProjectFullPanel from "./ProjectSlidingPanel";
import { useNavigate } from "react-router-dom";

export const ProjectsDashboard = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [projects, setProjects] = useState<Project[]>([]);
  const { fetching, isFetched, makeApiCall } = useAPICall();
  const { authToken, user } = useAuth();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cards, setCards] = useState({
    total_projects: 0,
    completed_works: 0,
    pending_works: 0,
  });
  const isAdmin = user.role == "admin";

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
        setCards(data.cards);
        setTotalPages(data.total_pages);
      } else {
        toast.error("Failed to fetch projects");
      }
    };
    getProjects();
  }, [page, searchTerm]);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3 max-sm:p-2">
          <div className="bg-blue-200 p-2 rounded-full">
            <Users className="text-blue-700" size={24} />
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {cards.total_projects}
            </div>
            <div className="text-xs text-blue-700">Total Projects</div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-emerald-50 rounded-lg p-3 max-sm:p-2">
          <div className="bg-emerald-200 p-2 rounded-full">
            <CheckCircle2 className="text-emerald-700" size={24} />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-900">
              {cards.completed_works}
            </div>
            <div className="text-xs text-emerald-700">Completed Projects</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-yellow-50 rounded-lg p-3 max-sm:p-2">
          <div className="bg-yellow-200 p-2 rounded-full">
            <Clock className="text-yellow-700" size={24} />
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-900">
              {cards.pending_works}
            </div>
            <div className="text-xs text-yellow-700">Pending projects</div>
          </div>
        </div>
      </div>
      {/* Filters and Search */}
      <div className="bg-white  rounded-lg border border-slate-200 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative flex items-center gap-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Search projects by ID, Company, name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 outline-none"
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
        </div>
      </div>

      {fetching || !isFetched ? (
        <Loading full={false} />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-6 w-full grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
              : "space-y-4"
          }
        >
          {projects.map((project) => {
            // Map snake_case to camelCase for ProjectCard and provide defaults for missing fields
            // Type as 'any' to suppress linter error due to type mismatch between API and ProjectCard
            const mappedProject = {
              ...project,
              clientName: project.client_name,
              createdDate: project.created_at,
              progress: project.progress,
              status: project.status || "",
            };
            return (
              <div key={project.id} className="relative">
                <ProjectCard
                  project={mappedProject}
                  onSelect={() => {
                    navigate("/");
                  }}
                  viewMode={viewMode}
                  userRole={""}
                />
              </div>
            );
          })}
        </div>
      )}

      {!fetching && projects.length === 0 && (
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
    </div>
  );
};
