// Загальні налаштування сайту Praxis.
// Тут змінюються назви розділів, підписи інтерфейсу, посилання та дані авторки.

export type Lang = 'uk' | 'en';
export const LANGS: Lang[] = ['uk', 'en'];

export const SITE = {
  name: 'Praxis',
  // Посилання на Telegram-спільноту. Якщо залишити порожнім — кнопки Telegram приховані.
  telegramUrl: 'https://t.me/prosthetics_ukraine',
  linkedinUrl: 'https://www.linkedin.com/in/maryna-hurak-86b262226',
  instagramUrl: 'https://www.instagram.com/gurak_gu/',
  repoUrl: 'https://github.com/marynahurak/praxis',
  orcid: '0009-0008-7275-8079',
  orcidUrl: 'https://orcid.org/0009-0008-7275-8079',
  since: 2026,
  author: {
    uk: {
      name: 'Марина Гурак',
      short: 'Гурак М.',
      role: 'Протезистка-ортезистка, ISPO Associate Prosthetist',
      affiliation: 'Відділення протезування верхніх кінцівок, Superhumans War Trauma Center',
      initials: 'МГ',
    },
    en: {
      name: 'Maryna Hurak',
      short: 'Hurak M.',
      role: 'Prosthetist-Orthotist, ISPO Associate Prosthetist',
      affiliation: 'Upper Limb Prosthetics Department, Superhumans War Trauma Center',
      initials: 'MH',
    },
  },
} as const;

export const SECTIONS = {
  prosthetics: {
    num: '01',
    uk: {
      title: 'Протезування',
      desc: 'Протезування верхніх і нижніх кінцівок: інтерфейс «залишкова кінцівка — куксоприймач», системи керування та підвісу, компоненти, остеоінтеграція, цифрове виготовлення.',
      subs: ['Верхня кінцівка', 'Нижня кінцівка', 'Остеоінтеграція', 'Цифрове виготовлення'],
    },
    en: {
      title: 'Prosthetics',
      desc: 'Upper and lower limb prosthetics: the residual limb–socket interface, control and suspension systems, components, osseointegration and digital fabrication.',
      subs: ['Upper limb', 'Lower limb', 'Osseointegration', 'Digital fabrication'],
    },
  },
  rehabilitation: {
    num: '02',
    uk: {
      title: 'Реабілітація',
      desc: 'Мультидисциплінарна реабілітація осіб із втратою кінцівки: від функціонального оцінювання до повернення до участі в житті суспільства.',
      subs: ['Фізична терапія', 'Ерготерапія', 'Фізична та реабілітаційна медицина', 'Психологія'],
    },
    en: {
      title: 'Rehabilitation',
      desc: 'Multidisciplinary rehabilitation of people with limb loss, from functional assessment to participation in society.',
      subs: ['Physical therapy', 'Occupational therapy', 'Physical and rehabilitation medicine', 'Psychology'],
    },
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
  high: { label: 'HIGH', uk: 'Узгоджені дані систематичних оглядів або РКД', en: 'Consistent evidence from systematic reviews or RCTs' },
  moderate: { label: 'MODERATE', uk: 'Когортні чи лабораторні дані з обмеженнями', en: 'Cohort or laboratory data with limitations' },
  low: { label: 'LOW', uk: 'Механістичне міркування, описи випадків або думка експертів', en: 'Mechanistic reasoning, case reports or expert opinion' },
  unknown: { label: 'UNKNOWN', uk: 'Доказів недостатньо; потребує верифікації', en: 'Insufficient evidence; requires verification' },
} as const;
export type ConfidenceKey = keyof typeof CONFIDENCE;
export const CONFIDENCE_KEYS = Object.keys(CONFIDENCE) as ConfidenceKey[];

export const EVIDENCE_LEVELS = [
  { w: 100, uk: 'Систематичні огляди та метааналізи', en: 'Systematic reviews and meta-analyses' },
  { w: 86, uk: 'Рандомізовані контрольовані дослідження (РКД)', en: 'Randomised controlled trials (RCTs)' },
  { w: 72, uk: 'Проспективні когортні дослідження та дослідження «випадок — контроль»', en: 'Prospective cohort and case-control studies' },
  { w: 58, uk: 'Поперечні та лабораторні біомеханічні дослідження', en: 'Cross-sectional and laboratory biomechanical studies' },
  { w: 44, uk: 'Міжнародні стандарти та консенсусні документи (ISPO, ISO)', en: 'International standards and consensus documents (ISPO, ISO)' },
  { w: 30, uk: 'Механістичне міркування з першопринципів — завжди позначене явно', en: 'First-principles mechanistic reasoning — always labelled explicitly' },
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
    nav: { label: 'Основна навігація', library: 'Бібліотека', sections: 'Розділи', tools: 'Інструменти', method: 'Методологія', about: 'Про Praxis' },
    siteTitle: 'доказова практика та інновації в протезуванні й реабілітації',
    siteDescription:
      'Незалежна науково-освітня ініціатива з доказової практики та інновацій у протезуванні, ортезуванні й реабілітації: трансляційні дослідження, біомеханіка, об\'єктивне оцінювання протезних технологій і систематизація рецензованої літератури.',
    hero: {
      eyebrow: 'Незалежна науково-освітня ініціатива',
      title: 'Доказова практика та інновації в протезуванні й реабілітації',
      subtitle: 'Від дослідження до клінічного рішення',
      lead: 'Praxis — незалежна науково-освітня ініціатива, що сприяє розвитку доказової практики та інновацій у протезуванні, ортезуванні й реабілітації. У центрі уваги — трансляційні дослідження, біомеханіка ходи та рухів верхньої кінцівки, об\'єктивне оцінювання протезних технологій і систематизація рецензованої фахової літератури. Для фахівців-практиків, науковців, R&D-інженерів та академічної спільноти в Україні й світі.',
      searchLabel: 'Пошук у базі знань',
      searchPlaceholder: 'Остеоінтеграція, MCPDriver, рівні доказовості…',
      searchButton: 'Шукати',
      topicsLabel: 'Теми:',
      topics: ['Остеоінтеграція', 'Часткова ампутація кисті', 'Нейроінтерфейси', 'Рівні доказовості'],
    },
    evidence: { title: 'Ієрархія доказів Praxis', confidenceIntro: 'Рівні впевненості, якими позначено висновки в статтях:' },
    sections: {
      title: 'Розділи бази знань',
      lead: 'Матеріали згруповано у два розділи. Кожна стаття містить аудит доказів, повний список джерел, декларацію конфлікту інтересів і рекомендацію щодо цитування.',
      count: (n: number) => (n === 0 ? 'Матеріали готуються' : `${n} ${pluralUk(n, 'стаття', 'статті', 'статей')} →`),
      empty: 'У цьому розділі поки немає опублікованих статей.',
      emptyOther: '',
      back: 'Усі розділи',
      includes: 'Охоплює:',
    },
    latest: { title: 'Нові матеріали', all: 'Усі матеріали бібліотеки →', read: 'Читати статтю →', empty: 'Перші статті з\'являться найближчим часом.' },
    policy: {
      eyebrow: 'Редакційна політика',
      title: 'Як Praxis працює з доказами',
      items: [
        { title: 'Синтез, а не переказ', text: 'Кожен матеріал — оригінальний аналітичний синтез із позицій клінічної практики та біомеханіки. Механістичні міркування відокремлено від емпіричних даних і явно позначено.' },
        { title: 'Верифікація джерел', text: 'Кожне фактичне твердження звірено з першоджерелом, а бібліографічні описи містять DOI або PMID, якщо вони є. Неперевірених тверджень Praxis не публікує.' },
        { title: 'Незалежність і прозорість', text: 'Praxis не має комерційного фінансування й не публікує реклами. Матеріали виробників позначено як такі, а кожна стаття містить декларацію конфлікту інтересів відповідно до рекомендацій ICMJE.' },
      ],
    },
    tg: {
      title: 'Фахове обговорення — у спільноті Praxis',
      text: 'Сайт є постійною бібліотекою. Дискусії, опитування та клінічні дилеми відбуваються в Telegram-спільноті Praxis; під кожною статтею є посилання на відповідне обговорення.',
      join: 'Приєднатися до спільноти',
      other: 'Read in English',
    },
    library: { title: 'Бібліотека', lead: 'Усі опубліковані матеріали Praxis, від новіших до старіших.', filterLabel: 'Фільтр за категорією', all: 'Усі', none: 'У цій категорії поки немає статей.' },
    search: {
      title: 'Пошук',
      lead: 'Пошук охоплює назви та повний текст статей.',
      fallback: 'Пошук стане доступним після публікації сайту.',
    },
    article: {
      crumbs: 'Навігаційний ланцюжок',
      home: 'База знань',
      minRead: 'хв читання',
      updated: 'оновлено',
      other: 'Read in English →',
      demo: 'Демонстраційна стаття для перевірки шаблону сайту.',
      audit: 'Аудит доказів',
      type: 'Тип матеріалу',
      level: 'Рівень ієрархії Praxis',
      confidence: 'Рівень впевненості',
      limitations: 'Обмеження',
      terms: 'Ключові терміни',
      toc: 'Зміст',
      termsTitle: 'Терміни UA / EN',
      levels: 'Рівні впевненості',
      discussTitle: 'Обговорення цієї статті',
      discussText: 'Запитання, заперечення та клінічні випадки колег — у спільноті Praxis у Telegram.',
      discussLink: 'Перейти до обговорення →',
      question: 'Питання до спільноти',
      discussBtn: 'Обговорити в Telegram',
      sources: 'Джерела',
      sourcesPending: 'Список джерел буде додано після верифікації першоджерел.',
      sourcesNote: 'Фактичні твердження звірено з першоджерелами. Ілюстрації — власні або поширювані за відкритими ліцензіями із зазначенням авторства.',
      cite: 'Як цитувати',
      available: 'Доступно за посиланням',
      related: 'Читайте також',
      coi: 'Конфлікт інтересів',
      coiNone: 'авторка заявляє про відсутність конфлікту інтересів.',
    },
    footer: {
      about: 'Незалежна некомерційна науково-освітня ініціатива з доказової практики та інновацій у протезуванні, ортезуванні й реабілітації.',
      founder: 'Засновниця та редакторка',
      sections: 'Розділи',
      project: 'Проєкт',
      linksTitle: 'Посилання',
      links: {
        about: 'Про Praxis',
        policy: 'Редакційна політика',
        evidence: 'Оцінювання доказів',
        ethics: 'Етика та доброчесність',
        license: 'Ліцензія та цитування',
        code: 'Вихідний код сайту',
      },
      disclaimer: 'Матеріали мають освітній характер і не замінюють індивідуальної клінічної консультації.',
      license: 'Тексти — CC BY-NC 4.0. Код — MIT.',
    },
    notFound: { title: 'Сторінку не знайдено', text: 'Можливо, статтю перенесено або адреса містить помилку.', home: 'На головну', search: 'Пошук у базі знань' },
  },
  en: {
    locale: 'en-GB',
    skip: 'Skip to content',
    homeLabel: 'Praxis — home',
    langLabel: 'Site language',
    searchLabel: 'Search',
    nav: { label: 'Main navigation', library: 'Library', sections: 'Sections', tools: 'Tools', method: 'Methodology', about: 'About Praxis' },
    siteTitle: 'evidence-based practice and innovation in prosthetics and rehabilitation',
    siteDescription:
      'An independent scientific and educational initiative on evidence-based practice and innovation in prosthetics, orthotics and rehabilitation: translational research, biomechanics, objective evaluation of prosthetic technologies and synthesis of peer-reviewed literature.',
    hero: {
      eyebrow: 'Independent scientific and educational initiative',
      title: 'Evidence-based practice and innovation in prosthetics and rehabilitation',
      subtitle: 'From research to clinical decision-making',
      lead: 'Praxis is an independent scientific and educational initiative advancing evidence-based practice and innovation in prosthetics, orthotics and rehabilitation. It focuses on translational research, the biomechanics of gait and upper-limb movement, the objective evaluation of prosthetic technologies and the structured synthesis of peer-reviewed literature. It is written for clinicians, researchers, R&D engineers and the academic community, in Ukraine and internationally.',
      searchLabel: 'Search the knowledge base',
      searchPlaceholder: 'Osseointegration, MCPDriver, levels of evidence…',
      searchButton: 'Search',
      topicsLabel: 'Topics:',
      topics: ['Osseointegration', 'Partial hand amputation', 'Neural interfaces', 'Levels of evidence'],
    },
    evidence: { title: 'The Praxis evidence hierarchy', confidenceIntro: 'Confidence levels assigned to conclusions in each article:' },
    sections: {
      title: 'Knowledge base sections',
      lead: 'Content is organised into two sections. Every article includes an evidence audit, a full reference list, a conflict-of-interest statement and a suggested citation.',
      count: (n: number) => (n === 0 ? 'In preparation' : `${n} ${n === 1 ? 'article' : 'articles'} →`),
      empty: 'No English articles in this section yet.',
      emptyOther: 'Read the Ukrainian articles →',
      back: 'All sections',
      includes: 'Covers:',
    },
    latest: { title: 'Latest articles', all: 'Browse the full library →', read: 'Read the article →', empty: 'English translations are in preparation.' },
    policy: {
      eyebrow: 'Editorial policy',
      title: 'How Praxis handles evidence',
      items: [
        { title: 'Synthesis, not summary', text: 'Every piece is an original analytical synthesis grounded in clinical practice and biomechanics. Mechanistic reasoning is separated from empirical data and labelled explicitly.' },
        { title: 'Source verification', text: 'Every factual claim is checked against the primary source, and references include a DOI or PMID where available. Unverified claims are not published.' },
        { title: 'Independence and transparency', text: 'Praxis receives no commercial funding and carries no advertising. Manufacturer materials are labelled as such, and every article includes a conflict-of-interest statement in line with the ICMJE Recommendations.' },
      ],
    },
    tg: {
      title: 'Professional discussion takes place in the Praxis community',
      text: 'The website is the permanent library. Discussions, polls and clinical dilemmas take place in the Praxis community on Telegram; each article links to its discussion thread.',
      join: 'Join the community',
      other: 'Читати українською',
    },
    library: { title: 'Library', lead: 'All Praxis articles published in English, newest first.', filterLabel: 'Filter by category', all: 'All', none: 'No articles in this category yet.' },
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
      demo: 'Demo article for testing the site template.',
      audit: 'Evidence audit',
      type: 'Type of material',
      level: 'Praxis hierarchy level',
      confidence: 'Confidence level',
      limitations: 'Limitations',
      terms: 'Key terms',
      toc: 'Contents',
      termsTitle: 'Terms EN / UA',
      levels: 'Confidence levels',
      discussTitle: 'Discuss this article',
      discussText: 'Questions, objections and clinical cases from colleagues are discussed in the Praxis community on Telegram.',
      discussLink: 'Go to the discussion →',
      question: 'Question for the community',
      discussBtn: 'Discuss on Telegram',
      sources: 'References',
      sourcesPending: 'References will be added once the primary sources have been verified.',
      sourcesNote: 'Factual claims have been checked against primary sources. Illustrations are original or openly licensed with attribution.',
      cite: 'How to cite',
      available: 'Available from',
      related: 'Further reading',
      coi: 'Conflict of interest',
      coiNone: 'the author declares no conflict of interest.',
    },
    footer: {
      about: 'An independent, non-commercial scientific and educational initiative on evidence-based practice and innovation in prosthetics, orthotics and rehabilitation.',
      founder: 'Founder and editor',
      sections: 'Sections',
      project: 'Project',
      linksTitle: 'Links',
      links: {
        about: 'About Praxis',
        policy: 'Editorial policy',
        evidence: 'Appraisal of evidence',
        ethics: 'Ethics and integrity',
        license: 'Licence and citation',
        code: 'Site source code',
      },
      disclaimer: 'Content is for educational purposes and does not replace individual clinical advice.',
      license: 'Text: CC BY-NC 4.0. Code: MIT.',
    },
    notFound: { title: 'Page not found', text: 'The article may have moved, or the address contains an error.', home: 'Back to home', search: 'Search the library' },
  },
} as const;
