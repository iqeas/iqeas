import React from "react";
import ShowFile from "@/components/ShowFile";
import { Badge } from "@/components/ui/badge";
import { Estimation } from "@/types/apiTypes";

interface AdminEstimationStageProps {
  estimationDetails: Estimation;
}

export default function AdminEstimationStage({
  estimationDetails,
}: AdminEstimationStageProps) {
  return (
    <div className="bg-white rounded-xl shadow border p-0 w-full max-w-3xl mx-auto">
      <div className="rounded-t-xl bg-gradient-to-r from-blue-600 to-blue-400 px-8 py-5 flex items-center gap-3 border-b">
        <svg
          width="28"
          height="28"
          fill="none"
          viewBox="0 0 24 24"
          className="text-white"
        >
          <rect width="28" height="28" fill="currentColor" rx="6" />
        </svg>
        <h2 className="text-2xl font-bold text-white">Estimation Details</h2>
        <span className="ml-auto text-white/80 font-mono text-sm">
          EST-{estimationDetails.id}
        </span>
      </div>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 border-b">
        <div className="space-y-4">
          <div>
            <span className="text-slate-500 font-semibold">Estimator:</span>
            <div className="font-medium text-slate-800 mt-1">
              {estimationDetails.user?.name || "-"}
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">
              Cost Estimate (₹):
            </span>
            <div className="font-bold text-green-700 text-lg mt-1">
              {estimationDetails.cost?.toLocaleString() || "-"}
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Approved:</span>
            <div className="mt-1">
              <Badge
                className={
                  estimationDetails.approved
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }
              >
                {estimationDetails.approved ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Sent to PM:</span>
            <div className="mt-1">
              <Badge
                className={
                  estimationDetails.sent_to_pm
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }
              >
                {estimationDetails.sent_to_pm ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <span className="text-slate-500 font-semibold">Deadline:</span>
            <div className="font-semibold text-rose-700 mt-1">
              {estimationDetails.deadline}
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Approval Date:</span>
            <div className="text-slate-800 mt-1">
              {estimationDetails.approval_date}
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Forwarded To:</span>
            <div className="text-slate-800 mt-1">
              {estimationDetails.forwarded_to.label}
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Notes:</span>
            <div className="text-slate-800 mt-1">{estimationDetails.notes}</div>
          </div>
        </div>
      </div>
      <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b">
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Updates
          </div>
          <div className="bg-slate-50 rounded px-3 py-2 border text-slate-800 text-sm min-h-[40px]">
            {estimationDetails.updates || (
              <span className="text-slate-400">No updates yet.</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-1">Log</div>
          <div className="bg-slate-50 rounded px-3 py-2 border text-slate-800 text-sm min-h-[40px]">
            {estimationDetails.log || (
              <span className="text-slate-400">No log yet.</span>
            )}
          </div>
        </div>
      </div>
      <div className="px-8 py-6">
        <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            className="text-blue-500"
          >
            <rect width="18" height="18" fill="currentColor" rx="4" />
          </svg>
          Uploaded Files
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {estimationDetails.uploaded_files &&
          estimationDetails.uploaded_files.length > 0 ? (
            estimationDetails.uploaded_files.map((file, idx) => (
              <ShowFile key={idx} label={file.label} url={file.url} />
            ))
          ) : (
            <span className="text-slate-400 ml-2">No files uploaded</span>
          )}
        </div>
      </div>
    </div>
  );
}
