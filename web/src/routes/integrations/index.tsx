import { component$, useSignal, useVisibleTask$, $, useTask$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api } from "../../api/client";

export default component$(() => {
  const isHovered = useSignal(false);
  const integrations = useSignal<any[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const status = useSignal<{ type: 'success' | 'error', msg: string } | null>(null);

  const fetchIntegrations = $(async () => {
    loading.value = true;
    try {
      const data = await api.listIntegrations();
      integrations.value = data;
    } catch (e: any) {
      error.value = "Failed to load integrations";
    } finally {
      loading.value = false;
    }
  });

  useVisibleTask$(() => {
    fetchIntegrations();
  });

  const handleToggleUnmonitor = $(async (integration: any) => {
    try {
      await api.updateIntegration(integration.id, {
        ...integration,
        unmonitor_completed_seasons: !integration.unmonitor_completed_seasons,
      });
      await fetchIntegrations();
    } catch (e: any) {
       console.error(e);
    }
  });

  const handleTestConnection = $(async (integration: any) => {
    try {
      const result = await api.testConnection(integration.url, integration.api_key);
      status.value = result.success 
        ? { type: 'success', msg: "Connection successful!" } 
        : { type: 'error', msg: "Connection failed: " + result.error };
      setTimeout(() => status.value = null, 3000);
    } catch (e: any) {
      status.value = { type: 'error', msg: "Test failed: " + e.message };
      setTimeout(() => status.value = null, 5000);
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
        class="glass-panel p-10 md:p-14 rounded-3xl w-full max-w-4xl relative z-10 
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
                Integrations
              </h1>
            </div>
            <p class="text-sm text-gray-400 font-medium tracking-wide pl-[3.25rem]">
              Manage service endpoints and service-specific behaviors
            </p>
          </div>
          
          <button class="px-6 py-2.5 rounded-lg bg-[var(--color-neon-purple)] border border-purple-400/50 text-white font-bold text-sm hover:bg-purple-500 hover:shadow-[0_0_20px_var(--color-neon-purple)] transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Connection
          </button>
        </header>

        {loading.value ? (
           <div class="flex items-center justify-center py-20">
              <div class="w-10 h-10 border-4 border-white/10 border-t-[var(--color-neon-purple)] rounded-full animate-spin" />
           </div>
        ) : error.value ? (
           <div class="p-8 text-center glass-panel border-red-500/20 text-red-400 rounded-2xl">
              {error.value}
           </div>
        ) : (
          <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {status.value && (
              <div class={`md:col-span-2 p-4 rounded-xl border text-sm font-bold tracking-tight animate-fade-in-up ${
                status.value.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {status.value.msg}
              </div>
            )}
            {integrations.value.map((integration) => (
              <div key={integration.id} class={`glass-panel p-6 rounded-2xl border border-white/10 hover:border-${integration.type === 'sonarr' ? 'blue' : 'yellow'}-500/40 relative overflow-hidden group transition-all duration-300`}>
                <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                  <div class={`w-32 h-32 rounded-full blur-3xl bg-${integration.type === 'sonarr' ? 'blue' : 'yellow'}-500`}></div>
                </div>
                
                <div class="relative z-10 flex items-start justify-between mb-6">
                  <div class="flex items-start gap-4">
                    <div class={`w-10 h-10 rounded-xl bg-${integration.type === 'sonarr' ? 'blue' : 'yellow'}-500 flex items-center justify-center shadow-lg text-${integration.type === 'sonarr' ? 'white' : 'yellow-950'}`}>
                      {integration.type === 'sonarr' ? (
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      ) : (
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 13.572l-7.5 7.428l-7.5 -7.428m0 0a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/></svg>
                      )}
                    </div>
                    <div>
                      <h2 class="text-xl font-bold text-white tracking-wide capitalize">{integration.type}</h2>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                        <span class="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Enabled</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick$={() => handleTestConnection(integration)}
                    class="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Test
                  </button>
                </div>

                <div class="space-y-4 relative z-10">
                  <div class="space-y-1">
                    <label class="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">API Endpoint</label>
                    <div class="glass-panel w-full p-2.5 rounded-lg border border-white/5 bg-black/20 text-gray-300 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                      {integration.url}
                    </div>
                  </div>
                  
                  <div class="space-y-1">
                    <label class="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">API Key</label>
                    <div class="glass-panel w-full p-2.5 rounded-lg border border-white/5 bg-black/20 flex items-center justify-between">
                      <span class="text-gray-400 font-mono text-xs flex items-center">
                        <span class="tracking-[0.2em] opacity-30 mt-0.5 inline-block align-middle pb-1">•••••</span>
                        <span class={`${integration.type === 'sonarr' ? 'text-blue-300' : 'text-yellow-300'} font-bold ml-1 tracking-widest`}>
                          {integration.api_key ? integration.api_key.slice(-4) : 'ERR'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {integration.type === 'sonarr' && (
                    <div class="flex items-center justify-between p-3.5 rounded-lg border border-white/5 bg-white/5 mt-6 border-t border-white/10">
                      <div>
                        <h3 class="text-sm font-semibold text-gray-200">Unmonitor Seasons</h3>
                        <p class="text-xs text-gray-500 mt-1 max-w-[200px] leading-relaxed">Automatically unmonitor a season once fully downloaded.</p>
                      </div>
                      <button 
                        onClick$={() => handleToggleUnmonitor(integration)}
                        class={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${integration.unmonitor_completed_seasons ? 'bg-blue-500' : 'bg-gray-600'}`}
                      >
                        <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${integration.unmonitor_completed_seasons ? 'translate-x-4' : 'translate-x-0'}`}/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
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
  title: "Integrations | Disablarr",
};
