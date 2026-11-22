# PDF-зріз «Атласу локалізації міоточок та конфігурації sEMG-електродів» для Zenodo; версія — з src/data/myomap.json.
# Генерує atlas-{uk,en}.html; друк у PDF — print.cjs. Тексти атласу беруться з даних сайту без змін;
# тексти, специфічні для документа (анотація, метод, правила оцінки), — у словнику T нижче.
import json, sys, html, os
from figs import HERE, ROOT, BUILD, D, SEC, GEO, U, ABBR, ROLE_FILL, PX_PER_MM, role_of, is_tmr, view_svg, section_svg, electrode_svg, esc

VERSION = D['meta']['version']
DOI = os.environ.get('MYOMAP_DOI') or sys.exit('set MYOMAP_DOI (version DOI reserved on Zenodo)')
DOI_URL = f'https://doi.org/{DOI}'
SITE = 'https://marynahurak.github.io/praxis'
REPO = 'https://github.com/marynahurak/praxis'
ORCID = '0009-0008-7275-8079'
LEVELS = ['ph', 'tr', 'th', 'sd']
FONTS = f'{ROOT}/node_modules/@fontsource'
CONTENT_W = 174  # мм

T = {
 'uk': {
  'kicker': 'Praxis · Технічна записка',
  'subtitle': f'Методологія, анатомічні ілюстрації та правила оцінки розміщення електродів. Зріз версії {VERSION} інтерактивного інструмента.',
  'date': '22 листопада 2026 року', 'author': 'Марина Гурак', 'short': 'Гурак М.',
  'm_doi': 'DOI цієї версії', 'm_online': 'Інтерактивна версія', 'm_repo': 'Код, конвеєр і журнал рішень', 'm_lic': 'Ліцензія', 'm_lang': 'Мови',
  'lang_line': 'Документ українською; англійська версія — у тому самому записі.',
  'lic_line': 'CC BY-NC-ND 4.0 (тексти, схеми, дані); анатомія BodyParts3D © DBCLS — CC BY 4.0',
  'cite_h': 'Як цитувати цей документ',
  'cover_cap': 'Чотири рівні ампутації: часткова кисть (долонна поверхня), трансрадіальний, трансгумеральний рівні та плечова дезартикуляція (передня поверхня).',
  'abstract_h': 'Анотація', 'kw_h': 'Ключові слова', 'toc_h': 'Зміст',
  'abstract': f"Атлас локалізації міоточок та конфігурації sEMG-електродів — інтерактивний навчальний інструмент Praxis для етапу пошуку міоточок (myosite localisation, myotesting) у міоелектричному протезуванні верхньої кінцівки. Анатомічну основу становить відкрита 3D-модель BodyParts3D (DBCLS, CC BY 4.0), з якої отримано вісім ортографічних проєкцій для чотирьох рівнів ампутації — часткової кисті, трансрадіального, трансгумерального рівнів і плечової дезартикуляції — та шість поперечних зрізів сіток моделі. Для 56 м'язів і частин м'язів атлас подає анатомічні описи, роль кожного м'яза як місця для електрода на кожному рівні, фізіологічно конгруентні команди для міотесту, очікуване зусилля та зони слабкого сигналу. Чотири типи електродів розміщуються в масштабі, а геометричне правило одразу оцінює частку площі електрода над черевцем, положення контактів, орієнтацію відносно довгої осі черевця та ризик перехресних наводок (crosstalk). Документ фіксує зміст, ілюстрації та правила оцінки версії {VERSION} для відтворюваності й цитування; інтерактивні функції доступні в онлайн-версії. Атлас є навчальним довідковим ресурсом, а не засобом підтримки клінічних рішень: остаточне положення електродів визначає інструментальна верифікація sEMG-сигналу.",
  'kw': "міоелектричне протезування; поверхнева електроміографія (sEMG); міотестинг; розміщення електродів; ампутація верхньої кінцівки; анатомічний атлас; BodyParts3D; цілеспрямована реіннервація м'язів (TMR)",
  'h_scope': 'Призначення та межі застосування', 'h_pass': 'Паспорт методології', 'h_method': 'Метод',
  'model_ref': 'Опис моделі: Mitsuhashi et al. (2009).', 'h_src': 'Джерело анатомії', 'h_proc': 'Обробка геометрії', 'h_site': 'Рекомендоване місце та вісь черевця', 'h_key': 'Умовні позначення', 'h_lim': 'Обмеження',
  'h_levels': 'Рівні ампутації', 'h_rules': 'Правила автоматичної оцінки розміщення', 'h_el': 'Електроди', 'h_modes': 'Типи керування',
  'h_weak': 'Де сигнал слабкий і чому', 'h_effort': 'Енергоефективність: зусилля та втома', 'h_chain': 'Як працює міоелектрична кисть',
  'h_pit': 'Типові пастки', 'h_ev': 'Рівень доказів', 'h_ver': 'Версії та журнал змін', 'h_legal': 'Авторське право, ліцензія та конфлікт інтересів',
  'h_cite': 'Як цитувати', 'h_refs': 'Джерела', 'h_app': "Додаток А. Каталог м'язів і кісток",
  'proc': [
    "Із моделі BodyParts3D 4.0 (npm-пакет @dagno/anatomy-model) відібрано структури правої верхньої кінцівки та плечового поясу; додано шкіру, тримач м'язів-згиначів (retinaculum musculorum flexorum) і грудну клітку як контекст; вилучено судини та сітку з помилковою міткою в джерелі (рішення D-03).",
    "Кожну проєкцію відтворено ортографічно (three.js у безголовому Chromium) у чотирьох режимах: затінення, кольорова мітка структури, силует шкіри, сухожилкові зони.",
    "Сухожилкові зони (tendinous zones) визначено геометрично: сітку м'яза розрізають 48 площинами, перпендикулярними до її довгої осі; ділянка вважається сухожилковою, якщо площа перерізу менша за 16% від максимальної або товщина (2 · площа / периметр) менша за 36% від максимальної. На поперечних зрізах пороги становлять 12% і 30% (D-04).",
    "Маски перетворено на SVG-контури; для кожного м'яза обчислено рекомендоване місце, довгу вісь видимого черевця, площу черевця та діаметр найбільшого вписаного кола.",
    "Поперечні зрізи — перерізи сіток моделі на заданих рівнях. На рівні кисті сухожилки зовнішніх м'язів кисті (extrinsic hand muscles), тобто м'язів передпліччя, позначено як сухожилкову тканину.",
    "Найширшого м'яза спини (m. latissimus dorsi) у моделі немає; його показано схематичним контуром за типовими орієнтирами початку й прикріплення (D-02).",
    "Сітка довгого долонного м'яза (m. palmaris longus) у джерелі містить і долонний апоневроз (aponeurosis palmaris), який не проходив пороги кроку 3. На передній проєкції передпліччя все дистальніше найвужчого місця сухожилка, а на проєкціях кисті весь контур позначено як сухожилкову зону; рекомендоване місце й вісь перераховано тим самим кодом (D-12, версія 2.1.1).",
  ],
  'proc_tail': 'Скрипти конвеєра, параметри та журнал проєктних рішень D-01–D-12 відкриті в репозиторії (scripts/myomap-pipeline/, docs/myomap-design-log.md).',
  'site': "De Luca (1997) рекомендує розміщувати електрод на середній лінії черевця між зоною іннервації та м'язово-сухожилковим переходом. Зон іннервації в моделі немає, тому рекомендоване місце наближено геометрично: це центр найбільшого вписаного кола у видимому черевці без сухожилкових зон (максимум перетворення відстаней, distance transform). Орієнтацію задає довга вісь видимого черевця, обчислена методом головних компонент (principal component analysis, PCA). Це відтворюване наближення, а не заміна міотесту (D-05).",
  'key_intro': 'Права верхня кінцівка в анатомічному положенні, ортографічна проєкція. Поперечні зрізи показано з дистального боку: передня (долонна) поверхня вгорі. Кожна ілюстрація має масштабну лінійку; зрізи одного рівня наведено в спільному масштабі.',
  'key_hatch': 'Штрихування — зони слабкого сигналу: сухожилкові зони та підшкірна кістка; світлий беж на зрізах — сухожилкова тканина.',
  'key_circle': "Пунктирне коло — найбільше вписане коло в черевці (рекомендоване місце), лінія — довга вісь черевця; показано для типових стартових, додаткових і залежних від збереженої анатомії місць.",
  'key_schem': "Синій пунктирний контур — схематичний м'яз, якого немає в 3D-моделі.",
  'lim': [
    'Одна референтна модель дорослої людини: індивідуальна та посттравматична анатомія залишкової кінцівки може суттєво відрізнятися.',
    "Сухожилкові зони визначено геометрично; це не гістологічна межа м'язово-сухожилкового переходу.",
    'Зони іннервації не моделюються.',
    None,  # fbNote
    "Контур найширшого м'яза спини схематичний.",
    'Автоматична оцінка розміщення — геометрична евристика, а не валідований клінічний алгоритм.',
    None,  # passStatus
  ],
  'tbl': ['Скор.', "М'яз", 'Роль на рівні', 'Команда для міотесту', 'Зусилля'],
  'tmr_mark': 'можлива мішень TMR',
  'modes_h': 'Типи керування на цьому рівні', 'lvpit_h': 'Особливості рівня',
  'fig': 'Рис.', 'views_cap': '{lv}: {a} і {b}. Колір — роль м\'яза на цьому рівні.',
  'sec_cap': '{lv}: поперечні зрізи ({list}), вигляд з дистального боку, спільний масштаб.',
  'rules_intro': "Оцінка розміщення — геометричне правило на основі однієї референтної моделі, а не валідований клінічний алгоритм. Принципи взято із SENIAM (Hermens et al., 2000) і De Luca (1997); числові пороги — евристика (D-07). Електроди відображаються в масштабі: розмір у пікселях = розмір у мм × масштаб проєкції / 1000.",
  'rules_view_h': 'Проєкції', 'rules_sec_h': 'Поперечні зрізи', 'rules_pair_h': 'Пара каналів (пряме керування)', 'rules_grade_h': 'Підсумкова оцінка',
  'rules_view': [
    'Площу електрода дискретизують сіткою 9 × 5 точок (45 точок) у межах його контуру з відступом 1 мм від краю.',
    "Кожну точку класифікують: черевце м'яза, сухожилкова зона, кістка або поза м'язами.",
    "Основний м'яз — той, над яким найбільше точок; точки над його сухожилковою зоною мають вагу 0,5.",
    "Частка над черевцем = кількість точок над черевцем основного м'яза / кількість усіх точок.",
    "Контакти: центр кожного контакту (для електродів із куполами — кожного купола) має лежати над черевцем основного м'яза.",
    "Орієнтація: кут між віссю електрода (лінією через контакти) і довгою віссю черевця: ≤ 20° — вісь збігається; 20–40° — відхилення; > 40° — електрод розвернуто поперек м'яза.",
    "Перекриття: інший м'яз, над яким лежить ≥ 6% точок, вважається перекритим.",
    "Кільце 5 мм: 32 точки на прямокутнику, віддаленому на 5 мм від краю електрода. М'язи, що там трапляються, показуються як інформація про ризик перехресних наводок і на оцінку не впливають.",
    "Ширина черевця: діаметр найбільшого вписаного кола в черевці порівнюють із шириною електрода; вужче черевце дає попередження.",
  ],
  'rules_sec': [
    'Від точки на шкірі вглиб уздовж внутрішньої нормалі до контуру шкіри структури зчитують кожні 0,5 мм до глибини 20 мм.',
    "Перша м'язова структура (черевце або сухожилкова тканина) на цьому промені — цільова. Якщо кістка трапляється раніше, шлях вважається заблокованим.",
    "Перекриття: на 2 мм глибше від початку цільової структури перевіряють 7 точок упоперек ширини електрода (ширина корпусу; для електродів із куполами — 10 мм). Інші м'язи там означають ризик перехресних наводок.",
  ],
  'grade_view': "«Добре розміщення» на проєкції: частка над черевцем ≥ 75%, усі контакти над черевцем основного м'яза, відхилення від осі ≤ 20°, немає перекритих м'язів, а в режимі прямого керування роль м'яза не «глибокий шар», «із застереженням» чи «сусідня ділянка». «Невдале розміщення»: основного м'яза немає або частка над черевцем < 35%. В інших випадках — «Можна покращити».",
  'grade_sec': "«Добре розміщення» на зрізі: перша структура — черевце (не сухожилкова тканина), перекритих м'язів немає, роль м'яза прийнятна для прямого керування. «Невдале розміщення»: у межах 15 мм м'язів немає або кістка лежить перед м'язом. В інших випадках — «Можна покращити».",
  'pair': "Для двох перших електродів у режимі прямого керування показується відстань між їхніми центрами (мм) і співвідношення м'язів: антагоністи (м'язи-згиначі та м'язи-розгиначі), одна функціональна група або той самий м'яз (тоді сигнали не будуть незалежними).",
  'el_tbl': ['Тип', 'Приклад', 'Контур на схемі, мм', 'Дані виробника', 'Джерело'],
  'el_fig': 'Контури електродів, накреслені Praxis, у масштабі 1:1 (за друку без масштабування). Розміри виробника підтверджено лише для 13E200 (27 × 18 × 9,5 мм); решта контурів умовні.',
  'domes': 'відстань між куполами', 'flange': 'манжета',
  'sys_tbl': ['Тип керування', 'Система', 'Примітка'],
  'sim': "В онлайн-версії є навчальний симулятор двоканального керування із синтезованим сигналом. Коскорочення фіксується, коли обидва канали перетинають поріг у межах 350 мс; після перемикання хвата кисть чекає, доки обидва канали розслабляться (D-10). Ці параметри — навчальна умовність.",
  'ev_tbl': ['Компонент', 'Основа та впевненість'],
  'basis_h': 'Позначки основи тверджень у тексті атласу',
  'cl_tbl': ['Версія', 'Дата', 'Зміни'],
  'ver_tail': f'Цей документ відповідає версії {VERSION}. Кожна наступна версія атласу отримає нову версію запису Zenodo з окремим DOI; спільний DOI запису (concept DOI) завжди вказує на найновішу версію.',
  'cite_doc_h': 'Цей документ', 'cite_tool_h': 'Інтерактивний інструмент',
  'cite_doc': f'Гурак М. Атлас локалізації міоточок та конфігурації sEMG-електродів (версія {VERSION}) [технічна записка]. Zenodo; 2026. doi:{DOI}',
  'cite_note': 'У дослідженнях і публікаціях указуйте версію, з якою працювали.',
  'contact_url': f'{SITE}/about/#contact',
  'app_intro': "Описи м'язів і кісток у тому вигляді, у якому їх подано в атласі. Скорочення відповідають підписам на ілюстраціях; «Рівні» — роль м'яза як місця для електрода на кожному рівні ампутації.",
  'regions': {'ph': "Кисть (власні м'язи)", 'tr': 'Передпліччя', 'th': 'Плече', 'sd': 'Плечовий пояс, тулуб і шия'},
  'levels_lbl': 'Рівні', 'bones_h': 'Кістки', 'not_in_model': "у 3D-моделі немає окремої сітки; на ілюстраціях не показано",
  'footer': f'Гурак М. · Атлас міоточок · версія {VERSION} · doi:{DOI}', 'page': 'с. ', 'of': ' з ',
  'mm': 'мм', 'lang_attr': 'uk', 'title_meta': f'Атлас локалізації міоточок та конфігурації sEMG-електродів, версія {VERSION}',
 },
 'en': {
  'kicker': 'Praxis · Technical note',
  'subtitle': f'Methodology, anatomical figures and electrode placement evaluation rules. A snapshot of version {VERSION} of the interactive tool.',
  'date': '22 November 2026', 'author': 'Maryna Hurak', 'short': 'Hurak M.',
  'm_doi': 'DOI of this version', 'm_online': 'Interactive version', 'm_repo': 'Code, pipeline and decision log', 'm_lic': 'Licence', 'm_lang': 'Languages',
  'lang_line': 'This document is in English; the Ukrainian version is in the same record.',
  'lic_line': 'CC BY-NC-ND 4.0 (texts, figures, data); BodyParts3D anatomy © DBCLS — CC BY 4.0',
  'cite_h': 'How to cite this document',
  'cover_cap': 'Four amputation levels: partial hand (palmar surface), transradial, transhumeral and shoulder disarticulation (anterior surface).',
  'abstract_h': 'Abstract', 'kw_h': 'Keywords', 'toc_h': 'Contents',
  'abstract': f"The Myosite localisation and sEMG electrode configuration atlas is an interactive educational tool from Praxis for the myosite localisation (myotesting) stage of upper-limb myoelectric prosthetic fitting. Its anatomical basis is the open BodyParts3D model (DBCLS, CC BY 4.0), from which eight orthographic views were generated for four amputation levels (partial hand, transradial, transhumeral and shoulder disarticulation), together with six cross-sections of the model meshes. For 56 muscles and muscle parts, the atlas provides anatomical descriptions, the role of each muscle as an electrode site at each level, physiologically congruent myotest commands, expected effort and weak-signal zones. Four electrode types can be placed at true scale, and a geometric rule immediately evaluates the fraction of the electrode area over the muscle belly, the contact positions, the orientation relative to the long axis of the belly and the risk of crosstalk. This document records the content, figures and evaluation rules of version {VERSION} for reproducibility and citation; the interactive functions are available online. The atlas is an educational reference, not a clinical decision-support tool: final electrode positions are determined by instrumented verification of the sEMG signal.",
  'kw': 'myoelectric prosthesis; surface electromyography (sEMG); myotesting; electrode placement; upper limb amputation; anatomical atlas; BodyParts3D; targeted muscle reinnervation (TMR)',
  'h_scope': 'Scope and intended use', 'h_pass': 'Methodology passport', 'h_method': 'Method',
  'model_ref': 'Model description: Mitsuhashi et al. (2009).', 'h_src': 'Anatomy source', 'h_proc': 'Geometry processing', 'h_site': 'Recommended site and belly axis', 'h_key': 'Key to the figures', 'h_lim': 'Limitations',
  'h_levels': 'Amputation levels', 'h_rules': 'Automatic placement evaluation rules', 'h_el': 'Electrodes', 'h_modes': 'Control types',
  'h_weak': 'Where the signal is weak, and why', 'h_effort': 'Energy efficiency: effort and fatigue', 'h_chain': 'How a myoelectric hand works',
  'h_pit': 'Common pitfalls', 'h_ev': 'Level of evidence', 'h_ver': 'Versions and changelog', 'h_legal': 'Copyright, licence and conflict of interest',
  'h_cite': 'How to cite', 'h_refs': 'References', 'h_app': 'Appendix A. Catalogue of muscles and bones',
  'proc': [
    'Structures of the right upper limb and shoulder girdle were selected from the BodyParts3D 4.0 model (npm package @dagno/anatomy-model); the skin, the flexor retinaculum (retinaculum musculorum flexorum) and the thorax were added as context; vessels and a mesh mislabelled in the source were removed (decision D-03).',
    'Each view was rendered orthographically (three.js in headless Chromium) in four modes: shading, structure colour ID, skin silhouette and tendinous zones.',
    'Tendinous zones were defined geometrically: each muscle mesh is cut by 48 planes perpendicular to its long axis, and a region is classed as tendinous if its cross-sectional area is below 16% of the maximum or its thickness (2 × area / perimeter) is below 36% of the maximum. In the cross-sections the thresholds are 12% and 30% (D-04).',
    'The masks were converted to SVG outlines; for each muscle, the recommended site, the long axis of the visible belly, the belly area and the diameter of the largest inscribed circle were computed.',
    'The cross-sections are cuts through the model meshes at set levels. At the hand level, the tendons of the extrinsic hand muscles (that is, the forearm muscles) are labelled as tendinous tissue.',
    'Latissimus dorsi is missing from the model; it is shown as a schematic outline based on typical landmarks of origin and insertion (D-02).',
    'In the source, the palmaris longus mesh also contains the palmar aponeurosis (aponeurosis palmaris), which did not meet the thresholds of step 3. On the anterior forearm view, everything distal to the narrowest part of the tendon, and on the hand views the whole outline, is marked as a tendinous zone; the recommended site and axis were recomputed with the same code (D-12, version 2.1.1).',
  ],
  'proc_tail': 'The pipeline scripts, parameters and the design decision log D-01 to D-12 are open in the repository (scripts/myomap-pipeline/, docs/myomap-design-log.md).',
  'site': 'De Luca (1997) recommends placing the electrode on the midline of the belly between the innervation zone and the myotendinous junction. Innervation zones are not present in the model, so the recommended site is approximated geometrically: it is the centre of the largest circle inscribed in the visible belly without tendinous zones (the maximum of the distance transform). Orientation follows the long axis of the visible belly, computed by principal component analysis (PCA). This is a reproducible approximation, not a substitute for myotesting (D-05).',
  'key_intro': 'Right upper limb in the anatomical position, orthographic projection. Cross-sections are viewed from distal, with the anterior (volar) surface at the top. Each figure has a scale bar; the cross-sections of one level share a common scale.',
  'key_hatch': 'Hatching marks weak-signal zones: tendinous zones and subcutaneous bone; light beige in the cross-sections is tendinous tissue.',
  'key_circle': 'The dashed circle is the largest circle inscribed in the belly (the recommended site) and the line is the long axis of the belly; shown for typical starting sites, additional sites and sites that depend on preserved anatomy.',
  'key_schem': 'A blue dashed outline marks a schematic muscle that is missing from the 3D model.',
  'lim': [
    'A single adult reference model: the individual and post-traumatic anatomy of a residual limb can differ substantially.',
    'Tendinous zones are defined geometrically; they are not the histological boundary of the myotendinous junction.',
    'Innervation zones are not modelled.',
    None,
    'The outline of latissimus dorsi is schematic.',
    'Automatic placement feedback is a geometric heuristic, not a validated clinical algorithm.',
    None,
  ],
  'tbl': ['Abbr.', 'Muscle', 'Role at this level', 'Myotest command', 'Effort'],
  'tmr_mark': 'possible TMR target',
  'modes_h': 'Control types at this level', 'lvpit_h': 'Level-specific points',
  'fig': 'Fig.', 'views_cap': '{lv}: {a} and {b} views. Colour shows the role of the muscle at this level.',
  'sec_cap': '{lv}: cross-sections ({list}), viewed from distal, common scale.',
  'rules_intro': 'Placement evaluation is a geometric rule based on a single reference model, not a validated clinical algorithm. The principles follow SENIAM (Hermens et al., 2000) and De Luca (1997); the numerical thresholds are heuristic (D-07). Electrodes are drawn at true scale: size in pixels = size in mm × view scale / 1000.',
  'rules_view_h': 'Views', 'rules_sec_h': 'Cross-sections', 'rules_pair_h': 'Channel pair (direct control)', 'rules_grade_h': 'Overall rating',
  'rules_view': [
    'The electrode area is sampled with a 9 × 5 grid (45 points) within its outline, inset 1 mm from the edge.',
    'Each point is classified as muscle belly, tendinous zone, bone or off the muscles.',
    'The main muscle is the one under the most points; points over its tendinous zone count with a weight of 0.5.',
    'Belly fraction = number of points over the belly of the main muscle / total number of points.',
    'Contacts: the centre of each contact (for dome electrodes, each dome) must lie over the belly of the main muscle.',
    'Orientation: the angle between the electrode axis (the line through the contacts) and the long axis of the belly: ≤ 20°, the axes match; 20–40°, deviation; > 40°, the electrode is turned across the muscle.',
    'Overlap: another muscle under ≥ 6% of the points counts as overlapped.',
    '5-mm ring: 32 points on a rectangle offset 5 mm from the electrode edge. Muscles found there are reported as information on crosstalk risk and do not affect the rating.',
    'Belly width: the diameter of the largest circle inscribed in the belly is compared with the electrode width; a narrower belly triggers a warning.',
  ],
  'rules_sec': [
    'From a point on the skin, structures are read inwards along the inward normal to the skin outline every 0.5 mm, to a depth of 20 mm.',
    'The first muscular structure (belly or tendinous tissue) along this ray is the target. If bone is met first, the path is classed as blocked.',
    'Overlap: 2 mm deeper than the start of the target structure, 7 points across the electrode width are checked (housing width; 10 mm for dome electrodes). Other muscles there indicate crosstalk risk.',
  ],
  'grade_view': '“Good placement” in a view: belly fraction ≥ 75%, all contacts over the belly of the main muscle, axis deviation ≤ 20°, no overlapped muscles and, in direct control mode, a muscle role other than “deep”, “with caveats” or “neighbouring region”. “Poor placement”: no main muscle or a belly fraction < 35%. Otherwise: “Could be improved”.',
  'grade_sec': '“Good placement” in a cross-section: the first structure is muscle belly (not tendinous tissue), there are no overlapped muscles and the muscle role is acceptable for direct control. “Poor placement”: no muscle within 15 mm, or bone lies in front of the muscle. Otherwise: “Could be improved”.',
  'pair': 'For the first two electrodes in direct control mode, the distance between their centres (mm) and the relationship of the muscles are reported: antagonists (flexors and extensors), the same functional group, or the same muscle (in which case the signals will not be independent).',
  'el_tbl': ['Type', 'Example', 'Outline in the drawing, mm', 'Manufacturer data', 'Source'],
  'el_fig': 'Electrode outlines drawn by Praxis at 1:1 scale (when printed without scaling). Manufacturer dimensions are confirmed only for the 13E200 (27 × 18 × 9.5 mm); the other outlines are indicative.',
  'domes': 'dome spacing', 'flange': 'flange',
  'sys_tbl': ['Control type', 'System', 'Note'],
  'sim': 'The online version includes a two-channel control simulator with a synthetic signal. A co-contraction is registered when both channels cross the threshold within 350 ms; after a grip switch, the hand waits until both channels relax (D-10). These parameters are teaching conventions.',
  'ev_tbl': ['Component', 'Basis and confidence'],
  'basis_h': 'Labels for the basis of statements in the atlas text',
  'cl_tbl': ['Version', 'Date', 'Changes'],
  'ver_tail': f'This document corresponds to version {VERSION}. Each subsequent version of the atlas will receive a new version of the Zenodo record with its own DOI; the record’s concept DOI always resolves to the latest version.',
  'cite_doc_h': 'This document', 'cite_tool_h': 'Interactive tool',
  'cite_doc': f'Hurak M. Myosite localisation and sEMG electrode configuration atlas (version {VERSION}) [technical note]. Zenodo; 2026. doi:{DOI}',
  'cite_note': 'In studies and publications, state the version you used.',
  'contact_url': f'{SITE}/en/about/#contact',
  'app_intro': 'Descriptions of muscles and bones as given in the atlas. Abbreviations match the labels in the figures; “Levels” gives the role of the muscle as an electrode site at each amputation level.',
  'regions': {'ph': 'Hand (intrinsic muscles)', 'tr': 'Forearm', 'th': 'Arm', 'sd': 'Shoulder girdle, trunk and neck'},
  'levels_lbl': 'Levels', 'bones_h': 'Bones', 'not_in_model': 'no separate mesh in the 3D model; not shown in the figures',
  'footer': f'Hurak M. · Myosite atlas · version {VERSION} · doi:{DOI}', 'page': 'p. ', 'of': ' of ',
  'mm': 'mm', 'lang_attr': 'en', 'title_meta': f'Myosite localisation and sEMG electrode configuration atlas, version {VERSION}',
 },
}

LOGO = ('<svg width="40" height="40" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#161b22"/>'
        '<g transform="translate(1.9 0.25)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 31.1V13H31A11.5 11.5 0 0 1 31 36H25.9" stroke="#E6EAF0" stroke-width="5"/>'
        '<path d="M21 40.9V51" stroke="#E6EAF0" stroke-width="5"/><circle cx="21" cy="36" r="3" stroke="#8DB0FF" stroke-width="2.6"/><circle cx="31" cy="24.5" r="3" stroke="#8DB0FF" stroke-width="2.6"/></g></svg>')


def build(lang, toc_pages=None):
    t = T[lang]; ui = U['ui'][lang]; fb = U['fb'][lang]
    tx = lambda v: (v or {}).get(lang, '') if isinstance(v, dict) else (v or '')
    e = esc
    other = 'en' if lang == 'uk' else 'uk'
    toc = []   # (id, number, title, level)
    H = []
    fig_no = [0]

    def h1(id_, num, title):
        toc.append((id_, num, title, 1))
        return f'<h2 id="{id_}"><span class="num">{num}</span>{e(title)}</h2>'

    def h2(id_, num, title, in_toc=True):
        if in_toc:
            toc.append((id_, num, title, 2))
        return f'<h3 id="{id_}"><span class="num">{num}</span>{e(title)}</h3>'

    def figcap(text):
        fig_no[0] += 1
        return f'<figcaption><b>{t["fig"]} {fig_no[0]}.</b> {text}</figcaption>'

    def basis_tag(b):
        return f'<span class="tag tag-{b}">{e(ui["basis"][b])}</span>'

    def role_chip(r):
        return f'<span class="chip"><i style="background:{ROLE_FILL[r]}"></i>{e(tx(D["roles"][r]))}</span>'

    # ------------------------------------------------------------------ cover
    strip = []
    for vid, lv in (('ph_palm', 'ph'), ('tr_ant', 'tr'), ('th_ant', 'th'), ('sd_ant', 'sd')):
        g = GEO[vid]; hmm = 64; wmm = hmm * g['w'] / g['h']
        strip.append(f'<div class="cv-fig">{view_svg(vid, lv, wmm, "cv" + vid, t["mm"], labels=False, sites=False, weak=False, bar=False)}<span>{e(tx(D["levels"][lv]["title"]))}</span></div>')
    other_title = U['ui'][other]['title']
    cover = f'''
<section class="cover">
  <div class="cv-top">
    <div class="cv-brand">{LOGO}<span>{e(t["kicker"])}</span></div>
    <h1 class="cv-title">{e(ui["title"])}</h1>
    <p class="cv-other" lang="{other}">{e(other_title)}</p>
    <p class="cv-sub">{e(t["subtitle"])}</p>
    <div class="cv-chips"><span class="vchip">v{VERSION}</span><span>{e(t["date"])}</span></div>
  </div>
  <div class="cv-body">
    <p class="cv-author">{e(t["author"])} <a href="https://orcid.org/{ORCID}" class="orcid">ORCID {ORCID}</a></p>
    <dl class="cv-meta">
      <dt>{e(t["m_doi"])}</dt><dd><a href="{DOI_URL}">{DOI_URL}</a></dd>
      <dt>{e(t["m_online"])}</dt><dd><a href="{SITE}{'' if lang == 'uk' else '/en'}/tools/myotesting-map/">{SITE}{'' if lang == 'uk' else '/en'}/tools/myotesting-map/</a></dd>
      <dt>{e(t["m_repo"])}</dt><dd><a href="{REPO}">{REPO}</a></dd>
      <dt>{e(t["m_lic"])}</dt><dd><a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">{e(t["lic_line"])}</a></dd>
      <dt>{e(t["m_lang"])}</dt><dd>{e(t["lang_line"])}</dd>
    </dl>
    <div class="cv-strip">{''.join(strip)}</div>
    <p class="cv-cap">{e(t["cover_cap"])}</p>
    <div class="cv-cite"><b>{e(t["cite_h"])}</b><span>{e(t["cite_doc"])}</span></div>
    <p class="cv-foot">© 2026 {e(t["author"])} · CC BY-NC-ND 4.0 · {e(ui["credit"])}</p>
  </div>
</section>'''

    # ------------------------------------------------------------------ abstract + toc
    H.append(f'<section class="front"><h2 class="plain">{e(t["abstract_h"])}</h2><p class="abstract">{e(t["abstract"])}</p>'
             f'<p class="kw"><b>{e(t["kw_h"])}:</b> {e(t["kw"])}</p>'
             f'<h2 class="plain toc-h">{e(t["toc_h"])}</h2>@@TOC@@</section>')

    # ------------------------------------------------------------------ 1 scope
    H.append('<section class="main">')
    H.append(h1('scope', '1', t['h_scope']))
    H.append(f'<p>{e(ui["scope"])}</p>')
    H.append(f'<div class="warn"><b>{e(ui["warnTitle"])}.</b> {e(ui["warn"])}</div>')

    # ------------------------------------------------------------------ 2 passport
    H.append(h1('passport', '2', t['h_pass']))
    H.append(f'<p class="lead">{e(ui["passLead"])}</p>')
    rows = [
        (ui['pass']['name'], e(ui['title'])),
        (ui['pass']['version'], f'{VERSION} · {e(t["date"])} · DOI <a href="{DOI_URL}">{DOI}</a>'),
        (ui['pass']['status'], e(ui['passStatus'])),
        (ui['pass']['purpose'], e(ui['passPurpose'])),
        (ui['pass']['evidence'], e(ui['passEvidence'])),
        (ui['pass']['repro'], f'{e(ui["passRepro"])} <a href="{REPO}">{REPO}</a>'),
        (ui['pass']['author'], f'{e(t["author"])} · <a href="https://orcid.org/{ORCID}">ORCID {ORCID}</a>'),
        (ui['pass']['rights'], e(ui['passRights'])),
        (ui['pass']['cite'], e(t['cite_doc'])),
    ]
    H.append('<table class="pass">' + ''.join(f'<tr><th>{e(a)}</th><td>{b}</td></tr>' for a, b in rows) + '</table>')

    # ------------------------------------------------------------------ 3 method
    H.append(h1('method', '3', t['h_method']))
    H.append(h2('m-src', '3.1', t['h_src']))
    H.append(f'<p>{e(ui["source"])} {e(t["model_ref"])}</p>')
    H.append(h2('m-proc', '3.2', t['h_proc']))
    H.append('<ol class="steps">' + ''.join(f'<li>{e(x)}</li>' for x in t['proc']) + '</ol>')
    H.append(f'<p class="small">{e(t["proc_tail"])}</p>')
    H.append(h2('m-site', '3.3', t['h_site']))
    H.append(f'<p>{e(t["site"])}</p>')
    H.append(h2('m-key', '3.4', t['h_key']))
    H.append(f'<p>{e(t["key_intro"])}</p>')
    H.append('<div class="legend">' + ''.join(role_chip(r) for r in ('primary', 'secondary', 'conditional', 'caution', 'deep', 'context')) + '</div>')
    H.append(f'<ul class="keylist"><li><span class="sw sw-hatch"></span>{e(t["key_hatch"])}</li>'
             f'<li><span class="sw sw-circle"></span>{e(t["key_circle"])}</li>'
             f'<li><span class="sw sw-schem"></span>{e(t["key_schem"])}</li></ul>')
    H.append(h2('m-lim', '3.5', t['h_lim']))
    lim = list(t['lim']); lim[3] = ui['fbNote']; lim[6] = ui['passStatus']
    H.append('<ul class="lim">' + ''.join(f'<li>{e(x)}</li>' for x in lim) + '</ul>')

    # ------------------------------------------------------------------ 4 levels
    H.append(h1('levels', '4', t['h_levels']))
    ROLE_ORDER = ['primary', 'secondary', 'conditional', 'caution', 'deep']
    for i, lv in enumerate(LEVELS, 1):
        L = D['levels'][lv]
        H.append(f'<div class="level{" first" if i == 1 else ""}">')
        H.append(h2(f'lv-{lv}', f'4.{i}', tx(L['title'])))
        H.append(f'<p>{e(tx(L["intro"]))}</p>')
        mn = L.get('modeNotes') or {}
        H.append(f'<dl class="modes">' + ''.join(f'<dt>{e(tx(D["modes"][m]["label"]))}</dt><dd>{e(tx(mn[m]))}</dd>' for m in ('direct', 'pr', 'tmr') if m in mn) + '</dl>')
        if L.get('pitfalls'):
            H.append(f'<p class="sub-h">{e(t["lvpit_h"])}</p><ul class="lvpit">' + ''.join(f'<li>{e(tx(p))}</li>' for p in L['pitfalls']) + '</ul>')
        # table
        keys = sorted(L['roles'].keys(), key=lambda k: (ROLE_ORDER.index(L['roles'][k]), list(D['muscles']).index(k)))
        trs = []
        for k in keys:
            m = D['muscles'][k]; r = L['roles'][k]
            eff = (m.get('effort') or {}).get('level')
            rcell = f'<i class="dot" style="background:{ROLE_FILL[r]}"></i>{e(tx(D["roles"][r]))}' + (f'<br><span class="tmr">{e(t["tmr_mark"])}</span>' if is_tmr(lv, k) else '')
            trs.append(f'<tr><td class="ab">{e(ABBR.get(k, k))}</td><td>{e(tx(m["name"]))}<br><span class="lat">{e(m["latin"])}</span></td><td>{rcell}</td>'
                       f'<td>{e(tx(m.get("cmd"))) or "—"}</td><td>{e(tx(D["effort"]["levels"][eff])) if eff else "—"}</td></tr>')
        H.append(f'<table class="mt"><thead><tr>' + ''.join(f'<th>{e(c)}</th>' for c in t['tbl']) + '</tr></thead><tbody>' + ''.join(trs) + '</tbody></table>')
        # views
        va, vb = L['views']
        ga, gb = GEO[va['id']], GEO[vb['id']]
        gap = 6
        wmm = min((CONTENT_W - gap) / 2, 150 * ga['w'] / ga['h'])
        OR = {'tr_ant': ('sideL', 'sideM'), 'tr_post': ('sideM', 'sideL'), 'th_ant': ('sideL', 'sideM'), 'th_post': ('sideM', 'sideL'),
              'ph_palm': ('radial', 'ulnar'), 'ph_dors': ('ulnar', 'radial'), 'sd_ant': ('sideL', 'midline'), 'sd_post': ('midline', 'sideL')}
        cells = []
        for v in (va, vb):
            o = OR[v['id']]
            cells.append(f'<div class="vcell" style="width:{wmm:.1f}mm"><div class="orient"><span>← {e(ui[o[0]])}</span><b>{e(tx(v["label"]))}</b><span>{e(ui[o[1]])} →</span></div>'
                         f'{view_svg(v["id"], lv, wmm, f"{lang}-{v["id"]}", t["mm"])}</div>')
        used = {r for r in L['roles'].values()} | {'context'}
        leg = '<div class="legend sm">' + ''.join(role_chip(r) for r in ('primary', 'secondary', 'conditional', 'caution', 'deep', 'context') if r in used) + '</div>'
        cap = t['views_cap'].format(lv=e(tx(L['title'])), a=e(tx(va['label']).lower()), b=e(tx(vb['label']).lower()))
        H.append(f'<figure class="views">{"".join(cells)}{leg}{figcap(cap + " " + e(t["key_hatch"]) + " " + e(t["key_circle"]))}</figure>')
        # sections
        if L['sections']:
            secs = L['sections']; pad = 48
            tot_u = sum(SEC[s['id']]['w'] + pad for s in secs)
            max_h = max(SEC[s['id']]['h'] + pad for s in secs)
            k = min((CONTENT_W - 5 * (len(secs) - 1)) * PX_PER_MM / tot_u, 78 * PX_PER_MM / max_h)
            cells = []
            lft = ui['radial'] if lv == 'ph' else ui['sideL']; rgt = ui['ulnar'] if lv == 'ph' else ui['sideM']
            for s in secs:
                cells.append(f'<div class="scell"><p class="slabel">{e(tx(s["label"]))}</p>{section_svg(s["id"], lv, k, f"{lang}-{s["id"]}", t["mm"])}</div>')
            cap = t['sec_cap'].format(lv=e(tx(L['title'])), list=', '.join(e(tx(s['label'])).lower() for s in secs))
            H.append(f'<figure class="secs"><div class="orient"><span>← {e(lft)}</span><b>{e(ui["section"])}</b><span>{e(rgt)} →</span></div><div class="srow">{"".join(cells)}</div>{figcap(cap + " " + e(ui["fromBelow"][lv]))}</figure>')
        H.append('</div>')

    # ------------------------------------------------------------------ 5 rules
    H.append(h1('rules', '5', t['h_rules']))
    H.append(f'<p>{e(t["rules_intro"])}</p>')
    H.append(h2('r-view', '5.1', t['rules_view_h']))
    H.append('<ol class="steps">' + ''.join(f'<li>{e(x)}</li>' for x in t['rules_view']) + '</ol>')
    H.append(h2('r-sec', '5.2', t['rules_sec_h']))
    H.append('<ol class="steps">' + ''.join(f'<li>{e(x)}</li>' for x in t['rules_sec']) + '</ol>')
    H.append(h2('r-grade', '5.3', t['rules_grade_h']))
    H.append(f'<div class="grades"><p><span class="g good">{e(fb["good"])}</span> <span class="g fair">{e(fb["fair"])}</span> <span class="g poor">{e(fb["poor"])}</span></p>'
             f'<p>{e(t["grade_view"])}</p><p>{e(t["grade_sec"])}</p></div>')
    H.append(h2('r-pair', '5.4', t['rules_pair_h']))
    H.append(f'<p>{e(t["pair"])}</p><p class="small">{e(ui["fbNote"])}</p>')

    # ------------------------------------------------------------------ 6 electrodes
    H.append(h1('electrodes', '6', t['h_el']))
    trs = []
    for el in D['electrodes']:
        dims = f'{el["w"]} × {el["h"]}'
        if el.get('flange'):
            dims += f'; {t["flange"]} {el["flange"][0]} × {el["flange"][1]}'
        if el.get('domes'):
            dims += f'; {t["domes"]} {abs(el["domes"][1] - el["domes"][0])}'
        trs.append(f'<tr><td>{e(tx(el["name"]))}</td><td>{e(el["example"])}</td><td class="nw">{e(dims)}</td><td>{e(tx(el["note"]))}</td><td class="url"><a href="{e(el["url"])}">{e(el["url"].split("//")[1].split("/")[0])}</a></td></tr>')
    H.append(f'<table class="mt el"><thead><tr>' + ''.join(f'<th>{e(c)}</th>' for c in t['el_tbl']) + '</tr></thead><tbody>' + ''.join(trs) + '</tbody></table>')
    els = ''.join(f'<div class="elc">{electrode_svg(el)}<span>{e(el["example"])}</span></div>' for el in D['electrodes'])
    H.append(f'<figure class="els"><div class="elrow">{els}</div>{figcap(e(t["el_fig"]))}</figure>')

    # ------------------------------------------------------------------ 7 modes
    H.append(h1('modes', '7', t['h_modes']))
    H.append('<dl class="modes big">' + ''.join(f'<dt>{e(tx(D["modes"][m]["label"]))}</dt><dd>{e(tx(D["modes"][m]["desc"]))}</dd>' for m in ('direct', 'pr', 'tmr')) + '</dl>')
    trs = []
    for m in ('direct', 'pr', 'tmr'):
        for s in D['systems'].get(m, []):
            trs.append(f'<tr><td>{e(tx(D["modes"][m]["label"]))}</td><td><a href="{e(s["url"])}">{e(s["name"])}</a></td><td>{e(tx(s["note"]))}</td></tr>')
    H.append(f'<p class="sub-h">{e(ui["systemsTitle"])}</p><table class="mt"><thead><tr>' + ''.join(f'<th>{e(c)}</th>' for c in t['sys_tbl']) + '</tr></thead><tbody>' + ''.join(trs) + f'</tbody></table><p class="small">{e(ui["systemsNote"])}</p>')

    # ------------------------------------------------------------------ 8 weak
    H.append(h1('weak', '8', t['h_weak']))
    H.append('<div class="cards">' + ''.join(f'<div class="card"><p class="card-h">{e(tx(w["title"]))} {basis_tag(w["basis"])}</p><p>{e(tx(w["text"]))}</p></div>' for w in D['weak']) + '</div>')

    # ------------------------------------------------------------------ 9 effort
    H.append(h1('effort', '9', t['h_effort']))
    H.append(f'<p>{e(tx(D["effort"]["intro"]))}</p>')
    H.append('<ul class="princ">' + ''.join(f'<li>{e(tx(p["text"]))} {basis_tag(p["basis"])}</li>' for p in D['effort']['principles']) + '</ul>')
    H.append(f'<p class="small">{e(ui["curveNote"])} {e(tx(D["effort"]["note"]))}</p>')

    # ------------------------------------------------------------------ 10 chain
    H.append(h1('chain', '10', t['h_chain']))
    H.append('<ol class="chain">' + ''.join(f'<li><b>{e(tx(h["t"]))}.</b> {e(tx(h["x"]))}</li>' for h in D['how']) + '</ol>')
    H.append(f'<p>{e(ui["simGripNote"])}</p><p class="small">{e(t["sim"])} {e(ui["simNote"])}</p>')

    # ------------------------------------------------------------------ 11 pitfalls
    H.append(h1('pitfalls', '11', t['h_pit']))
    H.append('<div class="cards">' + ''.join(f'<div class="card"><p class="card-h">{e(tx(p["title"]))} {basis_tag(p["basis"])}</p><p>{e(tx(p["text"]))}</p></div>' for p in D['pitfalls']) + '</div>')

    # ------------------------------------------------------------------ 12 evidence
    H.append(h1('evidence', '12', t['h_ev']))
    H.append(f'<p class="badge-line"><span class="evb">{e(ui["evidenceBadge"])}</span></p>')
    H.append(f'<table class="mt ev"><thead><tr>' + ''.join(f'<th>{e(c)}</th>' for c in t['ev_tbl']) + '</tr></thead><tbody>' + ''.join(f'<tr><td>{e(a)}</td><td>{e(b)}</td></tr>' for a, b in ui['evidenceRows']) + '</tbody></table>')
    H.append(f'<p class="small">{e(t["basis_h"])}: ' + ' '.join(basis_tag(b) for b in ('evidence', 'mechanistic', 'expert')) + '</p>')

    # ------------------------------------------------------------------ 13 versions
    H.append(h1('versions', '13', t['h_ver']))
    H.append(f'<p>{e(ui["versioning"])}</p>')
    H.append(f'<table class="mt cl"><thead><tr>' + ''.join(f'<th>{e(c)}</th>' for c in t['cl_tbl']) + '</tr></thead><tbody>' + ''.join(f'<tr><td class="nw"><b>{c["v"]}</b></td><td class="nw">{c["date"]}</td><td>{e(tx(c["text"]))}</td></tr>' for c in D['changelog']) + '</tbody></table>')
    H.append(f'<p>{e(t["ver_tail"])}</p>')

    # ------------------------------------------------------------------ 14 legal
    H.append(h1('copyright', '14', t['h_legal']))
    H.append(''.join(f'<p>{e(x)}</p>' for x in ui['legal']))
    H.append(f'<p>{e(ui["legalContact"])} <a href="{t["contact_url"]}">{t["contact_url"]}</a></p>')
    H.append(f'<p>{e(ui["coi"])}</p>')

    # ------------------------------------------------------------------ 15 cite
    H.append(h1('cite', '15', t['h_cite']))
    tool_url = f'{SITE}{"" if lang == "uk" else "/en"}/tools/myotesting-map/'
    H.append(f'<div class="citebox"><p class="sub-h">{e(t["cite_doc_h"])}</p><p>{e(t["cite_doc"])}</p>'
             f'<p class="sub-h">{e(t["cite_tool_h"])}</p><p>{e(ui["cite"])} {e(ui["avail"])} <a href="{tool_url}">{tool_url}</a></p>'
             f'<p class="small">{e(t["cite_note"])}</p></div>')

    # ------------------------------------------------------------------ references
    toc.append(('refs', '', t['h_refs'], 1))
    H.append(f'<h2 id="refs" class="plain">{e(t["h_refs"])}</h2>')
    refs = sorted(D['references'], key=lambda r: r['text'])
    H.append('<ol class="refs">' + ''.join(f'<li>{e(r["text"])} <a href="https://doi.org/{e(r["doi"])}">doi:{e(r["doi"])}</a></li>' for r in refs) + '</ol>')
    H.append('</section>')

    # ------------------------------------------------------------------ appendix
    toc.append(('app', '', t['h_app'], 1))
    H.append(f'<section class="appendix"><h2 id="app" class="plain">{e(t["h_app"])}</h2><p class="small">{e(t["app_intro"])}</p>')
    present = {s['key'] for g in GEO.values() for s in g['structs'] if s['kind'] == 'muscle'}
    region = {}
    for k in D['muscles']:
        reg = next((lv for lv in ('tr', 'th', 'sd', 'ph') if k in D['levels'][lv]['roles']), None)
        if not reg:
            reg = next((vid.split('_')[0] for vid, g in GEO.items() if any(s['key'] == k for s in g['structs'])), 'sd')
        region[k] = reg
    LVS = {'ph': {'uk': 'Часткова кисть', 'en': 'Partial hand'}, 'tr': {'uk': 'Трансрадіальний', 'en': 'Transradial'},
           'th': {'uk': 'Трансгумеральний', 'en': 'Transhumeral'}, 'sd': {'uk': 'Плечова дезартикуляція', 'en': 'Shoulder disarticulation'}}
    H.append('<div class="cat">')
    for reg in LEVELS:
        H.append(f'<h4 class="reg">{e(t["regions"][reg])}</h4>')
        for k, m in D['muscles'].items():
            if region[k] != reg:
                continue
            lvl = [f'{LVS[lv][lang]} — {tx(D["roles"][D["levels"][lv]["roles"][k]]).lower() if lang == "uk" else tx(D["roles"][D["levels"][lv]["roles"][k]]).lower()}' + (f' ({t["tmr_mark"]})' if is_tmr(lv, k) else '') for lv in LEVELS if k in D['levels'][lv]['roles']]
            fields = [(ui['origin'], m.get('origin')), (ui['insertion'], m.get('insertion')), (ui['nerve'], m.get('nerve')), (ui['action'], m.get('action')),
                      (ui['why'], m.get('why')), (ui['cmd'], m.get('cmd')), (ui['xt'], m.get('xt'))]
            eff = m.get('effort') or {}
            dd = ''.join(f'<p><b>{e(a)}:</b> {e(tx(v))}</p>' for a, v in fields if tx(v))
            if eff.get('level'):
                dd += f'<p><b>{e(ui["effort"])}:</b> {e(tx(D["effort"]["levels"][eff["level"]]))}. {e(tx(eff.get("text")))}</p>'
            if lvl:
                dd += f'<p><b>{e(t["levels_lbl"])}:</b> {e("; ".join(lvl))}.</p>'
            if m.get('schematic'):
                dd += f'<p class="note">{e(ui["schematic"])}</p>'
            elif k not in present:
                dd += f'<p class="note">{e(t["not_in_model"][0].upper() + t["not_in_model"][1:])}.</p>'
            H.append(f'<div class="mu"><p class="mu-h"><span class="ab">{e(ABBR.get(k, k))}</span> {e(tx(m["name"]))} <span class="lat">{e(m["latin"])}</span></p>{dd}</div>')
    H.append(f'<h4 class="reg">{e(t["bones_h"])}</h4>')
    for k, b in D['bones'].items():
        H.append(f'<div class="mu"><p class="mu-h">{e(tx(b["name"]))} <span class="lat">{e(b["latin"])}</span></p><p>{e(tx(b.get("note")))}</p></div>')
    H.append('</div></section>')

    # ------------------------------------------------------------------ TOC
    def toc_html():
        out = ['<ol class="toc">']
        for id_, num, title, lvl in toc:
            pg = (toc_pages or {}).get(id_, '')
            out.append(f'<li class="t{lvl}"><a href="#{id_}"><span class="tn">{num}</span><span class="tt">{e(title)}</span><span class="tp">{pg}</span></a></li>')
        out.append('</ol>')
        return ''.join(out)

    body = '\n'.join(H).replace('@@TOC@@', toc_html())
    css = open(HERE / 'doc.css').read()
    css = css.replace('@@FOOTER@@', t['footer'].replace('"', '\\"')).replace('@@PAGE@@', t['page']).replace('@@OF@@', t['of'])
    fonts = ''.join(f'<link rel="stylesheet" href="file://{FONTS}/{p}">' for p in (
        'inter/400.css', 'inter/500.css', 'inter/600.css', 'inter/700.css',
        'source-serif-4/400.css', 'source-serif-4/400-italic.css', 'source-serif-4/600.css', 'source-serif-4/700.css',
        'ibm-plex-mono/400.css', 'ibm-plex-mono/500.css'))
    doc = f'<!DOCTYPE html><html lang="{t["lang_attr"]}"><head><meta charset="utf-8"><title>{e(t["title_meta"])}</title>{fonts}<style>{css}</style></head><body>{cover}{body}</body></html>'
    return doc, toc


if __name__ == '__main__':
    lang = sys.argv[1]
    pages = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else None
    doc, toc = build(lang, pages)
    open(f'{BUILD}/atlas-{lang}.html', 'w').write(doc)
    json.dump([[a, b, c, d] for a, b, c, d in toc], open(f'{BUILD}/toc-{lang}.json', 'w'), ensure_ascii=False)
    print('ok', lang, len(doc) // 1024, 'KB')
