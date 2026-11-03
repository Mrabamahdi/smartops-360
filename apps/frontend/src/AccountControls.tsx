import type {Lang} from './domain';

export function ControlIcon({name}:{name:'sun'|'moon'|'bell'|'profile'|'logout'}){
 const paths={sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,moon:<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>,bell:<><path d="M18 8a6 6 0 0 0-12 0c0 6-2 6-2 8h16c0-2-2-2-2-8"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></>,profile:<><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,logout:<><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M10 12h11m-4-4 4 4-4 4"/></>};
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function ThemeToggle({dark,lang,onToggle}:{dark:boolean;lang:Lang;onToggle:()=>void}){
 const current=lang==='de'?(dark?'Dunkler Modus':'Heller Modus'):(dark?'Dark mode':'Light mode');
 const action=lang==='de'?(dark?'Zum hellen Modus wechseln':'Zum dunklen Modus wechseln'):(dark?'Switch to light mode':'Switch to dark mode');
 return <span className="control-hint"><button type="button" className="compact-control" aria-label={action} title={`${current} · ${action}`} onClick={onToggle}><ControlIcon name={dark?'moon':'sun'}/></button><span className="control-tooltip" aria-hidden="true">{current}</span></span>;
}
