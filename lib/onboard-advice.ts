import type { Design } from './data';
import { calculate } from './engineering';
import { dataTotals } from './operations';
import { nextIntervalHours, pendingEvent, phases, responseRisk, type Flight } from './simulation';
import { translate, type Locale } from './i18n';

export type AdviceTopic = 'phase' | 'risk' | 'data' | 'power';

/** Read-only explanations of the same state used by the flight controls. No AI or network. */
export function onboardAdvice(design: Design, flight: Flight, topic: AdviceTopic, locale: Locale): string {
  const c = (ru: string, en: string, kk: string) => locale === 'ru' ? ru : locale === 'kk' ? kk : en;
  const t = (text: string) => translate(text, locale);
  const n = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const metrics = calculate(design), operations = flight.operations, event = pendingEvent(flight);
  const finished = flight.completed
    ? c('Полёт завершён. Эти показатели относятся к итогам; новые команды уже не выполняются.', 'The flight is complete. These are final measurements; no further commands can run.', 'Ұшу аяқталды. Бұл — қорытынды көрсеткіштер; жаңа командалар орындалмайды.') : '';
  const lines: string[] = finished ? [finished] : [];
  if (topic === 'phase') {
    lines.push(`${c('Текущий этап', 'Current phase', 'Ағымдағы кезең')}: ${t(phases[flight.phase])}.`);
    if (!flight.completed) {
      if (event) lines.push(c(`Сначала ответь на событие «${t(event.title)}». До решения следующий интервал недоступен.`, `Resolve “${t(event.title)}” before advancing the next interval.`, `Келесі аралыққа дейін «${t(event.title)}» оқиғасын шеш.`));
      else lines.push(c(`Следующая команда рассчитает ${n(nextIntervalHours(flight, design))} ч. До нажатия кнопки время миссии не идёт.`, `The next command advances ${n(nextIntervalHours(flight, design))} hours. Mission time stays paused until you confirm.`, `Келесі команда ${n(nextIntervalHours(flight, design))} сағатты есептейді. Растамайынша уақыт тоқтап тұрады.`));
      lines.push(flight.phase < 4
        ? c('Сейчас идёт ввод аппарата в работу: научные данные ещё не собираются. Проверь приборы и передачу перед научными интервалами.', 'The spacecraft is being commissioned: science collection has not started. Check instruments and transmission before science intervals.', 'Аппарат іске қосылуда: ғылыми деректер әлі жиналмайды. Аспаптар мен дерек жіберуді тексер.')
        : c('Научные интервалы учитывают работу приборов, заряд, окна связи и потери данных. Настройки применятся к следующему расчёту.', 'Science intervals account for instruments, battery, contact windows and data loss. Settings apply to the next calculation.', 'Ғылыми аралықтар аспаптарды, қуатты, байланыс уақытын және дерек жоғалуын ескереді. Баптаулар келесі есепке қолданылады.'));
    }
  } else if (topic === 'risk') {
    lines.push(c(`Состояние аппарата: ${n(flight.health)}%. Остаток топлива: ${n(flight.fuel)} кг.`, `Spacecraft health: ${n(flight.health)}%. Fuel remaining: ${n(flight.fuel)} kg.`, `Аппарат күйі: ${n(flight.health)}%. Отын қалдығы: ${n(flight.fuel)} кг.`));
    if (event && !flight.completed) {
      lines.push(t(event.title), t(event.description));
      for (const choice of event.choices) {
        const risk = responseRisk(choice.risk, metrics.reliability, design.mode) * 100;
        lines.push(`${t(choice.label)}: ${c('риск повреждения', 'damage risk', 'зақым қаупі')} ${n(risk)}%; ${t('Fuel')} ${n(choice.fuel)} ${t('kg')}; ${t('Science')} ${choice.science > 0 ? '+' : ''}${choice.science}.${choice.fuel > flight.fuel ? ' ' + c('Недостаточно топлива.', 'Insufficient fuel.', 'Отын жеткіліксіз.') : ''}`);
      }
      lines.push(c('Это вероятность, а не обещание исхода. Меньший риск может потребовать топлива или снизить научный результат.', 'These are probabilities, not guaranteed outcomes. Lower risk may cost fuel or science.', 'Бұл — ықтималдық, кепілді нәтиже емес. Қауіпті азайту отын не ғылыми нәтижені қажет етуі мүмкін.'));
    } else if (!flight.completed) lines.push(c('События, требующего решения, сейчас нет. Это не гарантирует отсутствие рисков в следующих интервалах.', 'No event currently requires a decision. This does not guarantee risk-free future intervals.', 'Қазір шешімді қажет ететін оқиға жоқ. Бұл келесі аралықтардың қауіпсіздігіне кепіл емес.'));
    if (flight.health < 35) lines.push(c('Состояние аппарата ниже порога 35%, необходимого для выполнения научных целей.', 'Health is below the 35% threshold required to complete science objectives.', 'Аппарат күйі ғылыми мақсаттарға қажетті 35% шегінен төмен.'));
  } else if (!operations) {
    lines.push(c('Это старое сохранение без подробного учёта энергии и данных. Эти показатели для него недоступны.', 'This legacy flight has no detailed energy or data accounting. Those measurements are unavailable.', 'Бұл ескі сақтауда қуат пен деректердің толық есебі жоқ. Көрсеткіштер қолжетімсіз.'));
  } else if (topic === 'data') {
    const totals = dataTotals(operations);
    lines.push(c(`Передано: ${n(totals.delivered)} ГБ. На борту: ${n(totals.buffered)} из ${n(metrics.storage)} ГБ. Потеряно или удалено: ${n(totals.lost)} ГБ.`, `Delivered: ${n(totals.delivered)} GB. Onboard: ${n(totals.buffered)} of ${n(metrics.storage)} GB. Lost or discarded: ${n(totals.lost)} GB.`, `Жіберілді: ${n(totals.delivered)} ГБ. Бортта: ${n(totals.buffered)} / ${n(metrics.storage)} ГБ. Жоғалған не жойылған: ${n(totals.lost)} ГБ.`));
    lines.push(c('В научный результат входят доставленные данные; оставшиеся в памяти ещё не засчитываются.', 'Only delivered data contribute to science; buffered data have not been credited.', 'Ғылыми нәтижеге тек жеткізілген деректер кіреді; жадтағы деректер әлі есептелмейді.'));
    if (!flight.completed) {
      lines.push(operations.downlink
        ? c('Передача включена, но работает только в окнах связи. При накоплении данных назначь приоритет важному прибору или снизь сбор.', 'Downlink is enabled, but only runs during contact windows. If data accumulate, prioritize an important instrument or reduce collection.', 'Дерек жіберу қосулы, бірақ тек байланыс уақытында жұмыс істейді. Деректер жиналса, маңызды аспапқа басымдық бер не жинауды азайт.')
        : c('Передача выключена. Включи её перед следующим интервалом, чтобы данные могли уходить в окна связи.', 'Downlink is off. Enable it before the next interval to transmit during contact windows.', 'Дерек жіберу өшірулі. Байланыс уақытында жіберу үшін келесі аралыққа дейін қос.'));
      if (operations.duty === 0 || design.instruments.every(id => operations.disabledInstruments?.includes(id))) lines.push(c('Сбор данных остановлен настройками приборов. Для новых наблюдений включи нужный прибор и ненулевую активность.', 'Instrument settings have stopped collection. Enable an instrument and nonzero duty for new observations.', 'Аспап баптаулары дерек жинауды тоқтатты. Бақылау үшін аспапты қосып, белсенділікті арттыр.'));
    }
  } else {
    lines.push(c(`Заряд: ${n(operations.batteryKWh)} из ${n(design.battery)} кВт·ч. Активность приборов: ${n(operations.duty * 100)}%.`, `Battery: ${n(operations.batteryKWh)} of ${n(design.battery)} kWh. Instrument duty: ${n(operations.duty * 100)}%.`, `Қуат: ${n(operations.batteryKWh)} / ${n(design.battery)} кВт·сағ. Аспап белсенділігі: ${n(operations.duty * 100)}%.`));
    lines.push(c(`Накопленный дефицит энергии: ${n(operations.unservedKWh)} кВт·ч. Заряд в конце интервала не показывает все перебои внутри него.`, `Cumulative unmet energy: ${n(operations.unservedKWh)} kWh. End-of-interval charge does not reveal every shortage within it.`, `Жинақталған қуат тапшылығы: ${n(operations.unservedKWh)} кВт·сағ. Соңғы заряд аралықтағы барлық үзілісті көрсетпейді.`));
    if (!flight.completed) lines.push(c('Если энергии не хватает, снизь активность приборов или выключи второстепенные. Это уменьшит сбор данных. Отключение передатчика экономит энергию, но повышает риск переполнения памяти.', 'If energy is insufficient, reduce duty or disable secondary instruments. This reduces collection. Disabling downlink saves energy but increases storage-overflow risk.', 'Қуат жетпесе, белсенділікті азайт не қосалқы аспаптарды өшір. Бұл дерек жинауды азайтады. Байланысты өшіру қуатты үнемдейді, бірақ жад толуы қаупін арттырады.'));
  }
  return lines.join('\n\n');
}

/** Never contact a visitor's localhost from a public deployment. */
export function engineerEndpoint(hostname: string, configured?: string): string | null {
  if (configured?.trim()) return configured.trim();
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) ? 'http://127.0.0.1:3013/ask' : null;
}
