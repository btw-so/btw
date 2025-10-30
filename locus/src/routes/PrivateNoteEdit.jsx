import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "modules/hooks";
import { selectUser } from "selectors";
import Tiptap from "../components/Tiptap";
import Loader from "../components/Loader";
import useCookie from "../hooks/useCookie";

function PrivateNoteEdit() {
  const { id } = useParams(); // note ID
  const userState = useAppSelector(selectUser);
  const tiptapRef = useRef(null);
  const [showMenuBar, setShowMenuBar] = useState(false);

  const [token] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );
  const { user } = userState;
  const { isLoggedIn } = user;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authentication
    if (!isLoggedIn) {
      setError("Authentication failed");
      setLoading(false);
      return;
    }

    // check the width in pixels if it's less than 768px, set showMenuBar to true
    if (window.innerWidth < 768) {
      setShowMenuBar(true);
    }

    // If authenticated, ready to show editor
    setLoading(false);
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader size={60} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-grow overflow-hidden relative">
        <div className="flex px-2 py-2 hidden md:flex absolute top-0 right-0" style={{
          justifyContent: "end",
        }}>
          <button
            onClick={() => setShowMenuBar(!showMenuBar)}
            className={`flex items-center gap-0.5 px-2 py-1 transition-all duration-200 rounded ${
              showMenuBar ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
            }`}
            title="Toggle formatting toolbar"
          >
            <i
              className={`ri-bold ri-sm ${
                showMenuBar ? "text-gray-700" : "text-gray-500"
              }`}
            ></i>
            <i
              className={`ri-italic ri-sm ${
                showMenuBar ? "text-gray-700" : "text-gray-500"
              }`}
            ></i>
            <i
              className={`ri-underline ri-sm ${
                showMenuBar ? "text-gray-700" : "text-gray-500"
              }`}
            ></i>
          </button>
        </div>

        <Tiptap
          ref={tiptapRef}
          menuBarClasses="opacity-20 hover:opacity-100 transition-opacity duration-300 !px-2 md:!px-0"
          showMenuBar={showMenuBar}
          reviewerMode={false}
          usecase="list"
          className="h-full flex-grow p-6"
          key={id}
          token={token}
          userId={user?.data?.id}
          email={user?.data?.email}
          name={user?.data?.name}
          docId={id}
          enableServerSync={true}
          mandatoryH1={false}
          disallowH1={true}
          onChange={() => {
            // Auto-save is handled by Hocuspocus/Y.js
          }}
        />
      </div>
    </div>
  );
}

export default PrivateNoteEdit;
