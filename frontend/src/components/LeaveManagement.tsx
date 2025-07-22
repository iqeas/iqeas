import React, { useState } from "react";
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

const mockUsers = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];
const mockLeaves = [
  {
    id: 1,
    user_id: 1,
    user_name: "Alice",
    leave_type: "casual",
    from_date: "2024-06-10",
    to_date: "2024-06-12",
    reason: "Family event",
    status: "pending",
  },
  {
    id: 2,
    user_id: 2,
    user_name: "Bob",
    leave_type: "sick",
    from_date: "2024-06-05",
    to_date: "2024-06-06",
    reason: "Fever",
    status: "approved",
  },
];
const leaveTypes = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "earned", label: "Earned" },
  { value: "unpaid", label: "Unpaid" },
];
const statusColors = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
};

function isTodayInRange(from, to) {
  const today = new Date().toISOString().slice(0, 10);
  return from <= today && today <= to;
}

const LeaveManagement = () => {
  const [records, setRecords] = useState(mockLeaves);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [userFilter, setUserFilter] = useState("all"); // all, on-leave, not-on-leave
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    leave_type: "casual",
    from_date: "",
    to_date: "",
    reason: "",
  });

  // Find current leave for a user (today in range)
  const getCurrentLeaveForUser = (userId) =>
    records.find(
      (r) =>
        r.user_id === userId &&
        isTodayInRange(r.from_date, r.to_date) &&
        r.status === "approved"
    );

  const openModal = (record = null, user = null) => {
    setEditRecord(record);
    setForm(
      record
        ? {
            user_id: record.user_id,
            leave_type: record.leave_type,
            from_date: record.from_date,
            to_date: record.to_date,
            reason: record.reason,
          }
        : {
            user_id: user ? user.id : "",
            leave_type: "casual",
            from_date: "",
            to_date: "",
            reason: "",
          }
    );
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditRecord(null);
  };
  const handleFormChange = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.user_id || !form.leave_type || !form.from_date || !form.to_date) {
      toast.error("Please fill all required fields");
      return;
    }
    const user_id_num =
      typeof form.user_id === "number"
        ? form.user_id
        : parseInt(form.user_id, 10);
    if (editRecord) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editRecord.id
            ? {
                ...r,
                ...form,
                user_id: user_id_num,
                user_name: mockUsers.find((u) => u.id === user_id_num)?.name,
              }
            : r
        )
      );
      toast.success("Leave updated");
    } else {
      setRecords((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          ...form,
          user_id: user_id_num,
          user_name: mockUsers.find((u) => u.id === user_id_num)?.name,
          status: "pending",
        },
      ]);
      toast.success("Leave applied");
    }
    closeModal();
  };
  const handleDelete = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast.success("Leave deleted");
  };
  const handleStatusChange = (id, status) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Leave ${status}`);
  };

  // Filtered users by search and leave status
  let filteredUsers = mockUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );
  if (userFilter === "on-leave") {
    filteredUsers = filteredUsers.filter((u) => getCurrentLeaveForUser(u.id));
  } else if (userFilter === "not-on-leave") {
    filteredUsers = filteredUsers.filter((u) => !getCurrentLeaveForUser(u.id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
              <SelectItem value="not-on-leave">Not on Leave</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
        </div>
        <Button onClick={() => openModal(null, null)}>Apply Leave</Button>
      </div>
      <div className="overflow-x-auto rounded-lg shadow bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left">Current Leave</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">From</th>
              <th className="p-3 text-left">To</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-4 text-gray-400">
                  No employees found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const leave = getCurrentLeaveForUser(user.id);
                return (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">
                      {leave ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">
                          On Leave
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
                          -
                        </span>
                      )}
                    </td>
                    <td className="p-3 capitalize">
                      {leave ? leave.leave_type : "-"}
                    </td>
                    <td className="p-3">{leave ? leave.from_date : "-"}</td>
                    <td className="p-3">{leave ? leave.to_date : "-"}</td>
                    <td className="p-3">
                      {leave ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            statusColors[leave.status]
                          }`}
                        >
                          {leave.status}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">{leave ? leave.reason : "-"}</td>
                    <td className="p-3 flex gap-2">
                      {leave ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModal(leave, user)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(leave.id)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(null, user)}
                        >
                          Apply
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Modal for create/edit */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editRecord ? "Edit Leave" : "Apply Leave"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              value={form.user_id.toString()}
              onValueChange={(v) => handleFormChange("user_id", v)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.leave_type}
              onValueChange={(v) => handleFormChange("leave_type", v)}
              required
            >
              <SelectTrigger className="w-full">
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
            <Input
              type="date"
              value={form.from_date}
              onChange={(e) => handleFormChange("from_date", e.target.value)}
              required
            />
            <Input
              type="date"
              value={form.to_date}
              onChange={(e) => handleFormChange("to_date", e.target.value)}
              required
            />
            {/* Reason field: use textarea instead of Input with 'as' prop */}
            <textarea
              placeholder="Reason (optional)"
              value={form.reason}
              onChange={(e) => handleFormChange("reason", e.target.value)}
              className="w-full border rounded px-3 py-2 min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">{editRecord ? "Update" : "Apply"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagement;
