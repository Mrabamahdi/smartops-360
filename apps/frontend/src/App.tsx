import {WorkspaceWelcome} from './WorkspaceWelcome';
import {api,all} from './api';

import {ServerLogin} from './ServerLogin';

import {ServerTeam,ServerEnergy} from './ServerPanels';

import {loadServer,saveServer,technicians,students} from './serverData';

import {CompanySummary,CollaborationManager,loadCompanies,companyKey} from './CollaborationManager';

import type {Company} from './CollaborationManager';

import {ControlIcon,ThemeToggle} from './AccountControls';

import {useEffect,useRef,useState} from 'react';

import type {FormEvent,ReactNode} from 'react';

import words from './locales.json';

import {available,comparison,cost,importCsv,load,original,reference,statuses,storageKey,validDate,validData} from './domain';

import type {Data,Job,Lang,LocalText,Page,Status} from './domain';

import {Workspace,type Role} from './Workspace';

import {downloadReport} from './pdf';



const STATIC_DEMO=import.meta.env.VITE_STATIC_DEMO==='true';
const initialData=STATIC_DEMO?load():null;

const icons:Record<Page,string>={dashboard:'layout-dashboard',collaboration:'link',admin:'users-round',maintenance:'wrench',planning:'calendar',energy:'zap',costs:'wallet',reports:'file-check'};

const asset=(path:string)=>import.meta.env.BASE_URL+path;

function Icon({name}:{name:string}){return <svg className="icon" aria-hidden="true"><use href={asset(`icons.svg#${name}`)}/></svg>}

function Mark(){return <svg className="mini-mark" aria-hidden="true" viewBox="0 0 28 28"><path d="M7 7h14M7 7v14M7 21h14" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="17" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="17" y="17" width="8" height="8" rx="2" fill="currentColor"/></svg>}

type Modal={type:'new'|'job'|'cost'|'reading'|'reset';id?:string}|null;

export default function App(){

 const [companyState,setCompanyState]=useState<{items:Company[];error:boolean}>(()=>STATIC_DEMO?loadCompanies():{items:[],error:false});

 const saveCompanies=async(items:Company[])=>{if(STATIC_DEMO){try{localStorage.setItem(companyKey,JSON.stringify(items));setCompanyState({items,error:false});return true}catch{setCompanyState(v=>({...v,error:true}));return false}}try{for(const c of items){const payload={name:c.name,description:c.description[0],description_de:c.description[1],website:c.website,logo:c.logo,visible:c.visible};await api('collaborations/'+(/^\d+$/.test(c.id)?c.id+'/':''),/^\d+$/.test(c.id)?'PATCH':'POST',payload)}for(const c of companyState.items)if(!items.some(v=>v.id===c.id))await api('collaborations/'+c.id+'/','DELETE');await refreshCompanies();return true}catch(e){notify(String(e));return false}};

 const refreshCompanies=async()=>{if(STATIC_DEMO){setCompanyState(loadCompanies());return}const items=await all('collaborations/');setCompanyState({items:items.map(v=>({id:String(v.id),name:v.name,description:[v.description,v.description_de||v.description],website:v.website,logo:v.logo||'',visible:v.visible})),error:false})};

 const [data,setData]=useState<Data>(()=>initialData?.data??{jobs:[],readings:[],threshold:0}),[ready,setReady]=useState(STATIC_DEMO),[storageError,setStorageError]=useState(initialData?.error??false);

 const [lang,setLang]=useState<Lang>(()=>{try{return localStorage.getItem('smartops-language')==='de'?'de':'en'}catch{return 'en'}}),[role,setRole]=useState<Role>('admin'),[page,setPage]=useState<Page>('dashboard');

 const [accountUsername,setAccountUsername]=useState(''); const [identity,setIdentity]=useState('Lena Weber'); const [signedIn,setSignedIn]=useState(STATIC_DEMO),[dark,setDark]=useState(false),[inbox,setInbox]=useState(false);

 const [exampleMode,setExampleMode]=useState(STATIC_DEMO);
 const [scopeRevision,setScopeRevision]=useState(0);
 const refreshScope=async()=>{const fresh=await loadServer(role);setData(fresh);await refreshCompanies();const notices=await all('notifications/');setNotifications(notices.map(v=>({id:v.id,message:v.message,read:v.read})));setModal(null);setSelected('');setSearch('');setFilter('');setListPage(0);setScopeRevision(v=>v+1)};
 const extra=(en:string,de:string)=>lang==='de'?de:en;

 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light'},[dark]);

 const [collapsed,setCollapsed]=useState(()=>window.matchMedia('(max-width:760px)').matches),[modal,setModal]=useState<Modal>(null),[feedback,setFeedback]=useState(''),[selected,setSelected]=useState('J-041');

 useEffect(()=>{const media=window.matchMedia('(max-width:760px)');const update=()=>setCollapsed(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
 const [filter,setFilter]=useState(''),[search,setSearch]=useState(''),[listPage,setListPage]=useState(0),[busy,setBusy]=useState(false);

 const [profileOpen,setProfileOpen]=useState(false);

 const profileDialog=useRef<HTMLDialogElement>(null);

 useEffect(()=>{if(profileOpen)profileDialog.current?.showModal();else profileDialog.current?.close()},[profileOpen]);

 const signOut=async()=>{try{await api('auth/logout/','POST');setProfileOpen(false);setSignedIn(false);setInbox(false);setModal(null);setData({jobs:[],readings:[],threshold:0});setCompanyState({items:[],error:false})}catch(e){notify(String(e))}};

 const drawer=useRef<HTMLDialogElement>(null);

 useEffect(()=>{if(inbox)drawer.current?.showModal();else drawer.current?.close()},[inbox]);

 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLElement|null>(null),main=useRef<HTMLElement>(null),csv=useRef<HTMLInputElement>(null);

 const t=(key:keyof typeof words.en)=>words[lang][key];

 const text=(value:LocalText)=>value[lang==='de'?1:0];

 const locale=lang==='de'?'de-DE':'en-GB';

 const num=(v:number)=>new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(v);

 const money=(v:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(v);

 const date=(v:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z'));

 const notify=(message:string)=>setFeedback(message);

 useEffect(()=>{if(STATIC_DEMO){setReady(true);setSignedIn(true);setExampleMode(true);return}api('auth/me/').then(u=>{setAccountUsername(u.username);setIdentity(u.name);setRole(u.role);setSignedIn(true);setPage(['student','technician'].includes(u.role)?'maintenance':'dashboard')}).catch(()=>{}).finally(()=>setReady(true))},[]);

 useEffect(()=>{if(signedIn&&!STATIC_DEMO){loadServer(role).then(setData).catch(e=>notify(String(e)));refreshCompanies().catch(()=>setCompanyState({items:[],error:true}))}},[signedIn,role]);

 useEffect(()=>{document.documentElement.lang=lang;try{localStorage.setItem('smartops-language',lang)}catch{}},[lang]);

 useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(''),4500);return ()=>clearTimeout(timer)},[feedback]);

 useEffect(()=>{if(modal){opener.current=document.activeElement as HTMLElement;dialog.current?.showModal()}else if(dialog.current?.open){dialog.current.close();if(opener.current?.isConnected)opener.current.focus()}},[modal]);

 const commit=async(next:Data)=>{setBusy(true);try{if(STATIC_DEMO){if(!validData(next))throw Error('Invalid example data');localStorage.setItem(storageKey,JSON.stringify(next));setData(next)}else{await saveServer(next,data,role);setData(await loadServer(role))}setStorageError(false);notify(t('saved'))}catch(e){if(STATIC_DEMO)setStorageError(true);notify(STATIC_DEMO?extra('This browser could not save the changes. Check its storage settings.','Dieser Browser konnte die Änderungen nicht speichern. Bitte prüfen Sie die Speichereinstellungen.'):String(e))}finally{setBusy(false)}};

 const updateJob=(next:Job)=>commit({...data,jobs:data.jobs.map(j=>j.id===next.id?next:j)});

 const navigate=(dest:Page)=>{setPage(dest);setListPage(0);setFeedback('');requestAnimationFrame(()=>{main.current?.focus({preventScroll:true});window.scrollTo({top:0})})};

 const allowedJobs=data.jobs;

 const baseline=reference(data.readings),alerts=baseline!==null?data.readings.filter(r=>r.value>baseline*(1+data.threshold/100)):[];

 const chosen=data.jobs.find(j=>j.id===selected)??data.jobs[0];

 const badge=(job:Job)=><span className={`tag ${{open:'neutral',scheduled:'info',progress:'warning',completed:'success'}[job.status]}`}>{t(job.status)}</span>;

 function jobTable(jobs:Job[],financial=false){return <div className="table-scroll" tabIndex={0} role="region" aria-label={t('jobs')}><table className="spec-table"><thead><tr><th scope="col">{t('job')}</th><th scope="col">{t('date')}</th><th scope="col">{t(financial?'total':'technicianName')}</th><th scope="col">{t(financial?'remaining':'status')}</th><th scope="col"><span className="sr-only">{t('view')}</span></th></tr></thead><tbody>{jobs.map(j=><tr key={j.id}><td><b>{text(j.problem)}</b><small>{text(j.equipment)} · {text(j.site)}</small></td><td>{date(j.date)}</td><td>{financial?money(cost(j)):j.tech||t('none')}</td><td>{financial?<>{money(j.budget-cost(j))}{cost(j)>j.budget&&<small className="tag error">{t('over')}</small>}</>:badge(j)}</td><td><button className="app-textbutton" onClick={()=>setModal({type:financial?'cost':'job',id:j.id})}>{t(financial?'edit':'view')}<span className="sr-only"> {j.id}</span></button></td></tr>)}{!jobs.length&&<tr><td colSpan={5} className="app-empty">{t('empty')}</td></tr>}</tbody></table></div>}

 function amounts(j:Job){return <dl className="app-amounts">{([['budget',j.budget],['labor',j.hours*j.rate],['parts',j.parts],['travel',j.travel],['total',cost(j)],['remaining',j.budget-cost(j)]] as const).map(([key,value])=><div key={key} className={key==='total'?'total':''}><dt>{t(key)}</dt><dd>{money(value)}</dd></div>)}</dl>}

 function energyComparison(j:Job|undefined){const c=j?comparison(j,data.readings):null;return c?<><div className="app-comparison"><div>{t('before')}<strong>{num(c.before)} kWh</strong><small>{date('2026-10-24')} – {date('2026-10-26')}</small></div><div>{t('after')}<strong>{num(c.after)} kWh</strong><small>{date('2026-10-28')} – {date('2026-10-30')}</small></div></div><p><b>{t('difference')}: {num(c.diff)} kWh {c.percent!==null?`(${num(c.percent)}%)`:'—'}</b></p><p className="app-subtle">{t('limits')}</p></>:<p className="app-subtle">{t('noEnergy')}</p>}

 function report(j:Job){return <article className="app-report" id="report"><header><div className="app-brand"><Mark/>SmartOps 360</div></header>{exampleMode&&<p className="callout info">{extra('Fictional example data — not an operational report.','Fiktive Beispieldaten — kein betrieblicher Bericht.')}</p>}<h2>{t('report')} · {text(j.problem)}</h2>{badge(j)}<dl className="app-details">{([['site',text(j.site)],['equipment',text(j.equipment)],['problem',text(j.problem)],['date',date(j.date)],['technicianName',j.tech||t('none')]] as const).map(([key,value])=><div key={key}><dt>{t(key)}</dt><dd>{value}</dd></div>)}</dl><h3>{t('repair')}</h3><p>{text(j.repair)||'—'}</p><p>{t('hours')}: {num(j.hours)}</p><h3>{t('costs')}</h3>{amounts(j)}<h3>{t('energyTitle')}</h3>{energyComparison(j)}<h3>{t('notes')}</h3><p>{text(j.repair)||t(j.status)}</p><footer>{t('generated')}: {new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date())}</footer></article>}

 async function exportPdf(){if(!chosen)return;setBusy(true);try{const j=chosen,c=comparison(j,data.readings);const lines=[...(exampleMode?[extra('Fictional example data — not an operational report.','Fiktive Beispieldaten — kein betrieblicher Bericht.')]:[]),`${t('job')}: ${text(j.problem)}`,`${t('site')}: ${text(j.site)}`,`${t('equipment')}: ${text(j.equipment)}`,`${t('problem')}: ${text(j.problem)}`,`${t('date')}: ${date(j.date)}`,`${t('technicianName')}: ${j.tech||t('none')}`,`${t('status')}: ${t(j.status)}`,`${t('repair')}: ${text(j.repair)||'—'}`,`${t('hours')}: ${num(j.hours)}`,`${t('rate')}: ${money(j.rate)}`,`${t('budget')}: ${money(j.budget)}`,`${t('labor')}: ${money(j.hours*j.rate)}`,`${t('parts')}: ${money(j.parts)}`,`${t('travel')}: ${money(j.travel)}`,`${t('total')}: ${money(cost(j))}`,`${t('remaining')}: ${money(j.budget-cost(j))}`,...(c?[`${t('before')}: ${num(c.before)} kWh | ${date('2026-10-24')} - ${date('2026-10-26')}`,`${t('after')}: ${num(c.after)} kWh | ${date('2026-10-28')} - ${date('2026-10-30')}`,`${t('difference')}: ${num(c.diff)} kWh (${c.percent===null?'—':num(c.percent)+'%'})`,t('limits')]:[t('noEnergy')]),`${t('notes')}: ${text(j.repair)||t(j.status)}`,`${t('generated')}: ${new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date())}`];await downloadReport(j,lang,lines,t('report'))}catch{notify(t('pdfError'))}finally{setBusy(false)}}

 async function onCsv(file:File|undefined){if(!file)return;if(file.size>1_000_000){notify(t('csvError'));return}try{const raw=await file.text();const readings=importCsv(raw,data.readings);commit({...data,readings});notify(t('imported'))}catch{notify(t('csvError'))}finally{if(csv.current)csv.current.value=''}}

 function pagination(count:number){return count>8&&<div className="app-pagination"><button className="btn secondary" disabled={!listPage} onClick={()=>setListPage(p=>p-1)} aria-label={lang==='de'?'Vorherige Seite':'Previous page'}>‹</button><span>{listPage+1} / {Math.ceil(count/8)}</span><button className="btn secondary" disabled={(listPage+1)*8>=count} onClick={()=>setListPage(p=>p+1)} aria-label={lang==='de'?'Nächste Seite':'Next page'}>›</button></div>}

 function content():ReactNode {

  if(page==='collaboration')return role==='admin'?<CollaborationManager lang={lang} items={companyState.items} onSave={saveCompanies} storageError={companyState.error}/>:null;

  if(page==='admin')return STATIC_DEMO?null:<ServerTeam lang={lang}/>;

  if(page==='energy'&&!STATIC_DEMO)return <ServerEnergy lang={lang}/>;

  if(page==='planning')return <Workspace page={page} role={role} lang={lang} jobs={allowedJobs} onJob={id=>setModal({type:'job',id})}/>;

  if(page==='dashboard')return <><CompanySummary lang={lang} items={companyState.items}/><div className="app-stats">{([['active',data.jobs.filter(j=>j.status!=='completed').length,'maintenance'],['planned',data.jobs.filter(j=>j.status==='scheduled').length,'maintenance'],['review',alerts.length,'energy'],['total',money(data.jobs.reduce((sum,j)=>sum+cost(j),0)),'costs']] as const).map(([key,value,p])=><div className="app-stat" key={key}><div className="stat-label"><Icon name={icons[p]||'wrench'}/>{t(key)}</div><strong>{value}</strong><button className="app-textbutton" onClick={()=>navigate(p)}>{t(p)}</button></div>)}</div><div className="app-grid"><section className="panel"><div className="app-sectionhead"><h2>{t('jobs')}</h2><button className="app-textbutton" onClick={()=>navigate('maintenance')}>{t('maintenance')}</button></div>{jobTable(data.jobs.slice(-5).reverse())}</section><section className="panel"><h2>{t('next')}</h2><ul className="app-schedule">{data.jobs.filter(j=>j.status==='scheduled'||j.status==='progress').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(j=><li key={j.id}><div className="app-datebox"><b>{j.date.slice(-2)}</b>{j.date.slice(5,7)}</div><div><b>{text(j.equipment)}</b><p>{text(j.site)}</p><p>{j.tech} · {date(j.date)}</p>{badge(j)}</div></li>)}</ul></section></div></>;

  if(page==='maintenance'||page==='costs'){const rows=allowedJobs.filter(j=>(!filter||j.status===filter)&&[j.id,text(j.site),text(j.equipment),text(j.problem),j.tech].join(' ').toLowerCase().includes(search.toLowerCase()));return <>{page==='costs'&&<p className="callout info">{t('costHint')}</p>}<div className="app-toolbar"><div className="field"><label htmlFor="search">{t('search')}</label><input id="search" type="search" value={search} onChange={e=>{setSearch(e.target.value);setListPage(0)}}/></div><div className="field small-field"><label htmlFor="filter">{t('filter')}</label><select id="filter" value={filter} onChange={e=>{setFilter(e.target.value);setListPage(0)}}><option value="">{t('all')}</option>{statuses.map(s=><option key={s} value={s}>{t(s)}</option>)}</select></div></div>{jobTable(rows.slice(listPage*8,listPage*8+8),page==='costs')}{pagination(rows.length)}</>}

  if(page==='reports')return <><div className="app-toolbar"><div className="field"><label htmlFor="report-job">{t('job')}</label><select id="report-job" value={chosen?.id} onChange={e=>setSelected(e.target.value)}>{data.jobs.map(j=><option key={j.id} value={j.id}>{text(j.problem)} · {text(j.site)}</option>)}</select></div><button className="btn" disabled={busy||!chosen} onClick={exportPdf}>{t('download')}</button>{STATIC_DEMO&&<button className="btn secondary" onClick={()=>setModal({type:'reset'})}>{t('reset')}</button>}<button className="btn secondary" onClick={()=>window.print()}>{t('export')}</button><p className="app-subtle">{t('printHelp')}</p></div>{chosen?report(chosen):<p>{t('noData')}</p>}</>;

  const max=Math.max(200,...data.readings.map(r=>r.value)),x=(i:number)=>40+i*530/Math.max(1,data.readings.length-1),y=(value:number)=>200-value*180/max;

  return <><div className="energy-roadmap"><strong>{extra('Coming next: energy optimization','Demnächst: Energieoptimierung')}</strong>{extra('Planned algorithms will support consumption analysis, unusual-pattern investigation and optimization recommendations. These features are in development.','Geplante Algorithmen sollen Verbrauchsanalysen, die Untersuchung auffälliger Muster und Optimierungsvorschläge unterstützen. Diese Funktionen sind in Entwicklung.')}</div><div className="callout warning"><div><strong>{t('warning')}</strong>{t('readingHelp')}</div></div><div className="app-grid equal"><section className="panel"><h2>{t('energyTitle')} · {extra('North Office meter','Zähler Büro Nord')}</h2>{data.readings.length?<svg className="app-chart" role="img" aria-labelledby="chart-title chart-description" viewBox="0 0 600 240"><title id="chart-title">{t('daily')}</title><desc id="chart-description">{t('baselineHelp')} {t('daily')}: {data.readings.length}. {lang==='de'?'Alle Werte stehen in der Tabelle unter dem Diagramm.':'All values are available in the table below the chart.'}</desc><path className="grid" d="M40 20V200H570M40 110H570"/><text x="0" y="24">{num(max)}</text><text x="0" y="114">{num(max/2)}</text><text x="20" y="204">0</text>{baseline!==null&&<path className="baseline" d={`M40 ${y(baseline)}H570`}/>}<polyline className="measured" points={data.readings.map((r,i)=>`${x(i)},${y(r.value)}`).join(' ')}/>{data.readings.map((r,i)=><circle key={r.date} cx={x(i)} cy={y(r.value)} r="4"/>)}<text x="40" y="230">{date(data.readings[0].date)}</text><text x="570" y="230" textAnchor="end">{date(data.readings.at(-1)!.date)}</text></svg>:<p>{t('noData')}</p>}<div className="legend"><span><i/>{t('measured')}</span><span><i className="dashed"/>{t('baseline')}: {baseline===null?'—':num(baseline)+' kWh'}</span></div><p className="app-subtle">{t('baselineHelp')}</p><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);commit({...data,threshold:Number(f.get('threshold'))})}} className="app-toolbar"><div className="field small-field"><label htmlFor="threshold">{t('threshold')}</label><input id="threshold" name="threshold" type="number" min="0" max="1000" step="0.1" defaultValue={data.threshold} key={data.threshold} required/></div><button className="btn secondary">{t('save')}</button></form><div className="table-scroll" role="region" tabIndex={0} aria-label={t('daily')}><table className="spec-table"><thead><tr><th scope="col">{lang==='de'?'Datum':'Date'}</th><th scope="col">kWh</th><th scope="col">{t('status')}</th></tr></thead><tbody>{data.readings.slice(-30).map(r=><tr key={r.date}><td>{date(r.date)}</td><td>{num(r.value)}</td><td>{baseline!==null&&r.value>baseline*(1+data.threshold/100)?<span className="tag warning">{t('review')} {baseline>0?`+${num((r.value-baseline)/baseline*100)}%`:''}</span>:'—'}</td></tr>)}</tbody></table></div><p className="app-subtle spaced">{lang==='de'?'Bis zu 30 letzte Werte angezeigt.':'Up to 30 most recent readings shown.'}</p></section><div className="grid gap-6"><section className="panel"><h2>{extra('Ventilation review','Lüftungsprüfung')}</h2>{energyComparison(data.jobs.find(j=>j.id==='J-041')!)}</section><section className="panel"><h2>{t('import')}</h2><p className="app-subtle">{t('csvHelp')}</p><input ref={csv} type="file" hidden accept=".csv,text/csv" aria-label={t('import')} onChange={e=>onCsv(e.target.files?.[0])}/><button className="btn secondary" onClick={()=>csv.current?.click()}>{t('import')}</button><p className="spaced"><a href={asset('example-readings.csv')} download>{lang==='de'?'CSV-Beispiel herunterladen':'Download CSV example'}</a></p></section></div></div></>;

 }

 const navigation:Page[]=STATIC_DEMO?['dashboard','maintenance','planning','energy','costs','reports']:role==='admin'||role==='manager'?['dashboard','maintenance','planning','energy','costs','reports']:['maintenance','planning'];

 const label=(p:Page)=>p==='collaboration'?extra('Collaboration','Zusammenarbeit'):p==='admin'?extra('Team administration','Teamverwaltung'):p==='planning'?extra('Planning','Planung'):t(p);

 const roleLabel=STATIC_DEMO?extra('Example data','Beispieldaten'):role==='admin'?'Admin':role==='student'?extra('Student','Studierende'):t(role);

 const [notifications,setNotifications]=useState<{id:number;message:string;read:boolean}[]>([]);

 useEffect(()=>{if(STATIC_DEMO||!signedIn){setNotifications([]);return}const refresh=()=>all('notifications/').then(rows=>setNotifications(rows.map(v=>({id:v.id,message:v.message,read:v.read})))).catch(()=>{});void refresh();const timer=setInterval(refresh,60000);return()=>clearInterval(timer)},[signedIn]);

 const modalJob=modal?.id?data.jobs.find(j=>j.id===modal.id):undefined;

 if(!ready)return <div className="app-main" role="status">{t('load')}</div>;

 if(!signedIn)return <ServerLogin lang={lang} setLang={setLang} onLogin={(r,name,username)=>{setSearch('');setFilter('');setListPage(0);setFeedback('');setAccountUsername(username);setIdentity(name);setRole(r);setPage(r==='technician'||r==='student'?'maintenance':'dashboard');setSignedIn(true)}} dark={dark} toggleDark={()=>setDark(v=>!v)}/>;

 return <>{!STATIC_DEMO&&<WorkspaceWelcome lang={lang} setLang={setLang} onChange={refreshScope} onMode={mode=>setExampleMode(mode==='demo')}/>}<a className="skip" href="#content">{t('skip')}</a><div className={`app-frame ${collapsed?'collapsed':''}`}><aside className="app-sidebar" id="navigation"><div className="sidebar-brandrow"><button className="sidebar-logo" aria-label={collapsed?extra('Expand navigation','Navigation ausklappen'):extra('Collapse navigation','Navigation einklappen')} title={collapsed?extra('Expand navigation','Navigation ausklappen'):extra('Collapse navigation','Navigation einklappen')} aria-expanded={!collapsed} aria-controls="sidebar-links" onClick={()=>setCollapsed(v=>!v)}><span className="sidebar-logo-art"><Mark/><svg className="logo-expand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span><span className="sidebar-brandname">SmartOps 360</span></button><button className="sidebar-fold" aria-label={extra('Collapse navigation','Navigation einklappen')} title={extra('Collapse navigation','Navigation einklappen')} onClick={()=>setCollapsed(true)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button></div><nav id="sidebar-links" aria-label={t('navigation')}>{navigation.map(p=><button key={p} aria-label={label(p)} title={collapsed?label(p):undefined} aria-current={page===p?'page':undefined} onClick={()=>navigate(p)}><Icon name={icons[p]}/><span className="nav-label">{label(p)}</span></button>)}</nav><div className="app-sidefoot account-footer">{role==='admin'&&!STATIC_DEMO&&<div className="sidebar-administration"><p className="utility-heading">{extra('Administration','Verwaltung')}</p><nav aria-label={extra('Administration','Verwaltung')}>{(['admin','collaboration'] as Page[]).map(p=><button key={p} aria-label={label(p)} title={collapsed?label(p):undefined} aria-current={page===p?'page':undefined} onClick={()=>navigate(p)}><Icon name={icons[p]}/><span className="nav-label">{label(p)}</span></button>)}</nav></div>}<div className="sidebar-account-info"><span className="account-name">{identity}</span><span>{roleLabel}</span></div>{STATIC_DEMO?<p className="browser-save-note">{extra('Saved in this browser','Gespeichert in diesem Browser')}</p>:<div className="account-actions"><button className="account-button" aria-label={extra('My profile','Mein Profil')} title={extra('My profile','Mein Profil')} onClick={()=>setProfileOpen(true)}><ControlIcon name="profile"/><span>{extra('My profile','Mein Profil')}</span></button><button className="account-button" aria-label={extra('Sign out','Abmelden')} title={extra('Sign out','Abmelden')} onClick={signOut}><ControlIcon name="logout"/><span>{extra('Sign out','Abmelden')}</span></button></div>}</div></aside><div className="app-workspace"><header className="app-topbar"><p>{extra('Your team. Your work. One place.','Ihr Team. Ihre Aufgaben. Ein Ort.')}</p><div className="app-controls"><ThemeToggle dark={dark} lang={lang} onToggle={()=>setDark(v=>!v)}/><label htmlFor="language">{t('language')}<select id="language" value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="en">English</option><option value="de">Deutsch</option></select></label>{!STATIC_DEMO&&<button className="bell-button" aria-label={extra('Notifications','Mitteilungen')} title={extra('Notifications','Mitteilungen')} aria-haspopup="dialog" onClick={()=>setInbox(true)}><ControlIcon name="bell"/>{notifications.some(n=>!n.read)&&<span className="unread-dot"/>}</button>}</div></header><main className="app-main" id="content" ref={main} tabIndex={-1}>{storageError&&<p className="callout error" role="alert">{t('storageError')}</p>}<div className="app-heading"><div><h1>{(role==='technician'||role==='student')&&page==='maintenance'?t('assigned'):label(page)}</h1><p>{STATIC_DEMO?extra('Fictional examples · changes are saved in this browser.','Fiktive Beispiele · Änderungen werden in diesem Browser gespeichert.'):role==='technician'?identity:t(page==='reports'?'reportHint':'intro')}</p></div>{(role==='manager'||role==='admin')&&page==='maintenance'&&<button className="btn" onClick={()=>setModal({type:'new'})}><Icon name="plus"/>{t('newJob')}</button>}{(role==='manager'||role==='admin')&&page==='energy'&&<button className="btn" onClick={()=>setModal({type:'reading'})}>{t('addReading')}</button>}</div><dialog className="notification-drawer" ref={drawer} onCancel={()=>setInbox(false)} aria-labelledby="notification-title"><section><h2 className="sr-only" id="notification-title">{extra('Notifications','Mitteilungen')}</h2><div className="app-sectionhead"><h2>{extra('Notifications','Mitteilungen')}</h2><button className="app-textbutton" onClick={()=>setInbox(false)}>{extra('Close','Schließen')}</button></div>{notifications.length?notifications.map(n=><button className="notice" key={n.id} onClick={async()=>{try{await api('notifications/'+n.id+'/','PATCH',{read:true});setNotifications(v=>v.map(item=>item.id===n.id?{...item,read:true}:item))}catch(e){notify(String(e))}}}><b>{n.message}</b><small>{n.read?extra('Read','Gelesen'):extra('Mark as read','Als gelesen markieren')}</small></button>):<p>{extra('You are up to date.','Sie sind auf dem neuesten Stand.')}</p>}</section></dialog><div key={scopeRevision}>{content()}</div><footer className="app-footer">SmartOps 360</footer></main></div></div><dialog className="profile-dialog" ref={profileDialog} onCancel={()=>setProfileOpen(false)} aria-labelledby="profile-title"><div className="app-sectionhead"><h2 id="profile-title">{extra('My profile','Mein Profil')}</h2><button className="app-textbutton" onClick={()=>setProfileOpen(false)}>{extra('Close','Schließen')}</button></div><button className="btn secondary" onClick={()=>{setProfileOpen(false);window.dispatchEvent(new Event('smartops:welcome'))}}>{extra('Getting started','Einführung')}</button><dl className="profile-details"><div><dt>{extra('Full name','Vollständiger Name')}</dt><dd>{identity}</dd></div><div><dt>{extra('Role','Rolle')}</dt><dd>{roleLabel}</dd></div><div><dt>{extra('Username','Benutzername')}</dt><dd>{accountUsername}</dd></div><div><dt>{extra('Interface language','Oberflächensprache')}</dt><dd>{lang==='de'?'Deutsch':'English'}</dd></div>{role==='student'&&identity==='Emilia Hoffmann'&&<div><dt>{extra('Learning path','Bildungsweg')}</dt><dd>Ausbildung</dd></div>}</dl></dialog><dialog ref={dialog} onCancel={()=>setModal(null)} aria-labelledby="dialog-title">{modal&&<Editor key={modal.type+(modal.id||'')} modal={modal} job={modalJob} data={data} role={role} identity={identity} lang={lang} onCancel={()=>setModal(null)} onSave={next=>{if('jobs' in next)commit(next);else updateJob(next);setModal(null);setSearch('');setFilter('');setListPage(0)}}/>}</dialog>{feedback&&<div className="toast" role="status">{feedback}</div>}</>;

}



function Editor({modal,job,data,role,identity,lang,onCancel,onSave}:{modal:NonNullable<Modal>;job?:Job;data:Data;role:Role;identity:string;lang:Lang;onCancel:()=>void;onSave:(next:Data|Job)=>void}){

 const t=(k:keyof typeof words.en)=>words[lang][k],local=(v:LocalText)=>v[lang==='de'?1:0];

 const [error,setError]=useState(''),[date,setDate]=useState(job?.date||new Date().toISOString().slice(0,10)),[specialty,setSpecialty]=useState<Job['specialty']>(job?.specialty||'hvac');

 const [tech,setTech]=useState(job?.tech||'');

 const candidates=technicians().filter(v=>!v.specialty||v.specialty===specialty);const candidate=candidates[0]?.name||'';

 const field=(key:'site'|'equipment'|'problem'|'budget'|'rate'|'parts'|'travel'|'hours'|'consumption',value:string|number,type='text',required=true)=><div className="field"><label htmlFor={'f-'+key}>{t(key)}</label><input id={'f-'+key} name={key} defaultValue={value} type={type} required={required} min={type==='number'?0:undefined} max={type==='number'?1e7:undefined} step={type==='number'?'0.01':undefined} maxLength={type==='text'?200:undefined}/></div>;

 const submit=(ev:FormEvent<HTMLFormElement>)=>{ev.preventDefault();setError('');const f=new FormData(ev.currentTarget);const get=(k:string)=>String(f.get(k)||'').trim();

  if(modal.type==='reset'){onSave(original());return}

  if(modal.type==='new'){if(!['site','equipment','problem'].every(k=>get(k))||!validDate(date)){setError(t('required'));return}if(data.jobs.length>=1000){setError(lang==='de'?'Demolimit erreicht: 1000 Aufträge.':'Demo limit reached: 1000 jobs.');return}const id=`J-${String(Math.max(40,...data.jobs.map(j=>Number(j.id.slice(2))))+1).padStart(3,'0')}`;onSave({...data,jobs:[...data.jobs,{id,site:[get('site'),get('site')],equipment:[get('equipment'),get('equipment')],problem:[get('problem'),get('problem')],date,status:'open',tech:'',specialty,repair:['',''],hours:0,rate:0,parts:0,travel:0,budget:Number(get('budget'))}]});return}

  if(modal.type==='reading'){if(!validDate(date)||data.readings.some(r=>r.date===date)||data.readings.length>=5000){setError(t('invalid'));return}onSave({...data,readings:[...data.readings,{date,value:Number(get('consumption'))}].sort((a,b)=>a.date.localeCompare(b.date))});return}

  if(!job)return;

  if(modal.type==='cost'){onSave({...job,budget:Number(get('budget')),rate:Number(get('rate')),parts:Number(get('parts')),travel:Number(get('travel'))});return}

  if(false)return;

  const status=get('status') as Status;const technician=(role==='manager'||role==='admin')?tech:job.tech;

  if(!validDate(date)){setError(t('required'));return}

  if(status!=='open'&&!technician){setError(t('noMatch'));return}

  if((role==='manager'||role==='admin')&&technician&&!candidates.some(v=>v.name===technician)&&job.status!=='completed'){setError(t('noMatch'));return}

  if(status==='completed'&&!get('repair')){setError(t('workRequired'));return}

  const repair=get('repair')===local(job.repair)?job.repair:[get('repair'),get('repair')] as LocalText;

  onSave({...job,studentIds:(role==='admin'||role==='manager')?f.getAll('students').map(Number):job.studentIds,date,status,tech:technician,hours:Number(get('hours')),repair});

 };

 if(role==='student'&&job)return <section><h2 id="dialog-title">{local(job.problem)}</h2><dl className="app-details"><div><dt>{t('site')}</dt><dd>{local(job.site)}</dd></div><div><dt>{t('date')}</dt><dd>{date}</dd></div><div><dt>{t('technicianName')}</dt><dd>{job.tech}</dd></div><div><dt>{t('status')}</dt><dd>{t(job.status)}</dd></div></dl><h3>{t('repair')}</h3><p>{local(job.repair)||'—'}</p><p className="app-subtle">{lang==='de'?'Schreibgeschützte Lernansicht.':'Read-only learning view.'}</p><button className="btn secondary" onClick={onCancel}>{t('cancel')}</button></section>;

 return <form onSubmit={submit}><h2 id="dialog-title">{t(modal.type==='new'?'newJob':modal.type==='cost'?'edit':modal.type==='reading'?'addReading':modal.type==='reset'?'reset':'job')}{job?' · '+local(job.problem):''}</h2>{modal.type==='reset'?<p>{t('resetConfirm')}</p>:<><div className="form-grid">{modal.type==='new'&&<>{field('site','')}{field('equipment','')}{field('problem','')}{field('budget',0,'number')}<div className="field"><label htmlFor="f-specialty">{t('specialty')}</label><select id="f-specialty" value={specialty} onChange={e=>setSpecialty(e.target.value as Job['specialty'])}><option value="hvac">{t('hvac')}</option><option value="electrical">{t('electrical')}</option></select></div></>}{(modal.type==='new'||modal.type==='reading'||modal.type==='job'&&(role==='manager'||role==='admin'))&&<div className="field"><label htmlFor="f-date">{t('date')}</label><input id="f-date" type="date" required value={date} onChange={e=>{setDate(e.target.value);setTech('')}}/></div>}{modal.type==='reading'&&field('consumption',100,'number')}{modal.type==='cost'&&job&&<>{field('budget',job.budget,'number')}{field('rate',job.rate,'number')}{field('parts',job.parts,'number')}{field('travel',job.travel,'number')}</>}{modal.type==='job'&&job&&<><div className="span-two app-subtle">{local(job.site)} · {local(job.equipment)} · {local(job.problem)}{role==='technician'&&<p>{t('date')}: {date}</p>}</div><div className="field"><label htmlFor="f-status">{t('status')}</label><select id="f-status" name="status" defaultValue={job.status}>{((role==='manager'||role==='admin')?statuses:[...new Set<Status>([job.status,'progress','completed'])]).map(s=><option key={s} value={s}>{t(s)}</option>)}</select></div>{field('hours',job.hours,'number')}<div className="field span-two"><label htmlFor="f-repair">{t('repair')}</label><textarea id="f-repair" name="repair" maxLength={2000} defaultValue={local(job.repair)}/></div>{(role==='manager'||role==='admin')&&<div className="field span-two"><label htmlFor="f-tech">{t('technicianName')}</label><select id="f-tech" value={tech} onChange={e=>setTech(e.target.value)}><option value="">{t('none')}</option>{candidates.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}{job.tech&&job.tech!==candidate&&job.status==='completed'&&<option value={job.tech}>{job.tech}</option>}</select><label htmlFor="f-students">{lang==='de'?'Lernaufgaben zuweisen':'Assign learning tasks'}</label><select id="f-students" name="students" multiple defaultValue={(job.studentIds||[]).map(String)}>{students().map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select><p className="app-recommend">{t('recommend')}<br/>{candidate?`${t('availability')}: ${candidate}`:t('noMatch')}</p></div>}</>}</div>{modal.type==='cost'&&<p className="app-subtle spaced">{t('costHint')}</p>}{modal.type==='reading'&&<p className="app-subtle spaced">{t('readingHelp')}</p>}</>}{error&&<p className="app-form-error" role="alert">{error}</p>}<div className="actions"><button className="btn secondary" type="button" onClick={onCancel}>{t('cancel')}</button><button className="btn" type="submit">{t(modal.type==='reset'?'confirm':'save')}</button></div></form>

}

























