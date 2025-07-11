import React from "react";

interface LoadingProps {
  message?: string;
  full?: boolean;
}

const Loading = ({ message = "Loading...", full = true }: LoadingProps) => {
  if (full) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-white/80">
        <div className="flex flex-col items-center">
          <span className="inline-block w-12 h-12 mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-blue-700 text-lg font-medium mt-2">
            {message}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start justify-start w-full">
      <span className="inline-block w-12 h-12 mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      <span className="text-blue-700 text-lg font-medium mt-2">{message}</span>
    </div>
  );
};

export default Loading;
