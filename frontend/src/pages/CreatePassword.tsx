import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const CreatePassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { makeApiCall, fetching } = useAPICall();

  const refId = searchParams.get("ref_id");

  useEffect(() => {
    if (!refId) {
      toast.error("Invalid or missing reference ID");
      navigate("*");
    }
  }, [refId, navigate]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!refId) {
      toast.error("Invalid or missing reference ID");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const response = await makeApiCall(
      "post",
      API_ENDPOINT.CREATE_PASSWORD,
      {
        ref_id: refId,
        password: password,
        confirm_password: confirmPassword,
      },
      "application/json",
      undefined,
      "createPassword"
    );

    if (response.status === 200 || response.status === 201) {
      toast.success("Password created successfully!");
      navigate("/login");
    } else {
      toast.error(
        response.detail || "Failed to create password. Please try again."
      );
    }
  };

  if (!refId) {
    return null; // Will redirect to not-found
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-slate-200">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md flex flex-col items-center">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">OE</span>
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">
            Oil Engineering ERP
          </span>
        </div>
        <h2 className="text-3xl font-bold text-blue-700 mb-2 text-center">
          Create Password
        </h2>
        <p className="text-slate-500 mb-6 text-center">
          Set up your new password to access your account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              New Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  errors.password ? "border-red-500" : ""
                }`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
                autoFocus
                disabled={fetching}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-blue-600"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <div className="text-red-500 text-sm mt-1">{errors.password}</div>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Shield size={18} />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  errors.confirmPassword ? "border-red-500" : ""
                }`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
                disabled={fetching}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-blue-600"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">Password Requirements:</p>
            <ul className="text-xs space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains at least one uppercase letter</li>
              <li>• Contains at least one lowercase letter</li>
              <li>• Contains at least one number</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-60"
            disabled={fetching}
            loading={fetching}
          >
            Create Password
          </Button>
        </form>
        <div className="mt-6 text-center text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} Oil Engineering ERP
        </div>
      </div>
    </div>
  );
};

export default CreatePassword;
