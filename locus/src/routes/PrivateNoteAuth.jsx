import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import useCookie from "../hooks/useCookie";
import Loader from "../components/Loader";
import { getUser } from "../actions";

const axiosInstance = axios.create({
  timeout: 20000,
  withCredentials: true,
});

function PrivateNoteAuth() {
  const { id, hash } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [, setCookie] = useCookie(process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid", "");
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const validateAndLogin = async () => {

      console.log("validateAndLogin");
      try {
        // Call API to validate secret and get login token
        const { data: res } = await axiosInstance.request({
          url: `${process.env.REACT_APP_TASKS_PUBLIC_URL}/list/get-login-token`,
          method: "POST",
          data: {
            noteId: id,
            hashedSecret: hash,
          },
        });

        if (res.success && res.data && res.data.loginToken) {
          // The saga will fetch user details using the cookie we just set
          await new Promise(resolve => setTimeout(resolve, 40));
          // Redirect to edit page
          navigate(`/private/note/${id}/edit`);
        } else {
          setStatus("error");
          setErrorMessage(res.error || "Failed to authenticate");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setStatus("error");
        setErrorMessage(error.message || "An error occurred during authentication");
      }
    };

    if (id && hash) {
      validateAndLogin();
    } else {
      setStatus("error");
      setErrorMessage("Missing note ID or secret");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader size={60} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">✗</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Failed</h2>
          <p className="text-gray-600">{errorMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default PrivateNoteAuth;
