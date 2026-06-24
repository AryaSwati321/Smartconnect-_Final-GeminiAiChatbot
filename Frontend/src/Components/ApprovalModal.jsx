import React from "react";

export default function ApprovalModal({ isOpen, onClose, onContact, approvalStatus }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 space-y-6 animate-in fade-in zoom-in">
        {/* Animated Warning Icon */}
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-amber-100 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center text-3xl">⏳</div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            Awaiting Admin Approval
          </h2>
          <p className="text-sm text-slate-600">
            Your vendor account is pending verification
          </p>
        </div>

        {/* Status */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-600 font-semibold">Status:</span>
            <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-semibold">
              {approvalStatus || "Pending"}
            </span>
          </div>
          <p className="text-sm text-amber-800">
            This feature will be available once your account is verified by our admin team.
          </p>
        </div>

        {/* Information Box */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">What You Can Do:</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
              <span>Update your vendor profile and business details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
              <span>Upload certifications and business documents</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 font-bold mt-0.5">✗</span>
              <span>Accept or manage service bookings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400 font-bold mt-0.5">✗</span>
              <span>Set your working availability</span>
            </li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">
            Questions about your verification status?
          </p>
          <div className="bg-white rounded p-3">
            <a
              href="mailto:ADMIN.SMARTCONNECT@GMAIL.COM"
              className="text-blue-600 font-semibold hover:underline break-all"
            >
              ADMIN.SMARTCONNECT@GMAIL.COM
            </a>
          </div>
          <p className="text-xs text-slate-600">
            Our admin team reviews vendor applications within 24-48 hours. You'll be notified once approved.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onContact}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Contact Admin
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Tip */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200">
          💡 Keep refreshing your dashboard - approval updates in real-time!
        </div>
      </div>
    </div>
  );
}
