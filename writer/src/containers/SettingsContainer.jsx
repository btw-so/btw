import React, { useEffect, useState, useRef } from "react";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { STATUS } from "../literals";
import useCookie from "../hooks/useCookie";
import UppyComponent from "../components/Uppy";
import useLocalStorage from "../hooks/useLocalStorage";
import { selectUser, selectOtp } from "../selectors";
import { addCustomDomain, updateUser } from "../actions";
import useTreeChanges from "tree-changes-hook";
import Tiptap from "../components/Tiptap";

import AppWrapper from "./AppWraper";

function SettingsContainer(props) {
  const dispatch = useDispatch();
  const userState = useAppSelector(selectUser);
  const { user } = userState;
  const { changed } = useTreeChanges(userState);
  const actions = useAppSelector(selectOtp);
  const [token, setToken] = useCookie("btw_uuid", "");

  const currentName = (user.data || {}).name || "";
  const currentSlug = (user.data || {}).slug || "";
  const currentBio = (user.data || {}).bio || "";
  const currentPic = (user.data || {}).pic || "";
  const currentLinkedin = (user.data || {}).linkedin || "";
  const currentTwitter = (user.data || {}).twitter || "";
  const currentInstagram = (user.data || {}).instagram || "";
  const currentDomain =
    ((user.data || {}).domains || []).length > 0
      ? ((user.data || {}).domains || [])[0].domain
      : "";
  const [showPicUploader, setShowPicUploader] = useState(false);

  const [name, setName] = useState(currentName);
  const [slug, setSlug] = useState(currentSlug);
  const [domain, setDomain] = useState(currentDomain);
  const [bio, setBio] = useState(currentBio);
  const [pic, setPic] = useState(currentPic);
  const [linkedin, setLinkedin] = useState(currentLinkedin);
  const [twitter, setTwitter] = useState(currentTwitter);
  const [instagram, setInstagram] = useState(currentInstagram);
  const bioRef = useRef(null);

  useEffect(() => {
    if (changed("user.data.name")) {
      setName(user.data.name);
    }
  }, [user.data.name]);

  useEffect(() => {
    if (changed("user.data.slug")) {
      setSlug(user.data.slug);
    }
  }, [user.data.slug]);

  useEffect(() => {
    if (changed("user.data.twitter")) {
      setTwitter(user.data.twitter);
    }
  }, [user.data.twitter]);

  useEffect(() => {
    if (changed("user.data.instagram")) {
      setInstagram(user.data.instagram);
    }
  }, [user.data.instagram]);

  useEffect(() => {
    if (changed("user.data.linkedin")) {
      setLinkedin(user.data.linkedin);
    }
  }, [user.data.linkedin]);

  useEffect(() => {
    if (changed("user.data.bio")) {
      setBio(user.data.bio);
      if (bioRef.current) {
        bioRef.current.setContent(user.data.bio);
      }
    }
  }, [user.data.bio]);

  useEffect(() => {
    if (changed("user.data.pic")) {
      setPic(user.data.pic);
    }
  }, [user.data.picture]);

  useEffect(() => {
    if (changed("user.data.domains")) {
      if (user.data.domains.length > 0) {
        setDomain(user.data.domains[0].domain);
      }
    }
  }, [user.data.domains]);

  const activeUpdateButton =
    name !== currentName ||
    slug !== currentSlug ||
    bio !== currentBio ||
    pic !== currentPic ||
    linkedin !== currentLinkedin ||
    twitter !== currentTwitter ||
    instagram !== currentInstagram;

  return (
    <AppWrapper {...props} settingsPage={true}>
      {token && props.userId ? (
        <div className={`flex-grow p-4 flex flex-col`}>
          <div className={`h-4 sm:hidden`}></div>
          <div className="mb-4 max-w-sm">
            <h2 className="font-extrabold text-lg mb-2">Profile</h2>
            <label className="block font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
          </div>
          <div className="mb-4 max-w-sm">
            <label className="block font-bold mb-2" htmlFor="slug">
              Slug
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="slug"
              type="text"
              placeholder="Slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
              }}
            />
          </div>
          <div className="mb-4 max-w-sm">
            <label className="block font-bold mb-2" htmlFor="slug">
              Linkedin
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Linkedin"
              type="text"
              placeholder="linkedin"
              value={linkedin}
              onChange={(e) => {
                setLinkedin(e.target.value);
              }}
            />
          </div>
          <div className="mb-4 max-w-sm">
            <label className="block font-bold mb-2" htmlFor="slug">
              Twitter
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="twitter"
              type="text"
              placeholder="Twitter"
              value={twitter}
              onChange={(e) => {
                setTwitter(e.target.value);
              }}
            />
          </div>
          <div className="mb-4 max-w-sm">
            <label className="block font-bold mb-2" htmlFor="slug">
              Instagram
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="instagram"
              type="text"
              placeholder="Instagram"
              value={instagram}
              onChange={(e) => {
                setInstagram(e.target.value);
              }}
            />
          </div>
          <div className="mb-4 max-w-sm">
            <label className="block font-bold mb-2" htmlFor="slug">
              Bio
            </label>
            <div
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <Tiptap
                ref={bioRef}
                content={bio}
                onChange={(html) => {
                  setBio(html);
                }}
                customMenu={{
                  items: ["Link"],
                }}
                hideCharacterCount={true}
              />
            </div>
          </div>
          <div className="mb-4 max-w-sm">
            <label className="block font-bold mb-2" htmlFor="pic">
              Picture
            </label>
            <div className="">
              <img
                src={pic || "https://dummyimage.com/300"}
                onClick={() => {
                  setShowPicUploader(true);
                }}
              />
              <div className="mt-2">
                <div
                  className={`w-full h-full backdrop-blur-sm bg-white/30 top-0 left-0 flex flex-col items-center justify-center ${
                    showPicUploader ? "absolute" : "absolute hidden"
                  }`}
                  onClick={() => {
                    setShowPicUploader(false);
                  }}
                >
                  <div
                    className=""
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <UppyComponent
                      maxNumberOfFiles={1}
                      allowedFileTypes={["image/*"]}
                      allowMultipleUploads={false}
                      onResults={(res) => {
                        let url =
                          res.urls && res.urls.length > 0 ? res.urls[0] : "";

                        if (url) {
                          if (process.env.REACT_APP_S3_ENDPOINT) {
                            url = url
                              .split(
                                `${process.env.REACT_APP_S3_ENDPOINT}/${process.env.REACT_APP_S3_ENDPOINT}`
                              )
                              .join(process.env.REACT_APP_S3_ENDPOINT);
                          }

                          setPic(url);
                        }

                        setShowPicUploader(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex mt-2 items-center justify-between">
              <button
                className={`flex items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm ${
                  activeUpdateButton ? "" : "opacity-50 cursor-not-allowed"
                }`}
                type="button"
                onClick={() => {
                  if (user.status === STATUS.RUNNING) {
                    return;
                  }

                  if (
                    name === currentName &&
                    slug === currentSlug &&
                    bio === currentBio &&
                    pic === currentPic &&
                    linkedin === currentLinkedin &&
                    twitter === currentTwitter &&
                    instagram === currentInstagram
                  ) {
                    return;
                  }

                  dispatch(
                    updateUser({
                      name,
                      slug,
                      bio,
                      pic,
                      twitter,
                      linkedin,
                      twitter,
                      instagram,
                    })
                  );
                }}
              >
                {user.status === STATUS.RUNNING ? (
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
                Save
              </button>
            </div>

            <h2 className="font-extrabold text-lg mb-2 mt-16">Publishing</h2>
            <div className="mb-4 max-w-sm">
              <label className="block font-bold mb-2" htmlFor="slug">
                Custom domain
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="customdomain"
                type="text"
                placeholder="www.example.com"
                value={domain}
                onChange={(e) => {
                  // only allow changing domain if current domain is empty
                  // later we can have delete domain + add domain functionality so multiple domains with multiple tag bindings can be setup
                  if (currentDomain) {
                    return;
                  }
                  setDomain(e.target.value);
                }}
              />
            </div>

            <div className="flex mt-2 items-center justify-between">
              <button
                className="flex items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                type="button"
                onClick={() => {
                  if (actions.addCustomDomain.status === STATUS.RUNNING) {
                    return;
                  }

                  if (currentDomain === domain) {
                    return;
                  }

                  dispatch(
                    addCustomDomain({
                      domain,
                    })
                  );
                }}
              >
                {actions.addCustomDomain.status === STATUS.RUNNING ? (
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
                Update
              </button>
            </div>

            {/* <UppyComponent
            onResults={(res) => {
              // dispatch an action to backend for this now
              dispatch(
                importNotes({
                  urls: res.urls,
                })
              );
            }}
          /> */}
          </div>
        </div>
      ) : null}
    </AppWrapper>
  );
}

export default SettingsContainer;
