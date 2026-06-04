import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles.css";
import { GalleryPage } from "./pages/GalleryPage.tsx";
import { WatchPage } from "./pages/WatchPage.tsx";

const router = createBrowserRouter([
  { path: "/", element: <GalleryPage /> },
  { path: "/watch/:id", element: <WatchPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
