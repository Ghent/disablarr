import { component$, isDev, useSignal, useVisibleTask$, useContextProvider } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";
import { AuthContext, type AuthState } from "./auth/AuthContext";
import { api, getBasePath } from "./api/client";

import "./global.css";

export default component$(() => {
  const auth = useSignal<AuthState>({
    isAuthenticated: false,
    username: null,
    loading: true,
  });

  useContextProvider(AuthContext, auth);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      if (localStorage.getItem("disablarr_token")) {
        await api.checkAuth();
        auth.value = {
          isAuthenticated: true,
          username: "admin", // Backend doesn't return username yet, default to admin
          loading: false,
        };
      } else {
        auth.value = {
          isAuthenticated: false,
          username: null,
          loading: false,
        };
      }
    } catch (e) {
      auth.value = {
        isAuthenticated: false,
        username: null,
        loading: false,
      };
    }
  });

  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <meta name="base-path" content="/" />
        {!isDev && (
          <link
              rel="manifest"
              href={`${import.meta.env.BASE_URL}manifest.json`}
          />
        )}
        <RouterHead />
      </head>
      <body lang="en">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
