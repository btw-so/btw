import React, { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useUpdateEffect } from "react-use";
import { selectUser, selectOtp } from "../selectors";
import useTreeChanges from "tree-changes-hook";

import { useAppSelector } from "modules/hooks";

import { STATUS } from "../literals";

import { getUser, generateOtp, verifyOtp } from "../actions";

function Login() {
  const dispatch = useDispatch();
  const user = useAppSelector(selectUser);
  const otp = useAppSelector(selectOtp);

  const emailFromQueryParams = new URLSearchParams(window.location.search).get(
    "email"
  );

  const [email, setEmail] = useState(emailFromQueryParams || "");
  const [mode, setMode] = useState("enter-email");
  const { changed } = useTreeChanges(user);
  const { changed: changedOtpState } = useTreeChanges(otp);

  const [otp1, setOtp1] = useState("");
  const [otp2, setOtp2] = useState("");
  const [otp3, setOtp3] = useState("");
  const [otp4, setOtp4] = useState("");
  const [otp5, setOtp5] = useState("");
  const [otp6, setOtp6] = useState("");

  const otp1Ref = useRef();
  const otp2Ref = useRef();
  const otp3Ref = useRef();
  const otp4Ref = useRef();
  const otp5Ref = useRef();
  const otp6Ref = useRef();

  useEffect(() => {
    const otpEntered = otp1 && otp2 && otp3 && otp4 && otp5 && otp6;
    if (otpEntered) {
      // submit
      dispatch(
        verifyOtp({
          email,
          otp: `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`,
        })
      );
    }
  }, [otp1, otp2, otp3, otp4, otp5, otp6]);

  useEffect(() => {
    if (changedOtpState("otp.status", STATUS.SUCCESS)) {
      setMode("enter-otp");
    } else if (changedOtpState("otp.status", STATUS.ERROR)) {
      setMode("enter-email");
    }
  });

  const onPaste = (e) => {
    try {
      let paste = (e.clipboardData || window.clipboardData).getData("text");
      paste = paste.toUpperCase();

      if (paste.length === 6) {
        // if all 6 characters of paste are integers, then proceed
        let pasteIsValid = true;
        for (let i = 0; i < paste.length; i++) {
          if (isNaN(parseInt(paste[i]))) {
            pasteIsValid = false;
            break;
          }
        }
        // convert each element of the paste string to integer
        // each integer will go into the corresponding otps input using setOtps
        // if all the paste characters are numbers, and acceptOtpState is not inprogress, then accept otp
        if (pasteIsValid) {
          setOtp1(paste[0]);
          setOtp2(paste[1]);
          setOtp3(paste[2]);
          setOtp4(paste[3]);
          setOtp5(paste[4]);
          setOtp6(paste[5]);
        }
      }

      e.preventDefault();
    } catch (error) {
      console.log(error);
    }
  };
  // const { data = [], message = '', status = STATUS.IDLE } = gitHub.topics[query] || topic;

  return (
    <div key="Login" data-testid="Login">
      <>
        <header className="container mx-auto py-6 px-4">
          <div className="flex items-center">
            <img src="/media/images/btw-logo.png" alt="Logo" className="h-4" />
          </div>
        </header>
        <div className="container mx-auto my-12">
          <div className="max-w-lg mx-auto p-2">
            {mode === "enter-otp" ? (
              <div className="bg-white rounded-lg p-8 drop-shadow-2xl">
                <h1 className="text-2xl font-extrabold mb-4">
                  Check your email for a magic code
                </h1>
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="email"
                >
                  We’ve sent a 6-digit code to {email}. The code will expire in
                  10 minutes.
                </label>
                <form>
                  <div className="flex items-center mb-4">
                    <input
                      type="number"
                      className="w-12 h-12 text-2xl text-center bg-white rounded-lg shadow-md border border-gray-300 mr-2 sm:mr-4"
                      maxLength={1}
                      value={otp1}
                      onChange={(e) => {
                        setOtp1(e.target.value);
                        // move to next input
                        if (e.target.value) {
                          otp2Ref.current.focus();
                        }
                      }}
                      ref={otp1Ref}
                      onPaste={(e) => {
                        onPaste(e);
                      }}
                    />
                    <input
                      type="number"
                      className="w-12 h-12 text-2xl text-center bg-white rounded-lg shadow-md border border-gray-300 mr-2 sm:mr-4"
                      maxLength={1}
                      value={otp2}
                      onChange={(e) => {
                        setOtp2(e.target.value);
                        // move to next input
                        if (e.target.value) {
                          otp3Ref.current.focus();
                        }

                        // if (e.target.value === '') {
                        //   otp1Ref.current.focus();
                        // }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp2) {
                          otp1Ref.current.focus();
                        }
                      }}
                      ref={otp2Ref}
                    />
                    <input
                      type="number"
                      className="w-12 h-12 text-2xl text-center bg-white rounded-lg shadow-md border border-gray-300 mr-2 sm:mr-4"
                      maxLength={1}
                      value={otp3}
                      onChange={(e) => {
                        setOtp3(e.target.value);
                        // move to next input
                        if (e.target.value) {
                          otp4Ref.current.focus();
                        }

                        // if (e.target.value === '') {
                        //   otp2Ref.current.focus();
                        // }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp3) {
                          otp2Ref.current.focus();
                        }
                      }}
                      ref={otp3Ref}
                    />
                    <input
                      type="number"
                      className="w-12 h-12 text-2xl text-center bg-white rounded-lg shadow-md border border-gray-300 mr-2 sm:mr-4"
                      maxLength={1}
                      value={otp4}
                      onChange={(e) => {
                        setOtp4(e.target.value);
                        // move to next input
                        if (e.target.value) {
                          otp5Ref.current.focus();
                        }
                        // if (e.target.value === '') {
                        //   otp3Ref.current.focus();
                        // }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp4) {
                          otp3Ref.current.focus();
                        }
                      }}
                      ref={otp4Ref}
                    />
                    <input
                      type="number"
                      className="w-12 h-12 text-2xl text-center bg-white rounded-lg shadow-md border border-gray-300 mr-2 sm:mr-4"
                      maxLength={1}
                      value={otp5}
                      onChange={(e) => {
                        setOtp5(e.target.value);
                        // move to next input
                        if (e.target.value) {
                          otp6Ref.current.focus();
                        }
                        // if (e.target.value === '') {
                        //   otp4Ref.current.focus();
                        // }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp5) {
                          otp4Ref.current.focus();
                        }
                      }}
                      ref={otp5Ref}
                    />
                    <input
                      type="number"
                      className="w-12 h-12 text-2xl text-center bg-white rounded-lg shadow-md border border-gray-300"
                      maxLength={1}
                      value={otp6}
                      onChange={(e) => {
                        setOtp6(e.target.value);
                        // if (e.target.value === '') {
                        //   otp5Ref.current.focus();
                        // }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp6) {
                          otp5Ref.current.focus();
                        }
                      }}
                      ref={otp6Ref}
                    />
                  </div>
                </form>
                <small className="text-xs">
                  {otp.verifyOtp.status === STATUS.RUNNING
                    ? "Verifying..."
                    : "Can’t find the code? Please check your spam folder."}
                </small>
                {otp.verifyOtp.status === STATUS.ERROR ? (
                  <div>
                    <strong className="font-bold text-xs mt-2 text-red-500">
                      {otp.verifyOtp.error}
                    </strong>
                  </div>
                ) : null}
              </div>
            ) : null}
            {mode === "enter-email" ? (
              <div className="bg-white rounded-lg px-8 pt-6 pb-8 mb-4 drop-shadow-2xl">
                <h1 className="text-2xl font-extrabold text-left mb-4">
                  Welcome to btw
                </h1>
                <div className="">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="email"
                  >
                    Enter your email address
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline input-text-sm"
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // sanitize email and check that it is in right format
                        // if not, show error
                        // if yes, then dispatch action to generate otp
                        if (
                          email &&
                          email.length > 0 &&
                          otp.otp.status !== STATUS.RUNNING
                        ) {
                          dispatch(generateOtp({ email }));
                        }
                      }
                    }}
                  />
                  <p className="text-xs mt-2">
                    We’ll send you a magic code (6-digit) for a password-free
                    login experience.
                  </p>
                  {otp.otp.status === STATUS.ERROR ? (
                    <p className="text-red-500 text-xs mt-2">{otp.otp.error}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <button
                      className="flex mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      type="submit"
                      onClick={() => {
                        // sanitize email and check that it is in right format
                        // if not, show error
                        // if yes, then dispatch action to generate otp
                        if (
                          email &&
                          email.length > 0 &&
                          otp.otp.status !== STATUS.RUNNING
                        ) {
                          dispatch(generateOtp({ email }));
                        }
                      }}
                    >
                      {otp.otp.status === STATUS.RUNNING ? (
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-75"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-100"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"
                          ></path>
                        </svg>
                      ) : null}
                      {otp.otp.status === STATUS.RUNNING
                        ? "Sending OTP..."
                        : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </>
    </div>
  );
}

export default Login;
