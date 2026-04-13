import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, getApiBase } from "../api/client";

export default component$(() => {
  const mouseX = useSignal(-1000);
  const mouseY = useSignal(-1000);
  const isHovered = useSignal(false);
  const scanActive = useSignal(false);
  const engineOnline = useSignal(false);
  
  const libraryCount = useSignal(0);
  const activeCount = useSignal(0);
  const unmonitorCount = useSignal(0);

  const logContainerRef = useSignal<Element>();
  
  const logs = useSignal<string[]>([
    "[SYSTEM] Connecting to Command Center stream...",
  ]);

  // Handle manual trigger
  const handleTrigger = $(async () => {
    if (scanActive.value) return;
    scanActive.value = true;
    try {
      await api.triggerEngine();
      logs.value = [...logs.value, `[SYSTEM] Manual engine scan triggered successfully.`].slice(-100);
    } catch (e: any) {
      logs.value = [...logs.value, `[ERROR] Failed to trigger engine: ${e.message}`].slice(-100);
    } finally {
      setTimeout(() => scanActive.value = false, 2000);
    }
  });

  // Auto-scroll logic for the virtual log viewer
  useVisibleTask$(({ track }) => {
    track(() => logs.value);
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
    }
  });

  // Real-time integration (SSE)
  useVisibleTask$(({ cleanup }) => {
    // Initial status fetch
    api.getEngineStatus().then(status => {
      engineOnline.value = status.running;
      libraryCount.value = status.library_count;
      activeCount.value = status.active_count;
      unmonitorCount.value = status.unmonitor_count;
    }).catch(console.error);

    const apiBase = getApiBase();
    const token = localStorage.getItem("disablarr_token");
    const eventSource = new EventSource(`${apiBase}/events?token=${token}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'log') {
        logs.value = [...logs.value, data.message].slice(-100);
      } else if (data.type === 'engine_status') {
        engineOnline.value = data.status.running;
        libraryCount.value = data.status.library_count;
        activeCount.value = data.status.active_count;
        unmonitorCount.value = data.status.unmonitor_count;
      }
    };

    eventSource.onerror = () => {
      logs.value = [...logs.value, "[SYSTEM] Connection lost. Retrying..."].slice(-100);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.value = e.clientX;
      mouseY.value = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    cleanup(() => {
      eventSource.close();
      window.removeEventListener("mousemove", handleMouseMove);
    });
  });

  return (
    <div class="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-[#05050A]">
      {/* Neon Tracking Glow */}
      <div 
        class="pointer-events-none absolute w-[800px] h-[800px] rounded-full blur-[100px] transition-opacity duration-700 ease-out z-0"
        style={{
          background: "radial-gradient(circle, oklch(0.5 0.3 290 / 0.3) 0%, transparent 60%)",
          left: `${mouseX.value}px`,
          top: `${mouseY.value}px`,
          transform: "translate(-50%, -50%)",
          opacity: isHovered.value ? "1" : "0.15"
        }}
      />
      
      {/* Base ambient gradient */}
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,_oklch(0.2_0.1_290)_0%,_transparent_50%)] pointer-events-none z-0" />

      {/* Main Container */}
      <main 
        class="glass-panel p-10 md:p-14 rounded-3xl w-full max-w-5xl relative z-10 
               border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] 
               transition-all duration-700 hover:shadow-[0_0_80px_var(--color-neon-purple)] 
               animate-[fade-in-up_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        onMouseEnter$={() => isHovered.value = true}
        onMouseLeave$={() => isHovered.value = false}
      >
        <header class="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 class="text-5xl font-black tracking-tight mb-2 text-white">
              Disablarr <span class="glow-text text-[var(--color-neon-purple)]">v2</span>
            </h1>
            <p class="text-sm text-gray-400 font-medium tracking-widest uppercase">
              Command Center
            </p>
          </div>
          
          <div class="flex flex-wrap items-center gap-4">
            {/* Trigger Scan Button moved up */}
            <button 
              class="px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 hover:border-white/20 font-semibold text-sm transition-all active:scale-95 flex items-center gap-2 group"
              onClick$={handleTrigger}
            >
              <svg class={`w-4 h-4 text-gray-400 group-hover:text-white transition-colors ${scanActive.value ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Manual Scan
            </button>

            {/* Integrations Button */}
            <Link href="/integrations" class="px-5 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-100 font-semibold text-sm flex items-center gap-2 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 115.656 5.656l-1.101 1.101" /></svg>
              Integrations
            </Link>

            {/* General Settings Button */}
            <Link href="/settings" class="px-5 py-2.5 rounded-lg bg-gray-500/10 border border-white/10 text-gray-300 font-semibold text-sm flex items-center gap-2 hover:bg-white/5 hover:border-white/20 transition-all">
              <svg class="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </Link>

            {/* Logs Button */}
            <Link href="/logs" class="px-5 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-100 font-semibold text-sm flex items-center gap-2 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Logs
            </Link>

            {/* Status Display */}
            <div 
              class={`px-4 py-2.5 rounded-lg border flex items-center gap-2.5 transition-all ${
                engineOnline.value 
                  ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                  : 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              }`}
            >
              <div class={`w-2.5 h-2.5 rounded-full transition-colors ${engineOnline.value ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
              <span class={`text-[11px] font-bold uppercase tracking-widest transition-colors ${engineOnline.value ? 'text-green-400' : 'text-red-400'}`}>
                {engineOnline.value ? 'Online' : 'Paused'}
              </span>
            </div>
          </div>
        </header>

        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {/* Card 1 */}
          <div class="glass-panel p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-default relative overflow-hidden">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Total Library</h3>
            <div class="text-4xl font-light text-white tracking-tight relative z-10">{libraryCount.value.toLocaleString()} 
              <span class="text-sm text-gray-500 ml-2 font-medium tracking-normal">Items</span>
            </div>
          </div>
          
          {/* Card 2 */}
          <div class="glass-panel p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-default relative overflow-hidden">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Active Monitored</h3>
            <div class="text-4xl font-light text-white tracking-tight relative z-10">{activeCount.value.toLocaleString()}
              <span class="text-sm text-gray-500 ml-2 font-medium tracking-normal">Monitored</span>
            </div>
          </div>
          
          {/* Card 3 */}
          <div class="glass-panel p-6 rounded-xl border border-[var(--color-neon-purple)]/30 bg-[var(--color-neon-purple)]/5 md:col-span-2 lg:col-span-1 hover:border-[var(--color-neon-purple)]/60 transition-all cursor-default relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-purple)]/10 to-transparent pointer-events-none"></div>
            <h3 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-neon-purple)] mb-3 drop-shadow-sm">Unmonitored Mappings</h3>
            <div class="text-4xl font-semibold text-white tracking-tight relative z-10">{unmonitorCount.value.toLocaleString()}
              <span class="text-sm text-[var(--color-neon-purple)] ml-2 font-medium tracking-normal">Saved</span>
            </div>
          </div>
        </section>

        {/* Streaming Log Feed - Updated for height and scrolling */}
        <section class="mb-2">
          <div class="flex items-center gap-3 mb-4 px-2">
            <div class="w-1.5 h-4 bg-gray-500 rounded-full"></div>
            <h2 class="text-sm font-semibold tracking-[0.15em] uppercase text-gray-400">Live Agent Stream</h2>
          </div>
          
          <div class="glass-panel rounded-xl border border-white/5 h-[320px] relative">
            <div 
              ref={logContainerRef}
              class="flex flex-col gap-1.5 h-full overflow-y-auto px-4 py-4 font-mono text-[13px] tracking-wide relative z-10 custom-scrollbar scroll-smooth"
            >
              {logs.value.map((log, i) => (
                <div 
                  key={log + i} 
                  class={`animate-[typewriter_0.2s_steps(40)_forwards] whitespace-nowrap leading-relaxed
                         ${log.includes('SUCCESS') ? 'text-green-400' : 
                           log.includes('RADARR') ? 'text-yellow-400' : 
                           log.includes('SONARR') ? 'text-blue-400' : 
                           log.includes('Engine paused') ? 'text-red-400' :
                           'text-gray-300'}`}
                >
                  <span class="text-gray-500 mr-3 opacity-60">[{new Date().toISOString().split('T')[1].slice(0,8)}]</span>
                  {log}
                </div>
              ))}
            </div>
            
            {/* Fade out over the scrolling text but without capturing mouse events */}
            <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--color-glass-dark)] to-transparent z-20 pointer-events-none rounded-b-xl border-b border-white/5"></div>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes typewriter {
          from { max-width: 0; opacity: 0; }
          to { max-width: 100%; opacity: 1; }
        }

        /* Custom OS-like styling for our log scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.4); /* Neon purple accent on hover */
        }
      `}</style>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Disablarr | Command Center",
};
