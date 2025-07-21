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

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "text-red-600 capitalize";
    case "medium":
      return "text-yellow-600 capitalize";
    case "low":
      return "text-green-600 capitalize";
    default:
      return "text-gray-600 capitalize";
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
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300 capitalize";
      case "estimating":
        return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 capitalize";
      case "working":
        return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 capitalize";
      case "completed":
        return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 capitalize";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 capitalize";
      default:
        return "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300 capitalize";
    }
  };

  const isCompleted = ["delivered"].includes(project.status.toLowerCase());
  if (viewMode === "list") {
    return (
      <Card
        className={`hover:shadow-md transition-shadow ${
          isCompleted ? " bg-green-50" : "bg-gray-100"
        }`}
      >
        <CardContent className="p-4 sm:p-4 px-2 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 flex-1">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                  <h3 className="font-semibold text-slate-800 text-base sm:text-lg">
                    {project.project_id}
                  </h3>
                  <Badge
                    className={`${getStatusColor(
                      project.status
                    )} hover:bg-transparent mt-1 sm:mt-0 w-fit`}
                  >
                    {project.status}
                  </Badge>
                  {isOverdue && (
                    <AlertCircle
                      size={16}
                      className="text-red-500 mt-1 sm:mt-0"
                    />
                  )}
                </div>
                <p className="text-base sm:text-lg font-medium text-slate-700">
                  {project.name}
                </p>
                <p className="text-sm text-slate-600">
                  {project.client_name} - {project.client_company}
                </p>
                <div className="hidden sm:flex items-center text-sm text-slate-500 space-x-4 mt-1">
                  <span className="flex items-center">
                    <MapPin size={14} className="mr-1" />
                    {project.location}
                  </span>
                  <span className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex sm:hidden items-center text-xs text-slate-500 mt-1">
                  <Calendar size={12} className="mr-1" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-6">
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
          {/* Project Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-900">
                Progress
              </span>
              <span className="text-xs text-slate-600">
                {project.progress}%
              </span>
            </div>
            <Progress value={project.progress} className="h-2 bg-slate-100" />
          </div>
          <div className="mt-4 sm:mt-6 flex justify-end">
            <Button
              className="bg-black text-white w-full sm:w-auto"
              onClick={onSelect}
            >
              Manage Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`hover:shadow-lg transition-shadow group  h-full flex flex-col  ${
        isCompleted ? " bg-green-50" : " bg-gray-100"
      }`}
    >
      <CardHeader className="pb-3 flex-1 flex flex-col">
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
      <CardContent className="pt-0  ">
        <div className="space-y-4 ">
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
          {/* Project Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-900">
                Progress
              </span>
              <span className="text-xs text-slate-600">
                {project.progress}%
              </span>
            </div>
            <Progress value={project.progress} className="h-2 bg-slate-100" />
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
