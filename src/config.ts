// Загальні налаштування сайту Praxis.
// Тут змінюються назви розділів, підписи інтерфейсу, посилання на Telegram та дані авторки.

export type Lang = 'uk' | 'en';
export const LANGS: Lang[] = ['uk', 'en'];

export const SITE = {
  name: 'Praxis',
  // Посилання на Telegram-канал. Якщо залишити порожнім — кнопки Telegram на сайті приховані.
  telegramUrl: 'https://t.me/prosthetics_ukraine',
  repoUrl: 'https://github.com/marynahurak/praxis',
  since: 2026,
  author: {
    uk: { name: 'Марина Гурак', short: 'Гурак М.', role: 'Протезистка-ортезистка, фізична терапевтка', initials: 'МГ' },
    en: { name: 'Maryna Hurak', short: 'Hurak M.', role: 'Prosthetist-Orthotist, Physical Therapist', initials: 'MH' },
  },
} as const;

export const SECTIONS = {
  'upper-limb': {
    num: '01',
    uk: { title: 'Верхня кінцівка', desc: 'Міоелектричне керування (EMG, FMG, SMG), куксоприймачі, багатосуглобові кисті, остеоінтеграція.' },
    en: { title: 'Upper Limb', desc: 'Myoelectric control (EMG, FMG, SMG), socket design, multi-articulating hands, osseointegration.' },
  },
  'lower-limb': {
    num: '02',
    uk: { title: 'Нижня кінцівка', desc: 'Геометрія куксоприймачів, системи підвісу, колінні модулі з мікропроцесором, стопи ESAR.' },
    en: { title: 'Lower Limb', desc: 'Socket geometry, suspension systems, microprocessor knees, ESAR feet.' },
  },
  orthotics: {
    num: '03',
    uk: { title: 'Ортезування', desc: 'Біомеханіка корекції, матеріали, ортези від стопи до хребта.' },
    en: { title: 'Orthotics', desc: 'Corrective biomechanics, materials, orthoses from foot to spine.' },
  },
  gait: {
    num: '04',
    uk: { title: 'Хода', desc: 'Кінематика й кінетика, вектор реакції опори (GRF), лабораторія проти реальної телеметрії IMU.' },
    en: { title: 'Gait', desc: 'Kinematics and kinetics, ground reaction force (GRF), the gait lab versus real-world IMU telemetry.' },
  },
  textbooks: {
    num: '05',
    uk: { title: 'Підручники', desc: 'Розбори базових підручників і довідкових текстів для навчання та підготовки.' },
    en: { title: 'Textbooks', desc: 'Reviews of core textbooks and reference texts for study and exam preparation.' },
  },
} as const;
export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

export const CATEGORIES = {
  news: { uk: 'Новини', en: 'News' },
  research: { uk: 'Дослідження', en: 'Research' },
  biomechanics: { uk: 'Біомеханіка', en: 'Biomechanics' },
  discussion: { uk: 'Обговорення', en: 'Discussion' },
} as const;
export type CategoryKey = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export const CONFIDENCE = {
  high: { label: 'HIGH', uk: 'Узгоджені дані систематичних оглядів або RCT', en: 'Consistent evidence from systematic reviews or RCTs' },
  moderate: { label: 'MODERATE', uk: 'Когортні чи лабораторні дані з обмеженнями', en: 'Cohort or laboratory data with limitations' },
  low: { label: 'LOW', uk: 'Механістичне міркування або думка експертів', en: 'Mechanistic reasoning or expert opinion' },
  unknown: { label: 'UNKNOWN', uk: 'Потребує верифікації', en: 'Needs verification' },
} as const;
export type ConfidenceKey = keyof typeof CONFIDENCE;
export const CONFIDENCE_KEYS = Object.keys(CONFIDENCE) as ConfidenceKey[];

export const EVIDENCE_LEVELS = [
  { w: 100, uk: 'Систематичні огляди та метааналізи', en: 'Systematic reviews and meta-analyses' },
  { w: 86, uk: 'Рандомізовані контрольовані дослідження (RCT)', en: 'Randomised controlled trials (RCTs)' },
  { w: 72, uk: 'Проспективні когортні та «випадок — контроль»', en: 'Prospective cohort and case-control studies' },
  { w: 58, uk: 'Поперечні та лабораторні біомеханічні', en: 'Cross-sectional and laboratory biomechanical studies' },
  { w: 44, uk: 'Міжнародні стандарти та консенсуси (ISPO, ISO)', en: 'International standards and consensus (ISPO, ISO)' },
  { w: 30, uk: 'Механістичне міркування — завжди позначене явно', en: 'Mechanistic reasoning — always labelled explicitly' },
] as const;

function pluralUk(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const t = {
  uk: {
    locale: 'uk-UA',
    skip: 'Перейти до змісту',
    homeLabel: 'Praxis — на головну',
    langLabel: 'Мова сайту',
    searchLabel: 'Пошук',
    nav: { label: 'Основна навігація', library: 'Бібліотека', sections: 'Розділи', method: 'Рівні доказів', about: 'Про Praxis' },
    siteDescription:
      'Незалежна база знань з доказової практики протезування, ортезування та реабілітаційної інженерії. Аналіз досліджень і біомеханіки для мультидисциплінарних команд.',
    hero: {
      eyebrow: 'Незалежна база знань · протезування · ортезування · реабілітаційна інженерія',
      title: 'Доказова практика протезування та ортезування — від статті до примірочної',
      lead: 'Praxis розбирає дослідження, біомеханіку та маркетингові заяви виробників і перетворює їх на рішення для мультидисциплінарної команди. Для протезистів-ортезистів, фізичних терапевтів, лікарів ФРМ і реабілітаційних інженерів.',
      searchLabel: 'Пошук у базі знань',
      searchPlaceholder: 'Пістонування, LOSO, ICS, екранування навантаження…',
      searchButton: 'Шукати',
      topicsLabel: 'Часті теми:',
      topics: ['Міоелектричне керування', 'Підвіс куксоприймача', 'Остеоінтеграція', 'Аналіз ходи'],
    },
    evidence: { title: 'Ієрархія доказів Praxis', confidenceIntro: 'Позначки впевненості, якими редакція маркує статті:' },
    sections: {
      title: 'Розділи бази знань',
      lead: 'Та сама структура, що й гілки в Telegram: кожен пост стає постійною статтею з пошуком, тегами й посиланнями на джерела.',
      count: (n: number) => (n === 0 ? 'Скоро' : `${n} ${pluralUk(n, 'стаття', 'статті', 'статей')} →`),
      empty: 'У цьому розділі поки немає статей.',
      emptyOther: '',
      back: 'Усі розділи',
    },
    latest: { title: 'Нові матеріали', all: 'Усі матеріали бібліотеки →', read: 'Читати статтю →', empty: 'Перші статті з’являться найближчим часом.' },
    policy: {
      eyebrow: 'Редакційна політика',
      title: 'Як Praxis працює з доказами',
      items: [
        { title: 'Синтез, а не переказ', text: 'Кожен матеріал — оригінальний клінічний аналіз, а не переклад анотації. Механістичні міркування відокремлені від даних і позначені явно.' },
        { title: 'Аудит методології', text: 'Розмір вибірки, LOSO проти перемішаної крос-валідації, ефект Хоторна в лабораторії ходи, стельові ефекти PROMs.' },
        { title: 'Незалежність від виробників', text: 'Компоненти оцінюються за кінематикою, кінетикою, масою та незалежними клінічними даними — не за брошурами. Без реклами й спонсорства.' },
      ],
    },
    tg: {
      title: 'Обговорення живе в Telegram',
      text: 'Сайт — постійна бібліотека. Живі дискусії, опитування та клінічні кейси — у спільноті Praxis. Під кожною статтею є посилання на її обговорення.',
      join: 'Приєднатися до каналу',
      other: 'Read in English',
    },
    library: { title: 'Бібліотека', lead: 'Усі матеріали Praxis — від нових до старіших.', filterLabel: 'Фільтр за категорією', all: 'Усі', none: 'У цій категорії поки немає статей.' },
    search: {
      title: 'Пошук',
      lead: 'Пошук працює за назвами й повним текстом статей.',
      fallback: 'Пошук стане доступним після публікації сайту.',
    },
    article: {
      crumbs: 'Навігаційний ланцюжок',
      home: 'База знань',
      minRead: 'хв читання',
      updated: 'оновлено',
      other: 'Read in English →',
      demo: 'Демонстраційна стаття для перевірки шаблону сайту. Це не опублікований матеріал Praxis: дані та джерела ще не верифіковано.',
      audit: 'Аудит доказів',
      type: 'Тип матеріалу',
      level: 'Рівень ієрархії Praxis',
      confidence: 'Впевненість',
      limitations: 'Обмеження',
      terms: 'Ключові терміни',
      toc: 'Зміст',
      termsTitle: 'Терміни UA / EN',
      levels: 'Рівні впевненості',
      discussTitle: 'Обговорення цієї статті',
      discussText: 'Питання, заперечення й клінічні кейси колег — у гілці Praxis у Telegram.',
      discussLink: 'Перейти до обговорення →',
      question: 'Питання до спільноти',
      discussBtn: 'Обговорити в Telegram',
      sources: 'Джерела',
      sourcesPending: 'Список джерел буде додано після верифікації першоджерел.',
      sourcesNote: 'Цифри й висновки звірено з першоджерелами. Ілюстрації — власні або з відкритою ліцензією (CC BY) з атрибуцією.',
      cite: 'Як цитувати',
      available: 'Доступно за посиланням',
      related: 'Читайте також',
      coi: 'Конфлікт інтересів',
      coiNone: 'авторка заявляє про відсутність конфлікту інтересів.',
    },
    footer: {
      about: 'Незалежний некомерційний освітній проєкт про протезування, ортезування та реабілітаційну інженерію. Без реклами та спонсорства виробників.',
      founder: 'Засновниця',
      sections: 'Розділи',
      project: 'Проєкт',
      links: { about: 'Про Praxis', policy: 'Редакційна політика', evidence: 'Як ми оцінюємо докази', license: 'Ліцензія та цитування', code: 'Код сайту на GitHub' },
      disclaimer: 'Матеріали мають освітній характер і не замінюють індивідуальної клінічної консультації.',
      license: 'Тексти — CC BY-NC 4.0. Код — MIT.',
    },
    notFound: { title: 'Сторінку не знайдено', text: 'Можливо, статтю перенесли або адреса містить помилку.', home: 'На головну', search: 'Пошук по базі' },
  },
  en: {
    locale: 'en-GB',
    skip: 'Skip to content',
    homeLabel: 'Praxis — home',
    langLabel: 'Site language',
    searchLabel: 'Search',
    nav: { label: 'Main navigation', library: 'Library', sections: 'Sections', method: 'Evidence levels', about: 'About Praxis' },
    siteDescription:
      'An independent knowledge base on evidence-based prosthetics, orthotics and rehabilitation engineering. Critical appraisal of research and biomechanics for multidisciplinary teams.',
    hero: {
      eyebrow: 'Independent knowledge base · prosthetics · orthotics · rehabilitation engineering',
      title: 'Evidence-based prosthetics and orthotics — from the paper to the fitting room',
      lead: 'Praxis dissects research, biomechanics and manufacturer claims and turns them into decisions for the multidisciplinary team. For prosthetists-orthotists, physical therapists, PM&R physicians and rehabilitation engineers.',
      searchLabel: 'Search the knowledge base',
      searchPlaceholder: 'Pistoning, LOSO, ICS, stress shielding…',
      searchButton: 'Search',
      topicsLabel: 'Popular topics:',
      topics: ['Myoelectric control', 'Socket suspension', 'Osseointegration', 'Gait analysis'],
    },
    evidence: { title: 'The Praxis evidence hierarchy', confidenceIntro: 'Confidence labels used by the editors:' },
    sections: {
      title: 'Knowledge base sections',
      lead: 'The same structure as the Telegram topics: every post becomes a permanent, searchable article with tags and sources.',
      count: (n: number) => (n === 0 ? 'Coming soon' : `${n} ${n === 1 ? 'article' : 'articles'} →`),
      empty: 'No English articles in this section yet.',
      emptyOther: 'Read the Ukrainian articles →',
      back: 'All sections',
    },
    latest: { title: 'Latest articles', all: 'Browse the full library →', read: 'Read the article →', empty: 'English translations are on their way.' },
    policy: {
      eyebrow: 'Editorial policy',
      title: 'How Praxis handles evidence',
      items: [
        { title: 'Synthesis, not summary', text: 'Every piece is an original clinical analysis rather than a translated abstract. Mechanistic reasoning is separated from data and labelled explicitly.' },
        { title: 'Methodological audit', text: 'Sample size, LOSO versus shuffled cross-validation, the Hawthorne effect in the gait lab, ceiling effects in PROMs.' },
        { title: 'Independent of manufacturers', text: 'Components are judged by kinematics, kinetics, mass and independent clinical data — not by brochures. No advertising, no sponsorship.' },
      ],
    },
    tg: {
      title: 'The discussion lives on Telegram',
      text: 'The website is the permanent library. Live discussions, polls and clinical cases happen in the Praxis community. Every article links to its discussion thread.',
      join: 'Join the channel',
      other: 'Читати українською',
    },
    library: { title: 'Library', lead: 'All Praxis articles in English, newest first.', filterLabel: 'Filter by category', all: 'All', none: 'No articles in this category yet.' },
    search: {
      title: 'Search',
      lead: 'Search covers titles and the full text of articles.',
      fallback: 'Search becomes available once the site is published.',
    },
    article: {
      crumbs: 'Breadcrumbs',
      home: 'Knowledge base',
      minRead: 'min read',
      updated: 'updated',
      other: 'Читати українською →',
      demo: 'Demo article for testing the site template. This is not a published Praxis piece: data and sources have not been verified yet.',
      audit: 'Evidence audit',
      type: 'Type of material',
      level: 'Praxis hierarchy level',
      confidence: 'Confidence',
      limitations: 'Limitations',
      terms: 'Key terms',
      toc: 'Contents',
      termsTitle: 'Terms EN / UA',
      levels: 'Confidence levels',
      discussTitle: 'Discuss this article',
      discussText: 'Questions, objections and clinical cases from colleagues live in the Praxis thread on Telegram.',
      discussLink: 'Go to the discussion →',
      question: 'Question for the community',
      discussBtn: 'Discuss on Telegram',
      sources: 'References',
      sourcesPending: 'References will be added once the primary sources have been verified.',
      sourcesNote: 'Figures and conclusions are checked against primary sources. Illustrations are original or openly licensed (CC BY) with attribution.',
      cite: 'How to cite',
      available: 'Available from',
      related: 'Further reading',
      coi: 'Conflict of interest',
      coiNone: 'the author declares no conflict of interest.',
    },
    footer: {
      about: 'An independent, non-commercial educational project on prosthetics, orthotics and rehabilitation engineering. No advertising, no manufacturer sponsorship.',
      founder: 'Founder',
      sections: 'Sections',
      project: 'Project',
      links: { about: 'About Praxis', policy: 'Editorial policy', evidence: 'How we grade evidence', license: 'Licence and citation', code: 'Site source on GitHub' },
      disclaimer: 'Content is for educational purposes and does not replace individual clinical advice.',
      license: 'Text: CC BY-NC 4.0. Code: MIT.',
    },
    notFound: { title: 'Page not found', text: 'The article may have moved, or the address contains a typo.', home: 'Back to home', search: 'Search the library' },
  },
} as const;
