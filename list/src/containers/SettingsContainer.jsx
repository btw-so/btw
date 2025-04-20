import React, { useEffect, useState, useRef } from "react";
import { useAppSelector } from "modules/hooks";
import useInterval from "beautiful-react-hooks/useInterval";
import { useDispatch } from "react-redux";
import { STATUS } from "../literals";
import useCookie from "../hooks/useCookie";
import UppyComponent from "../components/Uppy";
import useLocalStorage from "../hooks/useLocalStorage";
import { selectUser, selectOtp } from "../selectors";
import { updateUser } from "../actions";
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
      birthday: currentSettings.birthday || "",
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
      ) ||
    settings.birthday !== currentSettings.birthday;

  return (
    <AppWrapper {...props} settingsPage={true}>
      {token && props.userId ? (
        <div className={`flex-grow p-4 flex flex-col overflow-y-scroll`}>
          <div className={`h-4 sm:hidden`}></div>
          <div className="mb-4 max-w-lg">
            <div className="mb-4 max-w-lg">
              <div className="">
                <div className="mt-4">
                  <label className="block font-bold mb-2" htmlFor="birthday">
                    Birthday
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-sm text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="birthday"
                    type="date"
                    value={settings.birthday || ""}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        birthday: e.target.value,
                      });
                    }}
                  />
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

                  if (!activeUpdateButton) {
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
                      settings: {
                        ...settings,
                        links: settings.links.filter(
                          (link) => link.name && link.url
                        ),
                        birthday: settings.birthday,
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
