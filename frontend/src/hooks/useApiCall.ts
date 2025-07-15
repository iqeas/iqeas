/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback } from "react"; // <--- Import useCallback
import axios from "axios";
import toast from "react-hot-toast";

interface ApiRequest {
  type: string;
  endpoint: string;
  data?: any;
  dataType?: "application/json" | "application/form-data";
  token?: string;
}
interface ApiResponse {
  data?: any;
  status: number;
  detail?: string;
}

export const useAPICall = () => {
  const [fetching, setIsFetching] = useState(false);
  const [fetchType, setFetchType] = useState<string>("");
  const [isFetched, setIsFetched] = useState(false);

  // Wrap makeApiCall in useCallback
  const makeApiCall = useCallback(
    async (
      method: string,
      endpoint: string,
      data?: any,
      dataType?: "application/json" | "application/form-data",
      token?: string,
      callType?: string // Renamed to avoid conflict with internal state
    ): Promise<ApiResponse> => {
      let header = {};
      if (token) {
        header = {
          Authorization: `Bearer ${token}`,
          "Content-Type": dataType || "application/json",
        };
      } else {
        header = {
          "Content-Type": dataType || "application/json",
        };
      }

      let responseData: ApiResponse;
      setIsFetching(true); // <--- These state setters are stable, so no issue here
      setFetchType(callType || ""); // Use the passed callType

      try {
        const response = await axios({
          method: method,
          data: data,
          headers: header,
          url: method.toLowerCase() === "get" ? `${endpoint}` : endpoint,
        });

        const responseJson = response.data;
        responseData = {
          status: responseJson.status_code,
          data: responseJson.data,
          detail: responseJson.detail,
        };
      } catch (error) {
        console.log(error);
        if (axios.isAxiosError(error) && error.response) {
          console.error("Error message: ", error.message);
          responseData = {
            status: error.response.status,
            data: undefined,
            detail: error.response.data.detail,
          };
        } else {
          responseData = {
            status: 500,
            data: undefined,
            detail: "An unexpected error occurred",
          };
        }
      } finally {
        // <--- Use finally to ensure state is reset
        setIsFetching(false);
        setFetchType("");
        setIsFetched(true); // <--- Keep this here to indicate the fetch attempt finished
      }

      // If you want to show toasts, enable them here
      // if (responseData.status === 500) {
      //   toast.error("An unexpected error occurred, Please try again later");
      //   console.log(responseData.detail);
      // }
      // if (responseData.status === 401) {
      //   toast.error("Unauthorized, Please login again"); // You uncommented this
      //   console.log(responseData.detail);
      // }
      // if (responseData.status === 403) {
      //   toast.error(
      //     "Forbidden, You don't have permission to access this resource"
      //   );
      //   console.log(responseData.detail);
      // }

      return responseData;
    },
    [] // <--- EMPTY DEPENDENCY ARRAY IS CRUCIAL HERE
  );

  return {
    makeApiCall,
    fetching,
    fetchType,
    isFetched,
  };
};
