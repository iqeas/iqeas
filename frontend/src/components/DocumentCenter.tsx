import { useEffect, useState, useCallback } from "react";
import { FolderOpen } from "lucide-react";
// Assuming these are correctly aliased in your tsconfig.json or similar
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

import { useAuth } from "@/contexts/AuthContext";
import { useAPICall } from "@/hooks/useApiCall"; // Your updated hook
import { API_ENDPOINT } from "@/config/backend";
import Loading from "./atomic/Loading"; // Your loading spinner component
import type { IDocumentFile } from "@/types/apiTypes"; // Your document file interface
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export const DocumentCenter = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [files, setFiles] = useState<IDocumentFile[]>([]);
  const { fetching, fetchType, makeApiCall, isFetched } = useAPICall();
  const { authToken, user } = useAuth();

  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [totalPages, setTotalPages] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const getDocuments = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_DOCUMENT_PROJECTS(page, pageSize, searchTerm),
        {},
        "application/json",
        authToken,
        "getFiles"
      );

      if (response.status == 200) {
        setFiles(response.data.projects);
        setTotalPages(response.data.total_pages);
      } else {
        toast.error("Failed to fetch documents");
      }
    };
    getDocuments();
  }, [searchTerm, page]); // Removed 'fetching' and 'isLoadingData' from dependencies

  // Primary full-page loading spinner.
  if (!isFetched && fetching && fetchType == "getFiles") {
    return <Loading full />;
  }

  return (
    <section className="mt-4 p-6 relative">
      <h1 className="text-xl font-bold mb-4 text-neutral-800">
        Document Center
      </h1>
      <div className="flex  rounded-lg   min-h-[320px]">
        <div className="flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchTerm(searchInput);
              setPage(1);
            }}
            className="flex gap-2 mb-6"
          >
            <Input
              placeholder="Search projects..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-md  focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <Button type="submit" variant="secondary" className="rounded-md">
              Search
            </Button>
          </form>
          <div className="flex flex-col gap-2">
            {fetching && fetchType === "getFiles" ? (
              <Loading full={false} />
            ) : files.length > 0 ? (
              files.map((file: IDocumentFile) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-3 hover:bg-slate-100 transition cursor-pointer"
                  onClick={() =>
                    navigate(`/${user.role}/documents/${file.id}`, {
                      state: { project: file },
                    })
                  }
                >
                  <FolderOpen className="w-8 h-8 text-blue-500" />
                  <div className="flex-1">
                    <div className="text-lg font-medium text-slate-800">
                      {file.name} - {file.project_id}
                    </div>
                    <div className="text-xs text-slate-500">
                      Created: {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-center py-8">
                No projects found.
              </div>
            )}
          </div>
          {/* Pagination (unchanged) */}
          {totalPages > 1 && !fetching && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    aria-disabled={page === 1}
                    className="rounded-md"
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNumber = i + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= page - 1 && pageNumber <= page + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={page === pageNumber}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNumber);
                          }}
                          className="rounded-md"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    (pageNumber === 2 && page > 3) ||
                    (pageNumber === totalPages - 1 && page < totalPages - 2)
                  ) {
                    return (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    aria-disabled={page === totalPages}
                    className="rounded-md"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </section>
  );
};
