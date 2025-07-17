import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useAPICall } from "@/hooks/useApiCall";
import { API_ENDPOINT } from "@/config/backend";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const roleToPath: Record<string, string> = {
  pm: "/pm",
  rfc: "/rfq",
  estimation: "/estimation",
  working: "/worker",
  documentation: "/documentation",
  Admin: "/admin",
};

const Login = () => {
  const { login, user } = useAuth();
  console.log(user);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const { makeApiCall, fetching, fetchType } = useAPICall();
  useEffect(() => {
    console.log(user);
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      toast.error("Please enter both Email and Password.");
      return;
    }
    const response = await makeApiCall(
      "post",
      API_ENDPOINT.LOGIN,
      {
        email,
        password,
      },
      "application/json",
      undefined,
      "login"
    );
    console.log(response);
    if (response.status == 200) {
      console.log(response.data, response.data);
      login(response.data.user, response.data.token);
      navigate("/");
    } else {
      toast.error("Credentials invalid, try again");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const response = await makeApiCall(
        "post",
        API_ENDPOINT.FORGOT_PASSWORD,
        { email },
        "application/json",
        undefined,
        "forgotPassword"
      );

      if (response.status === 200 || response.status === 201) {
        toast.success("Password reset link has been sent to your email");
      } else {
        toast.error("Failed to sent email, please try again");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };
  if (user) {
    return null;
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
          Sign In
        </h2>
        <p className="text-slate-500 mb-6 text-center">
          Welcome back! Please login to your account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <UserIcon size={18} />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                disabled={fetching}
                placeholder="Enter your Email"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={fetching}
                placeholder="Enter your password"
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
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-60"
            disabled={fetching}
            loading={fetching && fetchType == "login"}
          >
            Sign In
          </Button>
        </form>

        {/* Forgot Password Section */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotPasswordLoading}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Forgot Password?
            </button>
            {fetching && fetchType == "forgotPassword" && (
              <Loader2 size={16} className="animate-spin text-blue-600" />
            )}
          </div>
        </div>
        <div className="mt-6 text-center text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} Oil Engineering ERP
        </div>
      </div>
    </div>
  );
};

export default Login;
