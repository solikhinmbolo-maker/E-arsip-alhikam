export interface AvatarItem {
  id: string;
  name: string;
  category: 'notion' | 'hijab' | 'pria' | 'wanita' | 'anime' | 'tech' | 'inisial';
  url: string;
}

export interface AvatarCategoryTab {
  id: 'all' | 'notion' | 'hijab' | 'pria' | 'wanita' | 'anime' | 'tech' | 'inisial';
  label: string;
  badge: string;
}

export const AVATAR_CATEGORIES: AvatarCategoryTab[] = [
  { id: 'all', label: 'Semua', badge: '🌟' },
  { id: 'notion', label: 'Notion Estetik', badge: '💫' },
  { id: 'hijab', label: 'Muslimah / Hijab', badge: '🧕' },
  { id: 'pria', label: 'Pria Kekinian', badge: '👨‍💼' },
  { id: 'wanita', label: 'Wanita Modis', badge: '👩‍💼' },
  { id: 'anime', label: 'Webtoon / Anime', badge: '✨' },
  { id: 'tech', label: 'Tech & Mascot', badge: '🤖' },
  { id: 'inisial', label: 'Warna Inisial', badge: '🔤' }
];

export function getFullAvatarCatalog(displayName: string = 'User'): AvatarItem[] {
  const safeName = encodeURIComponent(displayName.trim() || 'User');

  return [
    // =========================================================================
    // 1. KATEGORI: NOTION STYLE ESTETIK (Sangat Populer, Minimalis & Kekinian)
    // =========================================================================
    {
      id: 'notion-1',
      name: 'Notion Admin Pro',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=DigitalAdmin&backgroundColor=b6e3f4'
    },
    {
      id: 'notion-2',
      name: 'Notion Fatma Estetik',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=FatmaAesthetic&backgroundColor=ffd5dc'
    },
    {
      id: 'notion-3',
      name: 'Notion Smart Teacher',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=SmartTeacher&backgroundColor=c0aede'
    },
    {
      id: 'notion-4',
      name: 'Notion Creative Staff',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=FutureStaff&backgroundColor=ffdfbf'
    },
    {
      id: 'notion-5',
      name: 'Notion Rizky Trend',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=RizkyTrend&backgroundColor=d1d4f9'
    },
    {
      id: 'notion-6',
      name: 'Notion Maya Elegan',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=MayaChic&backgroundColor=b6e3f4'
    },
    {
      id: 'notion-7',
      name: 'Notion Fajar Minimalis',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=FajarMinimal&backgroundColor=c0aede'
    },
    {
      id: 'notion-8',
      name: 'Notion Zahra Ceria',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=ZahraSmile&backgroundColor=ffd5dc'
    },
    {
      id: 'notion-9',
      name: 'Notion Hendra Santai',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=HendraChill&backgroundColor=ffdfbf'
    },
    {
      id: 'notion-10',
      name: 'Notion Dinda Modern',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=DindaModern&backgroundColor=d1d4f9'
    },
    {
      id: 'notion-11',
      name: 'Notion Dimas Keren',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=DimasCool&backgroundColor=b6e3f4'
    },
    {
      id: 'notion-12',
      name: 'Notion Sarah Smart',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=SarahSmart&backgroundColor=ffd5dc'
    },
    {
      id: 'notion-13',
      name: 'Notion Budi Kreatif',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=BudiCreative&backgroundColor=c0aede'
    },
    {
      id: 'notion-14',
      name: 'Notion Alisa Fresh',
      category: 'notion',
      url: 'https://api.dicebear.com/7.x/notionists/svg?seed=AlisaFresh&backgroundColor=ffdfbf'
    },

    // =========================================================================
    // 2. KATEGORI: MUSLIMAH & HIJAB (Ramah, Tersenyum, Rapi & Elegan)
    // =========================================================================
    {
      id: 'hijab-1',
      name: 'Bu Fatimah (Hijab Pink)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FatimahModis&top=hijab&mouth=smile&eyes=happy&backgroundColor=ffd5dc'
    },
    {
      id: 'hijab-2',
      name: 'Bu Zahra (Hijab Ungu)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ZahraChic&top=hijab&mouth=smile&eyes=default&backgroundColor=c0aede'
    },
    {
      id: 'hijab-3',
      name: 'Bu Aisyah (Hijab Biru)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AisyahSmile&top=hijab&mouth=smile&eyes=happy&backgroundColor=b6e3f4'
    },
    {
      id: 'hijab-4',
      name: 'Bu Nurul (Hijab Peach)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NurulAdinda&top=hijab&mouth=smile&eyes=default&backgroundColor=ffdfbf'
    },
    {
      id: 'hijab-5',
      name: 'Bu Khadijah (Hijab Lavender)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KhadijahAnggun&top=hijab&mouth=smile&eyes=happy&backgroundColor=d1d4f9'
    },
    {
      id: 'hijab-6',
      name: 'Bu Salma (Hijab Tosca)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SalmaCeria&top=hijab&mouth=smile&eyes=default&backgroundColor=b6e3f4'
    },
    {
      id: 'hijab-7',
      name: 'Bu Maryam (Hijab Coral)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MaryamManis&top=hijab&mouth=smile&eyes=happy&backgroundColor=ffd5dc'
    },
    {
      id: 'hijab-8',
      name: 'Bu Nabila (Hijab Pastel)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NabilaSyifa&top=hijab&mouth=smile&eyes=default&backgroundColor=c0aede'
    },
    {
      id: 'hijab-9',
      name: 'Bu Hana (Hijab Vanilla)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HanaSafira&top=hijab&mouth=smile&eyes=happy&backgroundColor=ffdfbf'
    },
    {
      id: 'hijab-10',
      name: 'Bu Syarifah (Hijab Indigo)',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SyarifahAlwi&top=hijab&mouth=smile&eyes=default&backgroundColor=d1d4f9'
    },
    {
      id: 'hijab-11',
      name: 'Muslimah Lorelei Soft',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=HijabAesthetic1&backgroundColor=ffd5dc'
    },
    {
      id: 'hijab-12',
      name: 'Muslimah Lorelei Chic',
      category: 'hijab',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=HijabAesthetic2&backgroundColor=c0aede'
    },

    // =========================================================================
    // 3. KATEGORI: PRIA KEKINIAN (Gaya Rambut Modern, Kacamata, Ramah & Rapi)
    // =========================================================================
    {
      id: 'pria-1',
      name: 'Pak Leo (Kacamata Trendy)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=LeoModern&backgroundColor=b6e3f4'
    },
    {
      id: 'pria-2',
      name: 'Pak Arka (Gaya Santai)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=ArkaTrend&backgroundColor=c0aede'
    },
    {
      id: 'pria-3',
      name: 'Pak Rehan (Urban Casual)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=RehanCool&backgroundColor=d1d4f9'
    },
    {
      id: 'pria-4',
      name: 'Pak Farhan (Tersenyum Hangat)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=FarhanSmile&backgroundColor=b6e3f4'
    },
    {
      id: 'pria-5',
      name: 'Pak Kevin (Professional Pro)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=KevinPro&backgroundColor=ffdfbf'
    },
    {
      id: 'pria-6',
      name: 'Pak Adrian (Smart Casual)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=AdrianSmart&backgroundColor=ffd5dc'
    },
    {
      id: 'pria-7',
      name: 'Pak Danar (Kacamata Bulat)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=DanarGlasses&backgroundColor=b6e3f4'
    },
    {
      id: 'pria-8',
      name: 'Pak Gilang (Gaya Rambut Pompadour)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=GilangHair&backgroundColor=c0aede'
    },
    {
      id: 'pria-9',
      name: 'Pak Ilham (Edu Creator)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=IlhamCreator&backgroundColor=d1d4f9'
    },
    {
      id: 'pria-10',
      name: 'Pak Surya (Pendidik Ceria)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=SuryaCeria&backgroundColor=ffdfbf'
    },
    {
      id: 'pria-11',
      name: 'Pak Naufal (Streetwear Kekinian)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=NaufalCool&backgroundColor=b6e3f4'
    },
    {
      id: 'pria-12',
      name: 'Pak Hafiz (Kerah Rapi)',
      category: 'pria',
      url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=HafizSmart&backgroundColor=c0aede'
    },

    // =========================================================================
    // 4. KATEGORI: WANITA MODIS & ESTETIK (Modern, Senyum Manis, Rapi)
    // =========================================================================
    {
      id: 'wanita-1',
      name: 'Bu Clara (Modis Chic)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ClaraChic&backgroundColor=ffd5dc'
    },
    {
      id: 'wanita-2',
      name: 'Bu Nadia (Senyum Manis)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=NadiaSmile&backgroundColor=c0aede'
    },
    {
      id: 'wanita-3',
      name: 'Bu Amanda (Profesional Muda)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=AmandaPro&backgroundColor=ffd5dc'
    },
    {
      id: 'wanita-4',
      name: 'Bu Jessica (Kacamata Elegan)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=JessicaGlasses&backgroundColor=b6e3f4'
    },
    {
      id: 'wanita-5',
      name: 'Bu Kirana (Rambut Bob Trendy)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=KiranaBob&backgroundColor=ffdfbf'
    },
    {
      id: 'wanita-6',
      name: 'Bu Tiara (Anggun Pastel)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=TiaraPastel&backgroundColor=d1d4f9'
    },
    {
      id: 'wanita-7',
      name: 'Bu Vania (Modern Minimal)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/micah/svg?seed=VaniaModern&backgroundColor=c0aede'
    },
    {
      id: 'wanita-8',
      name: 'Bu Bella (Gaya Ceria)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=BellaHappy&backgroundColor=ffd5dc'
    },
    {
      id: 'wanita-9',
      name: 'Bu Olivia (Kreatif Smart)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=OliviaSmart&backgroundColor=b6e3f4'
    },
    {
      id: 'wanita-10',
      name: 'Bu Renata (Staf Administrasi)',
      category: 'wanita',
      url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=RenataAdmin&backgroundColor=ffdfbf'
    },

    // =========================================================================
    // 5. KATEGORI: WEBTOON & ANIME STYLE (Sangat Digemari, Dinamis & Keren)
    // =========================================================================
    {
      id: 'anime-1',
      name: 'Kai Webtoon Hero',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KaiWebtoon&backgroundColor=b6e3f4'
    },
    {
      id: 'anime-2',
      name: 'Ren Manga Stylist',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RenManga&backgroundColor=c0aede'
    },
    {
      id: 'anime-3',
      name: 'Hana Anime Ceria',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HanaAnime&backgroundColor=ffd5dc'
    },
    {
      id: 'anime-4',
      name: 'Yuki Chic Webtoon',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=YukiChic&backgroundColor=ffdfbf'
    },
    {
      id: 'anime-5',
      name: 'Kenji Modern Adventurer',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KenjiAdventurer&backgroundColor=d1d4f9'
    },
    {
      id: 'anime-6',
      name: 'Aoi Cute Manga',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AoiManga&backgroundColor=ffd5dc'
    },
    {
      id: 'anime-7',
      name: 'Haru School Pro',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HaruSchool&backgroundColor=b6e3f4'
    },
    {
      id: 'anime-8',
      name: 'Rin Scholar Webtoon',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RinScholar&backgroundColor=c0aede'
    },
    {
      id: 'anime-9',
      name: 'Sora Sky Adventurer',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SoraSky&backgroundColor=b6e3f4'
    },
    {
      id: 'anime-10',
      name: 'Mio Cheerful Anime',
      category: 'anime',
      url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MioAnime&backgroundColor=ffd5dc'
    },

    // =========================================================================
    // 6. KATEGORI: TECH & DIGITAL MASCOT (Futuristik, Bot AI, Ikon Modern)
    // =========================================================================
    {
      id: 'tech-1',
      name: 'Cyber Alpha Guard',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberAlpha&backgroundColor=b6e3f4'
    },
    {
      id: 'tech-2',
      name: 'Neon Bot Assistant',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonBot&backgroundColor=c0aede'
    },
    {
      id: 'tech-3',
      name: 'Quantum Cloud Bot',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumCloud&backgroundColor=d1d4f9'
    },
    {
      id: 'tech-4',
      name: 'Digital Arsip Mascot',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ArsipTechMascot&backgroundColor=ffdfbf'
    },
    {
      id: 'tech-5',
      name: 'Campus AI Helper',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CampusAI&backgroundColor=ffd5dc'
    },
    {
      id: 'tech-6',
      name: 'Smart School Sentinel',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SchoolSentinel&backgroundColor=b6e3f4'
    },
    {
      id: 'tech-7',
      name: 'Data Spark Bot',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DataSpark&backgroundColor=c0aede'
    },
    {
      id: 'tech-8',
      name: 'Server Sync Mascot',
      category: 'tech',
      url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ServerSync&backgroundColor=ffdfbf'
    },

    // =========================================================================
    // 7. KATEGORI: WARNA INISIAL ELEGAN (UI-Avatars Bergradasi Halus)
    // =========================================================================
    {
      id: 'inisial-1',
      name: 'Inisial Biru Safir',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=2563eb&color=fff&size=120`
    },
    {
      id: 'inisial-2',
      name: 'Inisial Zamrud Hijau',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=059669&color=fff&size=120`
    },
    {
      id: 'inisial-3',
      name: 'Inisial Indigo Malam',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=4f46e5&color=fff&size=120`
    },
    {
      id: 'inisial-4',
      name: 'Inisial Ungu Violet',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=7c3aed&color=fff&size=120`
    },
    {
      id: 'inisial-5',
      name: 'Inisial Mawar Merah',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=e11d48&color=fff&size=120`
    },
    {
      id: 'inisial-6',
      name: 'Inisial Amber Emas',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=d97706&color=fff&size=120`
    },
    {
      id: 'inisial-7',
      name: 'Inisial Biru Cyan Laut',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=0891b2&color=fff&size=120`
    },
    {
      id: 'inisial-8',
      name: 'Inisial Slate Elegan',
      category: 'inisial',
      url: `https://ui-avatars.com/api/?name=${safeName}&background=334155&color=fff&size=120`
    }
  ];
}
