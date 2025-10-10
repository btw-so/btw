import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/lib/integration/react";
import { configStore } from "store";

import { showAlert } from "actions";

import ErrorHandler from "components/ErrorHandler";
import Loader from "components/Loader";
import Reload from "components/Reload";
import GlobalStyles from "containers/GlobalStyles";

import reportWebVitals from "./reportWebVitals";
import Root from "./Root";
import { register } from "./serviceWorkerRegistration";

const { persistor, store } = configStore();

window.store = store;

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <PersistGate loading={<Loader block size={100} />} persistor={persistor}>
      <ErrorBoundary FallbackComponent={ErrorHandler}>
        <HelmetProvider>
          <Root />
        </HelmetProvider>
      </ErrorBoundary>
      <GlobalStyles />
    </PersistGate>
  </Provider>
);

/* istanbul ignore next */
// register({
//   onUpdate: () => {
//     store.dispatch(showAlert(<Reload />, { id: 'sw-update', icon: 'bolt', timeout: 0 }));
//   },
// });

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log); // eslint-disable-line no-console
