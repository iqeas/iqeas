import React, { useState } from "react";
import ShowFile from "./ShowFile";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

export interface ProjectDocument {
  label: string;
  file: string;
  [key: string]: unknown;
}

interface ProjectDocumentsDropdownProps {
  documents: ProjectDocument[];
  title?: string;
}

const ProjectDocumentsDropdown: React.FC<ProjectDocumentsDropdownProps> = ({
  documents,
  title = "Project Related Documents",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = documents;

  return (
    <div className="mb-4 border rounded-lg bg-slate-50">
      <button
        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-blue-800 hover:bg-blue-100 rounded-t-lg focus:outline-none"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span>{title}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="p-4 border-t bg-white rounded-b-lg">
          {/* <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by file name, label, or related title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div> */}
          {filtered.length === 0 ? (
            <div className="text-slate-400 text-sm">No documents found.</div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((doc, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ShowFile label={doc.label} url={doc.file} size="medium" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentsDropdown;
