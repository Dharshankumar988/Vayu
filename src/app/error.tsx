"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Client Error Caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070715] text-white p-10 font-mono">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Client Render Error Caught</h2>
      <div className="bg-black/50 p-6 rounded border border-red-500/30 max-w-4xl w-full">
        <p className="text-xl mb-4 font-semibold">{error.message}</p>
        <pre className="text-sm text-gray-400 overflow-x-auto p-4 bg-black/80 rounded">
          {error.stack}
        </pre>
      </div>
      <button
        className="mt-8 px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 transition"
        onClick={() => reset()}
      >
        Try Again
      </button>
    </div>
  );
}
