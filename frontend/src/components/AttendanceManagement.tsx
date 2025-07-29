/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import Loading from "./atomic/Loading";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedDay, setSelectedDay] = useState(getDayString(new Date()));
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { makeApiCall, fetching, isFetched, fetchType } = useAPICall();
  const { authToken } = useAuth();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    user_id: "",
    date: selectedDay,
    status: "present",
    note: "",
  });
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 40;
  useEffect(() => {
    const getUsers = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ATTENDANCE_RECORDS(
          selectedDay,
          page,
          pageSize,
          search
        ),
        {},
        "application/json",
        authToken,
        "fetchRecords"
      );
      if (response.status === 200) {
        setTotalPages(response.data.total_pages);
        setRecords(response.data.users || []);
      } else {
        toast.error("Failed to fetch attendances");
      }
    };

    getUsers();
  }, [query, page, selectedDay]);

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
    setForm({
      date: selectedDay,
      note: "",
      status: "present",
      user_id: null,
    });
  };
  const handleFormChange = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.date || !form.status) {
      toast.error("Please fill all required fields");
      return;
    }
    if (editRecord) {
      const response = await makeApiCall(
        "patch",
        API_ENDPOINT.ACTION_ATTENDANCE_RECORDS(editRecord.id),
        { ...form },
        "application/json",
        authToken,
        `editAttendance`
      );
      if (response.status == 200) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === editRecord.id
              ? {
                  ...r,
                  attendance: response.data,
                }
              : r
          )
        );
        toast.success("Attendance updated");
      } else {
        toast.error("Failed to mark attendance");
      }
    } else {
      const response = await makeApiCall(
        "post",
        API_ENDPOINT.ATTENDANCE_RECORDS,
        { ...form },
        "application/json",
        authToken,
        `createAttendance`
      );
      if (response.status == 200) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === form.user_id
              ? {
                  ...r,
                  attendance: response.data,
                }
              : r
          )
        );
        toast.success("Attendance marked");
      } else {
        toast.error("Failed to mark attendance");
      }
    }
    closeModal();
  };

  // Day navigation
  const handleDayChange = (diff) => {
    const newDate = addDay(new Date(selectedDay), diff);
    setPage(1);
    setSelectedDay(getDayString(newDate));
  };

  if (!isFetched) {
    return <Loading full />;
  }
  return (
    <div className="p-6 mx-auto">
      <div className="flex items-center justify-start mb-6">
        <h2 className="text-2xl font-bold max-sm:text-lg">
          Attendance Management
        </h2>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDayChange(-1)}
            disabled={fetching}
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
            disabled={fetching}
          >
            <ChevronRight />
          </Button>
        </div>
        <Input
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            console.log(e.key);
            if (e.key == "Enter") {
              setPage(1);
              setQuery(search);
            }
          }}
          className="w-48"
        />
      </div>
      <div className="overflow-x-auto rounded-lg shadow bg-white">
        <table className="min-w-full text-sm max-sm:text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Employee
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Status
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">Note</th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {fetching && fetchType == "fetchRecords" && (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-400">
                  <Loading full={false} />
                </td>
              </tr>
            )}
            {records.length === 0 && !fetching && (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-400">
                  No employees found
                </td>
              </tr>
            )}
            {!fetching &&
              records &&
              records.map((record) => {
                const attendance = record.attendance;
                return (
                  <tr
                    key={record.id}
                    className="border-b last:border-b-0 max-sm:text-xs"
                  >
                    <td className="p-3 capitalize max-sm:p-2">{record.name}</td>
                    <td className="p-3 capitalize max-sm:p-2">
                      {attendance ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold max-sm:text-[10px]">
                          {attendance.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold max-sm:text-[10px]">
                          Unmarked
                        </span>
                      )}
                    </td>
                    <td className="p-3 max-sm:p-2">
                      {attendance ? attendance.note : "-"}
                    </td>
                    <td className="p-3 flex gap-2 max-sm:p-2">
                      {attendance ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(record, attendance)}
                          loading={
                            fetching &&
                            fetchType == `editAttendance${record.id}`
                          }
                          disabled={
                            fetching &&
                            fetchType == `editAttendance${record.id}`
                          }
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(record, null)}
                          loading={
                            fetching &&
                            fetchType == `createAttendance${record.id}`
                          }
                          disabled={
                            fetching &&
                            fetchType == `createAttendance${record.id}`
                          }
                        >
                          Mark
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {/* Pagination Controls */}
      </div>
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
      {/* Modal for create/edit */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader className="px-6 py-5">
            <DialogTitle
              aria-disabled={fetching && fetchType == `editAttendance`}
            >
              {editRecord ? "Edit Attendance" : "Mark Attendance"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                value={records.find((u) => u.id === form.user_id)?.name || ""}
                disabled
                className="w-full"
              />
              <Input
                type="date"
                value={form.date}
                onChange={(e) => handleFormChange("date", e.target.value)}
                required
                disabled
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={fetching && fetchType == `editAttendance`}
                >
                  Cancel
                </Button>
                <Button
                  loading={fetching && fetchType == `createAttendance`}
                  disabled={fetching && fetchType == `editAttendance`}
                  type="submit"
                >
                  {editRecord ? "Update" : "Mark"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceManagement;
