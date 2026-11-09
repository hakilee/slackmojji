import React from "react";
import ReactDOM from "react-dom/client";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import "pretendard/dist/web/static/Pretendard-Regular.css";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource/black-han-sans";
import "@fontsource/jua";
import "./styles/tailwind.css";
import { Toaster } from "~/components/design-system";
import { EditorPage } from "./pages/EditorPage";

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: EditorPage,
});
const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster
      position="bottom-center"
      theme="dark"
      duration={3000}
      offset={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}
      mobileOffset={{ bottom: "calc(16px + env(safe-area-inset-bottom))", left: 16, right: 16 }}
      containerAriaLabel="알림"
      toastOptions={{ style: { borderRadius: "var(--radius-control)" } }}
    />
  </React.StrictMode>,
);
