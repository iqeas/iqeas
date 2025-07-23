import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import Loading from "./atomic/Loading";

const leaveTypes = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "earned", label: "Earned" },
  { value: "unpaid", label: "Unpaid" },
];

function getLeaveStatus(fromDateStr: string, toDateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
  const fromDate = new Date(fromDateStr);
  const toDate = new Date(toDateStr);

  if (toDate < today) {
    return "Ended";
  } else if (fromDate > today) {
    return "Upcoming";
  } else {
    return "Ongoing";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "Ongoing":
      return "bg-green-100 text-green-700";
    case "Upcoming":
      return "bg-yellow-100 text-yellow-700";
    case "Ended":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function isTodayInRange(from, to) {
  const today = new Date().toISOString().slice(0, 10);
  return from <= today && today <= to;
}

const LeaveManagement = () => {
  const [records, setRecords] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  // Change default filter to 'all-employees'
  const [userFilter, setUserFilter] = useState("all-employees");
  const [users, setUsers] = useState([]);
  const [leaveToDelete, setLeaveToDelete] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const { makeApiCall, fetching, isFetched, fetchType } = useAPICall();
  const [page, setPage] = useState(1);
  const pageSize = 40;
  const { authToken } = useAuth();

  useEffect(() => {
    setRecords([]);
    setUsers([]);
    if (userFilter == "all-employees") {
      fetchAllEmployees();
    } else {
      fetchLeaves();
    }
  }, [query, page, userFilter]);
  const fetchAllEmployees = async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_ALL_USERS(search, page, pageSize),
      {},
      "application/json",
      authToken,
      "getLeaves"
    );
    if (response.status == 200) {
      setUsers(response.data.users);
    } else {
      toast.error("Failed to fetch employees");
    }
  };
  const fetchLeaves = async () => {
    const response = await makeApiCall(
      "get",
      API_ENDPOINT.GET_LEAVES(userFilter, page, pageSize, search),
      {},
      "application/json",
      authToken,
      "getLeaves"
    );
    if (response.status == 200) {
      setRecords(response.data.leaves);
      setTotalPages(response.data.total_pages);
    } else {
      toast.error("Failed to fetch leaves");
    }
  };
  function toDateInputValue(date) {
    if (!date) return "";
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().slice(0, 10);
  }
  const [form, setForm] = useState({
    user_id: "",
    leave_type: "casual",
    from_date: "",
    to_date: "",
    reason: "",
    name: "",
  });

  const openModal = (record = null, user = null) => {
    setEditRecord(record);
    setForm(
      record
        ? {
            name: record.user.name,
            user_id: record.user.id,
            leave_type: record.leave_type,
            from_date: toDateInputValue(record.from_date),
            to_date: toDateInputValue(record.to_date),
            reason: record.reason,
          }
        : {
            user_id: user.id,
            leave_type: "casual",
            from_date: "",
            to_date: "",
            reason: "",
            name: user.name,
          }
    );
    setModalOpen(true);
  };
  console.log(form);
  const closeModal = () => {
    setModalOpen(false);
    setEditRecord(null);
  };
  const handleFormChange = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.leave_type || !form.from_date || !form.to_date) {
      toast.error("Please fill all required fields");
      return;
    }
    const data = {
      user_id: form.user_id,
      leave_type: form.leave_type,
      from_date: form.from_date,
      to_date: form.to_date,
      reason: form.reason,
    };
    if (editRecord) {
      const response = await makeApiCall(
        "patch",
        API_ENDPOINT.ACTION_LEAVE(editRecord.id),
        data,
        "application/json",
        authToken,
        "editLeave"
      );
      if (response.status == 200) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === editRecord.id
              ? {
                  ...r,
                  ...response.data,
                }
              : r
          )
        );
        toast.success("Leave edited successfully");
      } else {
        toast.error("Failed to edit leave");
      }
    } else {
      const response = await makeApiCall(
        "post",
        API_ENDPOINT.CREATE_LEAVE,
        data,
        "application/json",
        authToken,
        "createLeave"
      );
      if (response.status == 200) {
        toast.success("Leave applied");
      } else {
        toast.error("Failed to apply leave");
      }
    }
    closeModal();
  };
  const handleDelete = async (id) => {
    console.log(id);
    const response = await makeApiCall(
      "delete",
      API_ENDPOINT.ACTION_LEAVE(id),
      {},
      "application/json",
      authToken,
      "deleteLeave"
    );
    if (response.status == 200) {
      toast.success("Leave deleted");
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setLeaveToDelete(null);
    } else {
      toast.error("Failed to delete leave");
    }
  };

  if (!isFetched) {
    return <Loading />;
  }
  return (
    <div className="p-6  mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold max-sm:text-lg">Leave Management</h2>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 justify-between w-full">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-employees">All Employees</SelectItem>
              <SelectItem value="all">All Leaves</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="not_on_leave">Not on Leave</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <Input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
              onKeyDown={(e) => {
                if (e.key == "Enter") {
                  setPage(1);
                  setQuery(search);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Table rendering based on filter */}
      {userFilter === "all-employees" ? (
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full text-sm max-sm:text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Employee
                </th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Role
                </th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {fetching && fetchType == "getLeaves" && (
                <tr>
                  <td colSpan={3} className="text-center p-4 text-gray-400">
                    <Loading full={false} />
                  </td>
                </tr>
              )}
              {!fetching && users.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center p-4 text-gray-400">
                    No employees found
                  </td>
                </tr>
              )}
              {!fetching &&
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-b-0 max-sm:text-xs"
                  >
                    <td className="p-3 capitalize max-sm:p-2">{user.name}</td>
                    <td className="p-3 capitalize max-sm:p-2">{user.role}</td>
                    <td className="p-3 capitalize max-sm:p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openModal(null, user)}
                      >
                        Apply
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full text-sm max-sm:text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Employee
                </th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Type
                </th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  From
                </th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">To</th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Status
                </th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Reason
                </th>
                <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {fetching && fetchType == "getLeaves" && (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-gray-400">
                    <Loading full={false} />
                  </td>
                </tr>
              )}
              {!fetching && records.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-gray-400">
                    No leave records found
                  </td>
                </tr>
              )}
              {!fetching &&
                records.map((leave) => {
                  const status = getLeaveStatus(leave.from_date, leave.to_date);
                  return (
                    <tr
                      key={leave.id}
                      className="border-b last:border-b-0 max-sm:text-xs"
                    >
                      <td className="p-3 max-sm:p-2">
                        {leave.user?.name || "-"}
                      </td>
                      <td className="p-3 capitalize max-sm:p-2">
                        {leave.leave_type}
                      </td>
                      <td className="p-3 max-sm:p-2">
                        {new Date(leave.from_date).toDateString()}
                      </td>
                      <td className="p-3 max-sm:p-2">
                        {new Date(leave.to_date).toDateString()}
                      </td>
                      <td className="p-3 max-sm:p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold max-sm:text-[10px] ${getStatusColor(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-3 max-sm:p-2">{leave.reason}</td>
                      <td className="p-3 flex gap-2 max-sm:p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(leave, leave.user)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setLeaveToDelete(leave.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      {!fetching && totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          {[...Array(totalPages)].map((_, idx) => (
            <Button
              key={idx + 1}
              size="sm"
              variant={page === idx + 1 ? "default" : "outline"}
              onClick={() => setPage(idx + 1)}
            >
              {idx + 1}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editRecord ? "Edit Leave" : "Apply Leave"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-name">Employee</Label>
              <Input
                id="employee-name"
                value={form.name}
                disabled
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-type-select">Leave Type</Label>
              <Select
                value={form.leave_type}
                onValueChange={(v) => handleFormChange("leave_type", v)}
                required
              >
                <SelectTrigger id="leave-type-select" className="w-full">
                  <SelectValue placeholder="Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={form.from_date}
                onChange={(e) => handleFormChange("from_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={form.to_date}
                onChange={(e) => handleFormChange("to_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <textarea
                id="reason"
                placeholder="Reason (optional)"
                value={form.reason}
                onChange={(e) => handleFormChange("reason", e.target.value)}
                className="w-full border rounded px-3 py-2 min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={
                  fetching &&
                  (fetchType == "createLeave" || fetchType == "editLeave")
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={
                  fetching &&
                  (fetchType == "createLeave" || fetchType == "editLeave")
                }
                disabled={
                  fetching &&
                  (fetchType == "createLeave" || fetchType == "editLeave")
                }
              >
                {editRecord ? "Update" : "Apply"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!leaveToDelete}
        onOpenChange={() => setLeaveToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              leave application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={fetching && fetchType == "deleteLeave"}
              variant="outline"
              onClick={() => {
                setLeaveToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (leaveToDelete) {
                  handleDelete(leaveToDelete);
                }
              }}
              loading={fetching && fetchType == "deleteLeave"}
              disabled={fetching && fetchType == "deleteLeave"}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveManagement;
