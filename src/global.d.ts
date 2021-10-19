declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_SOCKET_SERVER_URL: string;
    readonly REACT_APP_FIREBASE_CONFIG: string;
  }
}
