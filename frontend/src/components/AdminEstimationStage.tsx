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
    <div className="bg-white border-b p-0 w-full">
      <div className="bg-blue-50 px-8 py-5 border-b">
        <h2 className="text-2xl font-bold text-blue-900 mb-1">
          Estimation Workflow
        </h2>
        <div className="flex flex-wrap gap-4 items-center text-sm text-slate-600">
          <span className="font-semibold text-slate-800">
            Estimation ID: {estimationDetails.id}
          </span>
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 ml-2">
            {estimationDetails.status}
          </Badge>
        </div>
      </div>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Estimator Assigned
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-slate-800">
              {estimationDetails.user?.name || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Cost Estimate (₹)
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-green-700 font-bold text-lg">
              {estimationDetails.cost?.toLocaleString() || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Approved
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-slate-800">
              {estimationDetails.approved ? "Yes" : "No"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Sent to PM
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-slate-800">
              {estimationDetails.sent_to_pm ? "Yes" : "No"}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Deadline
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-rose-700 font-semibold">
              {estimationDetails.deadline}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Approval Date
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-slate-800">
              {estimationDetails.approval_date}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Forwarded To
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-slate-800">
              {typeof estimationDetails.forwarded_to === "object" &&
              estimationDetails.forwarded_to !== null
                ? estimationDetails.forwarded_to.name ||
                  JSON.stringify(estimationDetails.forwarded_to)
                : estimationDetails.forwarded_to || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Notes
            </div>
            <div className="bg-slate-100 rounded px-3 py-2 text-slate-800">
              {estimationDetails.notes}
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 pb-8">
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-1">
            Updates
          </div>
          <div className="bg-slate-50 rounded px-3 py-2 border text-slate-800 text-sm">
            {estimationDetails.updates || "No updates yet."}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-1">Log</div>
          <div className="bg-slate-50 rounded px-3 py-2 border text-slate-800 text-sm">
            {estimationDetails.log || "No log yet."}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-1">
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
    </div>
  );
}
