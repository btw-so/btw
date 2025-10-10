declare global {
  interface Window {
    HIDE_LOGS: boolean;
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any;
    store: any;
  }

  const VERSION: string;
}

export {};
