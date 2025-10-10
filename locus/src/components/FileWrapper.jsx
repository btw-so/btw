import React, { useEffect } from "react";

export default function FileWrapper({ fileLoading, fileSuccess, fileError, fileUrl }) {
    if (fileLoading) {
      return (
        <div className="animate-spin">
          <i className="ri-reset-right-line"></i>
        </div>
      );
    } else if (fileError) {
      return (
        <div className="">
          <div className="p-4">
            <div className="flex items-start">
              <div className="shrink-0">
                <i className="ri-error-warning-line"></i>
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-gray-900">
                  Error loading file
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (fileSuccess) {
      const ErrorComponent = () => {
        return (
          <div>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              Download the file directly
            </a>
          </div>
        );
      };
  
      if (
        fileUrl.endsWith(".png") ||
        fileUrl.endsWith(".jpg") ||
        fileUrl.endsWith(".jpeg")
      ) {
        return <img src={fileUrl} className="w-full h-full object-contain object-top" />;
      } else if (fileUrl.endsWith(".pdf")) {
        return (
          <iframe
            src={`https://docs.google.com/gview?url=${fileUrl}&embedded=true`}
            width="100%"
            height="100%"
            frameBorder="0"
          />
        );
      } else if (
        fileUrl.endsWith(".mp4") ||
        fileUrl.endsWith(".mov") ||
        fileUrl.endsWith(".avi") ||
        fileUrl.endsWith(".wmv") ||
        fileUrl.endsWith(".flv") ||
        fileUrl.endsWith(".webm")
      ) {
        return <video src={fileUrl} controls />;
      } else if (
        fileUrl.endsWith(".mp3") ||
        fileUrl.endsWith(".wav") ||
        fileUrl.endsWith(".ogg") ||
        fileUrl.endsWith(".flac") ||
        fileUrl.endsWith(".aac")
      ) {
        return <audio src={fileUrl} controls />;
      } else {
        return <ErrorComponent />;
      }
    } else {
      return null;
    }
  }