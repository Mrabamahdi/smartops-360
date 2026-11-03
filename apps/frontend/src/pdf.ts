import type {Job} from './domain';
/** Runs only after a user requests a PDF; the PDF library is a separate lazy chunk. */
export async function downloadReport(job:Job,language:string,lines:string[],title:string){
 const {jsPDF}=await import('jspdf');
 const doc=new jsPDF();
 const response=await fetch(import.meta.env.BASE_URL+'assets/fonts/Poppins-Regular.ttf');
 if(!response.ok)throw Error('font');
 const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 doc.addFileToVFS('Poppins.ttf',btoa(binary));doc.addFont('Poppins.ttf','Poppins','normal');doc.setFont('Poppins');
 let y=24,page=1;const header=()=>{doc.setTextColor('#244C91');doc.setFontSize(18);doc.text('SmartOps 360',18,18);doc.setDrawColor('#244C91');doc.line(18,23,192,23);y=33};
 const footer=()=>{doc.setFontSize(8);doc.setTextColor('#50617D');doc.text(`${job.id} | ${language.toUpperCase()} | ${page}`,18,285)};
 header();doc.setFontSize(14);doc.text(title,18,y);y+=12;doc.setFontSize(10);doc.setTextColor('#1E2B43');
 for(const line of lines){for(const wrapped of doc.splitTextToSize(line,174) as string[]){if(y>270){footer();doc.addPage();page++;header();doc.setFontSize(10);doc.setTextColor('#1E2B43')}doc.text(wrapped,18,y);y+=6}y+=3}footer();doc.save(`SmartOps-${job.id}-${language}.pdf`);
}
