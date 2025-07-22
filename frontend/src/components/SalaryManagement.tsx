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
const mockSalaries = [
  {
    id: 1,
    user_id: 1,
    user_name: "Alice",
    month: "2024-06",
    base_salary: 50000,
    bonus: 5000,
    deduction: 2000,
    net_salary: 53000,
    paid_on: "2024-06-30",
  },
  {
    id: 2,
    user_id: 2,
    user_name: "Bob",
    month: "2024-06",
    base_salary: 40000,
    bonus: 2000,
    deduction: 1000,
    net_salary: 41000,
    paid_on: "2024-06-30",
  },
];

function getMonthString(date) {
  return date.toISOString().slice(0, 7);
}
function addMonth(date, diff) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + diff);
  return d;
}

const SalaryManagement = () => {
  const [records, setRecords] = useState(mockSalaries);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    getMonthString(new Date())
  );
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    month: selectedMonth,
    base_salary: "",
    bonus: "0",
    deduction: "0",
  });

  // Find salary record for a user for the selected month
  const getSalaryForUser = (userId) =>
    records.find(
      (r) => Number(r.user_id) === Number(userId) && r.month === selectedMonth
    );

  const openModal = (user = null, record = null) => {
    setEditRecord(record);
    setForm(
      record
        ? {
            user_id: record.user_id,
            month: record.month,
            base_salary: record.base_salary.toString(),
            bonus: record.bonus.toString(),
            deduction: record.deduction.toString(),
          }
        : {
            user_id: user.id,
            month: selectedMonth,
            base_salary: "",
            bonus: "0",
            deduction: "0",
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
    if (!form.user_id || !form.month || !form.base_salary) {
      toast.error("Please fill all required fields");
      return;
    }
    const base = parseFloat(form.base_salary) || 0;
    const bonus = parseFloat(form.bonus) || 0;
    const deduction = parseFloat(form.deduction) || 0;
    const net_salary = base + bonus - deduction;
    const user_id_num =
      typeof form.user_id === "number"
        ? form.user_id
        : parseInt(form.user_id, 10);
    if (editRecord) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editRecord.id
            ? ({
                ...r,
                ...form,
                user_id: user_id_num,
                base_salary: base,
                bonus,
                deduction,
                net_salary,
              } as typeof r)
            : r
        )
      );
      toast.success("Salary updated");
    } else {
      setRecords((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          ...form,
          user_id: user_id_num,
          user_name: mockUsers.find((u) => u.id === user_id_num)?.name,
          base_salary: base,
          bonus,
          deduction,
          net_salary,
          paid_on: new Date().toISOString().slice(0, 10),
        },
      ]);
      toast.success("Salary paid");
    }
    closeModal();
  };

  // Month navigation
  const handleMonthChange = (diff) => {
    const newDate = addMonth(new Date(selectedMonth + "-01"), diff);
    setSelectedMonth(getMonthString(newDate));
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
            onClick={() => handleMonthChange(-1)}
          >
            <ChevronLeft />
          </Button>
          <span className="font-semibold text-lg">
            {new Date(selectedMonth + "-01").toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleMonthChange(1)}
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
              <th className="p-3 text-left">Base Salary</th>
              <th className="p-3 text-left">Bonus</th>
              <th className="p-3 text-left">Deduction</th>
              <th className="p-3 text-left">Net Salary</th>
              <th className="p-3 text-left">Paid On</th>
              <th className="p-3 text-left">Status</th>
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
                const salary = getSalaryForUser(user.id);
                return (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">
                      {salary ? `₹${salary.base_salary}` : "-"}
                    </td>
                    <td className="p-3">{salary ? `₹${salary.bonus}` : "-"}</td>
                    <td className="p-3">
                      {salary ? `₹${salary.deduction}` : "-"}
                    </td>
                    <td className="p-3 font-bold">
                      {salary ? `₹${salary.net_salary}` : "-"}
                    </td>
                    <td className="p-3">{salary ? salary.paid_on : "-"}</td>
                    <td className="p-3">
                      {salary ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="p-3 flex gap-2">
                      {salary ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(user, salary)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(user, null)}
                        >
                          Paid
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
              {editRecord ? "Edit Salary" : "Pay Salary"}
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
              type="month"
              value={form.month}
              onChange={(e) => handleFormChange("month", e.target.value)}
              required
            />
            <Input
              type="number"
              placeholder="Base Salary"
              value={form.base_salary}
              onChange={(e) => handleFormChange("base_salary", e.target.value)}
              required
            />
            <Input
              type="number"
              placeholder="Bonus"
              value={form.bonus}
              onChange={(e) => handleFormChange("bonus", e.target.value)}
            />
            <Input
              type="number"
              placeholder="Deduction"
              value={form.deduction}
              onChange={(e) => handleFormChange("deduction", e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">{editRecord ? "Update" : "Pay"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryManagement;
