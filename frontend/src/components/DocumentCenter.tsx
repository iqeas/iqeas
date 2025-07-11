import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Eye,
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import Loading from "./atomic/Loading";
import type { IDocumentFile } from "@/types/apiTypes";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export const DocumentCenter = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [files, setFiles] = useState<IDocumentFile[]>([]);
  const { fetchType, fetching, isFetched, makeApiCall } = useAPICall();
  const { authToken } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalFiles = useRef(0);
  const setTotalPages = useRef(0);
  useEffect(() => {
    const getDocuments = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_FILES(searchTerm, page, pageSize),
        {},
        "application/json",
        authToken,
        "getFiles"
      );
      if (response && response.data && response.data.files) {
        setFiles(response.data.files);
        console.log(response.data.files);
        setTotalPages.current = response.data.pagination.totalPages;
        totalFiles.current = response.data.pagination.total;
      }
    };
    getDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  if (!isFetched) {
    return <Loading full />;
  }

  const totalPages = setTotalPages.current;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Document Center</h1>
          <p className="text-slate-600 mt-1">
            Manage project documents with version control
          </p>
        </div>
      </div>

      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Documents</p>
                <p className="text-2xl font-bold">{totalFiles.current}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText size={20} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchTerm(searchInput);
                setPage(1);
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Search documents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fetching && fetchType === "getFiles" ? (
              <Loading />
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center space-x-4">
                    <FileText size={20} className="text-blue-600" />
                    <div>
                      <h4 className="font-medium text-slate-800">
                        {file.label}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                        <span>Uploaded by: {file.uploaded_by.name}</span>
                        <span>
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="sm">
                      <Eye size={16} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}

            {files.length === 0 && (
              <div className="text-slate-400 text-center py-8">
                No documents found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Pagination */}
      {files.length > 0 && (
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
                tabIndex={page === 1 ? -1 : 0}
              />
            </PaginationItem>
            {/* Page numbers with ellipsis if needed */}
            {Array.from({ length: totalPages }).map((_, i) => {
              // Show first, last, current, and neighbors; ellipsis for gaps
              if (
                i === 0 ||
                i === totalPages - 1 ||
                Math.abs(i + 1 - page) <= 1
              ) {
                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={page === i + 1}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(i + 1);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (
                (i === 1 && page > 3) ||
                (i === totalPages - 2 && page < totalPages - 2) ||
                (i < page - 1 && i > 0 && page > 4 && i === page - 3) ||
                (i > page - 1 &&
                  i < totalPages - 1 &&
                  page < totalPages - 3 &&
                  i === page + 1)
              ) {
                return (
                  <PaginationItem key={i + "ellipsis"}>
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
                tabIndex={page === totalPages ? -1 : 0}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
