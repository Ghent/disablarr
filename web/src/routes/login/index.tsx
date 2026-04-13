import { component$, useSignal, useContext, $ } from "@builder.io/qwik";
import { type DocumentHead, useNavigate } from "@builder.io/qwik-city";
import { api } from "../../api/client";
import { AuthContext } from "../../auth/AuthContext";

export default component$(() => {
  const password = useSignal("");
  const error = useSignal<string | null>(null);
  const loading = useSignal(false);
  const auth = useContext(AuthContext);
  const nav = useNavigate();

  const handleLogin = $(async () => {
    if (!password.value) return;
    loading.value = true;
    error.value = null;

    try {
      const data = await api.login(password.value);
      localStorage.setItem("disablarr_token", data.token);
      auth.value = {
        isAuthenticated: true,
        username: "admin",
        loading: false,
      };
      nav("/");
    } catch (e: any) {
      error.value = e.message || "Login failed";
    } finally {
      loading.value = false;
    }
  });

  return (
    <div class="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-[#05050A]">
      {/* Background Ambience */}
      <div 
        class="pointer-events-none absolute w-full h-full blur-[150px] opacity-20"
        style={{
          background: "radial-gradient(circle at center, oklch(0.5 0.3 290) 0%, transparent 70%)"
        }}
      />

      <main class="glass-panel p-10 md:p-14 rounded-3xl w-full max-w-md relative z-10 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-[fade-in-up_0.5s_ease-out_forwards]">
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-neon-purple)] mb-6 shadow-[0_0_20px_var(--color-neon-purple)]">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 class="text-3xl font-black tracking-tight text-white mb-2">Disablarr</h1>
          <p class="text-gray-400 text-sm font-medium tracking-wide">Enter master key to access Command Center</p>
        </div>

        <form 
          preventdefault:submit
          onSubmit$={handleLogin}
          class="space-y-6"
        >
          <div class="space-y-2">
            <label class="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">Master Key</label>
            <div class="relative group">
              <input
                type="password"
                value={password.value}
                onInput$={(e) => (password.value = (e.target as HTMLInputElement).value)}
                placeholder="••••••••••••••••"
                class="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[var(--color-neon-purple)] focus:ring-1 focus:ring-[var(--color-neon-purple)] transition-all font-mono"
                autoFocus
              />
            </div>
          </div>

          {error.value && (
            <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-shake">
              {error.value}
            </div>
          )}

          <button
            type="submit"
            disabled={loading.value}
            class="w-full py-4 rounded-xl bg-[var(--color-neon-purple)] border border-purple-400/50 text-white font-black tracking-widest text-sm hover:bg-purple-500 hover:shadow-[0_0_30px_var(--color-neon-purple)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3 active:scale-95"
          >
            {loading.value ? (
               <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                AUTHENTICATE
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </>
            )}
          </button>
        </form>

        <footer class="mt-12 pt-8 border-t border-white/5 text-center">
          <p class="text-[10px] text-gray-600 uppercase tracking-widest font-bold">System Status: Nominal</p>
        </footer>
      </main>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); filter: blur(5px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Login | Disablarr",
};
