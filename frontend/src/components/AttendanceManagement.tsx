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
import { ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const mockUsers = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];
const mockAttendance = [
  {
    id: 1,
    user_id: 1,
    user_name: "Alice",
    date: "2024-06-01",
    status: "present",
    note: "",
  },
  {
    id: 2,
    user_id: 2,
    user_name: "Bob",
    date: "2024-06-01",
    status: "absent",
    note: "Sick",
  },
];
const statusOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half-day", label: "Half Day" },
  { value: "leave", label: "Leave" },
];

function getDayString(date) {
  return date.toISOString().slice(0, 10);
}
function addDay(date, diff) {
  const d = new Date(date);
  d.setDate(d.getDate() + diff);
  return d;
}

const AttendanceManagement = () => {
  const [records, setRecords] = useState(mockAttendance);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedDay, setSelectedDay] = useState(getDayString(new Date()));
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    date: selectedDay,
    status: "present",
    note: "",
  });

  // Find attendance record for a user for the selected day
  const getAttendanceForUser = (userId) =>
    records.find((r) => r.user_id === userId && r.date === selectedDay);

  const openModal = (user = null, record = null) => {
    setEditRecord(record);
    setForm(
      record
        ? {
            user_id: record.user_id,
            date: record.date,
            status: record.status,
            note: record.note,
          }
        : {
            user_id: user.id,
            date: selectedDay,
            status: "present",
            note: "",
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
    if (!form.user_id || !form.date || !form.status) {
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
      toast.success("Attendance updated");
    } else {
      setRecords((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          ...form,
          user_id: user_id_num,
          user_name: mockUsers.find((u) => u.id === user_id_num)?.name,
        },
      ]);
      toast.success("Attendance marked");
    }
    closeModal();
  };

  // Day navigation
  const handleDayChange = (diff) => {
    const newDate = addDay(new Date(selectedDay), diff);
    setSelectedDay(getDayString(newDate));
  };

  // Filtered users by search
  const filteredUsers = mockUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDayChange(-1)}
          >
            <ChevronLeft />
          </Button>
          <span className="font-semibold text-lg">
            {new Date(selectedDay).toLocaleDateString("default", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDayChange(1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <Input
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
      </div>
      <div className="overflow-x-auto rounded-lg shadow bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Note</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-400">
                  No employees found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const attendance = getAttendanceForUser(user.id);
                return (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3 capitalize">
                      {attendance ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">
                          {attendance.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">
                          Unmarked
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {attendance ? attendance.note : "-"}
                    </td>
                    <td className="p-3 flex gap-2">
                      {attendance ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(user, attendance)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(user, null)}
                        >
                          Mark
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
              {editRecord ? "Edit Attendance" : "Mark Attendance"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              value={mockUsers.find((u) => u.id == form.user_id)?.name || ""}
              disabled
              className="w-full"
            />
            <Input
              type="date"
              value={form.date}
              onChange={(e) => handleFormChange("date", e.target.value)}
              required
            />
            <Select
              value={form.status}
              onValueChange={(v) => handleFormChange("status", v)}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Note (optional)"
              value={form.note}
              onChange={(e) => handleFormChange("note", e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">{editRecord ? "Update" : "Mark"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceManagement;
