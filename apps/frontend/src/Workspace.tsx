

import {useState} from 'react';

import type {Job,Lang} from './domain';

export type Role='admin'|'manager'|'technician'|'student';

type Person={name:string;role:Role;path:string;active:boolean;specialty?:string};

const initial:Person[]=[{name:'Anna Berger',role:'admin',path:'employee',active:true},{name:'Martin Keller',role:'manager',path:'employee',active:true},{name:'Lena Weber',role:'technician',path:'employee',active:true},{name:'Tom Fischer',role:'technician',path:'employee',active:true},{name:'Emilia Hoffmann',role:'student',path:'apprentice',active:true},{name:'Jonas Wagner',role:'student',path:'dual',active:true}];

export function Workspace({page,role,lang,jobs,onJob}:{page:'admin'|'planning';role:Role;lang:Lang;jobs:Job[];onJob:(id:string)=>void}){

 const t=(en:string,de:string)=>lang==='de'?de:en;

 const [people,setPeople]=useState<Person[]>(()=>{try{const value=JSON.parse(localStorage.getItem('smartops-team')||'null');return Array.isArray(value)&&value.every(p=>typeof p.name==='string'&&['admin','manager','technician','student'].includes(p.role)&&typeof p.active==='boolean')?value:initial}catch{return initial}});

 const [category,setCategory]=useState(''),[specialty,setSpecialty]=useState(''),[query,setQuery]=useState('');

 const specialties:Record<string,string>={hvac:t('Heating and ventilation','Heizung und Lüftung'),electrical:t('Electrical engineering','Elektrotechnik'),planning:t('Technical planning','Technische Planung'),operations:t('Operations management','Betriebsführung')};

 const specialtyOf=(p:Person)=>p.specialty|| (p.name==='Tom Fischer'?'electrical':p.role==='admin'||p.role==='manager'?'operations':p.path==='dual'?'planning':'hvac');

 const [adding,setAdding]=useState(false),[error,setError]=useState('');

 const save=(next:Person[])=>{try{localStorage.setItem('smartops-team',JSON.stringify(next));setPeople(next);setError('');return true}catch{setError(t('Could not save. Browser storage is unavailable.','Speichern fehlgeschlagen. Der Browserspeicher ist nicht verfügbar.'));return false}};

 const paths:Record<string,string>={employee:t('Employees','Mitarbeitende'),apprentice:'Ausbildung',dual:'Duales Studium'};

 const roles:Record<Role,string>={admin:'Admin',manager:'Manager',technician:t('Technician','Technik'),student:t('Student','Studierende')};

 if(page==='admin')return role!=='admin'?<p>{t('Admin access required.','Admin-Zugang erforderlich.')}</p>:<><div className="app-sectionhead"><p>{t('People and responsibilities, clearly organized.','Menschen und Zuständigkeiten, klar organisiert.')}</p><button className="btn" onClick={()=>setAdding(v=>!v)}>{t('Add team member','Teammitglied hinzufügen')}</button></div>{adding&&<form className="panel team-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),name=String(f.get('name')||'').trim();if(!name)return;if(!save([...people,{name,role:f.get('role') as Role,path:String(f.get('path')),active:true,specialty:String(f.get('specialty'))}]))return;setQuery('');setCategory(String(f.get('path')));setSpecialty(String(f.get('specialty')));setAdding(false)}}><div className="form-grid"><div className="field"><label htmlFor="person-name">{t('Full name','Vollständiger Name')}</label><input id="person-name" name="name" required maxLength={100}/></div><div className="field"><label htmlFor="person-role">{t('Role','Rolle')}</label><select id="person-role" name="role">{Object.entries(roles).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div><div className="field"><label htmlFor="person-path">{t('Employment or study path','Beschäftigung oder Bildungsweg')}</label><select id="person-path" name="path">{Object.entries(paths).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div><div className="field"><label htmlFor="person-specialty">{t('Specialty','Fachrichtung')}</label><select id="person-specialty" name="specialty">{Object.entries(specialties).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div></div><button className="btn">{t('Save member','Mitglied speichern')}</button></form>}{error&&<p role="alert">{error}</p>}<div className="team-breadcrumb"><button className="app-textbutton" onClick={()=>{setCategory('');setSpecialty('');setQuery('')}}>{t('All groups','Alle Gruppen')}</button>{category&&<><span>/</span><button className="app-textbutton" onClick={()=>{setSpecialty('');setQuery('')}}>{paths[category]}</button></>}{specialty&&<><span>/</span><span>{specialties[specialty]}</span></>}</div>{!category?<div className="group-grid">{Object.entries(paths).map(([key,title])=><button className="panel group-card" key={key} onClick={()=>setCategory(key)}><h2>{title}</h2><p>{people.filter(p=>p.path===key).length} {t('team members','Teammitglieder')}</p><span>{t('Browse specialties','Fachrichtungen ansehen')} →</span></button>)}</div>:!specialty?<div className="group-grid">{Object.entries(specialties).filter(([key])=>people.some(p=>p.path===category&&specialtyOf(p)===key)).map(([key,title])=><button className="panel group-card" key={key} onClick={()=>setSpecialty(key)}><h2>{title}</h2><p>{people.filter(p=>p.path===category&&specialtyOf(p)===key).length} {t('team members','Teammitglieder')}</p><span>{t('View names','Namen ansehen')} →</span></button>)}</div>:<section className="panel"><div className="field"><label htmlFor="team-search">{t('Search names','Namen suchen')}</label><input id="team-search" type="search" value={query} onChange={e=>setQuery(e.target.value)}/></div><p className="app-subtle">{t('Sorted alphabetically by surname','Alphabetisch nach Nachnamen sortiert')}</p><div className="team-list">{people.map((p,i)=>({...p,index:i})).filter(p=>p.path===category&&specialtyOf(p)===specialty&&p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>(a.name.split(' ').at(-1)||a.name).localeCompare(b.name.split(' ').at(-1)||b.name,lang)||a.name.localeCompare(b.name,lang)).map(p=><article className="team-row" key={p.index}><div><h2>{p.name}</h2><p>{roles[p.role]} · {specialties[specialty]}</p></div><span className={p.active?'tag success':'tag neutral'}>{p.active?t('Active','Aktiv'):t('Inactive','Inaktiv')}</span><button className="app-textbutton" onClick={()=>save(people.map((v,j)=>j===p.index?{...v,active:!v.active}:v))}>{p.active?t('Set inactive','Deaktivieren'):t('Activate','Aktivieren')}</button></article>)}</div></section>}</>;

 return <><p className="callout info">{role==='student'&&jobs.length?t('Review your assigned learning tasks with your supervisor.','Lernaufgaben mit Lena Weber. Arbeiten vor Abschluss gemeinsam prüfen.'):role==='student'?t('No learning assignments yet. Your supervisor will assign work.','Noch keine Lernaufgaben. Ihre Betreuung wird Aufgaben zuweisen.'):t('Follow assignments from planning to completion. Open a task to review its details.','Verfolgen Sie Aufgaben von der Planung bis zum Abschluss. Öffnen Sie eine Aufgabe für Details.')}</p><div className="planning-grid">{(['open','scheduled','progress','completed'] as const).map((status,i)=><section className="planning-column" key={status}><h2>{[t('To plan','Zu planen'),t('Scheduled','Geplant'),t('In progress','In Bearbeitung'),t('Completed','Abgeschlossen')][i]} <small>{jobs.filter(j=>j.status===status).length}</small></h2>{jobs.filter(j=>j.status===status).sort((a,b)=>a.date.localeCompare(b.date)).map(j=><article className="panel task" key={j.id}><h3>{j.problem[lang==='de'?1:0]}</h3><p>{j.site[lang==='de'?1:0]}</p><p>{j.tech||t('Not assigned','Nicht zugewiesen')}</p><time dateTime={j.date}>{new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-GB',{dateStyle:'medium'}).format(new Date(j.date+'T12:00:00'))}</time><button className="app-textbutton" onClick={()=>onJob(j.id)}>{t('Open task','Aufgabe öffnen')}</button></article>)}{!jobs.some(j=>j.status===status)&&<p className="app-subtle">{t('No tasks here.','Hier gibt es keine Aufgaben.')}</p>}</section>)}</div></>;

}











