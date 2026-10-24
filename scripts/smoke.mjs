// Run against a running MongoDB + seeded API: npm run smoke
const base = process.env.API_URL || 'http://localhost:5000/api';
const assert = (ok, message) => { if (!ok) throw new Error(message); console.log('✓',message); };
async function http(path, token, method='GET', body) {
  const result = await fetch(base+path, { method, headers:{ ...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{}) }, body:body?JSON.stringify(body):undefined });
  const json = await result.json();
  return { ...json, httpStatus:result.status };
}
try {
  const health = await http('/health');
  assert(health.httpStatus===200 && health.app==='EventSphere AI' && health.status === 'ok','API is responding');
  const student=await http('/auth/login',undefined,'POST',{email:'student@eventsphere.demo',password:'Demo@12345'});
  const organizer=await http('/auth/login',undefined,'POST',{email:'organizer@eventsphere.demo',password:'Demo@12345'});
  assert(student.token && organizer.token,'Demo account login works');
  const list=await http('/events',student.token);
  assert(list.httpStatus===200 && Array.isArray(list.events) && list.events.length>=1,'Event discovery returns listings');
  const date = new Date(Date.now()+5*86400000).toISOString();
  const title = `Smoke Test Session ${Date.now()}`;
  const created = await http('/events',organizer.token,'POST',{title,description:'Smoke test-generated event with complete registration and QR attendance.',category:'Workshop',date,time:'1:00 PM',venue:'Test Demo Venue',locality:'Pune',location:{lat:18.52,lng:73.85},capacity:15});
  assert(created.httpStatus===201 && created.event?._id,'Organizer can publish an event');
  const check=await http('/events/duplicate-check',organizer.token,'POST',{title,date,locality:'Pune'});
  assert(check.matches?.some(m=>m.id===created.event._id),'Duplicate detection identifies a similar event');
  const registration=await http(`/events/${created.event._id}/register`,student.token,'POST');
  assert(registration.httpStatus===201 && registration.registration?.ticketToken?.length===48,'Student gets a secure ticket token');
  const tickets=await http('/me/tickets',student.token);
  assert(tickets.tickets?.some(t=>t.ticketToken===registration.registration.ticketToken),'My Tickets includes new reservation');
  const bad=await http('/checkins/verify',student.token,'POST',{ticketToken:registration.registration.ticketToken});
  assert(bad.httpStatus===403,'Student cannot verify attendance');
  const scanned=await http('/checkins/verify',organizer.token,'POST',{ticketToken:registration.registration.ticketToken});
  assert(scanned.httpStatus===200 && scanned.attendee,'Organizer can check in ticket');
  const repeat=await http('/checkins/verify',organizer.token,'POST',{ticketToken:registration.registration.ticketToken});
  assert(repeat.httpStatus===409,'Ticket cannot be checked in twice');
  console.log('\nALL SMOKE TESTS PASSED. Demo ready.');
} catch(error) {
  console.error('\nSMOKE TEST FAILED:',error.message);
  console.error('Check MongoDB, npm run seed and npm run dev.');
  process.exitCode=1;
}
