const state = { token: localStorage.getItem('foundry_token') || '', user: JSON.parse(localStorage.getItem('foundry_user') || 'null'), type: 'all', items: [], categories: [], view: 'home', adminData: null };
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const itemEmoji = item => ({Accessories:'👛',Electronics:'🎧',Documents:'🪪',Bags:'🎒',Keys:'🔑',Books:'📚',Clothing:'🧥',Other:'📦'}[item.category] || (item.type === 'lost' ? '🔎' : '🎁'));
const dateText = value => { if (!value) return 'Date not provided'; const d = new Date(String(value).length === 10 ? `${value}T12:00:00` : value); return Number.isNaN(d.getTime()) ? escapeHtml(value) : d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); };
const statusClass = status => status === 'Pending' || status === 'Pending Claim' ? 'pending' : status === 'Claimed' || status === 'Approved' ? 'claimed' : status === 'Rejected' ? 'rejected' : '';
async function api(url, options = {}) {
  const headers = { 'Content-Type':'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try { response = await fetch(url, { ...options, headers }); }
  catch { throw new Error('Could not connect to the server. Check that the app and MongoDB are running.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401 && state.token) signOut(false); throw new Error(data.message || 'Request failed.'); }
  return data;
}
function toast(message, type='success') { const el = document.createElement('div'); el.className = `toast ${type === 'error' ? 'error' : ''}`; el.textContent = message; $('toastRegion').appendChild(el); setTimeout(() => el.remove(), 3800); }
function showModal(content) { $('modalContent').innerHTML = content; $('modalBackdrop').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal() { $('modalBackdrop').classList.add('hidden'); document.body.style.overflow = ''; }
function errorBox(message) { return `<div class="form-error">${escapeHtml(message)}</div>`; }
function updateAuthUI() {
  $('authBtn').textContent = state.user ? 'Sign out' : 'Sign in';
  $('userChip').classList.toggle('hidden', !state.user); $('userChip').textContent = state.user ? `Hi, ${state.user.name.split(' ')[0]}` : '';
  $('adminNav').classList.toggle('hidden', state.user?.role !== 'admin');
  $('reportTop').textContent = state.user ? '＋ Report an item' : 'Sign in to report';
}
function setView(view) {
  state.view = view;
  $('activityView').classList.toggle('hidden', view !== 'activity'); $('adminView').classList.toggle('hidden', view !== 'admin');
  $('browse').classList.toggle('hidden', view !== 'home'); document.querySelector('.hero').classList.toggle('hidden', view !== 'home'); document.querySelector('.stats-strip').classList.toggle('hidden', view !== 'home'); document.querySelector('.cta-band').classList.toggle('hidden', view !== 'home');
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  if (view === 'activity') loadActivity(); if (view === 'admin') loadAdmin(); window.scrollTo({top:0,behavior:'smooth'});
}
async function loadItems() {
  const q = $('searchInput').value.trim(), category = $('categoryFilter').value, status = $('statusFilter').value;
  $('itemGrid').innerHTML = '<div class="loading-card">Finding the right listings…</div>';
  const params = new URLSearchParams({q, type:state.type, category, status});
  try {
    const data = await api(`/api/items?${params}`); state.items = data.items || [];
    $('resultsCount').textContent = `${data.total} ${data.total === 1 ? 'listing' : 'listings'} found`;
    $('itemGrid').innerHTML = state.items.map((item, index) => itemCard(item,index)).join('');
    $('emptyState').classList.toggle('hidden', state.items.length !== 0); $('itemGrid').classList.toggle('hidden', state.items.length === 0);
    $('statTotal').textContent = data.total;
    const all = await api('/api/items?type=all&status=all'); $('statLost').textContent = all.items.filter(x=>x.type==='lost').length; $('statFound').textContent = all.items.filter(x=>x.type==='found').length;
  } catch (e) { $('itemGrid').innerHTML = `<div class="loading-card">${escapeHtml(e.message)}<br><br><button class="btn btn-outline" onclick="loadItems()">Try again</button></div>`; $('resultsCount').textContent = 'Listings unavailable'; }
}

function itemCard(item, index) {
  const type = String(item.type || '').trim().toLowerCase();
  const status = String(item.status || 'Open').trim().toLowerCase();

  const reporterId = String(
    item.reporter?._id || item.reporter?.id || item.reporter || ''
  );

  const userId = String(
    state.user?._id || state.user?.id || ''
  );

  const isFound = type === 'found';
  const isOpen = status === 'open';
  const isOwnItem = Boolean(userId && reporterId && userId === reporterId);

  let action;

  if (isFound && isOpen && state.user && !isOwnItem) {
    action = `<button class="card-action" data-action="claim" data-id="${item._id}">Claim item ↗</button>`;
  } else {
    action = `<button class="card-action" data-action="details" data-id="${item._id}">View details ↗</button>`;
  }

  const img = item.image && /^https?:\/\//i.test(item.image)
    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.remove()">`
    : '';

  return `<article class="item-card">
    <div class="item-visual tone-${index % 5}">
      <span class="type-pill ${type}">${isFound ? 'FOUND ITEM' : 'LOST ITEM'}</span>
      <span class="status-pill ${statusClass(item.status || 'Open')}">${escapeHtml(String(item.status || 'Open').toUpperCase())}</span>
      <span class="visual-emoji">${itemEmoji(item)}</span>
      ${img}
    </div>
    <div class="item-body">
      <div class="item-category">${escapeHtml(item.category)}</div>
      <h3 title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h3>
      <p class="item-description">${escapeHtml(item.description)}</p>
      <div class="item-meta">
        <span class="pin">⌖</span>
        <span>${escapeHtml(item.location)}</span>
        <span>·</span>
        <span>${dateText(item.date)}</span>
      </div>
      <div class="item-footer">
        <span class="reporter">Posted by ${escapeHtml(item.reporter?.name || `Student ${item.reg_no}`)}</span>
        ${action}
      </div>
    </div>
  </article>`;
}

function authModal(mode='login') {
  const isRegister = mode === 'register';
  showModal(`<div class="modal-kicker">WELCOME TO FOUNDRY</div><h2 id="modalTitle">${isRegister?'Create your account.':'Good to have you back.'}</h2><p class="modal-intro">${isRegister?'Join your campus community and help lost things find their way home.':'Sign in to post a report, submit a claim or track your activity.'}</p><form id="authForm"><div id="authError"></div>${isRegister?`<div class="form-grid"><div class="field"><label for="regNo">Registration number *</label><input id="regNo" name="reg_no" required placeholder="e.g. 202401"></div><div class="field"><label for="fullName">Full name *</label><input id="fullName" name="name" required placeholder="Your full name"></div></div>`:''}<div class="field"><label for="email">Campus email *</label><input id="email" name="email" type="email" required autocomplete="email" placeholder="you@campus.edu"></div>${isRegister?`<div class="field"><label for="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" placeholder="Contact number"></div>`:''}<div class="field"><label for="password">Password *</label><input id="password" name="password" type="password" required minlength="8" autocomplete="${isRegister?'new-password':'current-password'}" placeholder="${isRegister?'At least 8 characters':'Your password'}"></div><button class="btn btn-primary form-submit" type="submit">${isRegister?'Create account':'Sign in'} ↗</button></form><div class="modal-switch">${isRegister?'Already registered?':'New to campus Foundry?'} <button id="switchAuth">${isRegister?'Sign in':'Create an account'}</button></div>`);
  $('switchAuth').onclick = () => authModal(isRegister?'login':'register');
  $('authForm').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const payload = Object.fromEntries(fd.entries()); const btn = e.currentTarget.querySelector('button[type=submit]'); btn.disabled=true;btn.textContent='Please wait…';
    try { const data = await api(`/api/auth/${isRegister?'register':'login'}`, {method:'POST',body:JSON.stringify(payload)}); state.token=data.token;state.user=data.user;localStorage.setItem('foundry_token',state.token);localStorage.setItem('foundry_user',JSON.stringify(state.user));updateAuthUI();closeModal();toast(isRegister?'Account created. Welcome to Foundry!':'You are signed in.');await loadItems();if(state.view==='activity')loadActivity(); }
    catch(err){$('authError').innerHTML=errorBox(err.message);btn.disabled=false;btn.textContent=isRegister?'Create account':'Sign in';}
  };
}
function reportModal() {
  if (!state.user) { toast('Sign in first to submit a report.','error'); return authModal(); }
  showModal(`<div class="modal-kicker">ADD TO THE COMMUNITY BOARD</div><h2 id="modalTitle">Report an item.</h2><p class="modal-intro">The more detail you share, the easier it is for the right person to recognise it.</p><form id="reportForm"><div id="reportError"></div><div class="form-grid"><div class="field"><label for="reportType">I'm reporting a *</label><select id="reportType" name="type" required><option value="lost">Lost item</option><option value="found">Found item</option></select></div><div class="field"><label for="reportCategory">Category *</label><select id="reportCategory" name="category" required><option>Accessories</option><option>Electronics</option><option>Documents</option><option>Bags</option><option>Keys</option><option>Books</option><option>Clothing</option><option>Other</option></select></div><div class="field full"><label for="reportName">Item name *</label><input id="reportName" name="name" required maxlength="120" placeholder="e.g. Navy blue backpack"></div><div class="field full"><label for="reportDescription">Description *</label><textarea id="reportDescription" name="description" required maxlength="1200" placeholder="Colour, brand, identifying marks or anything helpful…"></textarea></div><div class="field"><label for="reportLocation">Last seen / found at *</label><input id="reportLocation" name="location" required placeholder="e.g. Central Library"></div><div class="field"><label for="reportDate">Date *</label><input id="reportDate" name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div><div class="field full"><label for="reportImage">Image URL (optional)</label><input id="reportImage" name="image" type="url" placeholder="https://…"></div></div><button class="btn btn-primary form-submit" type="submit">Publish report ↗</button></form>`);
  $('reportForm').onsubmit = async e => {e.preventDefault();const payload=Object.fromEntries(new FormData(e.currentTarget).entries());const btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Publishing…';try{await api('/api/items',{method:'POST',body:JSON.stringify(payload)});closeModal();toast('Report published successfully.');await loadItems();if(state.view==='activity')loadActivity();}catch(err){$('reportError').innerHTML=errorBox(err.message);btn.disabled=false;btn.textContent='Publish report ↗';}};
}
async function detailsModal(id) {
  try {const {item}=await api(`/api/items/${encodeURIComponent(id)}`);showModal(`<div class="modal-kicker">${item.type==='lost'?'LOST ITEM':'FOUND ITEM'} · ${escapeHtml(item.status)}</div><div class="detail-modal-emoji">${itemEmoji(item)}</div><h2>${escapeHtml(item.name)}</h2><p class="modal-intro">${escapeHtml(item.description)}</p><div class="detail-info"><div><small>CATEGORY</small><b>${escapeHtml(item.category)}</b></div><div><small>REPORTED ON</small><b>${dateText(item.date)}</b></div><div><small>LOCATION</small><b>${escapeHtml(item.location)}</b></div><div><small>REPORTED BY</small><b>${escapeHtml(item.reporter?.name || item.reg_no)}</b></div></div>${item.image&&/^https?:\/\//i.test(item.image)?`<p><a class="text-link" href="${escapeHtml(item.image)}" target="_blank" rel="noopener">Open item image ↗</a></p>`:''}${item.type==='found'&&item.status==='Open'&&state.user&&String(item.reporter?._id)!==String(state.user.id)?`<button class="btn btn-primary form-submit" data-action="claim" data-id="${item._id}">Submit a claim ↗</button>`:''}`);}
  catch(e){toast(e.message,'error');}
}
function claimModal(id) {
  if (!state.user) return authModal();
  const item=state.items.find(x=>String(x._id)===String(id));
  showModal(`<div class="modal-kicker">CLAIM VERIFICATION</div><h2>Is this yours?</h2><p class="modal-intro">${item?`You're claiming <b>${escapeHtml(item.name)}</b>. `:''}Share a few details only the owner would know. An administrator will review your claim.</p><form id="claimForm"><div id="claimError"></div><div class="field"><label for="claimProof">How can you identify this item? *</label><textarea id="claimProof" name="proof" required minlength="8" maxlength="1500" placeholder="Describe a unique mark, contents, serial number or another detail…"></textarea></div><p class="modal-intro">Avoid sharing passwords, bank details or other sensitive information.</p><button class="btn btn-primary form-submit" type="submit">Send claim for review ↗</button></form>`);
  $('claimForm').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Submitting…';try{await api('/api/claims',{method:'POST',body:JSON.stringify({item_id:id,proof:$('claimProof').value})});closeModal();toast('Claim submitted. You can track it in My activity.');await loadItems();if(state.view==='activity')loadActivity();}catch(err){$('claimError').innerHTML=errorBox(err.message);btn.disabled=false;btn.textContent='Send claim for review ↗';}};
}
function signOut(showToast=true){state.token='';state.user=null;localStorage.removeItem('foundry_token');localStorage.removeItem('foundry_user');updateAuthUI();if(state.view!=='home')setView('home');if(showToast)toast('You have signed out.');}
async function loadActivity(){if(!state.user){showModal(`<div class="modal-kicker">YOUR SPACE</div><h2>Sign in to see your activity.</h2><p class="modal-intro">Your reports and claim updates are connected to your campus account.</p><button class="btn btn-primary form-submit" id="activitySignIn">Sign in ↗</button>`);$('activitySignIn').onclick=()=>authModal();return;} $('myReports').innerHTML='<div class="no-data">Loading reports…</div>';$('myClaims').innerHTML='<div class="no-data">Loading claims…</div>';try{const [r,c]=await Promise.all([api('/api/items/mine/reports'),api('/api/claims/mine')]);$('myReportsCount').textContent=r.items.length;$('myClaimsCount').textContent=c.claims.length;$('myReports').innerHTML=r.items.length?r.items.map(i=>`<div class="stack-row"><div class="stack-icon">${itemEmoji(i)}</div><div class="stack-content"><b>${escapeHtml(i.name)}</b><p>${escapeHtml(i.type.toUpperCase())} · ${escapeHtml(i.location)}</p><small>${dateText(i.date)}</small></div><div class="stack-side"><span class="status-text ${statusClass(i.status)}">${escapeHtml(i.status)}</span></div></div>`).join(''):'<div class="no-data">You have not posted any reports yet.</div>';$('myClaims').innerHTML=c.claims.length?c.claims.map(cl=>`<div class="stack-row"><div class="stack-icon">🧾</div><div class="stack-content"><b>${escapeHtml(cl.item_id?.name||'Item unavailable')}</b><p>${escapeHtml(cl.proof)}</p><small>Submitted ${dateText(cl.claim_date)}${cl.reviewNote?` · ${escapeHtml(cl.reviewNote)}`:''}</small></div><div class="stack-side"><span class="status-text ${statusClass(cl.status)}">${escapeHtml(cl.status)}</span></div></div>`).join(''):'<div class="no-data">No claims yet. Found an item that could be yours? Browse found items.</div>';}catch(e){$('myReports').innerHTML=`<div class="no-data">${escapeHtml(e.message)}</div>`;$('myClaims').innerHTML='';}}
async function loadAdmin(){if(state.user?.role!=='admin'){toast('Administrator access required.','error');setView('home');return;}$('adminStats').innerHTML='<div class="loading-card">Loading dashboard…</div>';try{const [data,claimsData,logsData]=await Promise.all([api('/api/admin/dashboard'),api('/api/claims/admin/all'),api('/api/admin/audit-logs')]);state.adminData=data;const s=data.stats;$('adminStats').innerHTML=[['Student accounts',s.users,'Registered community'],['Lost reports',s.lost,'Needs a match'],['Found reports',s.found,'Waiting to reunite'],['Pending claims',s.pendingClaims,'Needs review'],['Items reunited',s.claimed,'Marked claimed']].map(([label,num,sub])=>`<div class="admin-stat"><span>${label}</span><strong>${num}</strong><small>${sub}</small></div>`).join('');const pending=claimsData.claims.filter(c=>c.status==='Pending');$('pendingCount').textContent=pending.length;$('adminClaims').innerHTML=pending.length?pending.map(c=>`<div class="stack-row"><div class="stack-icon">🧾</div><div class="stack-content"><b>${escapeHtml(c.item_id?.name||'Unknown item')}</b><p>${escapeHtml(c.claimant?.name||c.reg_no)} · ${escapeHtml(c.claimant?.reg_no||c.reg_no)}</p><p>${escapeHtml(c.proof)}</p><small>Submitted ${dateText(c.claim_date)}</small><div class="review-actions"><button class="approve-btn" data-action="review" data-id="${c._id}" data-status="Approved">Approve claim</button><button class="reject-btn" data-action="review" data-id="${c._id}" data-status="Rejected">Reject</button></div></div><div class="stack-side"><span class="status-text pending">Pending</span></div></div>`).join(''):'<div class="no-data">All caught up. No pending claims.</div>';$('auditLogs').innerHTML=logsData.logs.length?logsData.logs.slice(0,20).map(log=>`<div class="stack-row"><div class="stack-icon">${log.action.includes('CLAIM')?'✓':log.action.includes('ITEM')?'⌕':'↗'}</div><div class="stack-content"><b>${escapeHtml(log.action.replaceAll('_',' '))}</b><p>${escapeHtml(log.actor?.name||log.actorRegNo||'System')}${log.details?.name?` · ${escapeHtml(log.details.name)}`:''}</p><small>${dateText(log.createdAt)} · ${new Date(log.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</small></div></div>`).join(''):'<div class="no-data">No audit activity yet.</div>';$('adminItems').innerHTML=data.recentItems.map(i=>`<tr><td><strong>${escapeHtml(i.name)}</strong></td><td>${escapeHtml(i.type)}</td><td>${escapeHtml(i.category)}</td><td>${escapeHtml(i.reporter?.name||i.reg_no)}</td><td><span class="status-text ${statusClass(i.status)}">${escapeHtml(i.status)}</span></td><td>${dateText(i.date)}</td></tr>`).join('')||'<tr><td colspan="6">No reports yet.</td></tr>';}catch(e){$('adminStats').innerHTML=`<div class="loading-card">${escapeHtml(e.message)}</div>`;}}
async function reviewClaim(id,status){let reviewNote='';if(status==='Rejected'){reviewNote=prompt('Optional note for the claimant (do not include sensitive details):')||'';}try{await api(`/api/claims/${id}/review`,{method:'PATCH',body:JSON.stringify({status,reviewNote})});toast(`Claim ${status.toLowerCase()}.`);await loadAdmin();await loadItems();}catch(e){toast(e.message,'error');}}
function resetFilters(){state.type='all';$('searchInput').value='';$('categoryFilter').value='all';$('statusFilter').value='all';document.querySelectorAll('#typeTabs button').forEach(b=>b.classList.toggle('selected',b.dataset.type==='all'));loadItems();}
$('authBtn').onclick=()=>state.user?signOut():authModal();['reportTop','heroReport','ctaReport','activityReport'].forEach(id=>$(id).onclick=reportModal);$('modalClose').onclick=closeModal;$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});$('menuBtn').onclick=()=>document.querySelector('.nav').classList.toggle('open');document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('.nav').classList.remove('open');if(a.dataset.view==='activity'&&!state.user){authModal();return;}setView(a.dataset.view);}));document.querySelectorAll('#typeTabs button').forEach(b=>b.onclick=()=>{state.type=b.dataset.type;document.querySelectorAll('#typeTabs button').forEach(x=>x.classList.toggle('selected',x===b));loadItems();});let searchTimer;$('searchInput').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadItems,250);});$('categoryFilter').onchange=loadItems;$('statusFilter').onchange=loadItems;$('clearFilters').onclick=resetFilters;$('emptyReset').onclick=resetFilters;$('refreshAdmin').onclick=loadAdmin;
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const {action,id,status}=btn.dataset;if(action==='details')detailsModal(id);if(action==='claim')claimModal(id);if(action==='signin')authModal();if(action==='review')reviewClaim(id,status);});
(async function init(){updateAuthUI();try{const health=await api('/api/health');if(health.database!=='connected')toast('Database is not connected yet.','error');}catch(e){}await loadItems();if(state.user&&state.token){try{const me=await api('/api/auth/me');state.user=me.user;localStorage.setItem('foundry_user',JSON.stringify(state.user));updateAuthUI();}catch(e){}}})();
