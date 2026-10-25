import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import { api, hasToken, saveToken } from './api.js';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarDays, Camera, Check,
  CheckCircle2, ChevronDown, CircleHelp, Clock3, Compass, Copy, Filter, Flame, Heart,
  LayoutDashboard, LogIn, LogOut, MapPin, Menu, Navigation, Plus, QrCode, ScanLine, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, Ticket, TrendingUp, UploadCloud, Users, WandSparkles, X,
  Zap, Code2, GraduationCap, PartyPopper, Handshake, Laptop, ExternalLink, Info,
} from 'lucide-react';

const CATS = ['All', 'Hackathon', 'Workshop', 'Tech Talk', 'Networking', 'Cultural', 'Community', 'Other'];
const CAT_ICONS = { Hackathon: Code2, Workshop: Laptop, 'Tech Talk': GraduationCap, Networking: Handshake, Cultural: PartyPopper, Community: Heart, Other: Zap };
const CAT_GRADIENT = { Hackathon: 'violet', Workshop:'blue', 'Tech Talk':'orange', Networking:'teal', Cultural:'pink', Community:'green', Other:'slate' };
const INITIAL_FORM = { title:'', description:'', category:'Hackathon', date:'', time:'10:00 AM', venue:'', locality:'Pune', lat:'18.5204', lng:'73.8567', capacity:'100', source:'manual' };
const Pune = { lat:18.5204, lng:73.8567 };
const markerIcon = L.divIcon({ className:'pin-host', html:'<div class="map-pin"><span>✦</span></div>', iconSize:[36,42], iconAnchor:[18,42] });
const formatDate = (x) => new Date(x).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
const dayNumber = (x) => new Date(x).toLocaleDateString('en-IN', { day:'2-digit' });
const dayMonth = (x) => new Date(x).toLocaleDateString('en-IN', { month:'short' }).toUpperCase();
const compact = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function Logo() { return <div className="logo-lockup"><div className="logo-symbol"><span className="logo-orbit"/><span className="logo-dot"/></div><span>event<span className="brand-highlight">sphere</span><span className="brand-ai">AI</span></span></div>; }
function Chip({children, color='purple'}) { return <span className={`chip ${color}`}>{children}</span>; }
function IconFor({category, size=16}) { const Icon = CAT_ICONS[category] || Zap; return <Icon size={size}/>; }
function Notice({message,onClose,type='success'}) {
  useEffect(() => { if (!message) return; const t = setTimeout(onClose, 4200); return () => clearTimeout(t); }, [message,onClose]);
  if (!message) return null;
  return <div className={`toast ${type}`} role="status"><span>{type==='success'?<CheckCircle2 size={18}/>:<Info size={18}/>}</span><span>{message}</span><button aria-label="Dismiss" onClick={onClose}><X size={15}/></button></div>;
}
function Modal({title, onClose, children, wide=false}) {
  useEffect(() => { const onKey = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown',onKey); return () => window.removeEventListener('keydown',onKey); }, [onClose]);
  return <div className="modal-overlay" onClick={onClose} role="presentation"><div role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide?'wide':''}`} onClick={e=>e.stopPropagation()}>
    <div className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={20}/></button></div>{children}</div></div>;
}
function AuthModal({onClose,onSuccess}) {
  const [mode,setMode] = useState('login'), [role,setRole] = useState('attendee');
  const [name,setName] = useState(''), [email,setEmail] = useState(''), [password,setPassword] = useState(''), [working,setWorking] = useState(false), [error,setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (working) return;
    setWorking(true);
    setError('');
    try {
      const isLogin = mode === 'login';
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: email.trim(), password }
        : { name: name.trim(), email: email.trim(), password, role };
      const result = await api(endpoint, { method: 'POST', body: payload });
      saveToken(result.token);
      onSuccess(result.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }
  return <Modal title={mode==='login'?'Welcome back':'Join EventSphere'} onClose={onClose}>
    <p className="modal-sub">Your next opportunity is waiting for you.</p>
    <div className="segment"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Log in</button><button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Create account</button></div>
    <form onSubmit={submit} className="form-stack">
      {mode==='register'&&<label>Full name<input required minLength={2} maxLength={80} placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)}/></label>}
      <label>Email address<input required type="email" placeholder="you@college.edu" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Password<input required minLength={8} type="password" placeholder="At least 8 characters" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {mode==='register'&&<label>I am joining as<select value={role} onChange={e=>setRole(e.target.value)}><option value="attendee">Student / Attendee</option><option value="organizer">Event organizer</option></select></label>}
      {error&&<p className="error-text">{error}</p>}
      <button className="btn primary full" disabled={working} type="submit">{working?'Connecting...':mode==='login'?'Log in':'Create account'} <ArrowRight size={16}/></button>
    </form>
  </Modal>;
}
function EventCard({event, onOpen}) {
  const size = Math.max(0, event.capacity - (event.registeredCount || 0));
  return <button className="event-card" onClick={()=>onOpen(event)}>
    <div className={`event-visual ${CAT_GRADIENT[event.category]||'slate'}`}>
      <div className="cover-mesh"/>
      <div className="visual-top"><span className="category-tag"><IconFor category={event.category} size={13}/>{event.category}</span>{event.score>=75&&<span className="match-tag"><Sparkles size={12}/> {event.score}% match</span>}</div>
      <div className="visual-symbol"><IconFor category={event.category} size={61}/></div>
      <div className="visual-bottom"><span>EVENTSPHERE COLLECTION</span><span className="tiny-cross">✳</span></div>
    </div>
    <div className="event-body"><div className="event-kicker"><span><CalendarDays size={13}/>{formatDate(event.date)}</span><span><Clock3 size={13}/>{event.time}</span></div>
      <h3>{event.title}</h3><p className="event-description">{event.description}</p>
      <div className="event-location"><MapPin size={14}/>{event.locality}{event.distanceKm!==null&&event.distanceKm!==undefined&&<span>· {event.distanceKm} km</span>}</div>
      <div className="event-footer"><span className="spots"><Users size={15}/> {size} spots left</span><span className="text-link">View event <ArrowUpRight size={16}/></span></div>
    </div>
  </button>;
}
function MapExplore({events,onOpen,center}) {
  return <div className="map-layout"><div className="map-surface"><MapContainer key={`${center.lat},${center.lng}`} center={[center.lat,center.lng]} zoom={12} className="leaflet-map" scrollWheelZoom={false}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
    {events.filter(e=>Number.isFinite(e.location?.lat)&&Number.isFinite(e.location?.lng)).map(e=><Marker key={e._id} position={[e.location.lat,e.location.lng]} icon={markerIcon}><Popup><div className="pop-event"><strong>{e.title}</strong><span>{e.locality} · {formatDate(e.date)}</span><button onClick={()=>onOpen(e)}>View details →</button></div></Popup></Marker>)}
  </MapContainer></div><div className="map-aside"><div className="map-aside-heading"><h3>Explore the neighborhood</h3><p>{events.length} opportunities in your results</p></div>{events.slice(0,8).map(e=><button key={e._id} className="map-item" onClick={()=>onOpen(e)}><span className={`map-item-icon ${CAT_GRADIENT[e.category]}`}><IconFor category={e.category} size={20}/></span><span><b>{e.title}</b><small>{e.locality} · {formatDate(e.date)}</small></span><ArrowUpRight size={17}/></button>)}<p className="fineprint">Map tiles need internet access. Demo events are fictional.</p></div></div>;
}
function EventDetails({event,onClose,user,onRequireAuth,onRegistered,notify}) {
  const [working,setWorking]=useState(false); const remaining=Math.max(0,event.capacity-(event.registeredCount||0));
  async function register() {
    if (!user) return onRequireAuth();
    if (user.role!=='attendee') return notify('Switch to a student account to register.','error');
    setWorking(true);
    try { await api(`/events/${event._id}/register`,{method:'POST'}); notify('Registered! Your QR ticket is in My Tickets.'); onRegistered(); onClose(); }
    catch(e) {notify(e.message,'error');} finally{setWorking(false);}
  }
  return <Modal title="Opportunity details" onClose={onClose} wide>
    <div className={`detail-hero ${CAT_GRADIENT[event.category]||'slate'}`}><div className="detail-hero-icon"><IconFor category={event.category} size={46}/></div><Chip>{event.category}</Chip></div>
    <div className="detail-content"><div className="detail-title-row"><div><h2>{event.title}</h2><p>{event.description}</p></div>{event.score>=70&&<span className="detail-match"><Sparkles size={15}/>{event.score}% match</span>}</div>
      <div className="details-grid"><div><CalendarDays size={18}/><span><b>{formatDate(event.date)}</b><small>{event.time}</small></span></div><div><MapPin size={18}/><span><b>{event.venue}</b><small>{event.locality}</small></span></div><div><Users size={18}/><span><b>{remaining} spots remaining</b><small>Capacity {event.capacity}</small></span></div><div><ShieldCheck size={18}/><span><b>{event.organizer?.name || 'Verified organizer account'}</b><small>Organizer</small></span></div></div>
      {event.isDemo&&<p className="demo-label"><Info size={15}/> Fictional demonstration event; not an actual scheduled event.</p>}
      <div className="detail-action"><span>Free discovery platform · No payment required</span><button className="btn primary" disabled={working||remaining===0||!!event.registered} onClick={register}>{event.registered?'Already registered':remaining===0?'Fully booked':working?'Registering...':'Reserve my spot'}<ArrowRight size={17}/></button></div>
    </div>
  </Modal>;
}
function Interests({user,onUpdate,notify}) {
  const [selected,setSelected]=useState(user.interests || []); const [saving,setSaving]=useState(false);
  useEffect(()=>setSelected(user.interests||[]),[user]);
  async function save() {setSaving(true);try{const {user:next}=await api('/auth/me/interests',{method:'PATCH',body:{interests:selected}});onUpdate(next);notify('Your interests have been updated.');}catch(e){notify(e.message,'error');}finally{setSaving(false);}}
  return <div className="preferences-panel"><h3>Make discovery yours <Sparkles size={17}/></h3><p>Choose topics you care about. Recommendations update automatically.</p><div className="interest-grid">{CATS.slice(1).map(c=><button key={c} className={`interest-option ${selected.includes(c)?'selected':''}`} onClick={()=>setSelected(s=>s.includes(c)?s.filter(x=>x!==c):[...s,c])}><IconFor category={c}/>{c}{selected.includes(c)&&<Check size={15}/>}</button>)}</div><button className="btn primary" disabled={saving} onClick={save}>{saving?'Saving...':'Save preferences'} <ArrowRight size={16}/></button></div>;
}
function Tickets({notify,onGoDiscover}) {
  const [tickets,setTickets]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{api('/me/tickets').then(r=>setTickets(r.tickets)).catch(e=>notify(e.message,'error')).finally(()=>setLoading(false));},[]);
  return <section className="dashboard-section"><div className="section-title-row"><div><span className="eyebrow">YOUR PASSPORT TO OPPORTUNITY</span><h1>My tickets<span className="title-dot">.</span></h1><p>Every registration, all in one place. Show your QR at the venue.</p></div><Chip color="green">{tickets.length} tickets</Chip></div>
  {loading?<div className="empty">Loading your tickets...</div>:tickets.length===0?<div className="empty-state"><Ticket size={42}/><h3>No tickets yet</h3><p>Discover an exciting event and reserve your spot.</p><button className="btn primary" onClick={onGoDiscover}>Explore events <ArrowRight size={16}/></button></div>:
    <div className="tickets-grid">{tickets.map(t=><div className="ticket-card" key={t._id}><div className="ticket-main"><Chip>{t.event?.category||'Event'}</Chip><h3>{t.event?.title||'Event no longer available'}</h3><p><CalendarDays size={14}/> {t.event?formatDate(t.event.date):'-'} · {t.event?.time}</p><p><MapPin size={14}/> {t.event?.venue}, {t.event?.locality}</p><span className={`ticket-status ${t.checkedInAt?'used':''}`}>{t.checkedInAt?<><CheckCircle2 size={14}/> Checked in</>:<><CheckCircle2 size={14}/> Confirmed</>}</span></div><div className="ticket-qr"><QRCodeSVG value={t.ticketToken} size={145} bgColor="#ffffff" fgColor="#111830" marginSize={1}/><span>SCAN AT ENTRY</span><button onClick={()=>{navigator.clipboard?.writeText(t.ticketToken).then(()=>notify('Ticket code copied.')).catch(()=>notify('Unable to copy code.','error'));}}><Copy size={13}/> Copy code</button></div></div>)}</div>}
  </section>;
}
function CameraScanner({onRead,notify}) {
  const videoRef=useRef(null);const streamRef=useRef(null);const rafRef=useRef(null);const activeRef=useRef(false);
  const [on,setOn]=useState(false);
  const stop=useCallback(()=>{activeRef.current=false;cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setOn(false);},[]);
  useEffect(()=>()=>stop(),[stop]);
  async function start() {
    if (!('BarcodeDetector' in window)) return notify('Camera QR scanning is unsupported in this browser. Paste the ticket code below.','error');
    try {
      const detector=new window.BarcodeDetector({formats:['qr_code']});
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      streamRef.current=stream; activeRef.current=true;
      videoRef.current.srcObject=stream; await videoRef.current.play(); setOn(true);
      async function scan(){if(!activeRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes.length&&codes[0].rawValue){onRead(codes[0].rawValue);stop();return;}}catch{}rafRef.current=requestAnimationFrame(scan);}scan();
    } catch(e){stop();notify(`Camera unavailable: ${e.message}`,'error');}
  }
  return <div className="camera-box"><video ref={videoRef} className={on?'active':''} playsInline muted aria-label="QR scanner camera"/>{on?<button className="btn secondary" onClick={stop}><X size={16}/> Stop camera</button>:<button className="btn secondary" onClick={start}><Camera size={17}/> Start QR camera scanner</button>}<small>Camera access requires localhost or HTTPS and browser QR support. Manual verification always works.</small></div>;
}
function Studio({notify}) {
  const [form,setForm]=useState(INITIAL_FORM); const [uploading,setUploading]=useState(false); const [saving,setSaving]=useState(false); const [checking,setChecking]=useState(false);
  const [duplicates,setDuplicates]=useState([]); const [overview,setOverview]=useState([]); const [scannerCode,setScannerCode]=useState(''); const [scanResult,setScanResult]=useState(null); const [scanLoading,setScanLoading]=useState(false); const [tab,setTab]=useState('create');
  const update=(name,value)=>{setForm(f=>({...f,[name]:value})); if(['title','date','locality'].includes(name)) setDuplicates([]);};
  const loadOverview=useCallback(()=>{api('/organizer/overview').then(r=>setOverview(r.events)).catch(e=>notify(e.message,'error'));},[]);
  useEffect(()=>{loadOverview();},[loadOverview]);
  async function scanPoster(e){const file=e.target.files?.[0];if(!file)return;setUploading(true);try{const fd=new FormData();fd.append('poster',file);const {parsed,confidence}=await api('/ocr/poster',{method:'POST',body:fd});setForm(f=>({...f,...Object.fromEntries(['title','date','time','venue','category'].filter(k=>parsed[k]).map(k=>[k,parsed[k]])),source:'poster'}));notify(`Poster text extracted (${confidence}% OCR confidence). Verify every field.`);}catch(e){notify(e.message,'error');}finally{setUploading(false);e.target.value='';}}
  async function checkDuplicate(){if(!form.title||!form.date)return notify('Enter event title and date first.','error');setChecking(true);try{const r=await api('/events/duplicate-check',{method:'POST',body:{title:form.title,date:form.date,locality:form.locality,venue:form.venue}});setDuplicates(r.matches);notify(r.matches.length?`${r.matches.length} potential duplicate(s) detected.`:'No close match found.');}catch(e){notify(e.message,'error');}finally{setChecking(false);}}
  async function publish(e){e.preventDefault();setSaving(true);try{const body={...form,location:{lat:Number(form.lat),lng:Number(form.lng)},capacity:Number(form.capacity),date:new Date(`${form.date}T12:00:00`).toISOString()};const r=await api('/events',{method:'POST',body});notify('Your opportunity is live!');setForm(INITIAL_FORM);setDuplicates([]);loadOverview();setTab('overview');}catch(e){if(e.data?.matches)setDuplicates(e.data.matches);notify(e.message,'error');}finally{setSaving(false);}}
  async function verify(){if(!scannerCode.trim())return notify('Enter or scan a ticket code.','error');setScanLoading(true);setScanResult(null);try{const r=await api('/checkins/verify',{method:'POST',body:{ticketToken:scannerCode.trim()}});setScanResult(r);setScannerCode('');notify(`Verified attendance for ${r.attendee}.`);loadOverview();}catch(e){notify(e.message,'error');}finally{setScanLoading(false);}}
  const total = overview.reduce((a,e)=>a+e.registrations,0); const checked = overview.reduce((a,e)=>a+e.checkins,0);
  return <section className="dashboard-section"><div className="section-title-row"><div><span className="eyebrow">ORGANIZER COMMAND CENTER</span><h1>Organizer Studio<span className="title-dot">.</span></h1><p>Turn a poster into a thriving community experience.</p></div><button className="btn primary" onClick={()=>setTab('create')}><Plus size={17}/> Publish event</button></div>
    <div className="studio-stats"><div><span>Published events</span><strong>{compact(overview.length)}</strong><span className="stat-foot"><CalendarDays size={13}/> your listings</span></div><div><span>Total registrations</span><strong>{compact(total)}</strong><span className="stat-foot"><TrendingUp size={13}/> across events</span></div><div><span>Verified arrivals</span><strong>{compact(checked)}</strong><span className="stat-foot"><CheckCircle2 size={13}/> QR check-ins</span></div><div><span>Attendance rate</span><strong>{total?Math.round(100*checked/total):0}%</strong><span className="stat-foot"><Zap size={13}/> live metric</span></div></div>
    <div className="studio-tabs">{[['create','Create event'],['overview','My events'],['checkin','QR check-in']].map(([id,name])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{name}</button>)}</div>
    {tab==='create'&&<div className="studio-panel"><div className="studio-panel-header"><div><h2>New opportunity</h2><p>Post manually or extract event details directly from a flyer.</p></div><span className="mini-badge"><WandSparkles size={14}/> POSTER INTELLIGENCE</span></div>
      <label className={`poster-drop ${uploading?'busy':''}`}><UploadCloud size={30}/><strong>{uploading?'Reading your poster...':'Drop in an event poster'}</strong><span>Click to upload a PNG or JPEG (max 4 MB)</span><input disabled={uploading} type="file" accept="image/png,image/jpeg" onChange={scanPoster} /></label>
      <form onSubmit={publish} className="event-form"><label className="span-2">Event title<input required maxLength={120} placeholder="e.g. AI Innovation Hackathon" value={form.title} onChange={e=>update('title',e.target.value)}/></label>
        <label className="span-2">Description<textarea required maxLength={2400} rows={3} placeholder="Why should people attend? What will they learn?" value={form.description} onChange={e=>update('description',e.target.value)}/></label>
        <label>Category<select value={form.category} onChange={e=>update('category',e.target.value)}>{CATS.slice(1).map(c=><option key={c}>{c}</option>)}</select></label><label>Date<input required type="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={e=>update('date',e.target.value)}/></label>
        <label>Start time<input required placeholder="10:00 AM" value={form.time} onChange={e=>update('time',e.target.value)}/></label><label>Capacity<input required type="number" min={1} max={10000} value={form.capacity} onChange={e=>update('capacity',e.target.value)}/></label>
        <label>Venue<input required placeholder="Innovation Center" value={form.venue} onChange={e=>update('venue',e.target.value)}/></label><label>City / locality<input required placeholder="Viman Nagar, Pune" value={form.locality} onChange={e=>update('locality',e.target.value)}/></label>
        <label>Latitude<input required type="number" step="any" min={-90} max={90} value={form.lat} onChange={e=>update('lat',e.target.value)}/></label><label>Longitude<input required type="number" step="any" min={-180} max={180} value={form.lng} onChange={e=>update('lng',e.target.value)}/></label>
        <div className="form-actions span-2"><button className="btn secondary" type="button" disabled={checking} onClick={checkDuplicate}><ShieldCheck size={17}/>{checking?'Checking...':'Check duplicates'}</button><button className="btn primary" disabled={saving} type="submit">{saving?'Publishing...':'Publish opportunity'}<ArrowRight size={17}/></button></div>
      </form>{duplicates.length>0&&<div className="duplicate-warning"><b><Info size={17}/> Potential duplicate listing</b>{duplicates.map(d=><p key={d.id}>{d.title} — {Math.round(d.confidence*100)}% similarity</p>)}<small>Confirm the event is distinct before publishing.</small></div>}
    </div>}
    {tab==='overview'&&<div className="studio-panel"><h2>Your published events</h2>{overview.length===0?<div className="empty-state"><CalendarDays size={36}/><h3>No events published yet</h3><button className="btn primary" onClick={()=>setTab('create')}>Create your first event</button></div>:<div className="event-admin-list">{overview.map(e=><div key={e._id} className="event-admin-row"><span className={`admin-icon ${CAT_GRADIENT[e.category]}`}><IconFor category={e.category} size={21}/></span><span className="admin-summary"><b>{e.title}</b><small>{formatDate(e.date)} · {e.locality}{e.isDemo?' · Demo':''}</small></span><div><strong>{e.registrations}</strong><small>Registered</small></div><div><strong>{e.checkins}</strong><small>Arrived</small></div></div>)}</div>}</div>}
    {tab==='checkin'&&<div className="studio-panel checkin-panel"><h2>Verify event attendance</h2><p>Scan a QR ticket or paste the attendee's ticket token. You can only check in attendees for your own events.</p><CameraScanner notify={notify} onRead={setScannerCode}/><div className="checkin-form"><label>Ticket code<input value={scannerCode} onChange={e=>setScannerCode(e.target.value)} placeholder="Paste scanned 48-character token" /></label><button className="btn primary" disabled={scanLoading} onClick={verify}><ScanLine size={17}/>{scanLoading?'Verifying...':'Verify ticket'}</button></div>{scanResult&&<div className="verified-result"><CheckCircle2 size={27}/><div><b>{scanResult.attendee} checked in</b><p>{scanResult.event} · {new Date(scanResult.checkedInAt).toLocaleTimeString('en-IN')}</p></div></div>}</div>}
  </section>;
}
function App() {
  const [user,setUser]=useState(null), [authOpen,setAuthOpen]=useState(false), [view,setView]=useState('discover');
  const [events,setEvents]=useState([]), [selected,setSelected]=useState(null), [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[sort,setSort]=useState('recommended');
  const [loading,setLoading]=useState(true), [apiDown,setApiDown]=useState(false), [mapMode,setMapMode]=useState(false), [origin,setOrigin]=useState(Pune), [locationLabel,setLocationLabel]=useState('Pune, India');
  const [notice,setNotice]=useState({message:'',type:'success'}),[mobileMenu,setMobileMenu]=useState(false);
  const notify = useCallback((message,type='success')=>setNotice({message,type}),[]);
  const clearNotice = useCallback(()=>setNotice({message:'',type:'success'}),[]);
  useEffect(()=>{if(hasToken())api('/auth/me').then(r=>setUser(r.user)).catch(()=>saveToken(''));},[]);
  const loadEvents=useCallback(async()=>{
    setLoading(true);
    try { const params=new URLSearchParams({search,category,sort,lat:String(origin.lat),lng:String(origin.lng)});const result=await api(`/events?${params}`);setEvents(result.events);setApiDown(false); }
    catch(e) {setApiDown(true);setEvents([]);}finally{setLoading(false);}
  },[search,category,sort,origin,user]);
  useEffect(()=>{const id=setTimeout(loadEvents,180);return()=>clearTimeout(id);},[loadEvents]);
  const counters=useMemo(()=>({events:events.length, nearby:events.filter(e=>e.distanceKm!==null&&e.distanceKm<=15).length, categories:new Set(events.map(e=>e.category)).size}),[events]);
  function onAuth(userData){setUser(userData);notify(`Welcome ${userData.name.split(' ')[0]}!`);setView(userData.role==='organizer'?'studio':'discover');}
  function logout(){saveToken('');setUser(null);setView('discover');notify('Signed out successfully.');}
  function go(v){setView(v);setMobileMenu(false);if(v==='discover')setMapMode(false);}
  function locate(){ if(!navigator.geolocation)return notify('Geolocation unsupported by this browser.','error');navigator.geolocation.getCurrentPosition(p=>{setOrigin({lat:p.coords.latitude,lng:p.coords.longitude});setLocationLabel('Near me');notify('Showing opportunities near your location.');},()=>notify('Location blocked. Using Pune as the demo location.','error'),{enableHighAccuracy:false,timeout:9000}); }
  function selectEvent(event){setSelected(event);if(user){api(`/events/${event._id}`).then(r=>setSelected(prev=>prev?{...prev,...r.event}:null)).catch(()=>{});}}
  const navItems = [{id:'discover',label:'Discover',icon:Compass},{id:'map',label:'Explore map',icon:MapPin},...(user?.role==='attendee'?[{id:'tickets',label:'My tickets',icon:Ticket},{id:'interests',label:'My interests',icon:Heart}]:[]),...(user?.role==='organizer'?[{id:'studio',label:'Organizer studio',icon:LayoutDashboard}]:[])];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?'visible':''}`}><div className="sidebar-logo"><Logo/><button className="icon-button mobile-close" onClick={()=>setMobileMenu(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="sidebar-scroll"><div className="sidebar-label">EXPLORE</div><nav>{navItems.map(item=><button key={item.id} className={`nav-link ${view===item.id?'active':''}`} onClick={()=>go(item.id)}><item.icon size={19}/>{item.label}{view===item.id&&<span className="nav-indicator"/>}</button>)}</nav>
      <div className="sidebar-label side-tools">HACKATHON DEMO</div><div className="sidebar-info"><span className="on-air"><span/> SYSTEM PREVIEW</span><strong>Opportunities should find you.</strong><p>From one poster to an entire community.</p><div className="orbit-decoration">◎</div></div></div>
      <div className="sidebar-profile">{user?<><div className="avatar">{user.name.charAt(0).toUpperCase()}</div><div className="profile-meta"><b>{user.name}</b><small>{user.role==='organizer'?'Organizer account':'Student account'}</small></div><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17}/></button></>:<button className="btn secondary full" onClick={()=>setAuthOpen(true)}><LogIn size={17}/> Sign in to continue</button>}</div>
    </aside>
    {mobileMenu&&<button className="mobile-scrim" aria-label="Close menu" onClick={()=>setMobileMenu(false)}/>}
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button><span className="breadcrumb">Platform <span>/</span> <b>{navItems.find(n=>n.id===view)?.label || 'Discover'}</b></span></div><div className="topbar-right"><span className="topbar-tag"><span className="live-dot"/> VECNAVERSE 2026 BUILD</span><button className="location-button" onClick={locate}><Navigation size={15}/>{locationLabel}<ChevronDown size={14}/></button>{user?<span className="avatar tiny">{user.name.charAt(0).toUpperCase()}</span>:<button className="btn primary small" onClick={()=>setAuthOpen(true)}>Join now <ArrowRight size={14}/></button>}</div></header>
      <main className="main-content">
        {(view==='discover'||view==='map')&&<>
          <section className="hero"><div className="hero-copy"><span className="hero-eyebrow"><span className="hero-eyebrow-icon"><Sparkles size={14}/></span> A SMARTER WAY TO FIND YOUR PEOPLE</span><h1>Big opportunities.<br/><span>Closer than you think.</span></h1><p>Hackathons, workshops, meetups & meaningful connections — discover the experiences worth showing up for.</p><div className="hero-actions"><button className="btn bright" onClick={()=>document.getElementById('explore-anchor')?.scrollIntoView({behavior:'smooth'})}>Explore opportunities <ArrowUpRight size={18}/></button><button className="btn hero-outline" onClick={()=>user?.role==='organizer'?go('studio'):setAuthOpen(true)}><Plus size={16}/> Host an event</button></div><div className="hero-proof"><div className="avatar-stack"><span>R</span><span>A</span><span>S</span></div><span>Built for students, builders & communities.</span></div></div><div className="hero-graphic"><span className="hero-star a">✦</span><span className="hero-star b">✳</span><div className="hero-orbit one"/><div className="hero-orbit two"/><div className="hero-core"><Zap size={58}/></div><div className="hero-float top"><span><Flame size={15}/></span><div><b>Find your spark</b><small>Explore nearby events</small></div></div><div className="hero-float bottom"><span><Users size={15}/></span><div><b>Make connections</b><small>Grow your community</small></div></div></div></section>
          <div className="metrics-grid"><div><span className="metric-icon violet"><CalendarDays size={21}/></span><div><strong>{loading?'—':counters.events}</strong><small>Upcoming opportunities</small></div><ArrowUpRight size={17}/></div><div><span className="metric-icon blue"><MapPin size={21}/></span><div><strong>{loading?'—':counters.nearby}</strong><small>Within 15 km</small></div><ArrowUpRight size={17}/></div><div><span className="metric-icon orange"><Compass size={21}/></span><div><strong>{loading?'—':counters.categories}</strong><small>Event categories</small></div><ArrowUpRight size={17}/></div></div>
          <section id="explore-anchor" className="discovery-section"><div className="section-title-row"><div><span className="eyebrow">EXPLORE WHAT'S NEXT</span><h2>Made for your curiosity<span className="title-dot">.</span></h2><p>Discover events that match your passions and your proximity.</p></div><div className="view-toggle"><button className={view==='discover'&&!mapMode?'active':''} onClick={()=>{go('discover');setMapMode(false);}}><LayoutDashboard size={17}/> Grid</button><button className={view==='map'||mapMode?'active':''} onClick={()=>{setView('map');setMapMode(true);}}><MapPin size={17}/> Map</button></div></div>
            <div className="filters-wrap"><div className="search-wrap"><Search size={19}/><input aria-label="Search events" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events, skills, places..."/>{search&&<button aria-label="Clear search" onClick={()=>setSearch('')}><X size={16}/></button>}</div><div className="sort-wrap"><SlidersHorizontal size={16}/><select aria-label="Sort results" value={sort} onChange={e=>setSort(e.target.value)}><option value="recommended">Best match</option><option value="date">Soonest</option><option value="nearest">Nearest</option></select></div></div>
            <div className="category-row">{CATS.map(c=><button key={c} className={`category-pill ${category===c?'selected':''}`} onClick={()=>setCategory(c)}>{c==='All'?<Compass size={15}/>:<IconFor category={c} size={15}/>} {c==='All'?'All events':c}</button>)}</div>
            <div className="results-head"><span>{loading?'Finding opportunities...':`${events.length} events to explore`}</span><span><Sparkles size={13}/> Recommendations are explainable, not guesses</span></div>
            {apiDown?<div className="empty-state"><Info size={40}/><h3>API is not connected</h3><p>Start MongoDB and the FastAPI server. Follow README.md, then reload.</p><button className="btn secondary" onClick={loadEvents}>Retry connection</button></div>:
             loading?<div className="loading-grid">{[1,2,3].map(i=><div className="skeleton" key={i}/>)}</div>:
             events.length===0?<div className="empty-state"><Search size={40}/><h3>No matching events</h3><p>Change the filters or add events from Organizer Studio.</p><button className="btn secondary" onClick={()=>{setSearch('');setCategory('All');}}>Clear filters</button></div>:
             view==='map'||mapMode?<MapExplore events={events} onOpen={selectEvent} center={origin}/>:<div className="cards-grid">{events.map(e=><EventCard event={e} key={e._id} onOpen={selectEvent}/>)}</div>}
          </section>
        </>}
        {view==='studio'&&user?.role==='organizer'&&<Studio notify={notify}/>}
        {view==='tickets'&&user?.role==='attendee'&&<Tickets notify={notify} onGoDiscover={()=>go('discover')}/>}
        {view==='interests'&&user?.role==='attendee'&&<section className="dashboard-section"><div className="section-title-row"><div><span className="eyebrow">DISCOVERY, PERSONALIZED</span><h1>My interests<span className="title-dot">.</span></h1><p>Help EventSphere bring your next great opportunity closer.</p></div></div><Interests user={user} onUpdate={setUser} notify={notify}/></section>}
        <footer className="app-footer"><span><Logo/> <small>Built for the VECNAVERSE 2026 hackathon</small></span><span>Prototype · <b>Demo events are fictional</b> · Made to bring people together <Heart size={12}/></span></footer>
      </main></div>
    {authOpen&&<AuthModal onClose={()=>setAuthOpen(false)} onSuccess={onAuth}/>}
    {selected&&<EventDetails event={selected} onClose={()=>setSelected(null)} user={user} onRequireAuth={()=>setAuthOpen(true)} notify={notify} onRegistered={loadEvents}/>}
    <Notice message={notice.message} type={notice.type} onClose={clearNotice}/>
  </div>;
}
export default App;