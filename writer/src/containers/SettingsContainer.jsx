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
import { Switch } from "@headlessui/react";

import AppWrapper from "./AppWraper";

function SettingsContainer(props) {
  const dispatch = useDispatch();
  const userState = useAppSelector(selectUser);
  const { user } = userState;
  const { changed } = useTreeChanges(userState);
  const actions = useAppSelector(selectOtp);
  const [token, setToken] = useCookie(
    process.env.REACT_APP_BTW_UUID_KEY || "btw_uuid",
    ""
  );

  const isUserPro = !!(user.data || {}).pro;
  const isAdmin =
    isUserPro &&
    ["deepti.vchopra@gmail.com", "siddhartha.gunti191@gmail.com"].includes(
      (user.data || {}).email
    );
  const currentName = (user.data || {}).name || "";
  const currentSlug = (user.data || {}).slug || "";
  const currentBio = (user.data || {}).bio || "";
  const currentPic = (user.data || {}).pic || "";
  const currentSettings = (user.data || {}).settings || {};
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
  const [settings, setSettings] = useState({
    ...currentSettings,
    ...{
      links: [...(currentSettings.links || []), { name: "", url: "" }],
    },
  });

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
    instagram !== currentInstagram ||
    settings.removeImagesInMainPage !==
      currentSettings.removeImagesInMainPage ||
    JSON.stringify((settings.links || []).filter((x) => x.name || x.url)) !==
      JSON.stringify(
        (currentSettings.links || []).filter((x) => x.name || x.url)
      );

  return (
    <AppWrapper {...props} settingsPage={true}>
      {token && props.userId ? (
        <div className={`flex-grow p-4 flex flex-col overflow-y-scroll`}>
          <div className={`h-4 sm:hidden`}></div>
          <div className="mb-4 max-w-lg">
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
          <div className="mb-4 max-w-lg">
            <label className="block font-bold -mb-1" htmlFor="slug">
              Slug
            </label>
            <label className="text-xs text-gray-500">
              Your site will go live on {`${slug || "<slug>"}.btw.so`}
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
          <div className="mb-4 max-w-lg">
            <label className="block font-bold mb-2" htmlFor="slug">
              LinkedIn
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="LinkedIn"
              type="text"
              placeholder="LinkedIn"
              value={linkedin}
              onChange={(e) => {
                setLinkedin(e.target.value);
              }}
            />
          </div>
          <div className="mb-4 max-w-lg">
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
          <div className="mb-4 max-w-lg">
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
          <div className="mb-4 max-w-lg">
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
          <div className="mb-4 max-w-lg">
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
            {isUserPro ? (
              <div className="mb-4 max-w-lg">
                <label className="block font-bold mb-2" htmlFor="pic">
                  Site settings
                </label>
                <div className="">
                  <Switch.Group as="div" className="flex items-center">
                    <Switch
                      checked={settings.removeImagesInMainPage}
                      onChange={() => {
                        setSettings({
                          ...settings,
                          removeImagesInMainPage:
                            !settings.removeImagesInMainPage,
                        });
                      }}
                      className={`${
                        settings.removeImagesInMainPage
                          ? "bg-blue-600"
                          : "bg-gray-200"
                      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                    >
                      <span
                        aria-hidden="true"
                        className={`${
                          settings.removeImagesInMainPage
                            ? "translate-x-5"
                            : "translate-x-0"
                        } mt-0.5 ml-0.5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </Switch>
                    <Switch.Label as="span" className="ml-1.5 text-sm">
                      <span className="font-medium text-gray-900">
                        Remove images from main page
                      </span>
                    </Switch.Label>
                  </Switch.Group>
                </div>
              </div>
            ) : null}
            {isAdmin ? (
              <div className="mb-4 max-w-lg">
                <label className="block font-bold mb-2" htmlFor="slug">
                  Links
                </label>
                <div className="flex flex-col space-y-2">
                  {(settings.links || []).map(({ name, url }, i) => {
                    return (
                      <div key={i} className="flex items-center space-x-2">
                        <input
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          type="text"
                          placeholder="Name"
                          value={name}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              links: [
                                ...settings.links.map((link, j) => {
                                  if (j === i) {
                                    return {
                                      ...link,
                                      name: e.target.value,
                                    };
                                  }

                                  return link;
                                }),
                                ...(i === settings.links.length - 1
                                  ? [
                                      {
                                        name: "",
                                        url: "",
                                      },
                                    ]
                                  : []),
                              ],
                            });
                          }}
                        />
                        <span>⇢</span>
                        <input
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          type="text"
                          placeholder="URL"
                          value={url}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              links: settings.links.map((link, j) => {
                                if (j === i) {
                                  return {
                                    ...link,
                                    url: e.target.value,
                                  };
                                }

                                return link;
                              }),
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
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

                  if (!activeUpdateButton) {
                    return;
                  }

                  dispatch(
                    updateUser({
                      ...user.data,
                      name,
                      slug,
                      bio,
                      pic,
                      linkedin,
                      twitter,
                      instagram,
                      settings: {
                        ...user.data.settings,
                        ...settings,
                        links: settings.links.filter(
                          (link) => link.name && link.url
                        ),
                      },
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
            <div className="mb-4 max-w-lg">
              <label className="block font-bold -mb-1" htmlFor="slug">
                Custom domain
              </label>
              <label className="text-xs text-gray-500">
                Included only in{" "}
                <a href="https://www.btw.so/pricing" target="_blank">
                  Pro plan
                </a>
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
                  if (currentDomain && (isUserPro || isAdmin)) {
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
