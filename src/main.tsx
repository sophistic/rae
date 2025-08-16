{/*
  This is the main entry point for the app.
  It is used to render the app and provide the app context.
*/}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
    <App /></BrowserRouter>
  </React.StrictMode>,
);
