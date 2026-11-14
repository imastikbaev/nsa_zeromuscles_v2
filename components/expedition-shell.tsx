'use client';
import Link from 'next/link';
import { ArrowUpRight, Orbit } from 'lucide-react';
import { useI18n } from './preferences';
import type { ReactNode } from 'react';
import { InstallControl } from './install-control';
import './expedition.css';
export function useExpeditionCopy() {
  const { locale } = useI18n();
  return (ru: string, en: string, kk: string) => locale === 'ru' ? ru : locale === 'kk' ? kk : en;
}
export function ExpeditionShell({children}: {children: ReactNode}) {
  const { t, locale, setLocale } = useI18n();
  const c = useExpeditionCopy();
  return <div className="expedition"><a className="skip-link" href="#exp-main">{c('К содержимому','Skip to content','Мазмұнға өту')}</a><header className="exp-header"><Link className="exp-brand" href="/" aria-label={t("Mission Architect")}><Orbit size={28}/><span>{c("АРХИТЕКТОР", "MISSION", "МИССИЯ")}<br/>{c("МИССИЙ", "ARCHITECT", "СӘУЛЕТШІСІ")}</span></Link><nav aria-label={c('Главная навигация','Main navigation','Негізгі навигация')}><Link href="/#how">{c('Как это работает','How it works','Қалай жұмыс істейді')}</Link><Link href="/builder/">{c('Новый конструктор','New Builder','Жаңа конструктор')}<ArrowUpRight size={15}/></Link><Link href="/simulator/">{c('Конструктор','Workspace','Конструктор')}<ArrowUpRight size={15}/></Link><select aria-label={c('Язык','Language','Тіл')} value={locale} onChange={e => setLocale(e.target.value as typeof locale)}><option value="ru">{t("RU")}</option><option value="en">{t("EN")}</option><option value="kk">{t("KZ")}</option></select></nav></header>{children}<footer className="exp-footer"><InstallControl/><Link href="/">{t("Mission Architect")}</Link><span>{c('Учебный симулятор. Оборудование и условия полёта упрощены.','Educational simulator. Equipment and flight conditions are simplified.','Оқу симуляторы. Жабдықтар мен ұшу шарттары жеңілдетілген.')}</span><Link href="/builder/">{c('Открыть новый конструктор','Open new builder','Жаңа конструкторды ашу')}<ArrowUpRight size={15}/></Link></footer></div>;
}
