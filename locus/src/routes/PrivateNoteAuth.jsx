import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAppSelector } from "modules/hooks";
import { selectUser } from "selectors";
import Tiptap from "../components/Tiptap";
import Loader from "../components/Loader";
import { getUser } from "../actions";
import useCookie from "../hooks/useCookie";

function PrivateNoteAuth() {
  const { id, hash } = useParams();
  const dispatch = useDispatch();
  const userState = useAppSelector(selectUser);
  const tiptapRef = useRef(null);

  const [token] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );

  const [status, setStatus] = useState("authenticating"); // 'authenticating' | 'authenticated' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [showMenuBar, setShowMenuBar] = useState(false);

  const { user } = userState;
  const { isLoggedIn } = user;

  useEffect(() => {
    // Check screen width for menu bar
    if (window.innerWidth < 768) {
      setShowMenuBar(true);
    }

    // Simply dispatch getUser - it will handle all private note authentication
    // by reading the URL and doing the fingerprint-split decryption in /user/details
    console.log('[PrivateNoteAuth] Dispatching getUser for private note authentication');
    dispatch(getUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wait for user data to be loaded before showing editor
  useEffect(() => {
    if (isLoggedIn && user.data && status === "authenticating") {
      console.log('[PrivateNoteAuth] User logged in, showing editor');
      setStatus("authenticated");
    } else if (user.error && status === "authenticating") {
      console.log('[PrivateNoteAuth] Authentication failed:', user.error);
      setStatus("error");
      setErrorMessage(user.error || "Failed to authenticate");
    }
  }, [isLoggedIn, user.data, user.error, status]);

  if (status === "error") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show editor immediately with loading overlay
  return (
    <div className="h-screen flex flex-col relative" style={{
      background: "#FBFBFB",
    }}>
      {/* Loading overlay - fades out when authenticated */}
      {status === "authenticating" && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <Loader size={60} />
            <p className="mt-4 text-gray-600">Loading note...</p>
          </div>
        </div>
      )}

      {/* Editor UI - shows immediately but content loads after auth */}
      <div className="flex-grow overflow-hidden relative">
        <div className="flex px-2 py-2 hidden md:flex absolute top-0 right-0 z-10" style={{
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

        {status === "authenticated" && (
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
        )}
      </div>
    </div>
  );
}

export default PrivateNoteAuth;
