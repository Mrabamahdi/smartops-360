import seed from './fixtures/demo-jobs.json';
export type Lang='en'|'de';
export type Status='open'|'scheduled'|'progress'|'completed';
export type Page='dashboard'|'maintenance'|'energy'|'costs'|'reports'|'admin'|'planning'|'collaboration';
export type LocalText=[string,string];
export interface Job {studentIds?:number[];id:string;site:LocalText;equipment:LocalText;problem:LocalText;date:string;status:Status;tech:string;specialty:'hvac'|'electrical';repair:LocalText;hours:number;rate:number;parts:number;travel:number;budget:number}
export interface Reading {date:string;value:number}
export interface Data {jobs:Job[];readings:Reading[];threshold:number}
const additionalExamples:Job[]=[
 {id:'J-044',site:['West Office','Büro West'],equipment:['Boiler B-01','Heizkessel B-01'],problem:['Heating pressure drops overnight','Heizungsdruck fällt über Nacht'],date:'2026-10-29',status:'completed',tech:'Lena Weber',specialty:'hvac',repair:['Expansion vessel checked and pressure restored.','Ausdehnungsgefäß geprüft und Druck wiederhergestellt.'],hours:1.5,rate:68,parts:42,travel:18,budget:220},
 {id:'J-045',site:['Workshop','Werkstatt'],equipment:['Compressor C-03','Kompressor C-03'],problem:['Compressor cycles too often','Kompressor schaltet zu häufig'],date:'2026-10-30',status:'progress',tech:'Tom Fischer',specialty:'electrical',repair:['Control relay inspection in progress.','Prüfung des Steuerrelais läuft.'],hours:2,rate:72,parts:0,travel:12,budget:360},
 {id:'J-046',site:['East Office','Büro Ost'],equipment:['Pump P-04','Pumpe P-04'],problem:['Unusual vibration during start-up','Ungewöhnliche Vibration beim Start'],date:'2026-11-03',status:'scheduled',tech:'Lena Weber',specialty:'hvac',repair:['',''],hours:0,rate:68,parts:0,travel:0,budget:300},
 {id:'J-047',site:['North Office','Büro Nord'],equipment:['Lighting L-12','Beleuchtung L-12'],problem:['Several corridor lights are out','Mehrere Flurleuchten sind ausgefallen'],date:'2026-11-04',status:'open',tech:'',specialty:'electrical',repair:['',''],hours:0,rate:72,parts:0,travel:0,budget:180},
 {id:'J-048',site:['Warehouse','Lager'],equipment:['Ventilation V-06','Lüftung V-06'],problem:['Filter change is due','Filterwechsel ist fällig'],date:'2026-11-05',status:'scheduled',tech:'Lena Weber',specialty:'hvac',repair:['',''],hours:0,rate:68,parts:0,travel:0,budget:145},
 {id:'J-049',site:['Workshop','Werkstatt'],equipment:['Distribution board DB-02','Verteiler DB-02'],problem:['Label two unmarked circuits','Zwei unbeschriftete Stromkreise kennzeichnen'],date:'2026-11-06',status:'open',tech:'',specialty:'electrical',repair:['',''],hours:0,rate:72,parts:0,travel:0,budget:210},
 {id:'J-050',site:['East Office','Büro Ost'],equipment:['Cooling unit AC-02','Kühlgerät AC-02'],problem:['Cooling response is slower than usual','Kühlleistung ist langsamer als üblich'],date:'2026-11-07',status:'open',tech:'',specialty:'hvac',repair:['',''],hours:0,rate:68,parts:0,travel:0,budget:420},
 {id:'J-051',site:['North Office','Büro Nord'],equipment:['Door controller D-03','Türsteuerung D-03'],problem:['Door sensor needs adjustment','Türsensor muss justiert werden'],date:'2026-11-08',status:'completed',tech:'Tom Fischer',specialty:'electrical',repair:['Sensor position adjusted and operation confirmed.','Sensorposition angepasst und Funktion bestätigt.'],hours:0.75,rate:72,parts:0,travel:0,budget:120},
 {id:'J-052',site:['Warehouse','Lager'],equipment:['Radiator R-08','Heizkörper R-08'],problem:['Radiator does not warm evenly','Heizkörper wird ungleichmäßig warm'],date:'2026-11-09',status:'open',tech:'',specialty:'hvac',repair:['',''],hours:0,rate:68,parts:0,travel:0,budget:160},
 {id:'J-053',site:['West Office','Büro West'],equipment:['Emergency lighting EL-01','Notbeleuchtung EL-01'],problem:['Monthly function check','Monatliche Funktionsprüfung'],date:'2026-11-10',status:'scheduled',tech:'Tom Fischer',specialty:'electrical',repair:['',''],hours:0,rate:72,parts:0,travel:0,budget:95},
 {id:'J-054',site:['Workshop','Werkstatt'],equipment:['Water heater WH-02','Warmwassergerät WH-02'],problem:['Inspect temperature fluctuation','Temperaturschwankung prüfen'],date:'2026-11-11',status:'open',tech:'',specialty:'hvac',repair:['',''],hours:0,rate:68,parts:0,travel:0,budget:250},
 {id:'J-055',site:['East Office','Büro Ost'],equipment:['Pump P-01','Pumpe P-01'],problem:['Routine seal inspection','Regelmäßige Dichtungsprüfung'],date:'2026-11-12',status:'scheduled',tech:'Lena Weber',specialty:'hvac',repair:['',''],hours:0,rate:68,parts:0,travel:0,budget:135},
];
export const original=():Data=>structuredClone({...seed,jobs:[...seed.jobs,...additionalExamples],threshold:20}) as Data;
export const statuses:Status[]=['open','scheduled','progress','completed'];
export const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export const cost=(j:Job)=>Math.round((j.hours*j.rate+j.parts+j.travel)*100)/100;
const numeric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e7;
const text=(v:unknown):v is LocalText=>Array.isArray(v)&&v.length===2&&v.every(x=>typeof x==='string'&&x.length<=4000);
export function validData(v:unknown):v is Data {
 if(!v||typeof v!=='object')return false;const d=v as Data;
 return Array.isArray(d.jobs)&&d.jobs.length<=1000&&d.jobs.every(j=>j&&typeof j.id==='string'&&/^J-\d+$/.test(j.id)&&text(j.site)&&text(j.equipment)&&text(j.problem)&&text(j.repair)&&validDate(j.date)&&statuses.includes(j.status)&&['hvac','electrical'].includes(j.specialty)&&typeof j.tech==='string'&&j.tech.length<100&&[j.hours,j.rate,j.parts,j.travel,j.budget].every(numeric))&&new Set(d.jobs.map(j=>j.id)).size===d.jobs.length&&Array.isArray(d.readings)&&d.readings.length<=5000&&d.readings.every(r=>r&&validDate(r.date)&&numeric(r.value))&&new Set(d.readings.map(r=>r.date)).size===d.readings.length&&numeric(d.threshold)&&d.threshold<=1000;
}
export const storageKey='smartops360.frontend.v1';
export function load():{data:Data;error:boolean}{try{const raw=localStorage.getItem(storageKey);if(!raw)return {data:original(),error:false};const parsed:unknown=JSON.parse(raw);if(!validData(parsed))throw Error('Invalid demo data');return {data:parsed,error:false}}catch{return {data:original(),error:true}}}
export function reference(readings:Reading[]){const rows=readings.filter(r=>['2026-10-21','2026-10-22','2026-10-23'].includes(r.date));return rows.length===3?rows.reduce((s,r)=>s+r.value,0)/3:null}
export function comparison(j:Job,readings:Reading[]){
 if(j.id!=='J-041'||j.date!=='2026-10-27'||j.status!=='completed')return null;
 const before=readings.filter(r=>r.date>='2026-10-24'&&r.date<='2026-10-26'),after=readings.filter(r=>r.date>='2026-10-28'&&r.date<='2026-10-30');
 if(before.length!==3||after.length!==3)return null;
 const a=before.reduce((s,r)=>s+r.value,0),b=after.reduce((s,r)=>s+r.value,0);return {before:a,after:b,diff:b-a,percent:a===0?null:(b-a)/a*100};
}
export function available(data:Data,specialty:Job['specialty'],date:string,exclude=''){const tech=specialty==='hvac'?'Lena Weber':'Tom Fischer';return data.jobs.some(j=>j.id!==exclude&&j.tech===tech&&j.date===date&&j.status!=='completed')?'':tech}
/** Atomic CSV import: parse quoted fields and either comma or semicolon delimiters. */
export function importCsv(source:string,existing:Reading[]):Reading[]{
 const input=source.replace(/^\uFEFF/,'').trim();const first=input.split(/\r?\n/)[0];const separator=first.includes(';')?';':',';const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++}else if(!quoted&&cell.length)throw Error('CSV');else quoted=!quoted}else if(!quoted&&(c===separator||c==='\n'||c==='\r')){row.push(cell.trim());cell='';if(c!==separator){if(c==='\r'&&input[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[]}}else cell+=c}
 if(quoted)throw Error('CSV');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 if(rows.length<2||rows.length>5001||rows[0].length!==2||rows[0][0].toLowerCase()!=='date'||rows[0][1].toLowerCase()!=='kwh')throw Error('CSV');
 const dates=new Set(existing.map(r=>r.date));const added=rows.slice(1).map(r=>{if(r.length!==2||!validDate(r[0])||!/^\d+(\.\d+)?$/.test(r[1])||!numeric(Number(r[1]))||dates.has(r[0]))throw Error('CSV');dates.add(r[0]);return {date:r[0],value:Number(r[1])}});
 if(existing.length+added.length>5000)throw Error('CSV');return [...existing,...added].sort((a,b)=>a.date.localeCompare(b.date));
}

