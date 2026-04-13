import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api } from "../../api/client";

export default component$(() => {
  const isHovered = useSignal(false);
  const loading = useSignal(true);
  const saving = useSignal(false);
  const error = useSignal<string | null>(null);
  const status = useSignal<{ type: 'success' | 'error', msg: string } | null>(null);
  
  const interval = useSignal(15);
  const dryRun = useSignal(true);
  const theme = useSignal("default");

  const fetchSettings = $(async () => {
    loading.value = true;
    try {
      const data = await api.getSettings();
      interval.value = data.interval_minutes;
      dryRun.value = data.dry_run;
      theme.value = data.theme_name;
    } catch (e: any) {
      error.value = "Failed to load settings";
    } finally {
      loading.value = false;
    }
  });

  useVisibleTask$(() => {
    fetchSettings();
  });

  const handleSave = $(async () => {
    saving.value = true;
    try {
      await api.updateSettings({
        interval_minutes: Number(interval.value),
        dry_run: dryRun.value,
        theme_name: theme.value,
      });
      status.value = { type: 'success', msg: "Settings saved successfully!" };
      setTimeout(() => status.value = null, 3000);
    } catch (e: any) {
      status.value = { type: 'error', msg: "Save failed: " + e.message };
      setTimeout(() => status.value = null, 5000);
    } finally {
      saving.value = false;
    }
  });

  return (
    <div class="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-[#05050A]">
      {/* Background Ambience */}
      <div 
        class="pointer-events-none absolute w-full h-[600px] blur-[150px] transition-opacity duration-1000 z-0 top-0 left-0 opacity-20"
        style={{
          background: "linear-gradient(135deg, oklch(0.5 0.3 290 / 0.5) 0%, transparent 60%)"
        }}
      />

      <main 
        class="glass-panel p-10 md:p-14 rounded-3xl w-full max-w-2xl relative z-10 
               border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
        onMouseEnter$={() => isHovered.value = true}
        onMouseLeave$={() => isHovered.value = false}
      >
        <header class="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
          <div>
            <div class="flex items-center gap-4 mb-2">
              <Link href="/" class="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-lg hover:bg-white/10 border border-white/10 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              </Link>
              <h1 class="text-3xl font-black tracking-tight text-white">
                Global Settings
              </h1>
            </div>
            <p class="text-sm text-gray-400 font-medium tracking-wide pl-[3.25rem]">
              Configure core engine behavior and system appearance
            </p>
          </div>
        </header>

        {loading.value ? (
           <div class="flex items-center justify-center py-20">
              <div class="w-10 h-10 border-4 border-white/10 border-t-[var(--color-neon-purple)] rounded-full animate-spin" />
           </div>
        ) : (
          <div class="space-y-8">
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                <div>
                  <h3 class="text-sm font-semibold text-gray-200 uppercase tracking-widest text-[10px]">Dry Run Mode</h3>
                  <p class="text-xs text-gray-500 mt-1 max-w-[300px]">If enabled, the engine will simulate actions without actually unmonitoring items.</p>
                </div>
                <button 
                  onClick$={() => dryRun.value = !dryRun.value}
                  class={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${dryRun.value ? 'bg-[var(--color-neon-purple)]' : 'bg-gray-700'}`}
                >
                  <span class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${dryRun.value ? 'translate-x-5' : 'translate-x-0'}`}/>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">Refresh Interval (Minutes)</label>
                  <input
                    type="number"
                    value={interval.value}
                    onInput$={(e) => (interval.value = Number((e.target as HTMLInputElement).value))}
                    class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-purple)] transition-all font-mono"
                  />
                </div>

                <div class="space-y-2">
                  <label class="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">System Theme</label>
                  <select
                    value={theme.value}
                    onChange$={(e) => (theme.value = (e.target as HTMLSelectElement).value)}
                    class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-purple)] transition-all appearance-none cursor-pointer"
                  >
                    <option value="default">Midnight Nebula (Default)</option>
                    <option value="purple">Vibrant Purple</option>
                    <option value="blue">Deep Ocean</option>
                    <option value="neon">Cyberpunk Neon</option>
                  </select>
                </div>
              </div>
            </div>

            {status.value && (
              <div class={`p-4 rounded-xl border text-sm font-bold tracking-tight animate-fade-in-up ${
                status.value.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {status.value.msg}
              </div>
            )}

            <div class="pt-6 border-t border-white/5">
              <button
                onClick$={handleSave}
                disabled={saving.value}
                class="w-full py-4 rounded-xl bg-[var(--color-neon-purple)] border border-purple-400/50 text-white font-black tracking-widest text-sm hover:bg-purple-500 hover:shadow-[0_0_30px_var(--color-neon-purple)] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {saving.value ? (
                   <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    SAVE SYSTEM CONFIGURATION
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); filter: blur(5px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Settings | Disablarr",
};
