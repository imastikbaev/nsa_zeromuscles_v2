'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Rocket,
  Zap,
  Camera,
  Globe2,
  AlertCircle,
  Radio,
  Shield,
  Gauge,
  Crosshair,
} from 'lucide-react';
import { ExpeditionShell, useExpeditionCopy } from '@/components/expedition-shell';
import { LaunchIntro } from '@/components/launch-intro';
import { EarthScene } from '@/components/earth-scene';
import {
  firstMission,
  sufficientPanels,
  type TutorialCameraId,
} from '@/lib/first-mission';
import { calculate } from '@/lib/engineering';
import {
  instruments,
  launchers,
  missions,
  orbits,
  scenarios,
  systems,
  type MissionId,
  type Mode,
} from '@/lib/data';
import { createFlight } from '@/lib/simulation';
import { clearFlight, DESIGN_KEY, readDesign, readFlight, saveFlight } from '@/lib/storage';
import { prepareProjectLoad, readProjects, writeProjects } from '@/lib/projects';
import { useI18n } from '@/components/preferences';

const CAMERA_IDS: readonly TutorialCameraId[] = [
  'camera',
  'radiometer',
  'spectrometer',
  'hires',
  'radar',
  'particles',
];

export default function FirstMission() {
  const c = useExpeditionCopy(),
    { t } = useI18n(),
    router = useRouter();

  const [step, setStep] = useState(0);
  const [missionId, setMissionId] = useState<MissionId>('earth');
  const [mode, setMode] = useState<Mode>('guided');
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [orbitId, setOrbitId] = useState<string>('sso');
  const [camera, setCamera] = useState<TutorialCameraId>('camera');
  const [secondaryInstrument, setSecondaryInstrument] = useState<string | null>(null);
  const [powerType, setPowerType] = useState<'solar' | 'advanced' | 'rtg'>('solar');
  const [panels, setPanels] = useState(1);
  const [battery, setBattery] = useState(1.2);
  const [communications, setCommunications] = useState<'xband' | 'kaband' | 'laser'>('xband');
  const [antenna, setAntenna] = useState<'patch' | 'dish' | 'array'>('patch');
  const [computer, setComputer] = useState<'standard' | 'redundant' | 'science'>('standard');
  const [propulsion, setPropulsion] = useState<'chemical' | 'hybrid' | 'ion'>('chemical');
  const [fuel, setFuel] = useState(100);
  const [thermal, setThermal] = useState<'passive' | 'active' | 'shield'>('passive');
  const [launcher, setLauncher] = useState<'swift' | 'atlas' | 'titan' | 'horizon'>('swift');

  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [showLaunchIntro, setShowLaunchIntro] = useState(false);
  const [activeFlight, setActiveFlight] = useState<string | null>(null),
    [ready, setReady] = useState(false);

  function applyPlanetDefaults(nextMission: MissionId, preserveScenario: string | null = null) {
    const mMeta = missions.find((item) => item.id === nextMission) ?? missions[0];
    setMissionId(nextMission);
    setOrbitId(mMeta.orbit);

    const matchingScenario =
      preserveScenario &&
      scenarios.some((s) => s.id === preserveScenario && s.mission === nextMission)
        ? preserveScenario
        : null;
    setScenarioId(matchingScenario);

    if (nextMission === 'earth') {
      setCamera('camera');
      setSecondaryInstrument(null);
      setPowerType('solar');
      setPanels(1);
      setAntenna('patch');
      setPropulsion('chemical');
      setFuel(100);
      setThermal('passive');
      setLauncher('swift');
    } else if (nextMission === 'lunar') {
      setCamera('spectrometer');
      setSecondaryInstrument('camera');
      setPowerType('solar');
      setPanels(3);
      setAntenna('dish');
      setPropulsion('chemical');
      setFuel(240);
      setThermal('passive');
      setLauncher('atlas');
    } else if (nextMission === 'mars') {
      setCamera('spectrometer');
      setSecondaryInstrument('camera');
      setPowerType('solar');
      setPanels(8);
      setAntenna('dish');
      setPropulsion('ion');
      setFuel(180);
      setThermal('active');
      setLauncher('titan');
    } else if (nextMission === 'asteroid') {
      setCamera('spectrometer');
      setSecondaryInstrument('camera');
      setPowerType('solar');
      setPanels(14);
      setAntenna('dish');
      setPropulsion('ion');
      setFuel(220);
      setThermal('active');
      setLauncher('titan');
    } else if (nextMission === 'solar') {
      setCamera('particles');
      setSecondaryInstrument('spectrometer');
      setPowerType('solar');
      setPanels(2);
      setAntenna('dish');
      setPropulsion('hybrid');
      setFuel(240);
      setThermal('shield');
      setLauncher('atlas');
    } else if (nextMission === 'deep') {
      setCamera('particles');
      setSecondaryInstrument('camera');
      setPowerType('rtg');
      setPanels(2);
      setAntenna('dish');
      setComputer('redundant');
      setPropulsion('ion');
      setFuel(320);
      setThermal('shield');
      setLauncher('horizon');
    }
  }

  function selectChallengeOption(nextScenarioId: string | null, nextMode: Mode) {
    setMode(nextMode);
    if (!nextScenarioId) {
      setScenarioId(null);
      return;
    }
    const found = scenarios.find((s) => s.id === nextScenarioId);
    if (found) {
      applyPlanetDefaults(found.mission, found.id);
    }
  }

  useEffect(() => {
    setActiveFlight(readFlight()?.flight.id ?? null);
    const params = new URLSearchParams(window.location.search);
    const qScenario = params.get('scenario') || params.get('challenge');
    const qMission = params.get('mission') as MissionId | null;
    const qMode = params.get('mode') as Mode | null;
    const qOrbit = params.get('orbit');

    if (qScenario && scenarios.some((s) => s.id === qScenario)) {
      const sc = scenarios.find((s) => s.id === qScenario)!;
      const targetMission =
        qMission && missions.some((m) => m.id === qMission) ? qMission : sc.mission;
      setMode('challenge');
      applyPlanetDefaults(targetMission, targetMission === sc.mission ? sc.id : null);
      if (qOrbit && orbits.some((o) => o.id === qOrbit && o.destinations.includes(targetMission))) {
        setOrbitId(qOrbit);
      }
    } else if (qMission && missions.some((m) => m.id === qMission)) {
      if (qMode && ['guided', 'challenge', 'sandbox'].includes(qMode)) {
        setMode(qMode);
      }
      applyPlanetDefaults(qMission, null);
      if (qOrbit && orbits.some((o) => o.id === qOrbit && o.destinations.includes(qMission))) {
        setOrbitId(qOrbit);
      }
    } else if (qMode === 'challenge') {
      setMode('challenge');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.getElementById('lesson-heading')?.focus();
  }, [step, activeFlight]);

  const design = firstMission(camera, panels, {
    mission: missionId,
    mode,
    scenario: scenarioId,
    orbit: orbitId,
    secondaryInstrument,
    powerType,
    battery,
    communications,
    antenna,
    computer,
    propulsion,
    fuel,
    thermal,
    launcher,
  });
  const m = calculate(design);
  const instrument = instruments.find((i) => i.id === camera)!;
  const maneuverFuel = Math.max(0, Math.round(design.fuel - m.fuelNeeded));
  const activeScenario = scenarios.find((s) => s.id === scenarioId);

  const titles = [
    c(
      'Выбери планету, испытание и орбиту.',
      'Choose your planet, challenge, and orbit.',
      'Планетаны, сынақты және орбитаны таңда.',
    ),
    c('Какую камеру и приборы установим на борт?', 'Which camera and sensors will you fly?', 'Бортқа қандай камера мен аспаптар орнатамыз?'),
    c('Обеспечь спутник энергией и батареей.', 'Supply power and battery reserve.', 'Жерсерікті энергиямен және батареямен қамтамасыз ет.'),
    c('Настрой радиолинию и бортовую память.', 'Configure downlink and onboard memory.', 'Радиобайланыс пен борттық жадты бапта.'),
    c('Выбери двигатель, топливо и защиту.', 'Choose propulsion, fuel, and shielding.', 'Қозғалтқышты, отынды және қорғанысты таңда.'),
    c('Подбери ракету-носитель под массу и дальность.', 'Select a launch vehicle for mass and range.', 'Масса мен қашықтыққа сай зымыран-тасығышты таңда.'),
    c('Твоя миссия готова к старту.', 'Your mission is ready for launch.', 'Миссияң ұшуға дайын.'),
  ];

  const steps = [
    c('Планета и вызов', 'Planet & Challenge', 'Планета мен сынақ'),
    c('Камеры', 'Cameras', 'Камералар'),
    c('Энергия', 'Power', 'Энергия'),
    c('Связь и память', 'Comms & Data', 'Байланыс'),
    c('Двигатель и защита', 'Propulsion', 'Қозғалтқыш'),
    c('Ракета', 'Rocket', 'Зымыран'),
    c('Запуск', 'Launch', 'Ұшыру'),
  ];

  const planetCopy: Record<
    MissionId,
    { title: string; subtitle: string; consequence: string }
  > = {
    earth: {
      title: c('Земля · Наблюдение и климат', 'Earth · Observation & Climate', 'Жер · Бақылау және климат'),
      subtitle: c(
        'Съёмка континентов, океанов и мониторинг климата с близких орбит',
        'Surface imaging and climate monitoring from near-Earth orbits',
        'Жер бетін түсіру және климатты бақылау',
      ),
      consequence: c(
        'Последствия: 100% солнечного света, минимальная задержка связи и 3 орбиты на выбор (LEO, SSO, GEO). Подходит любая ракета от лёгкой Swift 1.',
        'Consequences: 100% sunlight, near-instant radio link, and 3 orbits (LEO, SSO, GEO). Compatible with all launchers starting from Swift 1.',
        'Салдары: 100% күн сәулесі, жылдам байланыс және 3 орбита (LEO, SSO, GEO).',
      ),
    },
    lunar: {
      title: c('Луна · Орбитальная картография', 'Moon · Lunar Orbital Survey', 'Ай · Орбиталық картография'),
      subtitle: c(
        'Поиск водяного льда в кратерах, карта минералов и рельефа Луны',
        'Map lunar craters, surface minerals, and radiation environment',
        'Ай кратерлеріндегі мұзды, минералдарды және бедерді зерттеу',
      ),
      consequence: c(
        'Последствия: расстояние связи вырастает в 9 раз (нужна параболическая антенна), Δv 900 м/с требует больше топлива, а для старта нужна ракета не слабее Atlas Nova.',
        'Consequences: 9× communication distance requires a high-gain dish antenna, Δv 900 m/s requires extra propellant, and launch requires at least Atlas Nova.',
        'Салдары: байланыс қашықтығы 9 есе артады (бағытталған антенна қажет), Δv 900 м/с, Atlas Nova зымыраны керек.',
      ),
    },
    mars: {
      title: c('Марс · Исследование Красной планеты', 'Mars · Red Planet Orbiter', 'Марс · Қызыл планета орбитері'),
      subtitle: c(
        'Изучение атмосферы, древних русел и минералогии марсианской поверхности',
        'Study Martian atmosphere, mineralogy, and surface terrain',
        'Марс атмосферасын, минералдарын және беткі бедерін зерттеу',
      ),
      consequence: c(
        'Последствия: солнце светит слабее в 2.3 раза (43% потока — нужно в ~2.5 раза больше панелей), дистанция связи ×25, Δv 1300 м/с и длительность 30 месяцев. Нужна ракета Titan Heavy.',
        'Consequences: sunlight drops to 43% (needs ~2.5× larger solar arrays), 25× radio distance, Δv 1,300 m/s, and 30-month mission. Requires Titan Heavy or Horizon X.',
        'Салдары: күн сәулесі 43%-ға дейін әлсірейді, байланыс ×25, Δv 1300 м/с. Titan Heavy зымыраны қажет.',
      ),
    },
    asteroid: {
      title: c('Пояс астероидов · Сближение с малым телом', 'Asteroid Belt · Small Body Rendezvous', 'Астероидтар белдеуі · Шағын денемен жақындасу'),
      subtitle: c(
        'Анализ состава, формы и реликтовых минералов далёкого астероида (2.2 а.е.)',
        'Survey shape, composition, and primordial minerals at 2.2 AU',
        'Астероидтың пішіні мен минералдық құрамын зерттеу (2.2 а.б.)',
      ),
      consequence: c(
        'Последствия: остаётся лишь 24% солнечного света (нужны большие панели или РИТЭГ) и огромный Δv 2100 м/с — без ионного двигателя химического топлива не хватит.',
        'Consequences: only 24% sunlight (needs large arrays or RTG) and massive Δv 2,100 m/s — ion propulsion is essential to close the fuel budget.',
        'Салдары: тек 24% күн сәулесі және Δv 2100 м/с — иондық қозғалтқыш қажет.',
      ),
    },
    solar: {
      title: c('Солнце · Гелиофизическая обсерватория', 'Sun · Heliophysics Observatory', 'Күн · Гелиофизикалық обсерватория'),
      subtitle: c(
        'Мониторинг солнечной плазмы, вспышек и корональных выбросов на 0.7 а.е.',
        'Measure solar radiation, plasma storms, and coronal activity at 0.7 AU',
        'Күн радиациясы мен плазмалық дауылдарды 0.7 а.б. қашықтықта өлшеу',
      ),
      consequence: c(
        'Последствия: 180% солнечной энергии (хватит даже маленьких панелей), но радиация 100% — старт заблокирован без активного термоконтроля или радиационного щита!',
        'Consequences: 180% solar flux (tiny panels suffice), but 100% radiation intensity — launch is blocked unless you equip active thermal control or a radiation shield!',
        'Салдары: 180% күн қуаты, бірақ 100% радиация — белсенді термобақылау немесе радиациялық қалқан міндетті!',
      ),
    },
    deep: {
      title: c('Дальний космос · Внешняя Солнечная система', 'Deep Space · Outer Solar System (5.2 AU)', 'Терең ғарыш · Сыртқы Күн жүйесі (5.2 а.б.)'),
      subtitle: c(
        'Экспедиция за орбиту Юпитера: исследование радиации, спутников и магнитосфер',
        'Journey beyond Jupiter: radiation belts, icy moons, and deep-space imaging',
        'Юпитер орбитасынан тыс экспедиция: радиация мен мұзды серіктерді зерттеу',
      ),
      consequence: c(
        'Последствия: всего 3.7% солнечного света (нужен ядерный РИТЭГ), экстремальный Δv 3000 м/с (ионный двигатель), радиационный щит и сверхтяжёлая ракета Horizon X.',
        'Consequences: only 3.7% sunlight (nuclear RTG required), extreme Δv 3,000 m/s (ion propulsion), radiation shield, and the heavy Horizon X launcher.',
        'Салдары: небәрі 3.7% күн сәулесі (ядролық РИТЭГ қажет), Δv 3000 м/с, радиациялық қалқан және Horizon X зымыраны.',
      ),
    },
  };

  const challengeCopy: Record<
    string,
    { title: string; subtitle: string; consequence: string }
  > = {
    budget: {
      title: c('Испытание 01 · Малый бюджет ($140M)', 'Challenge 01 · Small Budget ($140M)', 'Сынақ 01 · Шағын бюджет ($140M)'),
      subtitle: c(
        'Построй самый экономный спутник наблюдения Земли и уложись в $140M',
        'Build a successful Earth observation satellite under a strict $140M cap',
        '$140M шегінде ең үнемді Жерді бақылау жерсерігін құрастыр',
      ),
      consequence: c(
        'Последствия: потолок бюджета снижен с $250M до $140M, а требуемый Δv увеличен на +15%. Придётся отказаться от дорогих лазеров и тяжёлых ракет в пользу лёгких приборов и Swift 1.',
        'Consequences: budget cap drops from $250M to $140M and required Δv increases by +15%. Favors lightweight instruments and the Swift 1 launcher.',
        'Салдары: бюджет шегі $140M-ға дейін төмендейді, ал қажетті Δv +15%-ға артады.',
      ),
    },
    mars500: {
      title: c('Испытание 02 · Марс за $500M (≥100 науки)', 'Challenge 02 · The $500M Mars Challenge (≥100 sci)', 'Сынақ 02 · $500M Марс сынағы (≥100 ғылым)'),
      subtitle: c(
        'Добудь минимум 100 очков науки на орбите Марса при бюджете до $500M',
        'Deliver at least 100 science points at Mars within a $500M budget',
        '$500M бюджет аясында Марста кемінде 100 ғылым ұпайын жина',
      ),
      consequence: c(
        'Последствия: чтобы пробить планку 100 науки на Марсе, нужно установить мощный спектрометр или камеру Hi-Res/SAR со вторым прибором и вовремя передавать данные через тарелку.',
        'Consequences: reaching 100 science at Mars requires pairing a high-value payload with a second sensor and maintaining strong downlink throughput.',
        'Салдары: Марста 100 ғылым ұпайын жинау үшін қуатты аспаптар мен сенімді байланыс арнасы қажет.',
      ),
    },
    lightmoon: {
      title: c('Испытание 03 · Лёгкий лунный след (≤1500 кг)', 'Challenge 03 · Lighter Lunar Footprint (≤1,500 kg)', 'Сынақ 03 · Жеңіл Ай зонды (≤1500 кг)'),
      subtitle: c(
        'Исследуй Луну аппаратом легче 1500 кг и выполни все научные цели',
        'Explore the Moon under 1,500 kg wet mass and complete every objective',
        'Салмағы 1500 кг-нан аспайтын аппаратпен Айды зерттеп, барлық мақсаттарды орында',
      ),
      consequence: c(
        'Последствия: жёсткое ограничение стартовой массы (1425 кг с учётом резерва Challenge). Химический двигатель потребует слишком много топлива — гибридный или ионный двигатель сэкономит сотни килограммов!',
        'Consequences: strict 1,425 kg effective mass limit. Chemical thrusters need heavy propellant tanks — hybrid or ion propulsion saves hundreds of kilograms.',
        'Салдары: масса шегі 1425 кг. Гибридті немесе иондық қозғалтқыш жүздеген килограмм отынды үнемдейді.',
      ),
    },
    voyager: {
      title: c('Испытание 04 · Долгий путь домой (≥70% здоровья)', 'Challenge 04 · The Long Way Home (≥70% health)', 'Сынақ 04 · Алыс жол (≥70% денсаулық)'),
      subtitle: c(
        'Выживи в 6-летней экспедиции в дальний космос, сохранив ≥70% здоровья',
        'Survive a 6-year deep-space voyage and finish with ≥70% spacecraft health',
        'Терең ғарыштағы 6 жылдық экспедицияда аппарат денсаулығын ≥70% деңгейінде сақта',
      ),
      consequence: c(
        'Последствия: в режиме Challenge риск повреждений в полёте выше на +25%. Необходимы радиационный щит (100% защиты), резервный компьютер и запас топлива для безопасных манёвров.',
        'Consequences: Challenge mode increases anomaly damage risk by +25%. Requires full radiation shielding, redundant avionics, and fuel reserves for safe maneuvers.',
        'Салдары: ақау қаупі +25%-ға жоғары. Радиациялық қалқан, резервтік компьютер және отын қоры қажет.',
      ),
    },
    reliable: {
      title: c('Испытание 05 · Отказ недопустим (≥95% надёжности)', 'Challenge 05 · Failure Is Not an Option (≥95% reliability)', 'Сынақ 05 · Ақауға жол жоқ (≥95% сенімділік)'),
      subtitle: c(
        'Спроектируй спутник с расчётной инженерной надёжностью не ниже 95%',
        'Engineer an orbital spacecraft with at least 95% design reliability',
        'Жобалық сенімділігі кемінде 95% болатын жерсерікті құрастыр',
      ),
      consequence: c(
        'Последствия: большие солнечные панели (>10 м²) и сложные приборы снижают надёжность. Выбирай надёжную ракету (Atlas Nova / Horizon X), гибридный двигатель, активную защиту и компактные панели.',
        'Consequences: oversized arrays (>10 m²) and complex payloads penalize reliability. Pick a high-reliability launcher (Atlas Nova / Horizon X), hybrid propulsion, and active shielding.',
        'Салдары: үлкен панельдер (>10 м²) сенімділікті төмендетеді. Сенімді зымыран мен белсенді қорғанысты таңда.',
      ),
    },
  };

  const cameraCopy: Record<
    TutorialCameraId,
    { title: string; subtitle: string; consequence: string }
  > = {
    camera: {
      title: c('Оптическая камера (5 м)', 'Optical camera (5 m)', 'Оптикалық камера (5 м)'),
      subtitle: c(
        'Базовая мультиспектральная съёмка поверхности и рельефа',
        'Balanced multispectral surface and terrain imaging',
        'Жер бетін базалық мультиспектрлік түсіру',
      ),
      consequence: c(
        'Последствия для миссии: минимальная нагрузка на борт (90 Вт, 45 кг, 8 ГБ/сут). Оставляет большой запас топлива и бюджета, закрывает цели «Съёмка» и «Рельеф» (+22 науки).',
        'Mission consequences: minimal burden on the spacecraft (90 W, 45 kg, 8 GB/day). Preserves fuel and budget headroom, covers Imaging & Terrain (+22 science).',
        'Миссия салдары: бортқа ең аз жүктеме (90 Вт, 45 кг, 8 ГБ/тәу). Отын мен бюджет қорын сақтайды (+22 ғылым).',
      ),
    },
    radiometer: {
      title: c(
        'Тепловизионная ИК-камера / Радиометр (±0.3 K)',
        'Thermal infrared camera / Radiometer (±0.3 K)',
        'Жылулық ИҚ-камера / Радиометр (±0.3 K)',
      ),
      subtitle: c(
        'Круглосуточное измерение температуры поверхности, климата и атмосферы',
        'Day-and-night surface temperature, climate, and atmosphere mapping',
        'Тәулік бойы температура мен климатты өлшеу',
      ),
      consequence: c(
        'Последствия для миссии: лёгкий (35 кг) и экономичный прибор (65 Вт, 6 ГБ/сут). Снимает даже в тени, экономит батарею и закрывает цели «Климат» и «Атмосфера» (+24 науки).',
        'Mission consequences: lightweight (35 kg) and low-power imager (65 W, 6 GB/day). Operates day and night, covers Climate & Atmosphere (+24 science).',
        'Миссия салдары: жеңіл (35 кг) және үнемді аспап (65 Вт, 6 ГБ/тәу). Күндіз де, түнде де жұмыс істейді (+24 ғылым).',
      ),
    },
    spectrometer: {
      title: c(
        'Гиперспектральная камера-спектрометр (400 каналов)',
        'Hyperspectral imaging spectrometer (400 bands)',
        'Гиперспектрлік камера-спектрометр (400 арна)',
      ),
      subtitle: c(
        'Химический анализ газов атмосферы, водяного льда и минералов (Луна, Марс, Астероид)',
        'Chemical signatures of atmospheric gases, water ice, and minerals',
        'Атмосфера газдары, су мұзы және минералдарды талдау',
      ),
      consequence: c(
        'Последствия для миссии: ключевой прибор для Луны, Марса и Астероидов (+30 науки, 10 ГБ/сут, 110 Вт). Закрывает цели «Минералы и вода» и «Атмосфера».',
        'Mission consequences: essential payload for Moon, Mars, and Asteroid missions (+30 science, 10 GB/day, 110 W). Covers Minerals & Atmosphere objectives.',
        'Миссия салдары: Ай, Марс және Астероид миссиялары үшін негізгі аспап (+30 ғылым, 10 ГБ/тәу, 110 Вт).',
      ),
    },
    hires: {
      title: c(
        'Камера сверхвысокого разрешения (0.5 м)',
        'High-resolution optical camera (0.5 m)',
        'Жоғары айқындықтағы оптикалық камера (0.5 м)',
      ),
      subtitle: c(
        'Детальная телефото-оптика для прецизионной съёмки рельефа и поверхности',
        'Precision telephoto optics for fine surface and terrain detail',
        'Бедерді дәл түсіруге арналған телефото-оптика',
      ),
      consequence: c(
        'Последствия для миссии: приносит +40 очков науки, но требует 250 Вт энергии и создаёт поток 32 ГБ/сутки — нужен ёмкий буфер памяти и быстрая радиолиния.',
        'Mission consequences: delivers +40 science points, but demands 250 W and generates 32 GB/day — requires upgraded onboard memory and faster downlink.',
        'Миссия салдары: +40 ғылым ұпайын береді, бірақ 250 Вт қуатты және тәулігіне 32 ГБ деректер ағынын талап етеді.',
      ),
    },
    radar: {
      title: c(
        'Всепогодная радарная камера SAR (3 м)',
        'Synthetic aperture radar camera SAR (3 m)',
        'Барлық ауа райына арналған SAR радар-камерасы (3 м)',
      ),
      subtitle: c(
        'Активное радиолокационное зондирование рельефа сквозь облака, пыль и ночь',
        'Active radar terrain mapping through cloud cover, dust storms, and darkness',
        'Бұлт пен қараңғылық арқылы белсенді радарлық түсіру',
      ),
      consequence: c(
        'Последствия для миссии: максимальная научная отдача (+42 очка), но высокое энергопотребление (420 Вт), большая масса (180 кг — снижает Δv) и поток 40 ГБ/сут.',
        'Mission consequences: highest science return (+42 points), but heavy power draw (420 W), high mass (180 kg — lowers Δv), and 40 GB/day data rate.',
        'Миссия салдары: ең жоғары ғылыми нәтиже (+42 ұпай), бірақ 420 Вт қуатты, 180 кг массаны және 40 ГБ/тәу деректер арнасын талап етеді.',
      ),
    },
    particles: {
      title: c(
        'Детектор энергетических частиц и радиации (1 кэВ–100 МэВ)',
        'Energetic particle & radiation detector (1 keV–100 MeV)',
        'Энергетикалық бөлшектер мен радиация детекторы',
      ),
      subtitle: c(
        'Измерение солнечного ветра, магнитосфер и космической радиации (Солнце, Луна, Дальний космос)',
        'Measures solar wind, radiation belts, and cosmic rays (Sun, Moon, Deep Space)',
        'Күн желін, радиациялық белдеулерді және ғарыштық сәулелерді өлшеу',
      ),
      consequence: c(
        'Последствия для миссии: самый лёгкий (22 кг), надёжный (99%) и экономичный прибор (35 Вт, 2 ГБ/сут, $14M). Обязателен для миссий к Солнцу и в Дальний космос (+20 науки).',
        'Mission consequences: lightest (22 kg), most reliable (99%), and lowest-power sensor (35 W, 2 GB/day, $14M). Essential for Solar and Deep Space missions (+20 science).',
        'Миссия салдары: ең жеңіл (22 кг), сенімді (99%) және үнемді аспап (35 Вт, 2 ГБ/тәу). Күн мен Терең ғарыш үшін міндетті (+20 ғылым).',
      ),
    },
  };

  function changeStep(next: number) {
    setError('');
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function autoBalanceAll() {
    let nextOrbit = orbitId;
    if (!orbits.find((o) => o.id === nextOrbit)?.destinations.includes(missionId)) {
      nextOrbit = missions.find((item) => item.id === missionId)?.orbit ?? 'sso';
    }

    let nextCamera = camera;
    let nextSecondary = secondaryInstrument;
    const missionObjectives = missions.find((item) => item.id === missionId)?.objectives ?? ['imaging'];
    const currentSupports = [
      ...(instruments.find((i) => i.id === nextCamera)?.supports ?? []),
      ...(nextSecondary ? instruments.find((i) => i.id === nextSecondary)?.supports ?? [] : []),
    ];
    if (!missionObjectives.some((obj) => currentSupports.includes(obj))) {
      const matchingInst = instruments.find((i) =>
        i.supports.some((s) => missionObjectives.includes(s)),
      );
      if (matchingInst) nextCamera = matchingInst.id as TutorialCameraId;
    }
    if (scenarioId === 'mars500' && !nextSecondary) {
      nextSecondary = nextCamera === 'spectrometer' ? 'camera' : 'spectrometer';
    }
    if (scenarioId === 'lightmoon') {
      nextCamera = 'spectrometer';
      nextSecondary = 'particles';
    }

    let nextPowerType: 'solar' | 'advanced' | 'rtg' =
      missionId === 'deep' ? 'rtg' : powerType === 'rtg' && missionId === 'earth' ? 'solar' : powerType;
    let nextPropulsion: 'chemical' | 'hybrid' | 'ion' =
      ['mars', 'asteroid', 'deep'].includes(missionId)
        ? 'ion'
        : scenarioId === 'lightmoon' || scenarioId === 'reliable' || missionId === 'solar'
          ? 'hybrid'
          : propulsion;
    let nextThermal: 'passive' | 'active' | 'shield' =
      ['solar', 'deep'].includes(missionId) || scenarioId === 'voyager'
        ? 'shield'
        : ['mars', 'asteroid'].includes(missionId) || scenarioId === 'reliable'
          ? 'active'
          : thermal;
    let nextComputer: 'standard' | 'redundant' | 'science' =
      scenarioId === 'voyager' || scenarioId === 'reliable' || ['mars', 'asteroid', 'deep'].includes(missionId)
        ? 'redundant'
        : computer;
    let nextAntenna: 'patch' | 'dish' | 'array' =
      missionId === 'earth' && nextOrbit !== 'geo' ? antenna : antenna === 'patch' ? 'dish' : antenna;
    let nextComms = communications;
    let nextLauncher = launcher;
    if (!launchers.find((l) => l.id === nextLauncher)?.destinations.includes(missionId)) {
      nextLauncher =
        (launchers.find((l) => l.destinations.includes(missionId))?.id as typeof launcher) ?? 'titan';
    }

    const currentData =
      instruments.find((i) => i.id === nextCamera)!.data +
      (nextSecondary ? instruments.find((i) => i.id === nextSecondary)?.data ?? 0 : 0);
    if (currentData * 2 > 128 && nextComputer === 'standard') {
      nextComputer = 'redundant';
    }

    let nextBattery = battery;
    let nextFuel = fuel;

    let tempDesign = firstMission(nextCamera, panels, {
      mission: missionId,
      mode,
      scenario: scenarioId,
      orbit: nextOrbit,
      secondaryInstrument: nextSecondary,
      powerType: nextPowerType,
      battery: nextBattery,
      communications: nextComms,
      antenna: nextAntenna,
      computer: nextComputer,
      propulsion: nextPropulsion,
      fuel: nextFuel,
      thermal: nextThermal,
      launcher: nextLauncher,
    });

    if (calculate(tempDesign).cost > calculate(tempDesign).budget && missionId === 'earth') {
      nextPowerType = 'solar';
      nextComms = 'xband';
      nextPropulsion = scenarioId === 'reliable' ? 'hybrid' : 'chemical';
      nextThermal = scenarioId === 'reliable' ? 'active' : 'passive';
      nextLauncher = scenarioId === 'reliable' ? 'atlas' : 'swift';
      tempDesign = firstMission(nextCamera, panels, {
        mission: missionId,
        mode,
        scenario: scenarioId,
        orbit: nextOrbit,
        secondaryInstrument: nextSecondary,
        powerType: nextPowerType,
        battery: nextBattery,
        communications: nextComms,
        antenna: nextAntenna,
        computer: nextComputer,
        propulsion: nextPropulsion,
        fuel: nextFuel,
        thermal: nextThermal,
        launcher: nextLauncher,
      });
    }

    const reqPanels = nextPowerType === 'rtg' ? 2 : sufficientPanels(tempDesign);
    const withPanels = { ...tempDesign, panels: reqPanels };
    const calcPanels = calculate(withPanels);

    if (nextBattery < calcPanels.batteryNeed) {
      nextBattery = Math.ceil(calcPanels.batteryNeed * 10) / 10;
    }
    if (nextFuel < calcPanels.fuelNeeded) {
      nextFuel = Math.min(900, Math.ceil((calcPanels.fuelNeeded + 25) / 10) * 10);
    }
    const afterFuel = calculate({
      ...withPanels,
      battery: nextBattery,
      fuel: nextFuel,
    });
    if (afterFuel.mass > afterFuel.massLimit) {
      const compatible = launchers.filter(
        (l) => l.destinations.includes(missionId) && l.payload >= afterFuel.mass,
      );
      if (compatible.length > 0) {
        nextLauncher = compatible[0].id as typeof launcher;
      }
    }
    if (afterFuel.bandwidth < afterFuel.requiredBandwidth) {
      if (nextAntenna === 'patch') nextAntenna = 'dish';
      else if (nextComms === 'xband') nextComms = 'kaband';
      else nextAntenna = 'array';
    }

    setCamera(nextCamera);
    setSecondaryInstrument(nextSecondary);
    setPowerType(nextPowerType);
    setPropulsion(nextPropulsion);
    setThermal(nextThermal);
    setPanels(reqPanels);
    setBattery(nextBattery);
    setFuel(nextFuel);
    setAntenna(nextAntenna);
    setCommunications(nextComms);
    setComputer(nextComputer);
    setLauncher(nextLauncher);
    setOrbitId(nextOrbit);
  }

  function startNewAttempt() {
    if (
      !activeFlight ||
      !window.confirm(
        c(
          'Удалить прогресс сохранённого полёта и начать обучение заново?',
          'Delete the saved flight progress and start the tutorial over?',
          'Сақталған ұшу барысын жойып, оқуды қайта бастау керек пе?',
        ),
      )
    )
      return;

    if (!clearFlight(activeFlight)) {
      setError(
        c(
          'Не удалось удалить попытку.',
          'Could not delete the attempt.',
          'Әрекетті жою мүмкін болмады.',
        ),
      );
      return;
    }

    const remaining = readFlight();
    if (remaining) {
      setActiveFlight(remaining.flight.id);
      setError(
        c(
          'Сохранённый полёт изменился. Проверь его перед удалением.',
          'The saved flight changed. Review it before deleting it.',
          'Сақталған ұшу өзгерді. Жоймас бұрын оны тексер.',
        ),
      );
      return;
    }
    setMode('guided');
    applyPlanetDefaults('earth', null);
    setActiveFlight(null);
    changeStep(0);
  }

  function launch() {
    setError('');
    const checkpoint = readFlight();
    if (checkpoint) {
      setActiveFlight(checkpoint.flight.id);
      return;
    }
    if (m.issues.length) return;
    setBusy(true);
    try {
      const current = readDesign();
      if (current && !writeProjects(prepareProjectLoad(readProjects(), current)))
        throw Error('backup');
      if (!saveFlight(design, { ...createFlight(design), paused: true }))
        throw Error('checkpoint');
      localStorage.setItem(DESIGN_KEY, JSON.stringify(design));
      setShowLaunchIntro(true);
    } catch {
      setError(
        c(
          'Не удалось сохранить миссию. Проверь доступ к хранилищу браузера и свободное место в библиотеке проектов. Текущий проект не удалён.',
          'Could not save the mission. Check browser storage access and available project-library slots. Your previous project has not been deleted.',
          'Миссия сақталмады. Браузер жадына қолжетімділікті және жоба кітапханасындағы бос орынды тексер. Алдыңғы жоба жойылған жоқ.',
        ),
      );
      setBusy(false);
    }
  }

  const lastStep = steps.length - 1;
  const planetOrbits = orbits.filter((o) => o.destinations.includes(missionId));

  return (
    <ExpeditionShell>
      <main id="exp-main" className="exp-learn">
        <div className="exp-learn-top">
          <Link href="/" className="exp-text-link">
            <ArrowLeft size={16} />
            {c('На главную', 'Back home', 'Басты бетке')}
          </Link>
          <span>
            {activeScenario
              ? `${c('Испытание:', 'Challenge:', 'Сынақ:')} ${t(activeScenario.name)}`
              : mode === 'challenge'
                ? `${c('Режим испытания', 'Challenge Mode', 'Сынақ режимі')} · ${t(m.mission.name)}`
                : `${c('Экспедиция', 'Expedition', 'Экспедиция')} · ${t(m.mission.name)}`}
          </span>
        </div>

        <ol
          className="exp-steps"
          aria-label={c('Этапы обучения', 'Learning steps', 'Оқу қадамдары')}
        >
          {steps.map((name, i) => (
            <li key={name} aria-current={step === i ? 'step' : undefined}>
              <button onClick={() => changeStep(i)}>
                <span>{i < step ? <Check size={16} /> : i + 1}</span>
                {name}
              </button>
            </li>
          ))}
        </ol>

        {activeFlight ? (
          <section className="exp-resume">
            <Rocket size={44} />
            <h1>
              {c(
                'У тебя уже есть миссия в полёте.',
                'You already have a flight in progress.',
                'Ұшып жатқан миссияң бар.',
              )}
            </h1>
            <p>
              {c(
                'Продолжи сохранённый полёт или удали его прогресс, чтобы начать учебную миссию заново.',
                'Continue the saved flight or delete its progress to start a new tutorial attempt.',
                'Сақталған ұшуды жалғастыр немесе оқу миссиясын жаңадан бастау үшін оның барысын жой.',
              )}
            </p>
            <div className="exp-actions">
              <Link className="exp-primary" href="/simulator/">
                {c('Продолжить полёт', 'Continue flight', 'Ұшуды жалғастыру')}
                <ArrowRight size={18} />
              </Link>
              <button type="button" className="exp-text-link" onClick={startNewAttempt}>
                {c(
                  'Удалить попытку и начать новую',
                  'Delete attempt and start a new one',
                  'Әрекетті жойып, жаңасын бастау',
                )}
              </button>
            </div>
            {error && (
              <p className="exp-error" role="alert">
                {error}
              </p>
            )}
          </section>
        ) : (
          <>
            <div className="exp-lesson">
              <section className="exp-lesson-body">
                <h1 id="lesson-heading" tabIndex={-1}>
                  {titles[step]}
                </h1>

                {/* STEP 0: PLANET, CHALLENGE & ORBIT */}
                {step === 0 && (
                  <>
                    <p className="exp-lead">
                      {c(
                        'Выбери планету назначения, режим экспедиции (свободный полёт или одно из инженерных испытаний Challenges) и рабочую орбиту. Все ограничения бюджета, солнечного света и дальности пересчитаются мгновенно.',
                        'Select your target planet, mission mode (guided flight or one of the engineering Challenges), and operating orbit. Budget caps, solar flux, and link distance update automatically.',
                        'Мақсатты планетаны, экспедиция режимін (еркін ұшу немесе Challenges сынақтарының бірі) және жұмыс орбитасын таңда.',
                      )}
                    </p>

                    <div className="exp-subblock" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                      <h2>
                        {c(
                          '1. Выбери режим или испытание (Challenges)',
                          '1. Choose Mode or Challenge Brief',
                          '1. Режимді немесе сынақты (Challenges) таңда',
                        )}
                      </h2>
                      <p>
                        {c(
                          'Ты можешь проходить любое испытание или свободно менять планету ниже — конструктор автоматически подстроит целевую орбиту и стартовые системы.',
                          'Pick any challenge brief below or switch to any planet freely — the builder automatically adapts target orbits and starter hardware.',
                          'Кез келген сынақты таңда немесе төменде планетаны еркін ауыстыр.',
                        )}
                      </p>
                      <div className="exp-camera-options exp-compact-grid">
                        <button
                          type="button"
                          aria-pressed={mode === 'guided' && !scenarioId}
                          onClick={() => selectChallengeOption(null, 'guided')}
                        >
                          <span className="exp-option-title">
                            {c('Стандартная экспедиция (Guided)', 'Standard Expedition (Guided)', 'Стандартты экспедиция')}
                            {mode === 'guided' && !scenarioId && <Check size={18} />}
                          </span>
                          <span>
                            {c(
                              'Полный бюджет планеты и штатные инженерные допуски для любой выбранной цели',
                              'Full planetary budget and nominal engineering margins for any chosen destination',
                              'Таңдалған планетаның толық бюджеті мен қалыпты инженерлік талаптары',
                            )}
                          </span>
                          <strong>
                            {c('Любая планета', 'Any planet', 'Кез келген планета')} <span>·</span>{' '}
                            {c('100% бюджета', '100% budget', '100% бюджет')}
                          </strong>
                        </button>

                        <button
                          type="button"
                          aria-pressed={mode === 'challenge' && !scenarioId}
                          onClick={() => selectChallengeOption(null, 'challenge')}
                        >
                          <span className="exp-option-title">
                            {c(
                              'Свободный Challenge на любой планете',
                              'Custom Planetary Challenge (Any Planet)',
                              'Кез келген планетадағы еркін Challenge',
                            )}
                            {mode === 'challenge' && !scenarioId && <Check size={18} />}
                          </span>
                          <span>
                            {c(
                              'Ужесточённые правила испытания на выбранной тобой планете',
                              'Hardened challenge rules applied to whichever planet you choose below',
                              'Таңдалған планетадағы күрделендірілген сынақ ережелері',
                            )}
                          </span>
                          <strong>
                            {c('Бюджет −18%', 'Budget −18%', 'Бюджет −18%')} <span>·</span>{' '}
                            {c('Масса −5%', 'Mass −5%', 'Масса −5%')} <span>·</span> Δv +15%
                          </strong>
                        </button>

                        {scenarios.map((sc) => {
                          const copy = challengeCopy[sc.id];
                          const isSelected = scenarioId === sc.id;
                          const scMission = missions.find((item) => item.id === sc.mission)!;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => selectChallengeOption(sc.id, 'challenge')}
                            >
                              <span className="exp-option-title">
                                {copy ? copy.title : t(sc.name)}
                                {isSelected && <Check size={18} />}
                              </span>
                              <span>{copy ? copy.subtitle : t(sc.description)}</span>
                              <strong>
                                {t(scMission.name)} <span>·</span> ${sc.budget}M <span>·</span>{' '}
                                {t(sc.goal)}
                              </strong>
                              {copy && <div className="exp-consequence">{copy.consequence}</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="exp-subblock">
                      <h2>
                        {c(
                          '2. Планета / Небесное тело назначения',
                          '2. Target Planet / Destination',
                          '2. Мақсатты планета / Аспан денесі',
                        )}
                      </h2>
                      <p>
                        {c(
                          'Меняй планету в любой момент: от близкой Земли и Луны до Марса, Астероидов, Солнца и Юпитера.',
                          'Switch planets at any time: from Earth and the Moon to Mars, the Asteroid Belt, the Sun, and Deep Space.',
                          'Планетаны кез келген уақытта өзгерт: Жер мен Айдан Марсқа, Астероидтарға, Күнге және Терең ғарышқа дейін.',
                        )}
                      </p>
                      <div className="exp-camera-options">
                        {missions.map((mi) => {
                          const pCopy = planetCopy[mi.id];
                          const miOrbit = orbits.find((o) => o.id === mi.orbit)!;
                          return (
                            <button
                              key={mi.id}
                              type="button"
                              aria-pressed={missionId === mi.id}
                              onClick={() => applyPlanetDefaults(mi.id, scenarioId)}
                            >
                              <span className="exp-option-title">
                                {pCopy.title}
                                {missionId === mi.id && <Check size={20} />}
                              </span>
                              <span>{pCopy.subtitle}</span>
                              <strong>
                                ${mi.budget}M <span>·</span> {mi.duration}{' '}
                                {c('мес.', 'mo', 'ай')} <span>·</span>{' '}
                                {Math.round(miOrbit.sun * 100)}%{' '}
                                {c('солнца', 'sunlight', 'күн')} <span>·</span> Δv {miOrbit.deltaV}{' '}
                                m/s
                              </strong>
                              <div className="exp-consequence">{pCopy.consequence}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="exp-subblock">
                      <h2>
                        {c(
                          '3. Рабочая орбита и траектория',
                          '3. Operating Orbit & Trajectory',
                          '3. Жұмыс орбитасы мен траекториясы',
                        )}
                      </h2>
                      <div className="exp-camera-options">
                        {planetOrbits.map((orb) => (
                          <button
                            key={orb.id}
                            type="button"
                            aria-pressed={orbitId === orb.id}
                            onClick={() => setOrbitId(orb.id)}
                          >
                            <span className="exp-option-title">
                              {t(orb.name)} ({orb.short} · {orb.altitude})
                              {orbitId === orb.id && <Check size={20} />}
                            </span>
                            <span>{t(orb.description)}</span>
                            <strong>
                              Δv {orb.deltaV} m/s <span>·</span> ×{orb.science}{' '}
                              {c('наука', 'science', 'ғылым')} <span>·</span>{' '}
                              {Math.round(orb.sun * 100)}% {c('солнца', 'sun', 'күн')}{' '}
                              <span>·</span> {c('дистанция', 'distance', 'қашықтық')} ×
                              {orb.distance}
                            </strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 1: CAMERAS & SECONDARY SENSOR */}
                {step === 1 && (
                  <>
                    <p className="exp-lead">
                      {c(
                        'Выбери основную камеру или научный прибор спутника. Обрати внимание на научные задачи выбранной планеты: прибор со значком «Цель планеты» закрывает обязательные требования миссии.',
                        'Choose your primary imaging or science payload. Pay attention to your target planet’s objectives: instruments marked "Planet goal" satisfy required mission measurements.',
                        'Негізгі камераны немесе ғылыми аспапты таңда. Таңдалған планетаның ғылыми мақсаттарына сәйкес келетін аспаптарға назар аудар.',
                      )}
                    </p>

                    <div className="exp-camera-options">
                      {CAMERA_IDS.map((id) => {
                        const item = instruments.find((i) => i.id === id)!;
                        const copy = cameraCopy[id];
                        const matchesPlanet = item.supports.some((s) =>
                          m.mission.objectives.includes(s),
                        );
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={camera === id}
                            onClick={() => {
                              setCamera(id);
                              if (secondaryInstrument === id) setSecondaryInstrument(null);
                            }}
                          >
                            <span className="exp-option-title">
                              {copy.title}
                              {camera === id && <Check size={20} />}
                            </span>
                            <span>{copy.subtitle}</span>
                            <strong>
                              +{item.science} {c('науки', 'science', 'ғылым')} <span>·</span>{' '}
                              {item.mass}
                              {t(' kg ')}
                              <span>·</span> {item.power}
                              {t(' W ')}
                              <span>·</span> {item.data} GB/d <span>·</span> ${item.cost}
                              {t('M')}
                              {matchesPlanet
                                ? ` · ★ ${c('Цель планеты', 'Planet goal', 'Планета мақсаты')}`
                                : ''}
                            </strong>
                            <div className="exp-consequence">{copy.consequence}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="exp-subblock">
                      <h2>
                        {c(
                          'Дополнительный научный прибор (по желанию)',
                          'Secondary Science Sensor (Optional)',
                          'Қосымша ғылыми аспап (қалауыңша)',
                        )}
                      </h2>
                      <p>
                        {c(
                          'Второй прибор увеличивает научную отдачу и помогает закрыть все цели экспедиции (особенно в испытаниях на Марсе и Луне).',
                          'Adding a second instrument boosts total science value and helps cover additional planetary objectives.',
                          'Екінші аспап ғылыми құндылықты арттырады және қосымша мақсаттарды жабуға көмектеседі.',
                        )}
                      </p>
                      <div className="exp-camera-options exp-compact-grid">
                        {[
                          {
                            id: null,
                            title: c('Без второго прибора', 'Single primary instrument only', 'Екінші аспапсыз'),
                            desc: c(
                              'Лёгкий спутник, минимальный расход энергии и бюджета',
                              'Lighter spacecraft, lowest power and budget use',
                              'Жеңіл аппарат, ең аз қуат пен бюджет шығыны',
                            ),
                            stats: '0 kg · 0 W · +0 sci',
                          },
                          ...instruments
                            .filter((inst) => inst.id !== camera)
                            .map((inst) => ({
                              id: inst.id,
                              title: t(inst.name),
                              desc: t(inst.description),
                              stats: `${inst.mass} kg · ${inst.power} W · ${inst.data} GB/d · +${inst.science} sci · $${inst.cost}M`,
                            })),
                        ].map((opt) => (
                          <button
                            key={opt.id ?? 'none'}
                            type="button"
                            aria-pressed={secondaryInstrument === opt.id}
                            onClick={() => setSecondaryInstrument(opt.id)}
                          >
                            <span className="exp-option-title">
                              {opt.title}
                              {secondaryInstrument === opt.id && <Check size={18} />}
                            </span>
                            <span>{opt.desc}</span>
                            <strong>{opt.stats}</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 2: POWER & BATTERY */}
                {step === 2 && (
                  <>
                    <p className="exp-lead">
                      {c(
                        `На орбите ${t(m.orbit.name)} солнечный поток составляет ${Math.round(m.orbit.sun * 100)}% от земного, а потребление борта — ${Math.round(m.requiredGeneration)} Вт. Для дальнего космоса можно установить ядерный РИТЭГ.`,
                        `In ${t(m.orbit.name)}, solar illumination is ${Math.round(m.orbit.sun * 100)}% of Earth’s and total load is ${Math.round(m.requiredGeneration)} W. For deep space, you can equip a nuclear RTG.`,
                        `${t(m.orbit.name)} орбитасында күн ағыны ${Math.round(m.orbit.sun * 100)}%, ал борттың тұтынуы — ${Math.round(m.requiredGeneration)} Вт.`,
                      )}
                    </p>

                    <div className="exp-subblock" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                      <h2>
                        {c(
                          '1. Источник электропитания',
                          '1. Primary Power System',
                          '1. Электр қуат көзі',
                        )}
                      </h2>
                      <div className="exp-camera-options exp-compact-grid">
                        {[
                          {
                            id: 'solar' as const,
                            title: c('Кремниевые панели (155 Вт/м²)', 'Standard solar array (155 W/m²)', 'Стандартты күн панельдері (155 Вт/м²)'),
                            desc: c(
                              'Надёжные (99.0%) и недорогие ($8M, 25 кг) батареи для околоземных и лунных орбит',
                              'Reliable (99.0%) and affordable ($8M, 25 kg) arrays for inner-system orbits',
                              'Сенімді (99.0%) және қолжетімді ($8M, 25 кг) күн батареялары',
                            ),
                            stats: '155 W/m² · 25 kg · $8M',
                          },
                          {
                            id: 'advanced' as const,
                            title: c(
                              'Каскадные панели GaAs (+45% мощности)',
                              'Advanced multi-junction array (+45% output)',
                              'Жетілдірілген панельдер (+45% қуат)',
                            ),
                            desc: c(
                              'Вырабатывают 225 Вт/м² у Земли — позволяют уменьшить размер крыльев на Марсе и у Земли',
                              'Generates 225 W/m² at 1 AU — keeps wing area compact for high-power payloads',
                              '225 Вт/м² өндіреді — қуатты камералар үшін қанат ауданын азайтады',
                            ),
                            stats: '225 W/m² · 40 kg · $24M',
                          },
                          {
                            id: 'rtg' as const,
                            title: c(
                              'Радиоизотопный генератор РИТЭГ (950 Вт)',
                              'Radioisotope generator RTG (950 W steady)',
                              'Радиоизотоптық генератор РИТЭГ (950 Вт)',
                            ),
                            desc: c(
                              'Даёт стабильные 950 Вт независимо от Солнца и теней. Незаменим в Дальнем космосе и у Астероидов',
                              'Delivers a constant 950 W regardless of distance from the Sun. Essential for Deep Space',
                              'Күннен қашықтыққа қарамастан тұрақты 950 Вт береді. Терең ғарыш үшін таптырмас',
                            ),
                            stats: '950 W base · 120 kg · $85M · 99.8% rel',
                          },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={powerType === p.id}
                            onClick={() => setPowerType(p.id)}
                          >
                            <span className="exp-option-title">
                              {p.title}
                              {powerType === p.id && <Check size={18} />}
                            </span>
                            <span>{p.desc}</span>
                            <strong>{p.stats}</strong>
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="exp-slider" htmlFor="solar-panels">
                      {c('Площадь солнечных панелей', 'Solar panel area', 'Күн панельдерінің ауданы')}
                      <strong>
                        {panels} {t('m²')}
                      </strong>
                      <input
                        id="solar-panels"
                        type="range"
                        min="1"
                        max="30"
                        step="0.5"
                        value={panels}
                        onChange={(e) => setPanels(Number(e.target.value))}
                      />
                      <span>1 {t('m²')}</span>
                      <span>30 {t('m²')}</span>
                    </label>

                    <div
                      className={`exp-energy-feedback ${m.designPowerMargin < 0 ? 'is-warning' : ''}`}
                      aria-live="polite"
                    >
                      {m.designPowerMargin < 0 ? <AlertCircle size={20} /> : <Check size={20} />}
                      <div>
                        <strong>
                          {m.designPowerMargin < 0
                            ? c(
                                `Не хватает ${Math.ceil(-m.designPowerMargin)} Вт`,
                                `${Math.ceil(-m.designPowerMargin)} W short`,
                                `${Math.ceil(-m.designPowerMargin)} Вт жетіспейді`,
                              )
                            : c(
                                `Запас мощности +${Math.round(m.designPowerMargin)} Вт`,
                                `+${Math.round(m.designPowerMargin)} W power margin`,
                                `Қуат қоры +${Math.round(m.designPowerMargin)} Вт`,
                              )}
                        </strong>
                        <p>
                          {m.designPowerMargin < 0
                            ? c(
                                'Увеличь площадь солнечных панелей или выбери РИТЭГ для дальнего космоса.',
                                'Increase solar panel area or select an RTG for deep-space missions.',
                                'Күн панельдерінің ауданын үлкейт немесе РИТЭГ таңда.',
                              )
                            : c(
                                'Энергии достаточно для одновременной работы приборов, связи и зарядки батарей.',
                                'Enough power to run payloads, downlink, and recharge batteries.',
                                'Аспаптардың жұмысы мен батареяны зарядтауға энергия жеткілікті.',
                              )}
                        </p>
                      </div>
                    </div>

                    <div className="exp-subblock">
                      <h2>
                        {c(
                          '2. Аккумуляторная батарея для теневых участков',
                          '2. Eclipse Battery Capacity',
                          '2. Көлеңке аймақтарға арналған аккумулятор',
                        )}
                      </h2>
                      <p>
                        {c(
                          `Минимальная ёмкость для прохождения тени: ${m.batteryNeed.toFixed(2)} кВт·ч. Больший запас защищает от разряда при пиковых нагрузках.`,
                          `Minimum eclipse requirement: ${m.batteryNeed.toFixed(2)} kWh. Extra capacity prevents brownouts during peak loads.`,
                          `Көлеңкеден өту үшін ең аз сыйымдылық: ${m.batteryNeed.toFixed(2)} кВт·сағ.`,
                        )}
                      </p>
                      <label className="exp-slider" htmlFor="battery-cap" style={{ margin: '18px 0 10px' }}>
                        {c('Ёмкость аккумулятора', 'Battery capacity', 'Аккумулятор сыйымдылығы')}
                        <strong>{battery.toFixed(1)} kWh</strong>
                        <input
                          id="battery-cap"
                          type="range"
                          min="0.6"
                          max="4.0"
                          step="0.2"
                          value={battery}
                          onChange={(e) => setBattery(Number(e.target.value))}
                        />
                        <span>0.6 kWh</span>
                        <span>4.0 kWh</span>
                      </label>
                    </div>
                  </>
                )}

                {/* STEP 3: COMMS, ANTENNA & ONBOARD COMPUTER */}
                {step === 3 && (
                  <>
                    <p className="exp-lead">
                      {c(
                        `Твои приборы генерируют ${m.data} ГБ научных данных в сутки. На дистанции ×${m.orbit.distance} радиосигнал ослабевает — подбери передатчик, антенну и объём памяти.`,
                        `Your instruments generate ${m.data} GB of science data per day. At ×${m.orbit.distance} distance, radio signals weaken — match your transceiver, antenna, and memory buffer.`,
                        `Аспаптар тәулігіне ${m.data} ГБ деректер жинайды. ×${m.orbit.distance} қашықтықта сигнал әлсірейді — таратқыш, антенна және жадты таңда.`,
                      )}
                    </p>

                    <div className="exp-subblock" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                      <h2>{c('1. Радиопередатчик', '1. Radio Transceiver', '1. Радиотаратқыш')}</h2>
                      <div className="exp-camera-options exp-compact-grid">
                        {systems.communications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={communications === item.id}
                            onClick={() => setCommunications(item.id as typeof communications)}
                          >
                            <span className="exp-option-title">
                              {t(item.name)}
                              {communications === item.id && <Check size={18} />}
                            </span>
                            <span>{t(item.pro)}</span>
                            <strong>
                              {item.bandwidth} Mbps <span>·</span> {item.power} W <span>·</span> $
                              {item.cost}M
                            </strong>
                            <div className="exp-consequence">
                              {item.id === 'xband'
                                ? c(
                                    'Последствия: самая высокая надёжность (99%) и малый расход энергии (45 Вт).',
                                    'Consequences: highest reliability (99%) and low power draw (45 W).',
                                    'Салдары: жоғары сенімділік (99%) және аз қуат шығыны (45 Вт).',
                                  )
                                : item.id === 'kaband'
                                  ? c(
                                      'Последствия: утраивает скорость передачи (100 Мбит/с) для тяжёлых камер и дальних орбит.',
                                      'Consequences: triples downlink rate (100 Mbps) for high-rate cameras and distant orbits.',
                                      'Салдары: деректерді жіберу жылдамдығын 3 есе арттырады (100 Мбит/с).',
                                    )
                                  : c(
                                      'Последствия: 220 Мбит/с без узких мест даже в дальнем космосе, но стоит $40M и потребляет 120 Вт.',
                                      'Consequences: 220 Mbps eliminates bottlenecks even in deep space, but costs $40M and draws 120 W.',
                                      'Салдары: 220 Мбит/с жылдамдық, бірақ құны $40M және 120 Вт тұтынады.',
                                    )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="exp-subblock">
                      <h2>{c('2. Антенна', '2. Spacecraft Antenna', '2. Антенна')}</h2>
                      <div className="exp-camera-options exp-compact-grid">
                        {systems.antenna.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={antenna === item.id}
                            onClick={() => setAntenna(item.id as typeof antenna)}
                          >
                            <span className="exp-option-title">
                              {t(item.name)}
                              {antenna === item.id && <Check size={18} />}
                            </span>
                            <span>{t(item.pro)}</span>
                            <strong>
                              ×{item.bandwidth} {c('усиление', 'gain', 'күшейту')} <span>·</span>{' '}
                              {item.mass} kg <span>·</span> ${item.cost}M
                            </strong>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="exp-subblock">
                      <h2>
                        {c(
                          '3. Бортовой компьютер и буфер памяти',
                          '3. Flight Computer & Storage Buffer',
                          '3. Борттық компьютер және жад буфері',
                        )}
                      </h2>
                      <div className="exp-camera-options exp-compact-grid">
                        {systems.computer.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={computer === item.id}
                            onClick={() => setComputer(item.id as typeof computer)}
                          >
                            <span className="exp-option-title">
                              {t(item.name)}
                              {computer === item.id && <Check size={18} />}
                            </span>
                            <span>{t(item.pro)}</span>
                            <strong>
                              {item.storage} GB <span>·</span> {item.power} W <span>·</span> $
                              {item.cost}M
                            </strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 4: PROPULSION, FUEL & SHIELDING */}
                {step === 4 && (
                  <>
                    <p className="exp-lead">
                      {c(
                        `Для выхода на орбиту ${t(m.orbit.name)} требуется Δv ${Math.round(m.requiredDeltaV)} м/с. Всё топливо сверх ${Math.ceil(m.fuelNeeded)} кг остаётся для манёвров и спасения миссии в полёте.`,
                        `Reaching ${t(m.orbit.name)} requires Δv ${Math.round(m.requiredDeltaV)} m/s. Any propellant above ${Math.ceil(m.fuelNeeded)} kg remains available for in-flight maneuvers.`,
                        `${t(m.orbit.name)} орбитасына шығу үшін Δv ${Math.round(m.requiredDeltaV)} м/с қажет. Артық отын ұшу кезіндегі маневрлерге қалады.`,
                      )}
                    </p>

                    <div className="exp-subblock" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                      <h2>{c('1. Двигательная установка', '1. Propulsion System', '1. Қозғалтқыш жүйесі')}</h2>
                      <div className="exp-camera-options exp-compact-grid">
                        {systems.propulsion.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={propulsion === item.id}
                            onClick={() => setPropulsion(item.id as typeof propulsion)}
                          >
                            <span className="exp-option-title">
                              {t(item.name)}
                              {propulsion === item.id && <Check size={18} />}
                            </span>
                            <span>{t(item.pro)}</span>
                            <strong>
                              Isp {item.isp}s <span>·</span> {item.power} W <span>·</span> $
                              {item.cost}M
                            </strong>
                            <div className="exp-consequence">
                              {item.id === 'chemical'
                                ? c(
                                    'Последствия: потребляет всего 25 Вт, но расходует много топлива — подходит для LEO/SSO.',
                                    'Consequences: draws only 25 W, but burns heavy propellant — best for near-Earth orbits.',
                                    'Салдары: небәрі 25 Вт тұтынады, бірақ отынды көбірек жұмсайды.',
                                  )
                                : item.id === 'hybrid'
                                  ? c(
                                      'Последствия: в 3 раза экономичнее по топливу и самая высокая надёжность (99.2%) — идеален для Луны и Солнца.',
                                      'Consequences: 3× more fuel-efficient with highest reliability (99.2%) — ideal for Moon and Solar missions.',
                                      'Салдары: отынды 3 есе үнемдейді және сенімділігі жоғары (99.2%).',
                                    )
                                  : c(
                                      'Последствия: в 7.5 раз экономичнее (огромный Δv для Марса, Астероида и Дальнего космоса), требует 320 Вт.',
                                      'Consequences: 7.5× fuel efficiency (huge Δv for Mars, Asteroid, and Deep Space), draws 320 W.',
                                      'Салдары: отынды 7.5 есе үнемдейді (Марс пен Терең ғарыш үшін таптырмас), 320 Вт тұтынады.',
                                    )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="exp-subblock">
                      <h2>
                        {c(
                          '2. Запас топлива в баках',
                          '2. Propellant Tank Load',
                          '2. Отын қоры',
                        )}
                      </h2>
                      <p>
                        {c(
                          `Минимум для выхода на орбиту: ${Math.ceil(m.fuelNeeded)} кг. Сейчас запас на манёвры в полёте: ${maneuverFuel} кг.`,
                          `Minimum for orbit insertion: ${Math.ceil(m.fuelNeeded)} kg. Current in-flight maneuver reserve: ${maneuverFuel} kg.`,
                          `Орбитаға шығу минимумы: ${Math.ceil(m.fuelNeeded)} кг. Маневр қоры: ${maneuverFuel} кг.`,
                        )}
                      </p>
                      <label className="exp-slider" htmlFor="fuel-load" style={{ margin: '18px 0 10px' }}>
                        {c('Заправляемое топливо', 'Propellant mass', 'Құйылатын отын')}
                        <strong>{fuel} kg</strong>
                        <input
                          id="fuel-load"
                          type="range"
                          min="30"
                          max="700"
                          step="10"
                          value={fuel}
                          onChange={(e) => setFuel(Number(e.target.value))}
                        />
                        <span>30 kg</span>
                        <span>700 kg</span>
                      </label>
                    </div>

                    <div className="exp-subblock">
                      <h2>
                        {c(
                          '3. Термоконтроль и защита от радиации',
                          '3. Thermal & Radiation Shielding',
                          '3. Жылу және радиациялық қорғаныс',
                        )}
                      </h2>
                      <div className="exp-camera-options exp-compact-grid">
                        {systems.thermal.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={thermal === item.id}
                            onClick={() => setThermal(item.id as typeof thermal)}
                          >
                            <span className="exp-option-title">
                              {t(item.name)}
                              {thermal === item.id && <Check size={18} />}
                            </span>
                            <span>{t(item.pro)}</span>
                            <strong>
                              {Math.round((item.protection ?? 0) * 100)}%{' '}
                              {c('защита', 'shielding', 'қорғаныс')} <span>·</span> {item.mass} kg{' '}
                              <span>·</span> {item.power} W
                            </strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 5: LAUNCH VEHICLE */}
                {step === 5 && (
                  <>
                    <p className="exp-lead">
                      {c(
                        `Полная масса спутника сейчас ${Math.round(m.mass)} кг, а цель полёта — ${t(m.mission.name)}. Выбери ракету-носитель, способную доставить аппарат к выбранной планете.`,
                        `Your spacecraft wet mass is ${Math.round(m.mass)} kg and your destination is ${t(m.mission.name)}. Select a launch vehicle rated for your target planet and mass.`,
                        `Жерсеріктің толық массасы ${Math.round(m.mass)} кг, ал бағыты — ${t(m.mission.name)}. Масса мен планетаға сай зымыран-тасығышты таңда.`,
                      )}
                    </p>

                    <div className="exp-camera-options">
                      {(['swift', 'atlas', 'titan', 'horizon'] as const).map((id) => {
                        const l = launchers.find((item) => item.id === id)!;
                        const reachesPlanet = l.destinations.includes(missionId);
                        const effectiveCap =
                          Math.min(l.payload, activeScenario?.mass ?? Infinity) *
                          (mode === 'challenge' ? 0.95 : 1);
                        const fits = m.mass <= effectiveCap && reachesPlanet;
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={launcher === id}
                            onClick={() => setLauncher(id)}
                          >
                            <span className="exp-option-title">
                              {l.name} ({l.class})
                              {launcher === id && <Check size={20} />}
                            </span>
                            <span>{t(l.description)}</span>
                            <strong>
                              {c('Грузоподъёмность до', 'Payload up to', 'Жүк көтергіштігі')}{' '}
                              {l.payload} kg <span>·</span> ${l.cost}M <span>·</span>{' '}
                              {(l.reliability * 100).toFixed(1)}%{' '}
                              {c('надёжность', 'reliability', 'сенімділік')}
                            </strong>
                            <div className="exp-consequence">
                              {!reachesPlanet
                                ? c(
                                    `⚠ Эта ракета не долетает до цели «${t(m.mission.name)}». Выбери более мощный носитель.`,
                                    `⚠ This launcher cannot reach ${t(m.mission.name)}. Select a higher-energy launch vehicle.`,
                                    `⚠ Бұл зымыран «${t(m.mission.name)}» бағытына жете алмайды.`,
                                  )
                                : fits
                                  ? c(
                                      `Последствия: подходит для «${t(m.mission.name)}», запас по массе ${Math.round(effectiveCap - m.mass)} кг.`,
                                      `Consequences: rated for ${t(m.mission.name)} with ${Math.round(effectiveCap - m.mass)} kg mass headroom.`,
                                      `Салдары: «${t(m.mission.name)}» үшін жарамды, масса қоры ${Math.round(effectiveCap - m.mass)} кг.`,
                                    )
                                  : c(
                                      `⚠ Перегруз на ${Math.ceil(m.mass - effectiveCap)} кг! Выбери более тяжёлую ракету или облегчи спутник.`,
                                      `⚠ Overloaded by ${Math.ceil(m.mass - effectiveCap)} kg! Pick a heavier launcher or lighten the spacecraft.`,
                                      `⚠ ${Math.ceil(m.mass - effectiveCap)} кг артық салмақ!`,
                                    )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* STEP 6: FINAL REVIEW & LAUNCH */}
                {step === 6 && (
                  <>
                    <p className="exp-lead">
                      {c(
                        'Проверь готовность всех систем перед пуском. В полёте ты сможешь управлять режимом работы приборов, передачей данных на Землю и принимать решения при нештатных ситуациях.',
                        'Review your spacecraft configuration before liftoff. During the flight, you will control payload duty cycles, data downlink, and respond to in-flight anomalies.',
                        'Ұшыру алдында барлық жүйелердің дайындығын тексер. Ұшу кезінде аспаптар мен деректерді жіберуді басқарасың.',
                      )}
                    </p>

                    <ul className="exp-checklist">
                      <li>
                        <Crosshair size={19} />
                        {t(m.mission.name)} ·{' '}
                        {activeScenario
                          ? `${t(activeScenario.name)} (${t(activeScenario.goal)})`
                          : mode === 'challenge'
                            ? c('Режим испытания (Challenge)', 'Challenge Mode', 'Сынақ режимі')
                            : c('Стандартная экспедиция', 'Standard Expedition', 'Стандартты экспедиция')}
                      </li>
                      <li>
                        <Globe2 size={19} />
                        {t(m.orbit.name)} ({m.orbit.altitude} · ×{m.orbit.science}{' '}
                        {c('наука', 'science', 'ғылым')})
                      </li>
                      <li>
                        <Camera size={19} />
                        {t(instrument.name)}
                        {secondaryInstrument
                          ? ` + ${t(instruments.find((i) => i.id === secondaryInstrument)?.name)}`
                          : ''}{' '}
                        ({c('прогноз науки:', 'projected science:', 'ғылым болжамы:')}{' '}
                        <strong>{Math.round(m.science)} pts</strong>)
                      </li>
                      <li>
                        <Zap size={19} />
                        {panels}
                        {t(' m² · ')}
                        {t(systems.power.find((p) => p.id === powerType)?.name)} ·{' '}
                        {battery.toFixed(1)} kWh {c('батарея', 'battery', 'батарея')}
                      </li>
                      <li>
                        <Radio size={19} />
                        {t(systems.communications.find((x) => x.id === communications)?.name)} +{' '}
                        {t(systems.antenna.find((x) => x.id === antenna)?.name)} · {m.storage} GB{' '}
                        {c('буфер', 'buffer', 'буфер')}
                      </li>
                      <li>
                        <Gauge size={19} />
                        {t(systems.propulsion.find((x) => x.id === propulsion)?.name)} · {fuel} kg (
                        {c('запас на манёвры:', 'maneuver reserve:', 'маневр қоры:')}{' '}
                        <strong>{maneuverFuel} kg</strong>)
                      </li>
                      <li>
                        <Shield size={19} />
                        {t(m.launcher.name)} ·{' '}
                        {t(systems.thermal.find((x) => x.id === thermal)?.name)} ·{' '}
                        {c('Надёжность:', 'Reliability:', 'Сенімділік:')}{' '}
                        <strong>{m.reliability.toFixed(1)}%</strong>
                      </li>
                    </ul>

                    {m.issues.length > 0 ? (
                      <div className="exp-energy-feedback is-warning">
                        <AlertCircle size={20} />
                        <div>
                          <p>
                            {c(
                              'Перед запуском исправь ограничения:',
                              'Resolve these constraints before launch:',
                              'Ұшыру алдында шектеулерді түзет:',
                            )}{' '}
                            {m.issues.map((i) => `${t(i.label)} (${t(i.fix)})`).join(' · ')}
                          </p>
                          <button
                            type="button"
                            className="exp-text-link"
                            style={{ marginTop: 8 }}
                            onClick={autoBalanceAll}
                          >
                            {c(
                              '✦ Автоматически сбалансировать системы под выбранную планету и вызов',
                              '✦ Auto-balance systems for your selected planet and challenge',
                              '✦ Таңдалған планета мен сынаққа жүйелерді авто-теңгеру',
                            )}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="exp-energy-feedback">
                        <Check size={20} />
                        {c(
                          'Все инженерные проверки пройдены! Спутник полностью готов к запуску.',
                          'All engineering checks passed! Your spacecraft is cleared for launch.',
                          'Барлық инженерлік тексерулер өтті! Жерсерік ұшуға дайын.',
                        )}
                      </p>
                    )}

                    <p className="exp-note">
                      {c(
                        'Текущий проект сохраним в библиотеку. После 3D-сцены запуска ракеты откроется пульт управления полётом.',
                        'Your design will be backed up in the library. After the 3D rocket launch sequence, Mission Control will open.',
                        'Жоба кітапханаға сақталады. 3D зымыран ұшыруынан кейін ұшуды басқару пульті ашылады.',
                      )}
                    </p>
                  </>
                )}
              </section>

              <aside className="exp-lesson-visual">
                {step === 0 ? (
                  missionId === 'earth' ? (
                    <EarthScene />
                  ) : (
                    <PlanetPreviewScene missionId={missionId} />
                  )
                ) : (
                  <div className="exp-satellite-preview">
                    <SatelliteDiagram
                      panels={panels}
                      camera={camera}
                      antenna={antenna}
                      propulsion={propulsion}
                      hasSecondary={!!secondaryInstrument}
                      hasRtg={powerType === 'rtg'}
                    />
                  </div>
                )}
                <div className="exp-live-budget" aria-live="polite">
                  <h2>
                    {c('Твой спутник', 'Your satellite', 'Сенің жерсерігің')} · {t(m.mission.name)}
                  </h2>
                  <dl>
                    <div>
                      <dt>{c('Стоимость миссии', 'Mission cost', 'Миссия құны')}</dt>
                      <dd>
                        ${m.cost.toFixed(1)}
                        {t('M ')}
                        <small>
                          / ${Math.round(m.budget)}
                          {t('M')}
                        </small>
                      </dd>
                    </div>
                    <div>
                      <dt>{c('Масса при запуске', 'Launch mass', 'Ұшыру массасы')}</dt>
                      <dd>
                        {Math.round(m.mass)}{' '}
                        <small>
                          / {Math.round(m.massLimit)}
                          {t(' kg')}
                        </small>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {c('Выработка / потребление', 'Generation / demand', 'Өндіріс / тұтыну')}
                      </dt>
                      <dd>
                        {Math.round(m.endOfLifeGeneration)}{' '}
                        <small>
                          / {Math.round(m.requiredGeneration)}
                          {t(' W')}
                        </small>
                      </dd>
                    </div>
                    <div>
                      <dt>{c('Скорость Δv (маневры)', 'Delta-v (maneuvers)', 'Δv (маневрлер)')}</dt>
                      <dd>
                        {Math.round(m.deltaV)}{' '}
                        <small>
                          / {Math.round(m.requiredDeltaV)} m/s (+{maneuverFuel} kg)
                        </small>
                      </dd>
                    </div>
                    <div>
                      <dt>{c('Связь и буфер памяти', 'Downlink & storage', 'Байланыс және жад')}</dt>
                      <dd>
                        {m.bandwidth.toFixed(1)}{' '}
                        <small>
                          / {m.requiredBandwidth.toFixed(1)} Mbps · {m.storage} GB
                        </small>
                      </dd>
                    </div>
                    <div>
                      <dt>{c('Надёжность и наука', 'Reliability & science', 'Сенімділік пен ғылым')}</dt>
                      <dd>
                        {m.reliability.toFixed(1)}% <small>· {Math.round(m.science)} pts</small>
                      </dd>
                    </div>
                  </dl>
                </div>
              </aside>
            </div>

            {error && (
              <p className="exp-error" role="alert">
                {error}
              </p>
            )}

            <div className="exp-lesson-actions">
              {step > 0 ? (
                <button className="exp-text-link" onClick={() => changeStep(step - 1)}>
                  <ArrowLeft size={17} />
                  {c('Назад', 'Back', 'Артқа')}
                </button>
              ) : (
                <Link className="exp-text-link" href="/simulator/">
                  {c('Открыть полный конструктор', 'Open full workspace', 'Толық конструкторды ашу')}
                </Link>
              )}

              <button
                className="exp-primary"
                disabled={
                  !ready ||
                  busy ||
                  (step === 2 && m.designPowerMargin < 0) ||
                  (step === lastStep && m.issues.length > 0)
                }
                onClick={() => (step === lastStep ? launch() : changeStep(step + 1))}
              >
                {busy
                  ? c('Сохраняем…', 'Saving…', 'Сақталуда…')
                  : step === lastStep
                    ? c('Начать полёт', 'Begin flight', 'Ұшуды бастау')
                    : c('Дальше', 'Continue', 'Келесі')}
                {step === lastStep ? <Rocket size={19} /> : <ArrowRight size={19} />}
              </button>
            </div>
          </>
        )}
      </main>
      {showLaunchIntro && (
        <LaunchIntro design={design} onDone={() => router.push('/builder/')} />
      )}
    </ExpeditionShell>
  );
}

function PlanetPreviewScene({ missionId }: { missionId: MissionId }) {
  const { t } = useI18n();
  const palette: Record<
    MissionId,
    { core: string; rim: string; glow: string; ring: string }
  > = {
    earth: { core: '#1d4ed8', rim: '#60a5fa', glow: '#38bdf8', ring: '#7dd3fc' },
    lunar: { core: '#64748b', rim: '#cbd5e1', glow: '#94a3b8', ring: '#cbd5e1' },
    mars: { core: '#9a3412', rim: '#fb923c', glow: '#f97316', ring: '#fdba74' },
    asteroid: { core: '#57534e', rim: '#a8a29e', glow: '#d6d3d1', ring: '#e7e5e4' },
    solar: { core: '#d97706', rim: '#fde047', glow: '#f59e0b', ring: '#fef08a' },
    deep: { core: '#4c1d95', rim: '#c4b5fd', glow: '#8b5cf6', ring: '#ddd6fe' },
  };
  const colors = palette[missionId] ?? palette.earth;

  return (
    <div className="exp-satellite-preview">
      <svg viewBox="0 0 460 260" role="img" aria-label={t('Target planet orbital diagram')}>
        <defs>
          <radialGradient id={`planet-grad-${missionId}`} cx="38%" cy="34%" r="68%">
            <stop offset="0%" stopColor={colors.rim} />
            <stop offset="65%" stopColor={colors.core} />
            <stop offset="100%" stopColor="#050b16" />
          </radialGradient>
        </defs>
        <g fill="none">
          <circle cx="230" cy="130" r="95" stroke={colors.glow} strokeOpacity="0.18" strokeWidth="1" />
          <ellipse
            cx="230"
            cy="130"
            rx="168"
            ry="58"
            stroke={colors.ring}
            strokeOpacity="0.55"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            transform="rotate(-14 230 130)"
          />
          {missionId === 'asteroid' ? (
            <path
              d="M175 110 C190 78, 255 72, 282 102 C304 128, 288 168, 245 176 C202 182, 162 152, 175 110 Z"
              fill={`url(#planet-grad-${missionId})`}
              stroke={colors.rim}
              strokeWidth="1.5"
            />
          ) : (
            <circle
              cx="230"
              cy="130"
              r="68"
              fill={`url(#planet-grad-${missionId})`}
              stroke={colors.rim}
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
          )}
          {missionId === 'lunar' && (
            <g stroke="#cbd5e1" strokeOpacity="0.35" strokeWidth="1.2">
              <circle cx="206" cy="112" r="12" />
              <circle cx="252" cy="144" r="16" />
              <circle cx="218" cy="154" r="8" />
            </g>
          )}
          {missionId === 'deep' && (
            <ellipse
              cx="230"
              cy="130"
              rx="118"
              ry="26"
              stroke={colors.rim}
              strokeOpacity="0.65"
              strokeWidth="4"
              transform="rotate(-14 230 130)"
            />
          )}
          {/* Orbiting Spacecraft Marker */}
          <g transform="translate(378, 92)">
            <rect x="-16" y="-4" width="10" height="8" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1" />
            <rect x="6" y="-4" width="10" height="8" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1" />
            <rect x="-5" y="-6" width="10" height="12" rx="2" fill="#e2e8f0" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function SatelliteDiagram({
  panels,
  camera,
  antenna,
  propulsion,
  hasSecondary,
  hasRtg,
}: {
  panels: number;
  camera: TutorialCameraId;
  antenna: 'patch' | 'dish' | 'array';
  propulsion: 'chemical' | 'hybrid' | 'ion';
  hasSecondary: boolean;
  hasRtg: boolean;
}) {
  const { t } = useI18n();
  const width = Math.min(155, 55 + panels * 4.2);
  const lensRadius =
    camera === 'hires' ? 22 : camera === 'radar' ? 20 : camera === 'spectrometer' ? 17 : 14;
  const plumeColor =
    propulsion === 'ion' ? '#64d8ff' : propulsion === 'hybrid' ? '#b794f4' : '#ffb74d';

  return (
    <svg viewBox="0 0 460 260" role="img" aria-label={t('Satellite configuration diagram')}>
      <g fill="none" stroke="#7caedf" strokeWidth="1.5">
        <path d="M38 130h384" strokeDasharray="4 6" opacity=".35" />
        {/* Solar Wings */}
        <rect x={180 - width} y="85" width={width} height="90" fill="#153354" />
        <rect x="280" y="85" width={width} height="90" fill="#153354" />
        {[1, 2, 3].map((i) => (
          <g key={i}>
            <path d={`M${180 - width + (width * i) / 4} 85v90 M${280 + (width * i) / 4} 85v90`} />
            <path d={`M${180 - width} ${85 + i * 22.5}h${width} M280 ${85 + i * 22.5}h${width}`} />
          </g>
        ))}
        <path d="M180 130h20m60 0h20" />
        {/* Bus Body */}
        <rect x="200" y="78" width="60" height="104" rx="8" fill="#d4dce5" stroke="#eaf0f7" />
        {/* RTG Fin if equipped */}
        {hasRtg && (
          <rect x="260" y="160" width="26" height="12" rx="3" fill="#7c2d12" stroke="#fdba74" />
        )}
        {/* Primary Camera / Payload Lens */}
        {camera === 'radar' ? (
          <rect x="212" y="108" width="36" height="44" rx="4" fill="#071526" stroke="#9bc7ff" />
        ) : (
          <circle cx="230" cy="130" r={lensRadius} fill="#071526" />
        )}
        <circle cx="230" cy="130" r="7" />
        {/* Optional Secondary Sensor Pod */}
        {hasSecondary && (
          <circle cx="246" cy="96" r="6" fill="#14243a" stroke="#9bc7ff" />
        )}
        {/* Top Antenna */}
        {antenna === 'dish' && <path d="M230 78V45m-18 0q18-24 36 0Z" />}
        {antenna === 'array' && (
          <rect x="214" y="54" width="32" height="16" rx="2" fill="#153354" stroke="#9bc7ff" />
        )}
        {antenna === 'patch' && (
          <rect x="220" y="68" width="20" height="10" rx="2" fill="#153354" />
        )}
        {/* Bottom Thruster Nozzle & Plume */}
        <path d="M218 182v16h24v-16" />
        <ellipse cx="230" cy="212" rx="10" ry="16" fill={plumeColor} stroke="none" opacity="0.55" />
      </g>
    </svg>
  );
}
