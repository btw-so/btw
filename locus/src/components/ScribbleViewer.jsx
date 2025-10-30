import React, { useEffect, useState } from "react";
import axios from "axios";
import useCookie from "../hooks/useCookie";

const ScribbleViewer = ({ scribbleId, userId }) => {
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );

  // Generate device fingerprint (simplified version)
  const getFingerprint = () => {
    const stored = localStorage.getItem("deviceFingerprint");
    if (stored) return stored;

    const uuid = crypto.randomUUID();
    localStorage.setItem("deviceFingerprint", uuid);
    return uuid;
  };

  useEffect(() => {
    const loadScribble = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_TASKS_PUBLIC_URL}/scribbles/get`,
          {
            scribble_id: scribbleId,
            fingerprint: getFingerprint(),
          },
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Cookie: `btw_uuid=${token}`,
            },
          }
        );

        if (response.data.success && response.data.scribble) {
          const scribble = response.data.scribble;

          if (scribble.pages) {
            const pagesData = JSON.parse(scribble.pages);
            setPages(pagesData.sort((a, b) => a.page_number - b.page_number));
          }
        }
      } catch (err) {
        console.error("Error loading scribble:", err);
        setError("Failed to load scribble");
      } finally {
        setLoading(false);
      }
    };

    if (scribbleId && userId) {
      loadScribble();
    }
  }, [scribbleId, userId, token]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-500">Loading scribble...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <i className="ri-error-warning-line text-6xl text-red-300 mb-4"></i>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Failed to Load
        </h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <i className="ri-brush-line text-6xl text-gray-300 mb-4"></i>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No Pages Yet
        </h3>
        <p className="text-gray-500 max-w-md">
          Start drawing on your iPad to see pages here.
        </p>
        <p className="text-gray-400 text-sm mt-4">
          This is a read-only view. Edit scribbles on iPad with Apple Pencil.
        </p>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Image viewer area */}
      <div className="flex-grow flex items-center justify-center p-6 overflow-hidden">
        {currentPage.thumbnail ? (
          <img
            src={`data:image/png;base64,${currentPage.thumbnail}`}
            alt={`Page ${currentPage.page_number}`}
            className="max-w-full max-h-full object-contain shadow-lg rounded"
            style={{ imageRendering: "crisp-edges" }}
          />
        ) : (
          <div className="text-center">
            <i className="ri-image-line text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No preview available for this page</p>
          </div>
        )}
      </div>

      {/* Page navigation controls */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
              currentPageIndex === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Previous page"
          >
            <i className="ri-arrow-left-s-line text-2xl"></i>
          </button>

          <div className="text-sm font-medium text-gray-700">
            Page {currentPageIndex + 1} of {pages.length}
          </div>

          <button
            onClick={() =>
              setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))
            }
            disabled={currentPageIndex === pages.length - 1}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
              currentPageIndex === pages.length - 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Next page"
          >
            <i className="ri-arrow-right-s-line text-2xl"></i>
          </button>
        </div>

        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <i className="ri-eye-line"></i>
          <span>Read-only view</span>
        </div>
      </div>

      {/* Page thumbnails strip */}
      {pages.length > 1 && (
        <div className="px-6 pb-4 bg-white">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pages.map((page, index) => (
              <button
                key={page.page_number}
                onClick={() => setCurrentPageIndex(index)}
                className={`flex-shrink-0 relative transition-all ${
                  index === currentPageIndex
                    ? "ring-2 ring-blue-500 rounded"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={`Go to page ${page.page_number}`}
              >
                {page.thumbnail ? (
                  <img
                    src={`data:image/png;base64,${page.thumbnail}`}
                    alt={`Page ${page.page_number}`}
                    className="w-20 h-28 object-cover rounded border border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-28 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                    <i className="ri-image-line text-2xl text-gray-300"></i>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                  {page.page_number}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScribbleViewer;
