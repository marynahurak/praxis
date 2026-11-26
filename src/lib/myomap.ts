// Спільні дані й тексти для «Атласу локалізації міоточок та конфігурації sEMG-електродів»:
// сторінка-довідник (src/views/MyoMap.astro) та повноекранна інтерактивна мапа (src/views/MyoAtlas.astro).
import { SITE, type Lang } from '../config';
import data from '../data/myomap.json';
import sections from '../data/myomap-geo/sections.json';

export const D = data as any;
export const SEC = sections as Record<string, any>;
const geoMods = import.meta.glob('../data/myomap-geo/*_*.json', { eager: true }) as Record<string, { default: any }>;
export const GEO: Record<string, any> = {};
for (const m of Object.values(geoMods)) GEO[m.default.id] = m.default;

// DOI записів Zenodo: concept — усі версії (завжди найновіша); versions — DOI окремих версій технічної записки.
export const DOI_CONCEPT: string | undefined = D.meta.doi?.concept;
export const DOI_VERSION: string | undefined = D.meta.doi?.versions?.[D.meta.version];

export const LEVELS = ['ph', 'tr', 'th', 'sd'] as const;
export const MODES = ['direct', 'pr', 'tmr'] as const;
export const START_LEVEL = 'tr';
export const START_VIEW = 'tr_ant';
type L10n = { uk: string; en: string };

// короткі підписи для панелі інструментів (повні — у рядку над мапою)
export const LV_SHORT: Record<string, { uk: string; en: string }> = {
  ph: { uk: 'Часткова кисть', en: 'Partial hand' }, tr: { uk: 'Трансрадіальний', en: 'Transradial' },
  th: { uk: 'Трансгумеральний', en: 'Transhumeral' }, sd: { uk: 'Плечова дезартикуляція', en: 'Shoulder disarticulation' },
};
export const VIEW_SHORT: Record<string, { uk: string; en: string }> = {
  ph_palm: { uk: 'Долонна', en: 'Palmar' }, ph_dors: { uk: 'Тильна', en: 'Dorsal' },
  tr_ant: { uk: 'Спереду', en: 'Anterior' }, tr_post: { uk: 'Ззаду', en: 'Posterior' },
  th_ant: { uk: 'Спереду', en: 'Anterior' }, th_post: { uk: 'Ззаду', en: 'Posterior' },
  sd_ant: { uk: 'Спереду', en: 'Anterior' }, sd_post: { uk: 'Ззаду', en: 'Posterior' },
};
export const SEC_SHORT_L = { uk: 'Зріз', en: 'Section' };

export const tr = (lang: Lang) => (v?: L10n) => (v ? v[lang] : '');

export const ABBR: Record<string, string> = {
  fcu: 'FCU', fds: 'FDS', pl: 'PL', fcr: 'FCR', pt: 'PT', br: 'BR', ecrl: 'ECRL', ecrb: 'ECRB', ed: 'ED', edm: 'EDM', ecu: 'ECU', anc: 'AN',
  apl: 'APL', epb: 'EPB', epl: 'EPL', ei: 'EI', fdp: 'FDP', fpl: 'FPL', sup: 'SUP', pq: 'PQ',
  bb_long: 'BB-l', bb_short: 'BB-s', brachialis: 'BRA', tb_long: 'TB-l', tb_lat: 'TB-lat', tb_med: 'TB-m', coraco: 'CB',
  delt_clav: 'D-cl', delt_acro: 'D-ac', delt_spin: 'D-sp',
  apb: 'APB', fpb: 'FPB', op: 'OP', adp: 'ADP', adm: 'ADM', fdmb: 'FDM', odm: 'ODM', dio: 'DI', pio: 'PI', lumb: 'LU',
  pm_clav: 'PM-cl', pm_stern: 'PM-st', pm_abd: 'PM-ab', trap_desc: 'TR-d', trap_trans: 'TR-t', trap_asc: 'TR-a',
  infra: 'IS', supra: 'SS', teres_maj: 'TMa', teres_min: 'TMi', rhomb_maj: 'RMa', rhomb_min: 'RMi', serr: 'SA', lev: 'LS', scm: 'SCM', lat: 'LD',
};

export function getUi(lang: Lang) {
  const author = SITE.author[lang];
  const doiVersion = DOI_VERSION;
  const all = {
  uk: {
    title: 'Атлас локалізації міоточок та конфігурації sEMG-електродів',
    ch: 'Канал', armed: 'Натисніть на м\'яз, щоб поставити електрод',
    atlasShort: 'Атлас міоточок', mapSuffix: 'інтерактивна мапа',
    guideBack: 'Довідник і методологія', notice: 'Навчальний ресурс, не засіб підтримки клінічних рішень.', noticeMore: 'Докладніше',
    openAtlas: 'Відкрити інтерактивну мапу', openAtlasNote: 'Мапа відкривається на весь екран: рівні, проєкції, поперечні зрізи, електроди та оцінка розміщення.',
    quickTitle: 'Одразу до потрібного вигляду', modesTitle: 'Типи керування', aboutModes: 'Про типи керування',
    sheetToggle: 'Панель', legendTitle: 'Позначення', mapNav: 'Налаштування мапи',
    statLevels: 'рівні ампутації', statViews: 'анатомічних проєкцій', statSections: 'поперечних зрізів', statMuscles: 'м\'язів і частин м\'язів', statElectrodes: 'типи електродів', statRefs: 'наукових джерел',
    levelsTitle: 'Оберіть рівень ампутації', levelsLead: 'Кожне посилання відкриває мапу одразу в потрібній проєкції або на поперечному зрізі.',
    figCaption: 'РИС. 01 · Інтерактивна мапа: задня поверхня передпліччя, два канали прямого керування',
    sec: { scope: 'Призначення', how: 'Як користуватися', modes: 'Типи керування', weak: 'Слабкий сигнал', effort: 'Енергоефективність', chain: 'Сигнальний ланцюг', pitfalls: 'Пастки', systems: 'Системи', evidence: 'Докази', source: 'Анатомія', passport: 'Паспорт і версії', refs: 'Джерела' },
    chainLead: 'Від наміру рухатися до руху протеза: шість перетворень сигналу. Нижче — симулятор, у якому можна керувати кистю двома каналами.',
    curveTitle: 'Схема: відносна інтенсивність скорочення і час до втоми', curveX: 'Відносна інтенсивність скорочення, % максимального зусилля', curveY: 'Час до втоми', curveZone: 'робочий діапазон керування', curveNote: 'Схематично, без числових значень: що вища відносна інтенсивність статичного скорочення, то коротший час до втоми, і ця залежність нелінійна (Frey-Law & Avin, 2010).',
    coBtn: 'Коскорочення (короткий імпульс)', simGrip: 'Хват', grips: { power: 'Силовий', tripod: 'Тридигітальний', key: 'Латеральний (ключовий)', point: 'Вказівний' },
    simSwitch: 'Коскорочення: перемикання на хват', simGripNote: 'У багатохватових міоелектричних кистях м\'язи-розгиначі зазвичай розкривають кисть, м\'язи-згиначі закривають, а для перемикання хватів використовують тригери, наприклад подвійні імпульси чи коскорочення (Kerver et al., 2023). Тут коскорочення — коли обидва канали перетинають поріг майже одночасно — перемикає хват по колу; спробуйте кнопку «Коскорочення».',
    socket: 'Куксоприймач з двома електродами', handAlt: 'Схематична багатосуглобова кисть',
    passTitle: 'Паспорт методології та версії', passLead: 'Структуровані дані про інструмент для відтворюваності: у дослідженнях і публікаціях указуйте версію, з якою працювали.',
    pass: {
      name: 'Назва', version: 'Версія', status: 'Статус', purpose: 'Призначення', evidence: 'Джерельна база', repro: 'Відтворюваність', author: 'Авторка', rights: 'Авторське право та ліцензія', cite: 'Як цитувати',
    },
    passStatus: 'Бета: навчальний прототип. Зовнішнє експертне рецензування та перевірка зручності використання ще не проводилися.',
    passPurpose: 'Навчальний довідковий ресурс для етапу пошуку міоточок у міоелектричному протезуванні верхньої кінцівки; не засіб підтримки клінічних рішень щодо конкретного пацієнта.',
    passEvidence: '3D-модель анатомії BodyParts3D (DBCLS, CC BY 4.0); рецензовані дослідження (див. «Джерела»); рекомендації SENIAM; технічна документація виробників електродів; клінічна практика — позначена окремо.',
    passRepro: 'Конвеєр обробки анатомії, журнал проєктних рішень і повна історія змін відкриті в репозиторії.', passLinks: { pipeline: 'конвеєр обробки', log: 'журнал рішень', history: 'історія змін' },
    passRights: '© 2026 Марина Гурак. Тексти, схеми, дизайн і дані атласу — CC BY-NC-ND 4.0; вихідний код інструмента — усі права захищено.',
    changelogTitle: 'Журнал змін',
    versioning: 'Версії нумеруються за схемою MAJOR.MINOR.PATCH: PATCH — виправлення описок і термінів без зміни логіки; MINOR — нові матеріали чи функції; MAJOR — зміна логіки вибору місць для електродів або критеріїв оцінки.',
    legalTitle: 'Авторське право',
    legal: [
      'Атлас створила Марина Гурак. Концепцію та технічне завдання розробила авторка; під час програмування, оформлення й підготовки текстів використано інструменти штучного інтелекту, а весь зміст перевірено й затверджено авторкою.',
      'Тексти, схеми, дизайн і дані атласу поширюються за ліцензією Creative Commons «Зазначення авторства — Некомерційна — Без похідних» 4.0 Міжнародна (CC BY-NC-ND 4.0): їх можна поширювати без змін, із зазначенням авторки, назви, версії й посиланням на джерело, але не з комерційною метою.',
      'Вихідний код інструмента опубліковано для прозорості методу. Його копіювання, зміна чи використання в інших продуктах можливі лише з письмового дозволу авторки.',
      'Анатомічна модель BodyParts3D (© DBCLS) залишається під ліцензією CC BY 4.0 незалежно від умов Praxis. Версії, опубліковані до 22 листопада 2026 року, залишаються доступними на умовах, що діяли на момент їх публікації.',
    ],
    legalContact: 'Переклад, адаптація, комерційне використання чи співпраця — за письмовим дозволом:', legalContactLink: 'контакти',
    licName: 'CC BY-NC-ND 4.0', copyShort: '© 2026 М. Гурак',
    scopeTitle: 'Призначення та межі застосування',
    scope: 'Інструмент призначений для навчальної та методичної підтримки етапу пошуку міоточок (міотестингу) під час первинного та повторного міоелектричного протезування верхньої кінцівки. Він поєднує анатомо-топографічні орієнтири цільових м\'язових черевців, фізіологічно конгруентні рухові команди для інтуїтивного керування протезом, схеми позиціонування sEMG-електродів у масштабі та дані виробників щодо окремих електродів. Атлас є навчальним довідковим ресурсом, а не засобом підтримки клінічних рішень щодо конкретного пацієнта: анатомічна карта задає лише початкову гіпотезу розміщення. Остаточне положення електродів визначає інструментальна верифікація sEMG-сигналу (амплітуда, співвідношення сигнал/шум, відсутність перехресних наводок) з урахуванням індивідуальних анатомічних і посттравматичних особливостей залишкової кінцівки.',
    lead: 'Інтерактивний анатомічний атлас для пошуку місць міоелектричних електродів: реальна анатомія м\'язів і кісток, зони слабкого сигналу, розміщення електродів у масштабі з миттєвою оцінкою та пояснення того, як працює міоелектрична кисть.',
    crumbs: 'Інструменти', eyebrow: 'Praxis · Інструмент 01',
    warnTitle: 'Важливо',
    warn: 'Після бойової, мінно-вибухової чи вогнепальної травми анатомія залишкової кінцівки часто нетипова: м\'язові черевця зміщені, виконано міодез або міопластику, є дефекти тканин. Атлас показує типову анатомію однієї референтної моделі дорослої людини.',
    evidenceBadge: 'Рівень доказів: низька–помірна впевненість', version: 'Версія', updated: 'оновлено',
    howTitle: 'Як користуватися',
    how: [
      'Оберіть рівень ампутації та проєкцію: спереду, ззаду або поперечний зріз. Показано праву верхню кінцівку в анатомічному положенні.',
      'Натисніть на м\'яз, щоб побачити його анатомію, команду для міотесту та очікуване зусилля.',
      'Перетягніть електрод із палітри на м\'яз або натисніть на електрод у палітрі, а потім на м\'яз: він стане на найширшу частину черевця вздовж його довгої осі. Електрод можна пересувати, обертати за круглий маркер чи кнопками, а з клавіатури — стрілками та клавішами [ і ]. Оцінка оновлюється миттєво.',
    ],
    level: 'Рівень ампутації', view: 'Проєкція', section: 'Поперечний зріз', sectionLevel: 'Рівень зрізу', mode: 'Тип керування',
    layers: 'Шари', weak: 'Зони слабкого сигналу', labels: 'Підписи', align: 'Вирівнювати за віссю м\'яза',
    palette: 'Електроди', paletteHint: 'Перетягніть на м\'яз або натисніть тут, а потім на м\'яз', mm: 'мм',
    clear: 'Прибрати всі', ring: 'Розмістити 8 каналів по колу',
    pick: 'Натисніть на м\'яз або кістку на схемі.',
    origin: 'Початок', insertion: 'Прикріплення', nerve: 'Іннервація', action: 'Функція', why: 'Як місце для електрода', cmd: 'Команда для міотесту', xt: 'Перехресні наводки',
    effort: 'Зусилля та втома', schematic: 'Схематичний контур: у 3D-моделі цього м\'яза немає.',
    placeHere: 'Поставити електрод на цей м\'яз', back: '← До опису рівня', levelPit: 'Особливості рівня',
    fbTitle: 'Оцінка розміщення', fbNote: 'Напрямок волокон наближено довгою віссю видимого черевця; для перистих і віялоподібних м\'язів він відрізняється в різних ділянках.',
    rotL: 'Повернути ліворуч на 15°', rotR: 'Повернути праворуч на 15°', alignBtn: 'За віссю м\'яза', siteBtn: 'На рекомендоване місце', del: 'Прибрати',
    weakTitle: 'Де сигнал слабкий і чому', effortTitle: 'Енергоефективність: зусилля та втома', howWorksTitle: 'Як працює міоелектрична кисть',
    simTitle: 'Симулятор двоканального керування', simOpen: 'Канал 1 (м\'язи-розгиначі) → розкрити', simClose: 'Канал 2 (м\'язи-згиначі) → закрити',
    simCross: 'Перехресні наводки між каналами (30%)', simTendon: 'Електрод каналу 1 над сухожилком', simThr: 'Поріг',
    simRaw: 'Сира ЕМГ після диференційного підсилення', simEnv: 'Огинаюча та поріг',
    simState: { idle: 'Кисть нерухома', open: 'Кисть розкривається', close: 'Кисть закривається', both: 'Обидва канали вище порогу: кисть стоїть' },
    simNote: 'Навчальна модель: сигнал синтезовано, параметри умовні. Реальні контролери використовують різні стратегії (наприклад, «перемагає сильніший канал»).',
    systemsTitle: 'Приклади комерційних систем керування',
    systemsNote: 'Дані виробників станом на листопад 2026 року; наведено лише як приклади типів керування. Перевіряйте актуальну документацію виробника.',
    pitfallsTitle: 'Типові пастки', evidenceTitle: 'Рівень доказів',
    evidenceRows: [
      ['Анатомія м\'язів і кісток', 'одна референтна 3D-модель BodyParts3D і стандартні анатомічні описи — висока впевненість для типової анатомії'],
      ['Правила розміщення (черевце, сухожилок, орієнтація, межі м\'язів)', 'рекомендації SENIAM і De Luca — помірна впевненість'],
      ['Вибір місць для керування та оцінка зусилля', 'клінічна практика, експертний консенсус і механістичні міркування — низька впевненість'],
      ['Розпізнавання патернів, TMR, пастки', 'лабораторні та клінічні дослідження — помірна впевненість'],
      ['Автоматична оцінка розміщення', 'геометричне правило на основі моделі, а не валідований клінічний алгоритм'],
    ],
    basis: { evidence: 'дослідження', mechanistic: 'механістичне міркування', expert: 'клінічна практика' },
    sourceTitle: 'Джерело анатомії та ліцензія',
    source: 'Анатомічні зображення та зрізи згенеровано з 3D-моделі BodyParts3D © The Database Center for Life Science (DBCLS), ліцензія CC BY 4.0, у підготовці Human Atlas та Dagno. Зміни Praxis: ортографічна візуалізація, виділення видимих меж м\'язів, автоматичне визначення сухожилкових зон за товщиною тканини, поперечні зрізи, схематичний контур найширшого м\'яза спини, кольорове оформлення. Контури електродів намальовано Praxis; фотографії виробників не використовуються.',
    refsTitle: 'Джерела', mfrTitle: 'Дані виробників', citeTitle: 'Як цитувати', source2: 'джерело',
    cite: `${author.short} Атлас локалізації міоточок та конфігурації sEMG-електродів (версія ${D.meta.version}) [інтерактивний інструмент]. Praxis. 2026.`,
    citeDoc: doiVersion ? `${author.short} Атлас локалізації міоточок та конфігурації sEMG-електродів (версія ${D.meta.version}) [технічна записка]. Zenodo; 2026. doi:${doiVersion}` : '',
    onlineAt: 'Інтерактивна версія:', doiThis: 'ця версія', doiAll: 'усі версії, завжди найновіша',
    coi: 'Конфлікт інтересів: авторка заявляє про відсутність конфлікту інтересів. Комерційні електроди й системи наведено лише як приклади типів.',
    avail: 'Доступно за посиланням:',
    credit: 'Анатомія: BodyParts3D © DBCLS, CC BY 4.0',
    sideL: 'бічний', sideM: 'присередній', radial: 'променевий', ulnar: 'ульнарний', midline: 'серединна лінія',
    fromBelow: { ph: 'Вигляд з дистального боку: долонна поверхня вгорі.', tr: 'Вигляд з дистального боку: передня (долонна) поверхня вгорі.', th: 'Вигляд з дистального боку: передня поверхня вгорі.' } as Record<string, string>,
    tmrHatch: 'можливі м\'язи-мішені', noscript: 'Для розміщення електродів потрібен JavaScript; анатомічні описи доступні й без нього.',
  },
  en: {
    title: 'Myosite localisation and sEMG electrode configuration atlas',
    ch: 'Channel', armed: 'Click a muscle to place the electrode',
    atlasShort: 'Myosite atlas', mapSuffix: 'interactive map',
    guideBack: 'Guide and methodology', notice: 'Educational resource, not a clinical decision-support tool.', noticeMore: 'Details',
    openAtlas: 'Open the interactive map', openAtlasNote: 'The map opens full screen: levels, views, cross-sections, electrodes and placement feedback.',
    quickTitle: 'Go straight to a view', modesTitle: 'Control types', aboutModes: 'About control types',
    sheetToggle: 'Panel', legendTitle: 'Key', mapNav: 'Map settings',
    statLevels: 'amputation levels', statViews: 'anatomical views', statSections: 'cross-sections', statMuscles: 'muscles and muscle parts', statElectrodes: 'electrode types', statRefs: 'scientific sources',
    levelsTitle: 'Choose the amputation level', levelsLead: 'Each link opens the map directly in the right view or cross-section.',
    figCaption: 'FIG. 01 · Interactive map: posterior forearm, two direct-control channels',
    sec: { scope: 'Scope', how: 'How to use', modes: 'Control types', weak: 'Weak signal', effort: 'Energy efficiency', chain: 'Signal chain', pitfalls: 'Pitfalls', systems: 'Systems', evidence: 'Evidence', source: 'Anatomy', passport: 'Passport and versions', refs: 'References' },
    chainLead: 'From the intention to move to the movement of the prosthesis: six signal transformations. Below is a simulator in which you can control the hand with two channels.',
    curveTitle: 'Schematic: relative contraction intensity and time to fatigue', curveX: 'Relative contraction intensity, % of maximal effort', curveY: 'Time to fatigue', curveZone: 'working control range', curveNote: 'Schematic, without numerical values: the higher the relative intensity of a static contraction, the shorter the time to fatigue, and the relationship is non-linear (Frey-Law & Avin, 2010).',
    coBtn: 'Co-contraction (short pulse)', simGrip: 'Grip', grips: { power: 'Power', tripod: 'Tripod', key: 'Lateral (key)', point: 'Index point' },
    simSwitch: 'Co-contraction: switching to', simGripNote: 'In multi-grip myoelectric hands the extensors usually open the hand and the flexors close it, while triggers such as double pulses or co-contractions are used to switch grips (Kerver et al., 2023). Here, a co-contraction (both channels crossing the threshold almost simultaneously) cycles through the grips; try the Co-contraction button.',
    socket: 'Socket with two electrodes', handAlt: 'Schematic multi-articulating hand',
    passTitle: 'Methodology and version passport', passLead: 'Structured information about the tool for reproducibility: in studies and publications, state the version you used.',
    pass: {
      name: 'Title', version: 'Version', status: 'Status', purpose: 'Purpose', evidence: 'Evidence base', repro: 'Reproducibility', author: 'Author', rights: 'Copyright and licence', cite: 'How to cite',
    },
    passStatus: 'Beta: educational prototype. External expert review and usability testing have not yet been carried out.',
    passPurpose: 'An educational reference for myosite localisation in upper-limb myoelectric prosthetics; not a clinical decision-support tool for individual patients.',
    passEvidence: 'BodyParts3D anatomical model (DBCLS, CC BY 4.0); peer-reviewed studies (see References); SENIAM recommendations; electrode manufacturer documentation; clinical practice, labelled separately.',
    passRepro: 'The anatomy processing pipeline, the design decision log and the full change history are open in the repository.', passLinks: { pipeline: 'processing pipeline', log: 'decision log', history: 'change history' },
    passRights: '© 2026 Maryna Hurak. Atlas texts, figures, design and data: CC BY-NC-ND 4.0; tool source code: all rights reserved.',
    changelogTitle: 'Changelog',
    versioning: 'Versions follow MAJOR.MINOR.PATCH: PATCH for typo and terminology fixes without changes in logic; MINOR for new material or features; MAJOR for changes in the logic of electrode site selection or in the evaluation criteria.',
    legalTitle: 'Copyright',
    legal: [
      'The atlas was created by Maryna Hurak. The concept and specification are the author\'s; AI tools were used for programming, design and text preparation, and all content has been reviewed and approved by the author.',
      'Atlas texts, figures, design and data are licensed under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0): they may be shared unchanged, with attribution to the author, the title, the version and a link to the source, but not for commercial purposes.',
      'The tool source code is published for methodological transparency. Copying, modifying or using it in other products requires the author\'s written permission.',
      'The BodyParts3D anatomical model (© DBCLS) remains under CC BY 4.0 regardless of Praxis terms. Versions published before 22 November 2026 remain available under the terms in force when they were published.',
    ],
    legalContact: 'Translation, adaptation, commercial use or collaboration require written permission:', legalContactLink: 'contact',
    licName: 'CC BY-NC-ND 4.0', copyShort: '© 2026 M. Hurak',
    scopeTitle: 'Scope and intended use',
    scope: 'The tool provides educational and methodological support for myosite localisation (myotesting) in primary and repeat upper-limb myoelectric prosthetic fitting. It brings together anatomical and topographic landmarks of target muscle bellies, physiologically congruent movement commands for intuitive prosthesis control, true-scale sEMG electrode positioning, and manufacturer data for selected electrodes. The atlas is an educational reference, not a decision-support tool for individual patients: the anatomical map provides only an initial placement hypothesis. Final electrode positions are determined by instrumented verification of the sEMG signal (amplitude, signal-to-noise ratio, absence of crosstalk), taking into account the individual anatomical and post-traumatic features of the residual limb.',
    lead: 'An interactive anatomical atlas for finding myoelectric electrode sites: real muscle and bone anatomy, weak-signal zones, true-scale electrode placement with instant feedback, and an explanation of how a myoelectric hand works.',
    crumbs: 'Tools', eyebrow: 'Praxis · Tool 01',
    warnTitle: 'Important',
    warn: 'After combat, blast or gunshot injuries, residual limb anatomy is often atypical: muscle bellies are displaced, myodesis or myoplasty has been performed, or tissue is missing. The atlas shows the typical anatomy of a single reference adult model.',
    evidenceBadge: 'Level of evidence: low to moderate confidence', version: 'Version', updated: 'updated',
    howTitle: 'How to use',
    how: [
      'Choose the amputation level and the view: anterior, posterior or cross-section. The right upper limb is shown in the anatomical position.',
      'Click a muscle to see its anatomy, the myotest command and the expected effort.',
      'Drag an electrode from the palette onto a muscle, or click an electrode in the palette and then a muscle: it snaps to the widest part of the belly along its long axis. You can move it, rotate it with the round handle or the buttons, or use the arrow keys and [ and ] on the keyboard. The feedback updates instantly.',
    ],
    level: 'Amputation level', view: 'View', section: 'Cross-section', sectionLevel: 'Section level', mode: 'Control type',
    layers: 'Layers', weak: 'Weak-signal zones', labels: 'Labels', align: 'Align with the muscle axis',
    palette: 'Electrodes', paletteHint: 'Drag onto a muscle, or click here and then on a muscle', mm: 'mm',
    clear: 'Remove all', ring: 'Place 8 channels around the limb',
    pick: 'Click a muscle or bone in the diagram.',
    origin: 'Origin', insertion: 'Insertion', nerve: 'Innervation', action: 'Action', why: 'As an electrode site', cmd: 'Myotest command', xt: 'Crosstalk',
    effort: 'Effort and fatigue', schematic: 'Schematic outline: this muscle is missing from the 3D model.',
    placeHere: 'Place an electrode on this muscle', back: '← Back to level overview', levelPit: 'Level-specific points',
    fbTitle: 'Placement feedback', fbNote: 'Fibre direction is approximated by the long axis of the visible belly; in pennate and fan-shaped muscles it varies between regions.',
    rotL: 'Rotate left by 15°', rotR: 'Rotate right by 15°', alignBtn: 'Align with muscle', siteBtn: 'Recommended site', del: 'Remove',
    weakTitle: 'Where the signal is weak, and why', effortTitle: 'Energy efficiency: effort and fatigue', howWorksTitle: 'How a myoelectric hand works',
    simTitle: 'Two-channel control simulator', simOpen: 'Channel 1 (extensors) → open', simClose: 'Channel 2 (flexors) → close',
    simCross: 'Crosstalk between channels (30%)', simTendon: 'Channel 1 electrode over tendon', simThr: 'Threshold',
    simRaw: 'Raw EMG after differential amplification', simEnv: 'Envelope and threshold',
    simState: { idle: 'Hand at rest', open: 'Hand opening', close: 'Hand closing', both: 'Both channels above threshold: the hand holds' },
    simNote: 'Teaching model: the signal is synthetic and the parameters are illustrative. Real controllers use different strategies (for example, "the stronger channel wins").',
    systemsTitle: 'Examples of commercial control systems',
    systemsNote: 'Manufacturer data as of November 2026; listed only as examples of control types. Check the manufacturer\'s current documentation.',
    pitfallsTitle: 'Common pitfalls', evidenceTitle: 'Level of evidence',
    evidenceRows: [
      ['Muscle and bone anatomy', 'a single BodyParts3D reference model and standard anatomical descriptions — high confidence for typical anatomy'],
      ['Placement rules (belly, tendon, orientation, muscle borders)', 'SENIAM and De Luca recommendations — moderate confidence'],
      ['Choice of control sites and effort rating', 'clinical practice, expert consensus and mechanistic reasoning — low confidence'],
      ['Pattern recognition, TMR, pitfalls', 'laboratory and clinical studies — moderate confidence'],
      ['Automatic placement feedback', 'a geometric rule based on the model, not a validated clinical algorithm'],
    ],
    basis: { evidence: 'research', mechanistic: 'mechanistic reasoning', expert: 'clinical practice' },
    sourceTitle: 'Anatomy source and licence',
    source: 'Anatomical images and sections were generated from the BodyParts3D model © The Database Center for Life Science (DBCLS), licensed under CC BY 4.0, as prepared by Human Atlas and Dagno. Changes by Praxis: orthographic rendering, extraction of visible muscle boundaries, automatic detection of tendinous zones from tissue thickness, cross-sections, a schematic outline of latissimus dorsi, colour styling. Electrode outlines are drawn by Praxis; no manufacturer photographs are used.',
    refsTitle: 'References', mfrTitle: 'Manufacturer data', citeTitle: 'How to cite', source2: 'source',
    cite: `${author.short} Myosite localisation and sEMG electrode configuration atlas (version ${D.meta.version}) [interactive tool]. Praxis. 2026.`,
    citeDoc: doiVersion ? `${author.short} Myosite localisation and sEMG electrode configuration atlas (version ${D.meta.version}) [technical note]. Zenodo; 2026. doi:${doiVersion}` : '',
    onlineAt: 'Interactive version:', doiThis: 'this version', doiAll: 'all versions, always the latest',
    coi: 'Conflict of interest: the author declares no conflict of interest. Commercial electrodes and systems are listed only as examples of types.',
    avail: 'Available from:',
    credit: 'Anatomy: BodyParts3D © DBCLS, CC BY 4.0',
    sideL: 'lateral', sideM: 'medial', radial: 'radial', ulnar: 'ulnar', midline: 'midline',
    fromBelow: { ph: 'Viewed from distal: palmar surface at the top.', tr: 'Viewed from distal: anterior (volar) surface at the top.', th: 'Viewed from distal: anterior surface at the top.' } as Record<string, string>,
    tmrHatch: 'possible target muscles', noscript: 'Electrode placement needs JavaScript; the anatomical descriptions are available without it.',
  },
};
  return all[lang];
}
export type MyoUi = ReturnType<typeof getUi>;

export function getFb(lang: Lang) {
  const all = {
  uk: {
    over: 'Над черевцем', of: 'площі електрода', tendonPart: 'над сухожилковою зоною', bonePart: 'над підшкірною кісткою', nonePart: 'поза м\'язами',
    others: 'Електрод перекриває також', near: 'Ближче ніж 5 мм до межі з', xtRisk: 'зростає ризик перехресних наводок', none: 'Під електродом немає м\'язів: сигналу немає',
    orientOk: 'Вісь електрода збігається з віссю м\'яза', orientWarn: 'Відхилення від осі м\'яза', orientBad: 'Електрод розвернуто поперек м\'яза',
    contactsOk: 'Усі контакти над черевцем того самого м\'яза', contactsBad: 'Контакти потрапляють на різні структури',
    fits: 'У найширшу частину черевця вписується коло діаметром', narrow: 'черевце вужче за електрод',
    good: 'Добре розміщення', fair: 'Можна покращити', poor: 'Невдале розміщення',
    dist: 'Відстань між каналами 1 і 2', antag: 'канали над антагоністами (м\'язи-згиначі та м\'язи-розгиначі)', sameM: 'обидва канали над тим самим м\'язом: сигнали не будуть незалежними', sameG: 'обидва канали над однією функціональною групою',
    depth: 'Під електродом', at: 'на глибині', from: 'від глибини', skinOnly: 'у межах 15 мм під електродом м\'язів немає', model: 'у моделі',
    tendonM: 'сухожилкова частина', schem: 'контур схематичний: підтвердьте пальпацією та міотестом',
    role: 'Роль на цьому рівні', eff: 'Очікуване зусилля', deep: 'м\'яз глибокий або малодоступний для поверхневої ЕМГ',
    belly: 'Видима площа черевця в цій проєкції', csa: 'Площа поперечного перерізу на цьому рівні', cm2: 'см²', diam: 'діаметр найбільшого вписаного кола',
  },
  en: {
    over: 'Over the belly of', of: 'of the electrode area', tendonPart: 'over a tendinous zone', bonePart: 'over subcutaneous bone', nonePart: 'off the muscles',
    others: 'The electrode also overlaps', near: 'Within 5 mm of the border with', xtRisk: 'crosstalk risk increases', none: 'No muscle under the electrode: no signal',
    orientOk: 'The electrode axis matches the muscle axis', orientWarn: 'Deviation from the muscle axis', orientBad: 'The electrode is turned across the muscle',
    contactsOk: 'All contacts over the belly of the same muscle', contactsBad: 'The contacts fall on different structures',
    fits: 'The widest part of the belly fits a circle of diameter', narrow: 'the belly is narrower than the electrode',
    good: 'Good placement', fair: 'Could be improved', poor: 'Poor placement',
    dist: 'Distance between channels 1 and 2', antag: 'channels over antagonists (flexors and extensors)', sameM: 'both channels over the same muscle: the signals will not be independent', sameG: 'both channels over the same functional group',
    depth: 'Under the electrode', at: 'at a depth of', from: 'from a depth of', skinOnly: 'no muscle within 15 mm under the electrode', model: 'in the model',
    tendonM: 'tendinous part', schem: 'schematic outline: confirm by palpation and myotesting',
    role: 'Role at this level', eff: 'Expected effort', deep: 'a deep muscle, poorly accessible to surface EMG',
    belly: 'Visible belly area in this view', csa: 'Cross-sectional area at this level', cm2: 'cm²', diam: 'diameter of the largest inscribed circle',
  },
};
  return all[lang];
}

export function orientFor(ui: MyoUi): Record<string, [string, string]> {
  return {
    tr_ant: [ui.sideL, ui.sideM], tr_post: [ui.sideM, ui.sideL], th_ant: [ui.sideL, ui.sideM], th_post: [ui.sideM, ui.sideL],
    ph_palm: [ui.radial, ui.ulnar], ph_dors: [ui.ulnar, ui.radial], sd_ant: [ui.sideL, ui.midline], sd_post: [ui.midline, ui.sideL],
  };
}

export const roleOf = (lv: string, key: string) => D.levels[lv].roles[key] ?? 'context';
export const isTmr = (lv: string, key: string) => (D.muscles[key]?.tmr ?? []).includes(lv);

export function buildClientData(lang: Lang) {
  const tx = tr(lang); const ui = getUi(lang);
  const views: Record<string, any> = {};
  for (const lv of LEVELS) {
    for (const v of D.levels[lv].views) {
      const g = GEO[v.id];
      views[v.id] = {
        level: lv, kind: 'view', ppm: g.ppm,
        s: Object.fromEntries(g.structs.filter((s: any) => s.kind === 'muscle').map((s: any) => [s.key, { a: s.axis, x: s.site[0], y: s.site[1], r: s.r_mm, c: s.area_cm2, b: s.belly_cm2 }])),
      };
    }
    for (const s of D.levels[lv].sections) {
      const g = SEC[s.id];
      views[s.id] = {
        level: lv, kind: 'section', ppm: g.ppm,
        s: Object.fromEntries(g.structs.filter((x: any) => x.kind === 'muscle').map((x: any) => [x.key, { x: x.site[0], y: x.site[1], c: x.area_cm2, t: x.tendon ? 1 : 0 }])),
      };
    }
  }
  return {
    lang, views,
    muscles: Object.fromEntries(Object.entries(D.muscles).map(([k, m]: [string, any]) => [k, { n: tx(m.name), ab: ABBR[k] ?? k, e: m.effort?.level ?? null, g: m.grp ?? null, sc: !!m.schematic }])),
    bones: Object.fromEntries(Object.entries(D.bones).map(([k, b]: [string, any]) => [k, tx(b.name)])),
    roles: Object.fromEntries(LEVELS.map((lv) => [lv, D.levels[lv].roles])),
    roleNames: Object.fromEntries(Object.entries(D.roles).map(([k, v]: [string, any]) => [k, tx(v)])),
    effortNames: Object.fromEntries(Object.entries(D.effort.levels).map(([k, v]: [string, any]) => [k, tx(v)])),
    el: D.electrodes.map((e: any) => ({ id: e.id, w: e.w, h: e.h, c: e.contacts ?? [], d: e.domes ?? [], f: e.flange ?? null, n: tx(e.name) })),
    fb: getFb(lang),
    ui: { ch: ui.ch, mm: ui.mm, armed: ui.armed },
  };
}

export function simData(lang: Lang) {
  const ui = getUi(lang);
  return { ch: ui.ch, simState: ui.simState, raw: ui.simRaw, env: ui.simEnv, thr: ui.simThr, grips: ui.grips, sw: ui.simSwitch };
}

export const fmtUpdated = (lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(D.meta.updated));

export const elSvg = (e: any, sc = 2.1) => {
  const W = (e.flange ? e.flange[0] : e.w) * sc + 6;
  const H = (e.flange ? e.flange[1] : Math.max(e.h, 14)) * sc + 6;
  const cx = W / 2, cy = H / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  if (e.flange) s += `<ellipse cx="${cx}" cy="${cy}" rx="${(e.flange[0] * sc) / 2}" ry="${(e.flange[1] * sc) / 2}" class="pe-fl"/>`;
  if (e.domes?.length) {
    s += `<rect x="${cx - (e.w * sc) / 2}" y="${cy - (e.h * sc) / 2}" width="${e.w * sc}" height="${e.h * sc}" rx="${(e.h * sc) / 2}" class="pe-pad"/>`;
    for (const d of e.domes) s += `<circle cx="${cx + d * sc}" cy="${cy}" r="${3.4 * sc}" class="pe-dome"/>`;
  } else {
    s += `<rect x="${cx - (e.w * sc) / 2}" y="${cy - (e.h * sc) / 2}" width="${e.w * sc}" height="${e.h * sc}" rx="${3 * sc}" class="pe-body"/>`;
    for (const c of e.contacts) s += `<rect x="${cx + (c.x - c.w / 2) * sc}" y="${cy - (c.h * sc) / 2}" width="${c.w * sc}" height="${c.h * sc}" rx="${(c.w * sc) / 2}" class="pe-ct"/>`;
  }
  return s + '</svg>';
};
