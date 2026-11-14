"use client";
import { useEffect, useRef } from "react";
import type { Design } from "@/lib/data";
import { LaunchSequence } from "./launch-sequence";
import { useExpeditionCopy } from "./expedition-shell";

/** Only dismisses the cinematic; the caller saves the initial flight before mounting. */
export function LaunchIntro({design,onDone}:{design:Design;onDone:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const c=useExpeditionCopy();
  useEffect(()=>{
    const element=dialog.current;
    if(element&&!element.open)element.showModal();
    return ()=>{if(element?.open)element.close();};
  },[]);
  return <dialog ref={dialog} className="ls-intro" aria-label={c("Запуск миссии","Mission launch","Миссияны ұшыру")}
    onCancel={event=>{event.preventDefault();onDone();}}>
    <header><h2>{c("Запуск миссии","Mission launch","Миссияны ұшыру")} · {design.name}</h2>
      <button type="button" onClick={onDone}>{c("К управлению полётом","Go to mission control","Ұшуды басқаруға өту")}</button>
    </header>
    <LaunchSequence design={design} onComplete={onDone}/>
    <p>{c("После кат-сцены вы управляете миссией с первого этапа. Время полёта идёт только по вашей команде.","After the cinematic, control the mission from its first phase. Mission time advances only on your command.","Көріністен кейін миссияны бірінші кезеңнен басқарасыз. Уақыт тек сіздің пәрменіңізбен өтеді.")}</p>
  </dialog>;
}
