export class ApiError extends Error { constructor(public status:number, message:string){super(message);this.name='ApiError'} }
export type RecordData=Record<string,any>;
export async function api(path:string,method='GET',body?:unknown):Promise<any>{
 let token='';if(method!=='GET'){const r=await fetch('/api/auth/csrf/');if(!r.ok)throw new ApiError(r.status,'Server unavailable / Server nicht erreichbar');token=(await r.json()).csrfToken}
 const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRFToken':token},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new ApiError(response.status,JSON.stringify(result));return result;
}
export async function all(path:string):Promise<RecordData[]>{let rows:RecordData[]=[];let next:string|null=path;while(next){const page=await api(next);rows=rows.concat(page.results);next=page.next?new URL(page.next,location.origin).pathname.replace('/api/','')+new URL(page.next,location.origin).search:null}return rows}
