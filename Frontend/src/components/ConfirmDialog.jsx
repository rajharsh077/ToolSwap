import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

const ConfirmDialog = ({ isOpen, title, message, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false, onConfirm, onCancel, isLoading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 transform transition-all">
        {/* Icon */}
        <div className={`flex justify-center mb-4 ${isDangerous ? "text-red-500" : "text-sky-500"}`}>
          {isDangerous && <ExclamationTriangleIcon className="h-12 w-12" />}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-center text-slate-600 mb-8">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-lg border-2 border-slate-300 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-white transition-colors disabled:opacity-50 ${
              isDangerous
                ? "bg-red-500 hover:bg-red-600"
                : "bg-sky-500 hover:bg-sky-600"
            }`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
