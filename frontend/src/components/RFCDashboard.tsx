import { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Search,
  Calendar,
  AlertCircle,
  Plus,
  X,
  CheckCircle,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  StickyNote,
  Edit,
  Trash2,
  Info,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import type { IRFCProject } from "@/types/apiTypes";
import ShowFile from "./ShowFile";
import toast from "react-hot-toast";
import {
  validateProjectForm,
  validateRequiredFields,
} from "@/utils/validation";
import Loading from "./atomic/Loading";
import test from "node:test";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "./ui/dialog";
import { isValidEmail } from "@/lib/utils";

function generateProjectId() {
  return `PRJ-${new Date().getFullYear()}-${Math.floor(
    Math.random() * 900 + 100
  )}`;
}

const initialForm = {
  name: "",
  clientName: "",
  clientCompany: "",
  location: "",
  projectType: "Pipeline",
  received_date: new Date().toISOString().slice(0, 10),
  uploadedFiles: [],
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  notes: "",
  priority: "medium",
};

// Add helper functions for badge color
const getPriorityBadgeProps = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case "high":
      return { variant: "destructive" as const };
    case "medium":
      return { variant: "secondary" as const };
    case "low":
      return {
        variant: "outline" as const,
        className: "border-gray-400 text-gray-600",
      };
    default:
      return { variant: "default" as const };
  }
};

const getStatusBadgeProps = (status: string) => {
  if (!status) return { variant: "default" as const };
  switch (status.toLowerCase()) {
    case "rejected":
      return { variant: "destructive" as const };
    case "completed":
      return {
        variant: "secondary" as const,
        className: "bg-green-100 text-green-800 border-green-300",
      };
    case "estimating":
    case "ready for estimation":
      return {
        variant: "secondary" as const,
        className: "bg-blue-100 text-blue-800 border-blue-300",
      };
    default:
      return { variant: "outline" as const, className: "capitalize" };
  }
};

export const RFCDashboard = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [projects, setProjects] = useState<IRFCProject[]>([]);
  const { fetchType, fetching, isFetched, makeApiCall } = useAPICall();
  const { authToken } = useAuth();
  const [formStep, setFormStep] = useState(1);
  const [sendToEstimation, setSendToEstimation] = useState(false);
  const [detailsProject, setDetailsProject] = useState(null);
  const [moreInfoProject, setMoreInfoProject] = useState(null);
  const [moreInfoForm, setMoreInfoForm] = useState({
    files: [],
    notes: "",
    enquiry: "",
  });
  const [cards, setCards] = useState({
    active_projects: 0,
    read_for_estimation: 0,
  });

  useEffect(() => {
    // Fetch projects data from API with pagination and search
    const fetchProjects = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_RFQ_PROJECTS(searchTerm, page, 20),
        {},
        "application/json",
        authToken,
        "getProjects"
      );
      if (response.status === 200) {
        setProjects(response.data.projects);
        setCards(response.data.cards);
        setTotalPages(response.data.total_pages);
      } else {
        toast.error("failed to fetch projects");
      }
    };
    fetchProjects();
  }, [searchTerm, page]);
  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "uploadedFiles") {
      setForm({ ...form, uploadedFiles: Array.from(files) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Start new project entry
  const startNewProject = () => {
    setForm({
      ...initialForm,
    });
    setFormStep(1);
    setShowForm(true);
  };

  // Go to next step
  const nextStep = () => setFormStep((s) => s + 1);
  const prevStep = () => setFormStep((s) => s - 1);

  // Submit new project
  const submitProject = async (sendToEstimationNow = false) => {
    const missing = validateProjectForm(form);
    if (missing.length > 0) {
      toast.error(`Missing required field: ${missing[0]}`);
      return;
    }
    if (!isValidEmail(form.contactEmail)) {
      toast.error(`Please enter valid contact email`);
      return;
    }
    // Check for missing file labels
    if (
      form.uploadedFiles.some(
        (f) => f.file && (!f.label || f.label.trim() === "")
      )
    ) {
      toast.error("Please enter a label for every uploaded file.");
      return;
    }
    // Upload all files in form.uploadedFiles
    const uploadedFileIds = [];

    for (const uf of form.uploadedFiles) {
      if (uf.file) {
        const uploaded = await uploadFile(uf.file, uf.label);
        if (uploaded && uploaded.id) {
          uploadedFileIds.push(uploaded.id);
        } else {
          toast.error("Failed to upload files");
          return;
        }
      }
    }
    const data = {
      name: form.name,
      client_name: form.clientName,
      client_company: form.clientCompany,
      location: form.location,
      received_date: form.received_date,
      project_type: form.projectType,
      priority: form.priority,
      contact_person: form.contactPerson,
      contact_person_phone: form.contactPhone,
      contact_person_email: form.contactEmail,
      notes: form.notes,
      send_to_estimation: sendToEstimationNow,
      uploaded_files: uploadedFileIds,
    };
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_PROJECT,
      data,
      "application/json",
      authToken,
      "createProject"
    );
    if (response.status == 201) {
      setProjects([response.data, ...projects]);
      if (response.data.send_to_estimation) {
        setCards({
          ...cards,
          active_projects: cards.active_projects + 1,
        });
      } else {
        setCards({
          ...cards,
          read_for_estimation: cards.read_for_estimation + 1,
        });
      }
      toast.success(response.detail);
    } else {
      toast.error("Failed to create project");
    }
    setShowForm(false);
    setSendToEstimation(false);
  };

  // Filtered projects is now just projects (API handles filtering)
  const filteredProjects = projects;

  // Refactor submitMoreInfo to upload files and send the correct payload
  const submitMoreInfo = async () => {
    if (!moreInfoProject) return;
    console.log(validateRequiredFields(moreInfoForm, ["enquiry", "notes"]));
    if (validateRequiredFields(moreInfoForm, ["enquiry", "notes"]).length > 0) {
      toast.error("Fill all the required fields");
      return;
    }
    // Upload files
    const uploadedFileIds = [];
    for (const uf of moreInfoForm.files) {
      if (uf.file) {
        const uploaded = await uploadFile(uf.file, uf.label);
        if (uploaded && uploaded.id) {
          uploadedFileIds.push(uploaded.id);
        } else {
          toast.error("Failed to upload files");
          return;
        }
      }
    }
    // Prepare data
    const data = {
      project_id: moreInfoProject.id,
      notes: moreInfoForm.notes,
      enquiry: moreInfoForm.enquiry,
      uploaded_file_ids: uploadedFileIds,
    };
    // Call API
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.PROJECT_ADD_MORE_INFO,
      data,
      "application/json",
      authToken,
      "addMoreInfo"
    );
    if (response.status === 201) {
      toast.success("Additional info added!");
      setProjects((prev) =>
        prev.map((item) => {
          if (item.id === moreInfoProject.id) {
            return {
              ...item,
              add_more_infos: [response.data, ...item.add_more_infos],
            };
          }
          return item;
        })
      );
      setMoreInfoProject(null);
      setMoreInfoForm({
        files: [],
        notes: "",
        enquiry: "",
      });
    } else {
      toast.error("Failed to add more info");
    }
  };

  const uploadFile = async (file: File, label: string) => {
    const data = new FormData();
    data.append("label", label);
    console.log(typeof file);

    data.append("file", file);
    console.log(data);
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.UPLOAD_FILE,
      data,
      "application/form-data",
      authToken,
      "uploadFile"
    );
    if (response.status == 201) {
      return response.data;
    } else {
      return null;
    }
  };

  const handleSentToEstimation = async (id: number) => {
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_PROJECT(id),
      {
        send_to_estimation: true,
      },
      "application/json",
      authToken,
      "sentToEstimation"
    );
    if (response.status == 200) {
      toast.success(response.detail);
      setProjects((prev) =>
        prev.map((item) => {
          if (item.id == id) {
            return {
              ...item,
              send_to_estimation: true,
              status: "estimating",
            };
          }
          return item;
        })
      );
      setCards({
        ...cards,
        active_projects: cards.active_projects + 1,
        read_for_estimation: cards.read_for_estimation - 1,
      });
    } else {
      toast.error("Failed to sent to estimation");
    }
  };
  if (!isFetched) {
    return <Loading full />;
  }
  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            RFQ Team Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Manage client requests and project initiation
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={startNewProject}
        >
          <Plus size={18} className="mr-2" />
          Add New Project
        </Button>
      </div>

      {/* Modal/Form for New Project */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="">
            <DialogHeader className="px-6 py-4">
              <h2 className="text-xl font-bold ">Add New Project</h2>
            </DialogHeader>
            <div className="relative  p-6">
              {/* Stepper */}
              <div className="flex mb-6 space-x-4">
                <div
                  className={`flex-1 text-center ${
                    formStep === 1
                      ? "font-bold text-blue-600"
                      : "text-slate-500"
                  }`}
                >
                  1. Data Collection
                </div>
                <div
                  className={`flex-1 text-center ${
                    formStep === 2
                      ? "font-bold text-blue-600"
                      : "text-slate-500"
                  }`}
                >
                  2. Review & Confirm
                </div>
              </div>

              {formStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">
                        Project Name
                      </label>
                      <Input
                        name="name"
                        value={form.name}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Client Name
                      </label>
                      <Input
                        name="clientName"
                        value={form.clientName}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Client Company
                      </label>
                      <Input
                        name="clientCompany"
                        value={form.clientCompany}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Location
                      </label>
                      <Input
                        name="location"
                        value={form.location}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Project Type
                      </label>
                      <Select
                        value={form.projectType}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, projectType: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Project Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pipeline">Pipeline</SelectItem>
                          <SelectItem value="Plant">Plant</SelectItem>
                          <SelectItem value="Maintenance">
                            Maintenance
                          </SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Priority
                      </label>
                      <Select
                        value={form.priority}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, priority: v.toLowerCase() }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Received Date
                      </label>
                      <Input
                        type="date"
                        name="received_date"
                        value={form.received_date}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">
                        Uploaded Files
                      </label>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setForm((prev) => ({
                            ...prev,
                            uploadedFiles: [
                              ...prev.uploadedFiles,
                              ...files.map((file) => ({
                                file,
                                label: "",
                                tempUrl: URL.createObjectURL(file),
                              })),
                            ],
                          }));
                          e.target.value = "";
                        }}
                      />
                      {form.uploadedFiles.map((uf, idx) => (
                        <div key={idx} className="flex items-center gap-2 mt-1">
                          <Input
                            type="text"
                            placeholder="Label"
                            value={uf.label}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                uploadedFiles: prev.uploadedFiles.map((u, i) =>
                                  i === idx
                                    ? { ...u, label: e.target.value }
                                    : u
                                ),
                              }))
                            }
                            className={
                              uf.label && uf.label.trim()
                                ? ""
                                : "border-red-400"
                            }
                          />
                          <span className="text-xs">{uf.file.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                uploadedFiles: prev.uploadedFiles.filter(
                                  (_, i) => i !== idx
                                ),
                              }))
                            }
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Contact Person
                      </label>
                      <Input
                        name="contactPerson"
                        value={form.contactPerson}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Phone</label>
                      <Input
                        name="contactPhone"
                        value={form.contactPhone}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Email</label>
                      <Input
                        name="contactEmail"
                        value={form.contactEmail}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Notes</label>
                      <Input
                        name="notes"
                        value={form.notes}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      onClick={nextStep}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {formStep === 2 && (
                <div>
                  <h3 className="font-semibold mb-2">Review Project Data</h3>
                  <div className="bg-slate-50 p-4 rounded mb-4 text-sm space-y-2">
                    <div>
                      <strong>Project Name:</strong> {form.name}
                    </div>
                    <div>
                      <strong>Client Name:</strong> {form.clientName}
                    </div>
                    <div>
                      <strong>Client Company:</strong> {form.clientCompany}
                    </div>
                    <div>
                      <strong>Location:</strong> {form.location}
                    </div>
                    <div>
                      <strong>Project Type:</strong> {form.projectType}
                    </div>
                    <div>
                      <strong>Received Date:</strong> {form.received_date}
                    </div>
                    <div>
                      <strong>Priority:</strong> {form.priority}
                    </div>
                    <div>
                      <strong>Contact Person:</strong> {form.contactPerson}
                    </div>
                    <div>
                      <strong>Phone:</strong> {form.contactPhone}
                    </div>
                    <div>
                      <strong>Email:</strong> {form.contactEmail}
                    </div>
                    {form.notes && <div>{form.notes}</div>}
                    <div>
                      <strong>Uploaded Files:</strong>
                      <ul className="list-disc ml-6">
                        {form.uploadedFiles
                          .filter((f) => f.file)
                          .map((f, i) => (
                            <li key={i}>
                              {f.label ? `${f.label}: ` : ""}
                              {f.file?.name}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => submitProject(sendToEstimation)}
                      loading={
                        fetching &&
                        (fetchType === "createProject" ||
                          fetchType === "uploadFile")
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold"> {cards.active_projects}</p>
                <p className="text-sm text-slate-600">Active RFQs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold capitalize">
                  {cards.read_for_estimation}
                </p>
                <p className="text-sm text-slate-600">Ready for Estimation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative flex items-center gap-2">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
          />
          <Input
            placeholder="Search RFQs by client name or project ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearchTerm(searchInput);
            }}
            className="pl-10"
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
        </div>
      </div>

      {/* RFQ Cards */}
      {fetching && fetchType == "getProjects" ? (
        <Loading full={false} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow cursor-pointer p-2 mb-4"
            >
              <CardHeader className="pb-4 mb-2 border-b border-slate-100">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">
                      {project.project_id}
                    </CardTitle>
                    <p className="text-base font-bold text-slate-800 mb-1">
                      {project.name}
                    </p>
                    <p className="text-slate-600 font-semibold flex items-center gap-1">
                      <User size={14} /> {project.client_name}
                    </p>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Building2 size={12} /> {project.client_company}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={12} /> {project.location}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12} /> Received:{" "}
                      {project.received_date
                        ? new Date(project.received_date).toLocaleDateString()
                        : "-"}
                    </p>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <FileText size={12} /> {project.project_type}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <Badge
                      className="capitalize"
                      {...getPriorityBadgeProps(project.priority)}
                    >
                      {project.priority}
                    </Badge>
                    <Badge
                      className="capitalize"
                      {...getStatusBadgeProps(project.status)}
                    >
                      {project.status}
                    </Badge>
                    <div className="flex gap-2 mt-2">
                      {/* <Button
                        size="icon"
                        variant="ghost"
                      
                        title="Edit"
                      >
                        <Edit size={16} />
                      </Button> */}
                      {/* <Button
                        size="icon"
                        variant="ghost"
                        
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button> */}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDetailsProject(project)}
                  >
                    <Info size={14} className="mr-1" /> Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMoreInfoProject(project)}
                  >
                    <StickyNote size={14} className="mr-1" /> Add More Info
                  </Button>
                  {!project.send_to_estimation && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      loading={fetching && fetchType == "sentToEstimation"}
                      onClick={() => {
                        handleSentToEstimation(project.id);
                      }}
                    >
                      <Send size={14} className="mr-1" /> Send to Estimation
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      {!fetching && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">No RFQ projects found.</div>
        </div>
      )}
      {/* Pagination Controls */}
      {!fetching && totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="px-3 py-1 text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Details View Modal */}
      {detailsProject && (
        <Dialog
          open={!!detailsProject}
          onOpenChange={() => setDetailsProject(null)}
        >
          <DialogContent>
            <DialogHeader
              className="flex flex-row items-center justify-between px-6 py-4 rounded-t-lg"
              style={{
                background: "linear-gradient(90deg, #1976d2 0%, #4fc3f7 100%)",
              }}
            >
              <div className="flex items-center gap-2">
                <FileText size={22} className="text-white" />
                <span className="text-lg font-bold text-white">
                  Project Details
                </span>
              </div>
              <div className="text-sm text-white font-mono opacity-80 pr-3">
                {detailsProject.project_id}
              </div>
            </DialogHeader>
            {/* Header */}

            {/* Content */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                <div>
                  <span className="font-semibold">Client Name:</span>
                  <br />
                  {detailsProject.client_name || (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Client Company:</span>
                  <br />
                  {detailsProject.client_company || (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Location:</span>
                  <br />
                  {detailsProject.location || (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Project Type:</span>
                  <br />
                  {detailsProject.project_type || (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Received Date:</span>
                  <br />
                  {detailsProject.received_date ? (
                    new Date(detailsProject.received_date).toLocaleDateString()
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Priority:</span>
                  <br />
                  {detailsProject.priority ? (
                    <Badge {...getPriorityBadgeProps(detailsProject.priority)}>
                      {detailsProject.priority}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>
                  <br />
                  {detailsProject.status ? (
                    <Badge
                      className="capitalize"
                      {...getStatusBadgeProps(detailsProject.status)}
                    >
                      {detailsProject.status}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>

              <hr className="my-2" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-600" />
                  <span className="font-semibold">Contact Person:</span>
                  <span>
                    {detailsProject.contact_person || (
                      <span className="text-gray-400">-</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-green-600" />
                  <span className="font-semibold">Phone:</span>
                  <span>
                    {detailsProject.contact_person_phone || (
                      <span className="text-gray-400">-</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-red-600" />
                  <span className="font-semibold">Email:</span>
                  <span>
                    {detailsProject.contact_person_email || (
                      <span className="text-gray-400">-</span>
                    )}
                  </span>
                </div>
              </div>

              <hr className="my-2" />

              {/* Notes */}
              <div className="mb-4">
                <span className="font-semibold flex items-center gap-2 mb-1">
                  <StickyNote size={16} /> Notes:
                </span>
                <div className="bg-slate-50 rounded p-2 min-h-[40px] text-gray-700">
                  {detailsProject.notes ? (
                    detailsProject.notes
                  ) : (
                    <span className="text-gray-400">No notes</span>
                  )}
                </div>
              </div>

              {/* Uploaded Files */}
              <div className="mb-4">
                <span className="font-semibold flex items-center gap-2 mb-1">
                  <FileText size={16} /> Uploaded Files:
                </span>
                <ul className="list-disc ml-6">
                  {detailsProject.uploaded_files?.length > 0 ? (
                    detailsProject.uploaded_files.map((f, i) => (
                      <li key={i} className="mb-2">
                        <ShowFile label={f.label} url={f.file} />
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">No files uploaded</li>
                  )}
                </ul>
              </div>

              {/* RFC Updates / Additional Info */}
              <div className="mb-4">
                <span className="font-semibold flex items-center gap-2 mb-1 text-yellow-700">
                  <AlertCircle size={16} /> RFC Updates:
                </span>
                {detailsProject.add_more_infos?.length > 0 ? (
                  <div className="space-y-4">
                    {detailsProject.add_more_infos.map((info, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex flex-col gap-1 mb-2 text-sm">
                          <div className="flex items-center gap-2">
                            <StickyNote size={14} />
                            <span className="font-medium">Notes:</span>
                            <span>{info.notes || "-"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Info size={14} />
                            <span className="font-medium">Enquiry:</span>
                            <span>{info.enquiry || "-"}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(info.uploaded_files || []).map((f, j) => (
                            <ShowFile
                              key={j}
                              label={f.label}
                              url={f.file}
                              size="small"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 ml-2">No updates yet.</div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* More Info Modal */}
      {moreInfoProject && (
        <Dialog open={true} onOpenChange={() => setMoreInfoProject(null)}>
          <DialogContent className="">
            <DialogHeader className="px-6 py-5">
              <h2 className="text-xl font-bold">
                Add More Info to {moreInfoProject.project_id}
              </h2>
            </DialogHeader>
            <div className=" p-6 ">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Upload Additional Files
                </label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setMoreInfoForm((prev) => ({
                      ...prev,
                      files: [
                        ...prev.files,
                        ...files.map((file) => ({
                          file,
                          label: "",
                          tempUrl: URL.createObjectURL(file),
                        })),
                      ],
                    }));
                    e.target.value = "";
                  }}
                />
                {moreInfoForm.files.map((uf, idx) => (
                  <div key={idx} className="flex items-center gap-2 mt-1">
                    <Input
                      type="text"
                      placeholder="Label"
                      value={uf.label}
                      onChange={(e) =>
                        setMoreInfoForm((prev) => ({
                          ...prev,
                          files: prev.files.map((u, i) =>
                            i === idx ? { ...u, label: e.target.value } : u
                          ),
                        }))
                      }
                      className={
                        uf.label && uf.label.trim() ? "" : "border-red-400"
                      }
                    />
                    <span className="text-xs">{uf.file?.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setMoreInfoForm((prev) => ({
                          ...prev,
                          files: prev.files.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Add Notes
                </label>
                <textarea
                  className="border rounded w-full p-2 text-sm"
                  rows={2}
                  value={moreInfoForm.notes}
                  onChange={(e) =>
                    setMoreInfoForm((form) => ({
                      ...form,
                      notes: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Add Enquiry
                </label>
                <textarea
                  className="border rounded w-full p-2 text-sm"
                  rows={2}
                  value={moreInfoForm.enquiry}
                  onChange={(e) =>
                    setMoreInfoForm((form) => ({
                      ...form,
                      enquiry: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMoreInfoProject(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={submitMoreInfo}
                  loading={
                    fetching &&
                    (fetchType == "addMoreInfo" ||
                      fetchType == "editMoreInfo" ||
                      fetchType == "uploadFile")
                  }
                  disabled={
                    fetching &&
                    (fetchType == "addMoreInfo" ||
                      fetchType == "editMoreInfo" ||
                      fetchType == "uploadFile")
                  }
                >
                  Submit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
