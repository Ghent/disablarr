import { component$, Slot, useContext, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation, useNavigate } from "@builder.io/qwik-city";
import { AuthContext } from "../auth/AuthContext";

export default component$(() => {
  const auth = useContext(AuthContext);
  const loc = useLocation();
  const nav = useNavigate();

  // Redirect and loading logic
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const isAuth = track(() => auth.value.isAuthenticated);
    const loading = track(() => auth.value.loading);
    const path = track(() => loc.url.pathname);

    if (loading) return;

    if (!isAuth && !path.startsWith("/login")) {
      nav("/login");
    } else if (isAuth && path.startsWith("/login")) {
      nav("/");
    }
  });

  if (auth.value.loading) {
    return (
      <div class="min-h-screen bg-[#05050A] flex items-center justify-center">
        <div class="w-12 h-12 border-4 border-[var(--color-neon-purple)]/20 border-t-[var(--color-neon-purple)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div class="contents">
      <Slot />
    </div>
  );
});
