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
import { API_ENDPOINT } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import { useAPICall } from "@/hooks/useApiCall";
import Loading from "./atomic/Loading";

function getMonthString(date) {
  return date.toISOString().slice(0, 7);
}
function addMonth(date, diff) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + diff);
  return d;
}

const SalaryManagement = () => {
  const [records, setRecords] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    getMonthString(new Date())
  );
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const { makeApiCall, fetching, isFetched, fetchType } = useAPICall();
  const [page, setPage] = useState(1);
  const pageSize = 40;
  const [form, setForm] = useState({
    user_id: "",
    month: "",
    base_salary: "",
    bonus: "",
    deduction: "",
    paid_on: "",
  });
  const { authToken } = useAuth();

  useEffect(() => {
    const getUsers = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_SALARIES(selectedMonth, page, pageSize, search),
        {},
        "application/json",
        authToken,
        "fetchRecords"
      );
      if (response.status === 200) {
        setTotalPages(response.data.total_pages);
        setRecords(response.data.salaries || []);
      } else {
        toast.error("Failed to fetch salaries");
      }
    };

    getUsers();
  }, [query, page, selectedMonth]);

  const openModal = (user = null, record = null) => {
    setEditRecord(record);
    const baseSalary =
      records
        .find((r) => r.id === (record?.user_id || user?.id))
        ?.base_salary?.toString() || "0";
    console.log(user, record);
    setForm(
      record
        ? {
            user_id: user.id,
            month: record.salary_date,
            base_salary: record.base_salary.toString(),
            bonus: record.bonus.toString(),
            deduction: record.deduction.toString(),
            paid_on: new Date(record.paid_on).toISOString().slice(0, 10),
          }
        : {
            user_id: user.id,
            month: selectedMonth,
            base_salary: baseSalary,
            bonus: "0",
            deduction: "0",
            paid_on: new Date().toISOString().slice(0, 10),
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.month || !form.base_salary || !form.paid_on) {
      toast.error("Please fill all required fields.");
      return;
    }
    const data = {
      user_id: form.user_id,
      salary_date: selectedMonth,
      base_salary: form.base_salary,
      bonus: form.bonus,
      deduction: form.deduction,
      paid_on: form.paid_on,
    };
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.EDIT_CREATE_SALARY,
      data,
      "application/json",
      authToken,
      "createEditSalary"
    );
    if (response.status == 200) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === form.user_id
            ? {
                ...r,
                salary: response.data,
              }
            : r
        )
      );
      toast.success("Salary updated");
    } else {
      toast.error("Failed to make salary");
    }
    closeModal();
  };

  // Month navigation
  const handleMonthChange = (diff) => {
    const newDate = addMonth(new Date(selectedMonth + "-01"), diff);
    setPage(1);
    setSelectedMonth(getMonthString(newDate));
  };
  if (!isFetched) {
    return <Loading full />;
  }

  return (
    <div className="p-6 mx-auto">
      <div className="flex items-center justify-start mb-6">
        <h2 className="text-2xl font-bold max-sm:text-lg">Salary Management</h2>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleMonthChange(-1)}
            disabled={fetching}
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
            disabled={fetching}
          >
            <ChevronRight />
          </Button>
        </div>
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
      <div className="overflow-x-auto rounded-lg shadow bg-white">
        <table className="min-w-full text-sm max-sm:text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Employee
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Base Salary
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">Bonus</th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Deduction
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Net Salary
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Paid On
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Status
              </th>
              <th className="p-3 text-left max-sm:p-2 max-sm:text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {fetching && fetchType == "fetchRecords" && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center p-4 text-gray-400 max-sm:p-2 max-sm:text-xs"
                >
                  <Loading full={false} />
                </td>
              </tr>
            )}
            {!fetching && records.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center p-4 text-gray-400 max-sm:p-2 max-sm:text-xs"
                >
                  No employees found
                </td>
              </tr>
            )}
            {!fetching &&
              records.map((user) => {
                const salary = user.salary;
                return (
                  <tr
                    key={user.id}
                    className="border-b last:border-b-0 max-sm:text-xs"
                  >
                    <td className="p-3 max-sm:p-2">{user.name}</td>
                    <td className="p-3 max-sm:p-2">
                      {salary ? `₹${user.base_salary}` : "-"}
                    </td>
                    <td className="p-3 max-sm:p-2">
                      {salary ? `₹${salary.bonus}` : "-"}
                    </td>
                    <td className="p-3 max-sm:p-2">
                      {salary ? `₹${salary.deduction}` : "-"}
                    </td>
                    <td className="p-3 font-bold max-sm:p-2">
                      {salary ? `₹${salary.net_salary}` : "-"}
                    </td>
                    <td className="p-3 max-sm:p-2">
                      {salary
                        ? new Date(salary.paid_on).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-3 max-sm:p-2">
                      {salary ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold max-sm:text-[10px]">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold max-sm:text-[10px]">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="p-3 flex gap-2 max-sm:p-2">
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
              })}
          </tbody>
        </table>
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
          <DialogHeader className="px-6 py-4">
            <DialogTitle aria-disabled={fetching}>
              {editRecord ? "Edit Salary" : "Pay Salary"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="employeeName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Employee
                </label>
                <Input
                  id="employeeName"
                  type="text"
                  value={records.find((u) => u.id == form.user_id)?.name || ""}
                  disabled
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="month"
                  className="block text-sm font-medium text-gray-700"
                >
                  Month
                </label>
                <Input
                  id="month"
                  type="month"
                  value={form.month}
                  onChange={(e) => handleFormChange("month", e.target.value)}
                  required
                  className="w-full mt-1"
                  disabled
                />
              </div>
              <div>
                <label
                  htmlFor="base_salary"
                  className="block text-sm font-medium text-gray-700"
                >
                  Base Salary
                </label>
                <Input
                  id="base_salary"
                  type="number"
                  placeholder="Base Salary"
                  value={form.base_salary}
                  onChange={(e) =>
                    handleFormChange("base_salary", e.target.value)
                  }
                  required
                  disabled
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="bonus"
                  className="block text-sm font-medium text-gray-700"
                >
                  Bonus
                </label>
                <Input
                  id="bonus"
                  type="number"
                  placeholder="Bonus"
                  value={form.bonus}
                  onChange={(e) => handleFormChange("bonus", e.target.value)}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="deduction"
                  className="block text-sm font-medium text-gray-700"
                >
                  Deduction
                </label>
                <Input
                  id="deduction"
                  type="number"
                  placeholder="Deduction"
                  value={form.deduction}
                  onChange={(e) =>
                    handleFormChange("deduction", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="paid_on"
                  className="block text-sm font-medium text-gray-700"
                >
                  Paid On
                </label>
                <Input
                  id="paid_on"
                  type="date"
                  value={form.paid_on}
                  onChange={(e) => handleFormChange("paid_on", e.target.value)}
                  required
                  className="w-full mt-1"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={fetching && fetchType == "createEditSalary"}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={fetching && fetchType == "createEditSalary"}
                  loading={fetching && fetchType == "createEditSalary"}
                >
                  {editRecord ? "Update" : "Pay"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryManagement;
