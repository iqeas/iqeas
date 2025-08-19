/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAPICall } from "@/hooks/useApiCall";
import { useAuth } from "@/contexts/AuthContext";
import { API_ENDPOINT } from "@/config/backend";
import Loading from "./atomic/Loading";
import { ITeam, IUser } from "@/types/apiTypes";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirmDialog } from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { isValidEmail, isValidPhoneNumber } from "@/lib/utils";

const ROLES = [
  { value: "rfq", label: "RFQ" },
  { value: "working", label: "Working" },
  { value: "estimation", label: "Estimation" },
  { value: "documentation", label: "Document" },
  { value: "admin", label: "Admin" },
  { value: "pm", label: "PM" },
];

export default function AdminMembers() {
  // User state
  const { makeApiCall, fetchType, fetching, isFetched } = useAPICall();
  const { user, authToken } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    active: true,
    role: "rfq",
    base_salary: "",
  });
  const [editUserId, setEditUserId] = useState(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 40;
  // Team state
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [page, setPage] = useState(1);
  const [teamFormData, setTeamFormData] = useState({
    title: "",
    members: [],
    leader_id: "",
    active: true,
    role: "working",
  });
  const [editTeamId, setEditTeamId] = useState(null);
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const confirmDialog = useConfirmDialog();
  // Modal state
  const [userModal, setUserModal] = useState({
    open: false,
    edit: false,
    user: null,
  });
  const [teamModal, setTeamModal] = useState({
    open: false,
    edit: false,
    team: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      const response = await makeApiCall(
        "get",
        API_ENDPOINT.GET_ALL_USERS(search, page, pageSize),
        {},
        "application/json",
        authToken,
        "getUser"
      );
      console.log(response.data);
      if (response.status == 200) {
        setUsers(response.data.users);
        setTotalPages(response.data.total_pages);
      } else {
        toast.error("Failed to fetch users");
      }
    };
    fetchData();
  }, [page, search]);
  // Add user
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (
      !userFormData.name ||
      !userFormData.email ||
      !userFormData.phone ||
      !userFormData.role ||
      !userFormData.base_salary
    ) {
      toast.error("fill all the field");
      return;
    }
    if (!isValidEmail(userFormData.email)) {
      toast.error("Please enter valid email.");
      return;
    }
    if (!isValidPhoneNumber(userFormData.phone)) {
      toast.error("Phone number must be 10  ");
      return;
    }
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.ADD_NEW_USER,
      {
        ...userFormData,
        base_salary: parseFloat(userFormData.base_salary) || 0,
        phone: userFormData.phone,
      },
      "application/json",
      authToken,
      "addUser"
    );
    if (response.status == 201) {
      setUsers([response.data, ...users]);
      toast.success(response.detail);
      setUserModal({ ...userModal, open: false });
    } else {
      toast.error(response.detail);
    }
  };
  // Toggle user active
  const handleToggleActive = async (id) => {
    const currentStatus = users.find((item) => item.id == id);
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_USER(id),
      { active: !currentStatus.active },
      "application/json",
      authToken,
      "userToggle"
    );
    if (response.status == 200) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
      );
      toast.success(response.detail);
    } else {
      toast.error(response.detail);
    }
  };
  // Add team
  const handleAddTeam = async (e) => {
    e.preventDefault();

    if (
      !teamFormData.title ||
      !teamFormData.leader_id ||
      teamFormData.members.length === 0
    ) {
      toast.error("Fill all the required field");
      return;
    }
    const data = {
      title: teamFormData.title,
      leader_id: parseInt(teamFormData.leader_id),
      users: JSON.stringify(teamFormData.members.map((id) => parseInt(id))),
      active: teamFormData.active,
      role: teamFormData.role,
    };

    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_TEAMS,
      data,
      "application/json",
      authToken,
      "createTeam"
    );
    if (response.status == 201) {
      setTeams((prev) => [response.data, ...prev]);
      toast.success(response.detail);
    } else {
      toast.error("Failed to create team");
    }
    setTeamModal({ ...teamModal, open: false });
    setEditTeamId(null);
    // TODO: API call for adding team
  };
  // Edit user (if implemented separately)
  const handleEditUser = async (e) => {
    e.preventDefault();
    if (
      !userFormData.name ||
      !userFormData.email ||
      !userFormData.phone ||
      !userFormData.role ||
      !userFormData.base_salary
    ) {
      toast.error("fill all the field");
      return;
    }
    const data = {
      id: editUserId,
      name: userFormData.name,
      email: userFormData.email,
      phone: userFormData.phone,
      role: userFormData.role,
      active: userFormData.active,
      base_salary: parseFloat(userFormData.base_salary) || 0,
    };
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_USER(editUserId),
      data,
      "application/json",
      authToken,
      "editUser"
    );
    if (response.status == 200) {
      setUsers((prev) =>
        prev.map((item) => {
          if (item.id == editUserId) {
            return response.data;
          }
          return item;
        })
      );
      toast.success(response.detail);
    } else {
      toast.error("Failed to edit user");
    }
    setEditUserId(null);
    setUserModal({ ...userModal, open: false });

    // if(response.status==200)
    // TODO: API call for editing user
  };
  const handleEditTeam = async (e) => {
    e.preventDefault();
    if (
      !teamFormData.title ||
      !teamFormData.leader_id ||
      teamFormData.members.length === 0
    ) {
      toast.error("Fill all the required field");
      return;
    }
    const data = {
      title: teamFormData.title,
      leader_id: parseInt(teamFormData.leader_id),
      users: JSON.stringify(teamFormData.members.map((id) => parseInt(id))),
      active: teamFormData.active,
      role: teamFormData.role,
    };
    const response = await makeApiCall(
      "patch",
      API_ENDPOINT.EDIT_TEAMS(editTeamId),
      data,
      "application/json",
      authToken,
      "editUser"
    );
    if (response.status == 200) {
      setTeams((prev) =>
        prev.map((item) => {
          if (item.id == editTeamId) {
            return response.data;
          }
          return item;
        })
      );
      toast.success(response.detail);
    } else {
      toast.error("Failed to edit user");
    }
    setTeamModal({ ...teamModal, open: false });
    setEditTeamId(null);

    // if(response.status==200)
    // TODO: API call for editing user
  };
  // Add/Edit user
  const openUserModal = (user = null) => {
    setUserModal({ open: true, edit: !!user, user });
    setEditUserId(user ? user.id : null);
    setUserFormData(
      user
        ? {
            name: user.name,
            email: user.email,
            phone: user.phone,
            active: user.active,
            role: user.role,
            base_salary: user.base_salary || "",
          }
        : {
            name: "",
            email: "",
            phone: "",
            active: true,
            role: "rfq",
            base_salary: "",
          }
    );
  };

  // Delete user
  const handleDeleteUser = async (user: any) => {
    const confirmed = await confirmDialog({
      title: "Delete User",
      description: `Are you sure you want to delete ${user.name}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      loading: fetching && fetchType === "deleteUser",
    });
    if (confirmed) {
      const response = await makeApiCall(
        "patch",
        API_ENDPOINT.EDIT_USER(user.id),
        { is_deleted: true },
        "application/json",
        authToken,
        "deleteUser"
      );
      if (response.status == 200) {
        setUsers((prev) => prev.filter((item) => item.id !== user.id));
        toast.success(response.detail);
      } else {
        toast.error("Failed to delete user");
      }
      setEditUserId(null);
      setUserModal({ ...userModal, open: false });
    }
  };

  if (!isFetched) {
    return <Loading full />;
  }
  return (
    <div className="p-8 ">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Employees Management</h2>
        <Button onClick={() => openUserModal()}>
          <Plus className="mr-2" />
          Add User
        </Button>
      </div>
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex w-full sm:w-80 items-center gap-2">
          <Input
            className="w-full border rounded-md px-3 py-2"
            placeholder="Search by Project Name, Project ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(query);
                setPage(1);
              }
            }}
          />
          <button
            className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium"
            onClick={() => {
              setSearch(query);
              setPage(1);
            }}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      <Dialog
        open={userModal.open}
        onOpenChange={(open) => setUserModal((m) => ({ ...m, open }))}
      >
        <DialogContent>
          <DialogHeader className="px-6 py-5">
            <DialogTitle>
              {userModal.edit ? "Edit User" : "Add User"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <form
              className="flex flex-col space-y-7"
              onSubmit={userModal.edit ? handleEditUser : handleAddUser}
            >
              <div className="md:col-span-1">
                <Input
                  placeholder="Name"
                  value={userFormData.name}
                  onChange={(e) =>
                    setUserFormData((u) => ({ ...u, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  placeholder="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) =>
                    setUserFormData((u) => ({ ...u, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  placeholder="Phone"
                  type="number"
                  value={userFormData.phone}
                  onChange={(e) =>
                    setUserFormData((u) => ({
                      ...u,
                      phone: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  placeholder="Base Salary"
                  type="number"
                  min={0}
                  value={userFormData.base_salary}
                  onChange={(e) =>
                    setUserFormData((u) => ({
                      ...u,
                      base_salary: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="md:col-span-1 flex items-center gap-2">
                <span className="text-xs">Active</span>
                <Switch
                  checked={userFormData.active}
                  onCheckedChange={(v) =>
                    setUserFormData((u) => ({ ...u, active: v }))
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Select
                  value={userFormData.role}
                  onValueChange={(value) =>
                    setUserFormData((u) => ({ ...u, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Button
                  type="submit"
                  className="w-full"
                  loading={
                    fetching &&
                    (fetchType == "addUser" || fetchType == "editUser")
                  }
                  disabled={
                    fetching &&
                    (fetchType == "addUser" || fetchType == "editUser")
                  }
                >
                  {userModal.edit ? "Save Changes" : "Add User"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mb-10">
        <h3 className="font-semibold mb-2">Users</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-xl ">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-sm">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Phone</th>
                <th className="p-2 text-left">Base Salary</th>
                <th className="p-2 text-center">Active</th>
                <th className="p-2 text-center">Role</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching && fetchType == "getUser" && (
                <tr className="border-b last:border-0">
                  <td colSpan={7} className="p-2">
                    <Loading full={false} />
                  </td>
                </tr>
              )}
              {!(fetching && fetchType == "getUser") &&
                users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-2">{u.name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.phone}</td>
                    <td className="p-2">{u.base_salary}</td>
                    <td className="p-2 text-center">
                      <Switch
                        checked={u.active}
                        onCheckedChange={() => handleToggleActive(u.id)}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Badge>
                        {ROLES.find((r) => r.value === u.role)?.label || u.role}
                      </Badge>
                    </td>
                    <td className="p-2 text-center flex items-center justify-center gap-2">
                      <button
                        className="text-blue-600 hover:bg-blue-50 rounded p-1"
                        title="Edit User"
                        onClick={() => openUserModal(u)}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        className="text-red-600 hover:bg-red-50 rounded p-1"
                        title="Delete User"
                        onClick={() => handleDeleteUser(u)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && !fetching && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <PaginationItem key={idx}>
                  <PaginationLink
                    isActive={page === idx + 1}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(idx + 1);
                    }}
                  >
                    {idx + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog
        open={teamModal.open}
        onOpenChange={(open) => setTeamModal((m) => ({ ...m, open }))}
      >
        <DialogContent>
          <DialogHeader className="px-6 py-4">
            <DialogTitle>
              {teamModal.edit ? "Edit Team" : "Add Team"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <form
              className="flex flex-col space-y-7"
              onSubmit={teamModal.edit ? handleEditTeam : handleAddTeam}
            >
              <div className="md:col-span-2">
                <Input
                  placeholder="Team Title"
                  value={teamFormData.title}
                  onChange={(e) =>
                    setTeamFormData((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Team Members
                </label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full border rounded px-2 py-2 text-left bg-white"
                    onClick={() => setShowMembersDropdown((v) => !v)}
                  >
                    {teamFormData.members.length === 0
                      ? "Select team members..."
                      : users
                          .filter((u) =>
                            teamFormData.members.includes(u.id.toString())
                          )
                          .map((u) => u.name)
                          .join(", ")}
                  </button>
                  {showMembersDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-y-auto">
                      {users.map((u) => {
                        const idStr = u.id.toString();
                        return (
                          <label
                            key={u.id}
                            className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={teamFormData.members.includes(idStr)}
                              onChange={() => {
                                setTeamFormData((f) => {
                                  const exists = f.members.includes(idStr);
                                  const newMembers = exists
                                    ? f.members.filter((m) => m !== idStr)
                                    : [...f.members, idStr];
                                  return {
                                    ...f,
                                    members: newMembers,
                                    leader: newMembers.includes(
                                      f.leader_id.toString()
                                    )
                                      ? f.leader_id.toString()
                                      : "",
                                  };
                                });
                              }}
                              className="mr-2"
                            />
                            {u.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Click to select multiple members
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium mb-1">
                  Team Leader
                </label>
                <Select
                  value={teamFormData.leader_id}
                  onValueChange={(value) =>
                    setTeamFormData((f) => ({ ...f, leader_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) =>
                        teamFormData.members.includes(u.id.toString())
                      )
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1 flex items-center gap-2">
                <span className="text-xs">Active</span>
                <Switch
                  checked={teamFormData.active}
                  onCheckedChange={(v) =>
                    setTeamFormData((f) => ({ ...f, active: v }))
                  }
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium mb-1">
                  Team Role
                </label>
                <Select
                  value={teamFormData.role}
                  onValueChange={(value) =>
                    setTeamFormData((f) => ({ ...f, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="working">Working</SelectItem>
                    <SelectItem value="pm">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Button
                  type="submit"
                  className="w-full"
                  loading={
                    fetching &&
                    (fetchType == "createTeam" || fetchType == "editUser")
                  }
                  disabled={
                    fetching &&
                    (fetchType == "createTeam" || fetchType == "editUser")
                  }
                >
                  {teamModal.edit ? "Save Changes" : "Add Team"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {/* <div>
        <h3 className="font-semibold mb-2">Teams</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-xl">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-sm">
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">Members</th>
                <th className="p-2 text-left">Leader</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-center">Active</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-2 font-semibold">{t.title}</td>
                  <td className="p-2">
                    {t.users.map((item) => item.name).join(", ")}
                  </td>
                  <td className="p-2">{t.leader.name}</td>
                  <td className="p-2">{t.role === "pm" ? "PM" : "Working"}</td>
                  <td className="p-2 text-center">
                    <Switch
                      checked={t.active}
                      onCheckedChange={() => handleToggleTeamActive(t.id)}
                    />
                  </td>
                  <td className="p-2 text-center flex items-center justify-center gap-2">
                    <button
                      className="text-blue-600 hover:bg-blue-50 rounded p-1"
                      title="Edit Team"
                      onClick={() => openTeamModal(t)}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="text-red-600 hover:bg-red-50 rounded p-1"
                      title="Delete Team"
                      onClick={() => handleDeleteTeam(t)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> */}
    </div>
  );
}
