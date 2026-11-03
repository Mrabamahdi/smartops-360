import {api,all,type RecordData} from './api';import type {Data,Job} from './domain';
const STATIC_DEMO=import.meta.env.VITE_STATIC_DEMO==='true';
let learning:RecordData[]=STATIC_DEMO?[{id:1,name:'Mia Keller'},{id:2,name:'Jonas Berg'},{id:3,name:'Nora Weiss'}]:[];export const students=()=>learning;
let roster:RecordData[]=STATIC_DEMO?[{id:1,name:'Lena Weber',specialty:'hvac'},{id:2,name:'Tom Fischer',specialty:'electrical'},{id:3,name:'Eva Schmidt',specialty:'hvac'}]:[];let source:RecordData[]=[];
export const technicians=()=>roster;
export async function loadServer(role:string):Promise<Data>{
 const jobs=await all('jobs/');source=jobs;
 learning=['admin','manager'].includes(role)?await all('students/'):[];
 roster=['admin','manager'].includes(role)?await all('technicians/'):[];
 return {jobs:jobs.map(v=>({studentIds:v.students,id:'J-'+v.id,site:[v.site,v.site],equipment:[v.equipment,v.equipment],problem:[v.problem,v.problem],repair:[v.repair,v.repair],date:v.date,status:v.status,tech:v.technician_name||'',specialty:v.specialty||'hvac',hours:Number(v.hours),rate:Number(v.rate||0),parts:Number(v.parts||0),travel:Number(v.travel||0),budget:Number(v.budget||0)})),readings:[],threshold:0};
}
export async function saveServer(next:Data,previous:Data,role:string){
 for(const job of next.jobs){const old=previous.jobs.find(v=>v.id===job.id);if(JSON.stringify(old)===JSON.stringify(job))continue;
 const values:RecordData={students:job.studentIds||[],site:job.site[0],equipment:job.equipment[0],problem:job.problem[0],repair:job.repair[0],date:job.date,status:job.status,hours:job.hours,rate:job.rate,parts:job.parts,travel:job.travel,budget:job.budget,specialty:job.specialty,technician:job.tech?roster.find(v=>v.name===job.tech)?.id:null};
 if(old)values.expected_updated_at=source.find(v=>'J-'+v.id===old.id)?.updated_at;
 if(role==='technician'){for(const k of Object.keys(values))if(!['repair','hours','status','expected_updated_at'].includes(k))delete values[k]}
 await api('jobs/'+(old?job.id.slice(2)+'/':''),old?'PATCH':'POST',values);
 }
}
