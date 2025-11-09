import React from 'react';

interface LoadingOverlayProps {
  title?: string;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({ 
  title = "Loading...", 
  message = "Please wait a moment",
  fullScreen = false 
}: LoadingOverlayProps) {
  // Always use overlay style with blur effect - works over any content
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}