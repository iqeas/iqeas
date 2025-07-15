import {
  Calendar,
  MapPin,
  Users,
  Clock,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Project } from "@/types/apiTypes";

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
  viewMode: "grid" | "list";
  userRole?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Working":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Completed":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "text-red-600";
    case "medium":
      return "text-yellow-600";
    case "low":
      return "text-green-600";
    default:
      return "text-gray-600";
  }
};

export const ProjectCard = ({
  project,
  onSelect,
  viewMode,
}: ProjectCardProps) => {
  const isOverdue =
    project.estimation &&
    new Date(project.estimation.deadline) < new Date() &&
    project.status !== "Completed";

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-slate-800">
                    {project.project_id}
                  </h3>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                  {isOverdue && (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
                <p className="text-lg font-medium text-slate-700">
                  {project.name}
                </p>
                <p className="text-sm text-slate-600">
                  {project.client_name} - {project.client_company}
                </p>
                <div className="flex items-center text-sm text-slate-500 space-x-4 mt-1">
                  <span className="flex items-center">
                    <MapPin size={14} className="mr-1" />
                    {project.location}
                  </span>
                  <span className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {project.estimation && (
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Cost</p>
                  <div className="flex items-center">
                    <DollarSign size={14} className="mr-1" />
                    <span className="text-sm font-medium">
                      {project.estimation.cost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Priority</p>
                <span
                  className={`text-sm font-medium ${getPriorityColor(
                    project.priority
                  )}`}
                >
                  {project.priority}
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Type</p>
                <Badge variant="outline" className="text-xs">
                  {project.project_type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="bg-black text-white w-full" onClick={onSelect}>
              Manage Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-slate-800">
                {project.project_id}
              </h3>
              {isOverdue && <AlertCircle size={16} className="text-red-500" />}
            </div>
            <h2 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              {project.name}
            </h2>
            <p className="text-sm text-slate-600">
              {project.client_name} - {project.client_company}
            </p>
          </div>
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center text-sm text-slate-600">
            <MapPin size={14} className="mr-2" />
            {project.location}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center">
              <Calendar size={14} className="mr-2" />
              {new Date(project.created_at).toLocaleDateString()}
            </div>
            <span
              className={`font-medium ${getPriorityColor(project.priority)}`}
            >
              {project.priority} Priority
            </span>
          </div>
          {project.estimation && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Estimation</span>
                <div className="flex items-center">
                  <DollarSign size={14} className="mr-1" />
                  <span className="text-sm font-medium text-slate-800">
                    {project.estimation.cost.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Clock size={14} className="mr-2" />
                <span>
                  Deadline:{" "}
                  {new Date(project.estimation.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center text-sm text-slate-600 mb-2">
              <Users size={14} className="mr-2" />
              Project Type
            </div>
            <Badge variant="outline" className="text-xs">
              {project.project_type}
            </Badge>
          </div>
          <div className="flex items-center text-sm text-slate-600 pt-2 border-t">
            <span className="text-xs text-slate-500">
              Created by: {project.user.name}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <Button className="bg-black text-white w-full" onClick={onSelect}>
            Manage Project
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
