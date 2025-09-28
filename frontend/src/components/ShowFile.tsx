import React from "react";
import { Eye, Download } from "lucide-react";

interface ShowFileProps {
  label: string;
  url: string;
  size?: "small" | "medium" | "large";
}

const sizeMap = {
  small: {
    text: "text-xs",
    icon: "w-3 h-3",
    pad: "px-2 py-1 gap-1",
  },
  medium: {
    text: "text-sm",
    icon: "w-4 h-4",
    pad: "px-3 py-1.5 gap-2",
  },
  large: {
    text: "text-base",
    icon: "w-5 h-5",
    pad: "px-4 py-2 gap-3",
  },
};

export const ShowFile: React.FC<ShowFileProps> = ({
  label,
  url,
  size = "medium",
}) => {
  const handleDownload = async (url: string, label: string) => {
    if (label.toLocaleLowerCase() === "invoice") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", label); // force download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };
  const s = sizeMap[size];
  return (
    <span
      className={`inline-flex items-center bg-blue-50 border border-blue-200 text-blue-800 font-semibold rounded ${s.text} ${s.pad}`}
    >
      <span className="truncate max-w-[120px]">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 text-blue-600 hover:text-blue-900"
        title="Open in new tab"
      >
        <Eye className={s.icon} />
      </a>
      <div
        onClick={(e) => {
          e.preventDefault();

          e.stopPropagation();
          handleDownload(url, label);
        }}
        className="ml-1 cursor-pointer text-blue-600 hover:text-blue-900"
        title="Download"
      >
        <Download className={s.icon} />
      </div>
    </span>
  );
};

export default ShowFile;
