const KEY='mon-cycle-data-v1';
const today=new Date();today.setHours(0,0,0,0);
const iso=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
const fromISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const fmt=(date,opts={day:'numeric',month:'long'})=>new Intl.DateTimeFormat('fr-FR',opts).format(date);
const defaultData=()=>({periods:[],entries:[],expenses:[],cycleLength:28,periodLength:5,moods:{}});
let data;try{data={...defaultData(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{data=defaultData()}
let selectedSymptoms=new Set(),selectedFlow='',selectedImpact='',calendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function persist(){localStorage.setItem(KEY,JSON.stringify(data));render()}
function starts(){return [...new Set(data.periods)].sort()}
function lastStart(){return starts().filter(x=>fromISO(x)<=today).at(-1)||null}
function estimatedNext(){const last=lastStart();if(!last)return null;return new Date(fromISO(last).getTime()+data.cycleLength*86400000)}
function cycleDay(){const last=lastStart();return last?Math.floor((today-fromISO(last))/86400000)+1:null}
function renderHome(){
 const last=lastStart(),next=estimatedNext(),day=cycleDay();
 $('#todayLabel').textContent=fmt(today,{weekday:'long',day:'numeric',month:'long'}).toUpperCase();
 $('#cycleDay').textContent=day?`JOUR ${day} DU CYCLE`:'NOUVEAU SUIVI';
 $('#phasePill').textContent=last&&day<=data.periodLength?'PÉRIODE DE RÈGLES':'APERÇU DU CYCLE';
 $('#forecastLabel').textContent=last?'Prochaines règles estimées':'Prochaines règles estimées';
 $('#forecastDate').textContent=next?fmt(next):'À renseigner';
 $('#forecastSub').textContent=next?'Prévision basée sur la durée moyenne de ton cycle.':'Ajoute tes dernières règles pour commencer.';
 const remain=next?Math.max(0,Math.ceil((next-today)/86400000)):null;
 $('#countdown').textContent=remain===null?'—':remain;
 $('#progressFill').style.width=day?`${Math.min(100,(day/data.cycleLength)*100)}%`:'0%';
 const lens=starts().slice(1).map((s,i)=>Math.round((fromISO(s)-fromISO(starts()[i]))/86400000));
 $('#avgCycle').textContent=lens.length?`${Math.round(lens.reduce((a,b)=>a+b,0)/lens.length)} jours`:`${data.cycleLength} jours*`;
 $('#lastPeriod').textContent=last?fmt(fromISO(last),{day:'numeric',month:'short'}):'À renseigner';
 const entry=data.entries.find(e=>e.date===iso(today));const mood=data.moods[iso(today)];
 $$('#moodRow .mood').forEach(b=>b.classList.toggle('selected',b.dataset.mood===mood));
 $('#homeSymptoms').innerHTML=entry?.symptoms?.length?entry.symptoms.map(s=>`<span class="chip">${esc(s)}</span>`).join(''):'<span class="empty-chip">Aucun symptôme noté</span>';
}
function renderCalendar(){const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth();$('#monthTitle').textContent=fmt(calendarMonth,{month:'long',year:'numeric'});const first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),total=Math.ceil((offset+days)/7)*7,grid=$('#calendarGrid');grid.innerHTML='';const last=lastStart(),next=estimatedNext();for(let i=0;i<total;i++){const n=i-offset+1,d=new Date(y,m,n),cell=document.createElement('div');cell.className='calendar-day';cell.textContent=d.getDate();if(d.getMonth()!==m)cell.classList.add('muted-day');if(iso(d)===iso(today))cell.classList.add('today');const periodDay=starts().some(s=>{const delta=(d-fromISO(s))/86400000;return delta>=0&&delta<data.periodLength});if(periodDay)cell.classList.add('period-day');else if(next){const delta=(d-next)/86400000;if(delta>=0&&delta<data.periodLength)cell.classList.add('estimate-day')}grid.append(cell)}}
function renderEntries(){const box=$('#entryList'),entries=[...data.entries].sort((a,b)=>b.date.localeCompare(a.date));box.innerHTML=entries.length?entries.map(e=>`<article class="entry-card"><div><h3>${fmt(fromISO(e.date),{weekday:'short',day:'numeric',month:'long'})}${e.flow?` · Flux ${esc(e.flow.toLowerCase())}`:''}</h3><p>${[...(e.symptoms||[]),e.pain>0?`Douleur ${e.pain}/10`:'',e.impact?`Activités : ${e.impact.toLowerCase()}`:'',e.note].filter(Boolean).map(esc).join(' · ')||'Aucune précision'}</p></div><span class="entry-tag">${e.flow?'RÈGLES':'JOURNAL'}</span></article>`).join(''):'<div class="empty-state">Tes notes apparaîtront ici.</div>';renderExpenses()}
function renderExpenses(){const expenses=data.expenses||[],monthKey=iso(new Date(today.getFullYear(),today.getMonth(),1)).slice(0,7),thisMonth=expenses.filter(x=>x.date.startsWith(monthKey)),sum=thisMonth.reduce((a,x)=>a+Number(x.amount||0),0);$('#monthlySpend').textContent=`${sum.toLocaleString('fr-FR')} FCFA`;$('#expenseList').innerHTML=thisMonth.length?thisMonth.slice().reverse().map(x=>`<div class="expense-row"><span>${esc(x.type)} · ${fmt(fromISO(x.date),{day:'numeric',month:'short'})}</span><strong>${Number(x.amount).toLocaleString('fr-FR')} FCFA</strong></div>`).join(''):'<p class="empty-expenses">Aucune dépense notée ce mois-ci.</p>'}
function renderInsights(){const st=starts(),lens=st.slice(1).map((s,i)=>Math.round((fromISO(s)-fromISO(st[i]))/86400000));$('#insightCycle').textContent=lens.length?`${Math.round(lens.reduce((a,b)=>a+b,0)/lens.length)} jours`:'Pas encore assez de données';$('#insightPeriod').textContent=data.periodLength?`${data.periodLength} jours*`:'À renseigner'}
function render(){renderHome();renderCalendar();renderEntries();renderInsights()}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function navigate(name){$$('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
$('#settingsBtn').addEventListener('click',()=>{navigate('settings');$('#cycleLength').value=data.cycleLength;$('#periodLength').value=data.periodLength});
$('#prevMonth').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar()});$('#nextMonth').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar()});
function openPeriodDialog(){const d=$('#periodStartDate');d.value=iso(today);$('#periodDialog').showModal()}
$('#logPeriodBtn').addEventListener('click',openPeriodDialog);$('#confirmPeriodBtn').addEventListener('click',e=>{e.preventDefault();const val=$('#periodStartDate').value;if(!val){showToast('Choisis une date de début.');return}if(!data.periods.includes(val))data.periods.push(val);persist();$('#periodDialog').close();showToast('Début des règles enregistré.')});
$('#logDate').value=iso(today);
$$('.mood').forEach(b=>b.addEventListener('click',()=>{data.moods[iso(today)]=b.dataset.mood;persist();showToast('Humeur enregistrée.') }));
$$('#flowChoices .choice').forEach(b=>b.addEventListener('click',()=>{$$('#flowChoices .choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedFlow=b.dataset.flow}));
$$('[data-impact]').forEach(b=>b.addEventListener('click',()=>{$$('#impactChoices .choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedImpact=b.dataset.impact}));
$('#painLevel').addEventListener('input',e=>$('#painValue').textContent=e.target.value);
$$('.symptom-option').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('selected');selectedSymptoms.has(b.dataset.symptom)?selectedSymptoms.delete(b.dataset.symptom):selectedSymptoms.add(b.dataset.symptom)}));
$('#saveEntryBtn').addEventListener('click',()=>{const date=$('#logDate').value;if(!date){showToast('Choisis une date.');return}const entry={date,flow:selectedFlow,symptoms:[...selectedSymptoms],pain:Number($('#painLevel').value),impact:selectedImpact,note:$('#noteText').value.trim()};data.entries=data.entries.filter(e=>e.date!==date);if(entry.flow&&!data.periods.includes(date))data.periods.push(date);data.entries.push(entry);if(entry.flow)data.periodLength=Math.max(data.periodLength,1);persist();selectedFlow='';selectedImpact='';selectedSymptoms.clear();$$('.choice,.symptom-option').forEach(x=>x.classList.remove('selected'));$('#painLevel').value=0;$('#painValue').textContent='0';$('#noteText').value='';showToast('Ta note a été enregistrée.')});
$('#addExpenseBtn').addEventListener('click',()=>{const amount=Number($('#productCost').value);if(!amount||amount<0){showToast('Saisis un montant supérieur à 0.');return}data.expenses=data.expenses||[];data.expenses.push({date:iso(today),type:$('#productType').value,amount});persist();$('#productCost').value='';showToast('Dépense ajoutée à ton suivi.')});
$('#saveSettingsBtn').addEventListener('click',()=>{const c=Number($('#cycleLength').value),p=Number($('#periodLength').value);if(c<15||c>60||p<1||p>12){showToast('Vérifie les durées saisies.');return}data.cycleLength=c;data.periodLength=p;persist();showToast('Préférences enregistrées.')});
$('#resetBtn').addEventListener('click',()=>{if(confirm('Effacer toutes les règles, notes et préférences enregistrées sur cet appareil ?')){data=defaultData();persist();showToast('Toutes les données ont été effacées.')}});
render();
