import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useDispatch } from "react-redux";
import {
  BrowserRouter,
  HashRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { selectUser } from "selectors";
import useTreeChanges from "tree-changes-hook";
import { useAppSelector } from "modules/hooks";

import toast, { Toaster } from "react-hot-toast";

import { getUser } from "actions";
// import Home from 'routes/Home';
import Login from "./routes/Login";
import NotFound from "routes/NotFound";
import PublicRoute from "./components/PublicRoute";
import PrivateRoute from "./components/PrivateRoute";
import Settings from "./routes/Settings";
import List from "./routes/List";
import PublicNote from "./routes/PublicNote";
import FourThousandWeeks from "./routes/FourThousandWeeks";

function Root() {
  const dispatch = useDispatch();
  const userState = useAppSelector(selectUser);
  const { changed } = useTreeChanges(userState);

  const { user } = userState;
  const { isLoggedIn } = user;

  const userDomain =
    ((user.data || {}).domains || []).length > 0
      ? user.data.domains[0].domain
      : (user.data || {}).slug
      ? `${(user.data || {}).slug}.btw.so`
      : null;

  useEffect(() => {
    // get user details if it is the first time
    dispatch(getUser());
  }, []);

  useEffect(() => {
    if (changed("user.isLoggedIn", true) && isLoggedIn) {
      toast.success("Logged In.");
    }
  }, [dispatch, changed]);

  // THOUGHTS 101
  // create a component that checks if the environment is electron, then it would be BrowserRouter
  // otherwise, it would be HashRouter
  // this is because electron does not support hash routing
  // but the web version does
  // so, we need to check if it is electron or not
  // and then use the correct router
  // this is a temporary solution
  // we need to find a better way to do this
  // maybe we can use a custom hook to check if it is electron or not
  // and then use the correct router

  // THOUGHTS 102
  // For some reason, hard refresh on the urls is giving 404 if we use BrowserRouter in production

  // const Router = process.env.REACT_APP_ELECTRON ? HashRouter : BrowserRouter;
  // const Router = HashRouter;
  const Router = BrowserRouter;

  Helmet.defaultProps.encodeSpecialCharacters = false;

  return (
    <Router>
      <div className="w-full h-full flex-grow flex flex-col min-h-screen">
        <Helmet
          defaultTitle={"btw ∴"}
          defer={false}
          encodeSpecialCharacters={false}
          titleAttributes={{ itemprop: "name", lang: "en-en" }}
          titleTemplate={`%s | btw ∴`}
        >
          <link
            href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap"
            rel="stylesheet"
          />
        </Helmet>

        {/* {isLoggedIn && <Login />} */}
        {/* <Main isAuthenticated={isAuthenticated}> */}
        <Routes className="flex flex-grow">
          <Route path="/public/note/:id/:hash" element={<PublicNote />} />
          <Route
            element={
              <PublicRoute isLoggedIn={isLoggedIn} to="/list">
                <Login />
              </PublicRoute>
            }
            path="/login"
          />
          <Route
            element={
              <PublicRoute isLoggedIn={isLoggedIn} to="/list">
                <Login />
              </PublicRoute>
            }
            path="/"
          />
          <Route
            className="flex flex-grow"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} to="/login">
                <List
                  userId={user && user.data ? user.data.id : null}
                  name={user && user.data ? user.data.name : null}
                  email={user && user.data ? user.data.email : null}
                  adminUser={
                    user &&
                    user.data &&
                    user.data.pro &&
                    user.data.email &&
                    [
                      "siddhartha.gunti191@gmail.com",
                      "deepti.vchopra@gmail.com",
                    ].includes(user.data.email)
                  }
                  isListPage={true}
                />
              </PrivateRoute>
            }
            path="/list"
          />
          <Route
            className="flex flex-grow"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} to="/login">
                <Settings
                  userId={user && user.data ? user.data.id : null}
                  name={user && user.data ? user.data.name : null}
                  email={user && user.data ? user.data.email : null}
                  share_id={
                    (user &&
                    user.data &&
                    user.data.domains &&
                    user.data.domains.length > 0
                      ? user.data.domains[0].share_id
                      : null) ||
                    (user && user.data && user.data.share_id
                      ? user.data.share_id
                      : null)
                  }
                  adminUser={
                    user &&
                    user.data &&
                    user.data.pro &&
                    user.data.email &&
                    [
                      "siddhartha.gunti191@gmail.com",
                      "deepti.vchopra@gmail.com",
                    ].includes(user.data.email)
                  }
                />
              </PrivateRoute>
            }
            path="/settings"
          />
          <Route
            className="flex flex-grow"
            element={
              <PrivateRoute isLoggedIn={isLoggedIn} to="/login">
                <FourThousandWeeks
                  userId={user && user.data ? user.data.id : null}
                  name={user && user.data ? user.data.name : null}
                  email={user && user.data ? user.data.email : null}
                  settings={user && user.data ? user.data.settings : null}
                  is4000Page={true}
                />
              </PrivateRoute>
            }
            path="/4000"
          />
          <Route element={<NotFound />} path="*" />
        </Routes>
        <Toaster />
        {/* </Main> */}
        {/* <Footer /> */}
      </div>
    </Router>
  );
}

export default Root;
