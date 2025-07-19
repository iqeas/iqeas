import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  PhoneCall,
} from "lucide-react";
import Loading from "./atomic/Loading";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

const DocumentationProjectList = () => {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();
  const { fetchType, fetching, isFetched, makeApiCall } = useAPICall();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { authToken } = useAuth();
  const [cards, setCards] = useState({
    total_projects: 0,
    total_works: 0,
    completed_works: 0,
    pending_works: 0,
  });

  useEffect(() => {
    getProjects();
    // eslint-disable-next-line
  }, [search, page]);

  const getProjects = async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_ALL_WORKERS_PROJECTS(search, page, pageSize),
      {},
      "application/json",
      authToken
    );
    if (response.status == 200) {
      setProjects(response.data.projects);
      setTotalPages(response.data.total_pages);
      setCards(response.data.cards);
    }
  };

  // Responsive grid classes
  const cardGrid =
    "grid gap-6 w-full grid-cols-[repeat(auto-fill,minmax(300px,1fr))]";
  if (!isFetched) {
    return <Loading full />;
  }
  return (
    <div className="p-4 md:p-8 w-full  mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">
        Document Dashboard
      </h1>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
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
        <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
          <div className="bg-green-200 p-2 rounded-full">
            <ClipboardList className="text-green-700" size={24} />
          </div>
          <div>
            <div className="text-lg font-bold text-green-900">
              {cards.total_works}
            </div>
            <div className="text-xs text-green-700">Total Works</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 rounded-lg p-3">
          <div className="bg-emerald-200 p-2 rounded-full">
            <CheckCircle2 className="text-emerald-700" size={24} />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-900">
              {cards.completed_works}
            </div>
            <div className="text-xs text-emerald-700">Completed Works</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-yellow-50 rounded-lg p-3">
          <div className="bg-yellow-200 p-2 rounded-full">
            <Clock className="text-yellow-700" size={24} />
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-900">
              {cards.pending_works}
            </div>
            <div className="text-xs text-yellow-700">Pending Workers</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex w-full sm:w-80 items-center gap-2">
          <Input
            className="w-full"
            placeholder="Search by Project Name, Project ID"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
          />
          <button
            className="p-2 rounded bg-gray-100 hover:bg-gray-200"
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-gray-900" />
          </button>
        </div>
      </div>
      {fetching && <Loading full={false} />}
      {/* Project Cards */}
      <div className={cardGrid}>
        {!fetching &&
          projects.map((project) => {
            const progress =
              parseInt(project.total_works) === 0
                ? 0
                : ((parseInt(project.total_works) -
                    parseInt(project.pending_works)) /
                    parseInt(project.total_works)) *
                  100;
            return (
              <Card
                key={project.project_id}
                className="relative rounded-3xl shadow-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 flex flex-col items-center p-0 overflow-hidden"
              >
                {/* Accent bar */}
                <div className="absolute left-0 top-0 h-full w-2 bg-gray-900 rounded-l-3xl" />
                {/* Watermark icon */}
                <FileText
                  className="absolute right-4 top-4 text-gray-300 opacity-30"
                  size={48}
                />
                <CardContent className="flex flex-col items-center gap-2 pt-6 pb-4 px-6 w-full">
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
                        <FileText className="text-gray-700" size={28} />
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 text-center">
                      {project.project_name}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(project.created_at)}
                    </span>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full bg-gray-200 text-xs text-gray-800 font-semibold">
                      {project.company_name}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-2 w-full  font-bold">
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Project ID:</span>{" "}
                      {project.project_code}
                    </div>
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Total Works:</span>{" "}
                      {project.total_works}
                    </div>
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">Pending Works:</span>{" "}
                      {project.pending_works}
                    </div>
                    {parseInt(project.pending_works) > 0 && (
                      <span className="mt-1 px-2 py-0.5 rounded bg-gray-100 text-gray-900 text-xs font-semibold border border-gray-300">
                        Verification Required
                      </span>
                    )}
                  </div>
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-gray-200" />
                  </div>
                  <Button
                    className="mt-4 w-full rounded-full bg-gradient-to-r from-gray-700 to-gray-900 text-white font-bold flex items-center justify-center gap-2"
                    onClick={() =>
                      navigate(`/documentation/project/${project.project_id}`, {
                        state: { project },
                      })
                    }
                  >
                    <FileText className="w-4 h-4" />
                    Go to Documenting
                  </Button>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !fetching && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <PaginationItem key={idx}>
                  <PaginationLink
                    isActive={page === idx + 1}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(idx + 1);
                    }}
                  >
                    {idx + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default DocumentationProjectList;
