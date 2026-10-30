import { getSupabaseClient } from '../supabase';

export interface UploadSoundOption {
  id: string;
  name: string;
  title: string;
  appReference: string;
  description: string;
  tag: string;
  notesSummary: string;
}

export const UPLOAD_SOUND_OPTIONS: UploadSoundOption[] = [
  {
    id: 'chime_classic',
    name: 'Chime Klasik (Standar)',
    title: 'Tangga Nada Ceria',
    appReference: 'Sistem Portal Standar',
    description: '3 nada C5-E5-G5 ceria, jernih, dan akrab terdengar di telinga.',
    tag: 'Standar',
    notesSummary: 'Do - Mi - Sol (C5-E5-G5)'
  },
  {
    id: 'apple_tritone',
    name: 'Apple iOS Tri-Tone',
    title: 'Khas iPhone & iPad',
    appReference: 'iOS / macOS Tri-Tone',
    description: 'Nada klasik 3 tingkat A4-C#5-E5 yang sangat jernih, renyah, dan prestisius.',
    tag: 'Apple iOS',
    notesSummary: 'Tri-Tone A4 - C#5 - E5'
  },
  {
    id: 'slack_knock',
    name: 'Slack Ding Knock',
    title: 'Modern Workplace',
    appReference: 'Slack / Enterprise Apps',
    description: 'Ketukan hollow ringkas disusul lonceng modern yang profesional & produktif.',
    tag: 'Slack Pro',
    notesSummary: 'Double-Tap Ding 880Hz'
  },
  {
    id: 'telegram_ping',
    name: 'Telegram Crisp Ping',
    title: 'Reaksi Segar & Gesit',
    appReference: 'Telegram Messenger',
    description: 'Nada gelembung air ultra-jernih (B5 -> E6) yang responsif dan sangat ringan.',
    tag: 'Telegram',
    notesSummary: 'Bubble Ping B5-E6'
  },
  {
    id: 'whatsapp_sent',
    name: 'WhatsApp Sent Ting',
    title: 'Konfirmasi Terkirim',
    appReference: 'WhatsApp Clean Sent',
    description: 'Dua nada gesit dengan akhiran ting lembut menandakan dokumen sukses terkirim.',
    tag: 'WhatsApp',
    notesSummary: 'Swoosh-Ting C6 (1046Hz)'
  },
  {
    id: 'google_bubble',
    name: 'Google Material Pop',
    title: 'Pixel Bubble Pop',
    appReference: 'Google Pixel / Android',
    description: 'Bunyi gelembung pop organik hangat khas antarmuka Google Material You.',
    tag: 'Material You',
    notesSummary: 'Warm Organic Pop'
  },
  {
    id: 'duo_victory',
    name: 'Duolingo Fanfare',
    title: 'Selebrasi Sukses Misi',
    appReference: 'Duolingo / Gamification',
    description: 'Melodi selebrasi kemenangan 4 nada gembira dan memicu kepuasan kerja.',
    tag: 'Selebrasi',
    notesSummary: 'Do - Mi - Sol - Do Tinggi'
  },
  {
    id: 'modern_bell',
    name: 'Modern Glass Bell',
    title: 'Lonceng Kristal Harmonis',
    appReference: 'Modern SaaS Dashboard',
    description: 'Resonansi nada ganda F5-A5-C6 dengan gema lembut profesional.',
    tag: 'Harmonis',
    notesSummary: 'Fa - La - Do tinggi (Harmonik)'
  },
  {
    id: 'soft_zen',
    name: 'Zen Bamboo Waterdrop',
    title: 'Tetesan Air Menenangkan',
    appReference: 'Calm & Headspace Apps',
    description: 'Dua nada pentatonik lembut G5-D6, tidak mengejutkan dan santun.',
    tag: 'Tenang & Halus',
    notesSummary: 'Sol - Re tinggi (Halus)'
  },
  {
    id: 'tech_beep',
    name: 'Cyber Future Beep',
    title: 'Dua Nada Kilat Digital',
    appReference: 'High-Tech Digital System',
    description: 'Dua nada digital ultra cepat (880Hz -> 1320Hz) yang gesit dan presisi.',
    tag: 'Futuristik',
    notesSummary: 'Digital Beep Kilat'
  },
  {
    id: 'melody_alhicam',
    name: 'Arpeggio Al-Hicam',
    title: 'Melodi Khusus Al-Hicam',
    appReference: 'SMP Al-Hicam Portal',
    description: 'Arpeggio 5 nada menawan (Do-Mi-Sol-Si-Do) khas portal arsip digital.',
    tag: 'Eksklusif',
    notesSummary: '5-Nada Arpeggio Gemerlap'
  }
];

const STORAGE_KEY = 'EARSIP_UPLOAD_SUCCESS_SOUND';
const DEFAULT_SOUND = 'chime_classic';

let cachedSoundId: string = DEFAULT_SOUND;

// Initialize cached sound id from localStorage safely
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && UPLOAD_SOUND_OPTIONS.some(opt => opt.id === saved)) {
      cachedSoundId = saved;
    }
  } catch {}
}

/**
 * Get active upload success sound id
 */
export function getActiveUploadSound(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && UPLOAD_SOUND_OPTIONS.some(opt => opt.id === saved)) {
        cachedSoundId = saved;
        return saved;
      }
    } catch {}
  }
  return cachedSoundId || DEFAULT_SOUND;
}

/**
 * Play specific or active upload success sound via Web Audio API synthesizer
 */
export function playUploadSuccessSound(soundId?: string) {
  if (typeof window === 'undefined') return;

  // Check if system audio is globally enabled
  try {
    const soundEnabled = localStorage.getItem('EARSIP_SOUND_ENABLED');
    if (soundEnabled === 'false') return;
  } catch {}

  const targetId = soundId || getActiveUploadSound();

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    const playTone = (
      freq: number, 
      startTime: number, 
      duration: number, 
      volume: number = 0.28, 
      type: OscillatorType = 'sine',
      endFreq?: number
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
      }

      // Smooth attack and decay to avoid clicking artifacts
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };

    switch (targetId) {
      case 'apple_tritone': {
        // Apple iOS Tri-Tone: A4 (440Hz), C#5 (554.37Hz), E5 (659.25Hz)
        playTone(440.00, t, 0.14, 0.26, 'sine');
        playTone(554.37, t + 0.11, 0.16, 0.28, 'sine');
        playTone(659.25, t + 0.23, 0.65, 0.32, 'triangle');
        playTone(1318.50, t + 0.23, 0.40, 0.08, 'sine'); // High crystalline shimmer
        break;
      }

      case 'slack_knock': {
        // Slack Knock Ding: subtle hollow tap followed by bright crisp bell
        // Hollow wood knock
        playTone(330.00, t, 0.05, 0.22, 'triangle', 220);
        // Snappy metallic ding
        playTone(880.00, t + 0.07, 0.35, 0.30, 'sine');
        playTone(1760.00, t + 0.07, 0.25, 0.12, 'sine');
        break;
      }

      case 'telegram_ping': {
        // Telegram Crisp Water Ping: quick upward glide B5 -> E6
        playTone(987.77, t, 0.06, 0.25, 'sine', 1318.51);
        playTone(1318.51, t + 0.05, 0.40, 0.30, 'sine');
        playTone(2637.00, t + 0.05, 0.20, 0.08, 'triangle');
        break;
      }

      case 'whatsapp_sent': {
        // WhatsApp Sent: swift low swoop then pleasant confirmation ting
        playTone(440.00, t, 0.08, 0.18, 'sine', 659.25);
        playTone(1046.50, t + 0.09, 0.35, 0.28, 'triangle');
        break;
      }

      case 'google_bubble': {
        // Google Pixel Material You: organic warm bubble pop
        playTone(420.00, t, 0.04, 0.25, 'sine', 340);
        playTone(660.00, t + 0.05, 0.18, 0.32, 'sine', 840);
        playTone(1200.00, t + 0.07, 0.15, 0.10, 'sine');
        break;
      }

      case 'duo_victory': {
        // Duolingo Fanfare: C5 -> E5 -> G5 -> C6 celebratory rapid fanfare
        playTone(523.25, t, 0.10, 0.24, 'triangle');
        playTone(659.25, t + 0.09, 0.11, 0.26, 'triangle');
        playTone(783.99, t + 0.19, 0.13, 0.28, 'triangle');
        playTone(1046.50, t + 0.30, 0.60, 0.34, 'sine');
        playTone(523.25, t + 0.30, 0.55, 0.15, 'sine');
        break;
      }

      case 'modern_bell': {
        // Modern Glass Bell: Harmonic blend F5 (698.46) + A5 (880) + C6 (1046.5)
        playTone(698.46, t, 0.45, 0.26, 'sine');
        playTone(880.00, t + 0.08, 0.55, 0.24, 'sine');
        playTone(1046.50, t + 0.16, 0.75, 0.28, 'triangle');
        break;
      }

      case 'soft_zen': {
        // Soft Zen: G5 (783.99) -> D6 (1174.66) delicate water drop
        playTone(783.99, t, 0.40, 0.20, 'sine');
        playTone(1174.66, t + 0.12, 0.75, 0.22, 'sine');
        break;
      }

      case 'tech_beep': {
        // Tech Beep: Quick high-tech double pulse
        playTone(880.00, t, 0.07, 0.25, 'sine');
        playTone(1318.51, t + 0.09, 0.18, 0.30, 'triangle');
        break;
      }

      case 'melody_alhicam': {
        // Arpeggio Al-Hicam: C5 -> E5 -> G5 -> B5 -> C6
        playTone(523.25, t, 0.12, 0.22, 'sine');
        playTone(659.25, t + 0.08, 0.14, 0.24, 'sine');
        playTone(783.99, t + 0.16, 0.16, 0.26, 'sine');
        playTone(987.77, t + 0.24, 0.20, 0.28, 'triangle');
        playTone(1046.50, t + 0.34, 0.70, 0.32, 'sine');
        playTone(523.25, t + 0.34, 0.60, 0.12, 'sine');
        break;
      }

      case 'chime_classic':
      default: {
        // Classic Chime: C5 (523.25) -> E5 (659.25) -> G5 (783.99)
        playTone(523.25, t, 0.16, 0.26, 'sine');
        playTone(659.25, t + 0.11, 0.20, 0.28, 'sine');
        playTone(783.99, t + 0.22, 0.50, 0.32, 'sine');
        break;
      }
    }
  } catch (err) {
    console.warn('Audio synthesis warning:', err);
  }
}

/**
 * Save active upload success sound & synchronize across all accounts and devices
 */
export async function saveActiveUploadSound(soundId: string, syncToCloud: boolean = true): Promise<boolean> {
  if (!UPLOAD_SOUND_OPTIONS.some(o => o.id === soundId)) {
    return false;
  }

  cachedSoundId = soundId;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, soundId);
    } catch {}

    // 1. Notify current window listeners
    window.dispatchEvent(new CustomEvent('earsip:upload-sound-updated', { detail: { soundId } }));

    // 2. Broadcast to other tabs / windows on this device
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('earsip_system_channel');
        bc.postMessage({ type: 'UPLOAD_SOUND_UPDATE', soundId });
        bc.close();
      }
    } catch {}
  }

  // 3. Synchronize to Supabase Cloud so all devices & all user accounts receive this setting
  if (syncToCloud) {
    try {
      const client = getSupabaseClient();
      if (client) {
        const payload = {
          id: 'SYS_UPLOAD_SOUND_CONFIG',
          tanggal: new Date().toLocaleDateString('id-ID'),
          tahun: new Date().getFullYear().toString(),
          identitas: '-',
          subjek: 'Pengaturan Suara Notifikasi Upload Sistem',
          kategori: 'SystemConfig',
          kategori_utama: 'SystemRegistry',
          nama_file_asli: soundId,
          ukuran: '1 KB',
          uploader: 'superadmin',
          is_trash: false
        };

        await client.from('arsip').upsert([payload], { onConflict: 'id' });

        // Broadcast to Supabase Realtime channel
        try {
          const channel = client.channel('global_settings_realtime');
          await channel.send({
            type: 'broadcast',
            event: 'upload_sound_change',
            payload: { soundId, timestamp: Date.now() }
          });
        } catch {}
      }
    } catch (err) {
      console.warn('Sync upload sound to Supabase warning:', err);
    }
  }

  return true;
}

/**
 * Fetch remote upload sound setting from Supabase Cloud
 */
export async function fetchRemoteUploadSound(): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('arsip')
      .select('nama_file_asli')
      .eq('id', 'SYS_UPLOAD_SOUND_CONFIG')
      .single();

    if (!error && data?.nama_file_asli) {
      const remoteSound = data.nama_file_asli.trim();
      if (UPLOAD_SOUND_OPTIONS.some(o => o.id === remoteSound)) {
        saveActiveUploadSound(remoteSound, false);
        return remoteSound;
      }
    }
  } catch (err) {
    // quiet fallback
  }
  return null;
}

/**
 * Initialize real-time synchronization listener for upload sound across all devices and accounts
 */
export function initUploadSoundSync(onSoundChanged?: (soundId: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Fetch remote setting from cloud on startup
  fetchRemoteUploadSound().then((remoteSound) => {
    if (remoteSound && onSoundChanged) {
      onSoundChanged(remoteSound);
    }
  }).catch(() => {});

  // 2. Local window event listener
  const handleLocalEvent = (e: any) => {
    if (e.detail?.soundId) {
      cachedSoundId = e.detail.soundId;
      if (onSoundChanged) onSoundChanged(e.detail.soundId);
    }
  };
  window.addEventListener('earsip:upload-sound-updated', handleLocalEvent);

  // 3. Multi-tab BroadcastChannel listener
  let bc: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('earsip_system_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'UPLOAD_SOUND_UPDATE' && event.data.soundId) {
          cachedSoundId = event.data.soundId;
          try {
            localStorage.setItem(STORAGE_KEY, event.data.soundId);
          } catch {}
          if (onSoundChanged) onSoundChanged(event.data.soundId);
        }
      };
    }
  } catch {}

  // 4. Supabase Realtime Channel Subscription
  let realtimeChannel: any = null;
  try {
    const client = getSupabaseClient();
    if (client) {
      realtimeChannel = client
        .channel('global_settings_realtime')
        .on('broadcast', { event: 'upload_sound_change' }, (msg: any) => {
          const soundId = msg.payload?.soundId;
          if (soundId && UPLOAD_SOUND_OPTIONS.some(o => o.id === soundId)) {
            cachedSoundId = soundId;
            try {
              localStorage.setItem(STORAGE_KEY, soundId);
            } catch {}
            if (onSoundChanged) onSoundChanged(soundId);
          }
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'arsip', filter: 'id=eq.SYS_UPLOAD_SOUND_CONFIG' },
          () => {
            fetchRemoteUploadSound().then(remoteSound => {
              if (remoteSound && onSoundChanged) {
                onSoundChanged(remoteSound);
              }
            }).catch(() => {});
          }
        )
        .subscribe();
    }
  } catch (err) {
    console.warn('Realtime subscription notice:', err);
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('earsip:upload-sound-updated', handleLocalEvent);
    if (bc) {
      try { bc.close(); } catch {}
    }
    if (realtimeChannel) {
      try {
        const client = getSupabaseClient();
        client?.removeChannel(realtimeChannel);
      } catch {}
    }
  };
}
