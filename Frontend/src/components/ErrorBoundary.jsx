import React from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const ErrorBoundary = () => {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "Please refresh the page or return to the home screen.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || "The requested page could not be loaded.";
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ExclamationTriangleIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#1E3A8A] px-4 py-2 font-semibold text-white hover:bg-[#15275a]"
          >
            Reload page
          </button>
          <Link
            to="/"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
