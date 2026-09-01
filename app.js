const state = {
  jobs: [], sources: [], saved: new Set(JSON.parse(localStorage.getItem('fmr-saved') || '[]')),
  shown: 9, savedOnly: false, view: 'grid'
};

const $ = (selector) => document.querySelector(selector);
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const today = new Date(); today.setHours(0,0,0,0);
const daysBetween = (date) => date ? Math.ceil((new Date(`${date}T23:59:59`) - today) / 86400000) : null;
const prettyDate = (value) => value ? fmt.format(new Date(`${value}T12:00:00`)) : 'Date not listed';

async function init() {
  try {
    const [jobsResponse, sourcesResponse] = await Promise.all([fetch('data/jobs.json'), fetch('data/sources.json')]);
    if (!jobsResponse.ok || !sourcesResponse.ok) throw new Error('Data could not be loaded.');
    const jobData = await jobsResponse.json();
    const sourceData = await sourcesResponse.json();
    state.jobs = jobData.jobs;
    state.sources = sourceData.sources;
    setupFilters();
    bindEvents();
    renderCoverage();
    renderStats(jobData);
    renderJobs();
  } catch (error) {
    $('#jobGrid').innerHTML = `<p class="empty-state">${error.message} Please refresh the page.</p>`;
  }
}

function setupFilters() {
  const fields = [...new Set(state.jobs.flatMap(job => job.fields))].sort();
  $('#fieldFilter').insertAdjacentHTML('beforeend', fields.map(field => `<option value="${escapeHtml(field)}">${escapeHtml(field)}</option>`).join(''));
}

function bindEvents() {
  ['searchInput','fieldFilter','typeFilter','regionFilter','sortFilter'].forEach(id => {
    $(`#${id}`).addEventListener('input', () => { state.shown = 9; renderJobs(); });
  });
  $('#clearFilters').addEventListener('click', resetFilters);
  $('#emptyReset').addEventListener('click', resetFilters);
  $('#loadMore').addEventListener('click', () => { state.shown += 9; renderJobs(); });
  $('#savedToggle').addEventListener('click', () => {
    state.savedOnly = !state.savedOnly;
    $('#savedToggle').setAttribute('aria-pressed', String(state.savedOnly));
    $('#savedToggle').classList.toggle('active', state.savedOnly);
    state.shown = 99; renderJobs();
  });
  $('#gridView').addEventListener('click', () => setView('grid'));
  $('#listView').addEventListener('click', () => setView('list'));
  $('#coverageToggle').addEventListener('click', () => {
    const expanded = $('#coverageGrid').classList.toggle('expanded');
    $('#coverageToggle').setAttribute('aria-expanded', String(expanded));
    $('#coverageToggle').innerHTML = expanded ? 'Show priority sources <span aria-hidden="true">−</span>' : 'View all monitored sources <span aria-hidden="true">＋</span>';
  });
}

function setView(view) {
  state.view = view;
  $('#jobGrid').classList.toggle('list', view === 'list');
  $('#gridView').classList.toggle('active', view === 'grid');
  $('#listView').classList.toggle('active', view === 'list');
  $('#gridView').setAttribute('aria-pressed', String(view === 'grid'));
  $('#listView').setAttribute('aria-pressed', String(view === 'list'));
}

function resetFilters() {
  $('#searchInput').value = '';
  ['fieldFilter','typeFilter','regionFilter'].forEach(id => $(`#${id}`).value = 'all');
  $('#sortFilter').value = 'newest';
  state.savedOnly = false; state.shown = 9;
  $('#savedToggle').setAttribute('aria-pressed', 'false');
  renderJobs();
}

function filteredJobs() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const field = $('#fieldFilter').value;
  const type = $('#typeFilter').value;
  const region = $('#regionFilter').value;
  return state.jobs.filter(job => {
    if (!['open','watchlist'].includes(job.status)) return false;
    const haystack = [job.title, job.institution, job.school, job.location, job.summary, ...job.fields].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) &&
      (field === 'all' || job.fields.includes(field)) &&
      (type === 'all' || job.roleTypes.includes(type)) &&
      (region === 'all' || normalizedRegion(job) === region) &&
      (!state.savedOnly || state.saved.has(job.id));
  }).sort((a,b) => {
    const sort = $('#sortFilter').value;
    if (sort === 'school') return a.institution.localeCompare(b.institution);
    if (sort === 'deadline') return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31');
    return (b.postedDate || b.addedDate || '').localeCompare(a.postedDate || a.addedDate || '');
  });
}

function normalizedRegion(job) {
  const location = `${job.location || ''} ${job.school || ''} ${job.institution || ''}`;
  const asiaLocation = /\b(?:Asia|Bangladesh|Bhutan|Brunei|Cambodia|China|Hong Kong|India|Indonesia|Iraq|Israel|Japan|Jordan|Kazakhstan|Kuwait|Laos|Lebanon|Macao|Macau|Malaysia|Maldives|Mongolia|Myanmar|Nepal|Oman|Pakistan|Philippines|Qatar|Saudi Arabia|Singapore|South Korea|Sri Lanka|Taiwan|Thailand|United Arab Emirates|Vietnam)\b/i;
  if (job.region === 'Asia' || asiaLocation.test(location)) return 'Asia';
  return job.region;
}

function renderJobs() {
  const jobs = filteredJobs();
  const visible = jobs.slice(0, state.shown);
  const grid = $('#jobGrid');
  grid.innerHTML = '';
  visible.forEach(job => grid.appendChild(createCard(job)));
  $('#resultCount').textContent = jobs.length;
  $('#emptyState').hidden = jobs.length !== 0;
  $('#loadMore').hidden = jobs.length <= state.shown;
  $('#savedCount').textContent = state.saved.size;
}

function createCard(job) {
  const card = $('#jobCardTemplate').content.firstElementChild.cloneNode(true);
  const deadlineDays = daysBetween(job.deadline);
  const age = daysBetween(job.postedDate || job.addedDate);
  const isNew = age !== null && age <= 14 && age >= 0;
  const badge = card.querySelector('.status-badge');
  badge.textContent = job.status === 'watchlist' ? 'Watchlist' : isNew ? 'New' : 'Verified';
  badge.classList.add(job.status === 'watchlist' ? 'watchlist' : isNew ? 'new' : 'verified');
  card.querySelector('.card-date').textContent = job.postedDate ? `Posted ${prettyDate(job.postedDate)}` : `Added ${prettyDate(job.addedDate)}`;
  card.querySelector('h3').textContent = job.title;
  card.querySelector('.institution').textContent = job.institution;
  card.querySelector('.location').textContent = `${job.school} · ${job.location}`;
  card.querySelector('.tag-row').innerHTML = [...job.fields.slice(0,2), job.track].filter(Boolean).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  card.querySelector('.summary').textContent = job.summary;
  const deadlineRow = card.querySelector('.deadline-row');
  deadlineRow.querySelector('span').textContent = job.deadlineLabel || 'Deadline';
  const deadline = deadlineRow.querySelector('strong');
  deadline.textContent = job.deadlineDisplay || (job.deadline ? prettyDate(job.deadline) : 'Not listed');
  if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 30 && job.deadlineLabel !== 'Review begins') deadline.classList.add('urgent');
  const link = card.querySelector('.card-link'); link.href = job.url;
  const save = card.querySelector('.save-job');
  save.classList.toggle('saved', state.saved.has(job.id));
  save.textContent = state.saved.has(job.id) ? '★' : '☆';
  save.setAttribute('aria-label', `${state.saved.has(job.id) ? 'Remove' : 'Save'} ${job.title}`);
  save.addEventListener('click', () => toggleSave(job.id));
  return card;
}

function toggleSave(id) {
  state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
  localStorage.setItem('fmr-saved', JSON.stringify([...state.saved]));
  renderJobs();
}

function renderStats(data) {
  const active = state.jobs.filter(job => ['open','watchlist'].includes(job.status));
  const newJobs = active.filter(job => { const age = daysBetween(job.postedDate || job.addedDate); return age !== null && age >= 0 && age <= 7; });
  const urgent = active.filter(job => { const d = daysBetween(job.deadline); return d !== null && d >= 0 && d <= 30 && job.deadlineLabel !== 'Review begins'; });
  $('#briefCount').textContent = active.length;
  $('#newCount').textContent = newJobs.length;
  $('#urgentCount').textContent = urgent.length;
  $('#sourceCount').textContent = state.sources.length;
  $('#coverageCount').textContent = state.sources.length;
  $('#lastChecked').textContent = prettyDate(data.lastCheckedAt.slice(0,10));
  $('#lastChecked').dateTime = data.lastCheckedAt;
}

function renderCoverage() {
  $('#coverageGrid').innerHTML = state.sources.map((source, index) => `
    <article class="source-card ${index >= 8 ? 'extra' : ''}">
      <p class="source-region">${escapeHtml(source.region)} · ${source.classification}</p>
      <a href="${source.url}" target="_blank" rel="noopener"><h3>${escapeHtml(source.institution)}</h3></a>
      <p>${escapeHtml(source.fields.join(' · '))}</p>
    </article>`).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

init();
