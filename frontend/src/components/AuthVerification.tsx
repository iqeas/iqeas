/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, PropsWithChildren } from "react";
import { useAPICall } from "@/hooks/useApiCall";
import { Button } from "./ui/button";
import { API_ENDPOINT } from "@/config/backend";
import Loading from "./atomic/Loading";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AuthVerification: React.FC<PropsWithChildren> = ({ children }) => {
  const { makeApiCall, fetching, isFetched } = useAPICall();
  const { login, setIsCheckedUser, isCheckedUser } = useAuth();
  const pathname = window.location.pathname;
  const handleVerify = async () => {
    setIsCheckedUser(false);
    const authToken = localStorage.getItem("auth_token");
    const response = await makeApiCall(
      "GET",
      API_ENDPOINT.VERIFY_USER,
      {},
      "application/json",
      authToken,
      "verifying"
    );
    console.log(response);
    if (response.status == 200) {
      console.log(response);
      login(response.data, authToken);
    }
    setIsCheckedUser(true);
  };
  useEffect(() => {
    if (localStorage.getItem("auth_token") && pathname != "/create-password/") {
      handleVerify();
    } else {
      setIsCheckedUser(true);
    }
  }, []);
  if (!isCheckedUser) {
    return <Loading full />;
  }
  return children;
};

export default AuthVerification;
