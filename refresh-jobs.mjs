import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
const JOBS_PATH = new URL('data/jobs.json', ROOT);
const SOURCES_PATH = new URL('data/sources.json', ROOT);
const now = new Date();
const today = now.toISOString().slice(0, 10);

const FIELD_RULES = {
  'Accounting': /accounting|audit|taxation|financial reporting/i,
  'Economics': /economics?|economist|economic analysis|political economy/i,
  'Finance': /finance|financial economics?|asset pricing|corporate finance/i,
  'Strategy': /strategy|strategic management|entrepreneurship|innovation/i,
  'Organizational Behavior': /organizational behavio[u]?r|organizations?|management of organizations|human resources|leadership/i,
  'Marketing': /marketing|consumer behavio[u]?r/i,
  'Operations & Analytics': /operations|supply chain|business analytics|decision science|management science/i,
  'Information Systems & AI': /information systems?|information technology|artificial intelligence|data science/i,
  'Health Policy': /health policy|health economics?|health services|health equity|health systems?|health care policy/i
};
const ROLE_RULE = /post[- ]?doc|fellow|assistant professor|associate professor|open rank|all ranks|tenure[- ]?(track|line|stream)|faculty position|senior lecturer|lecturer|junior professor/i;
const CLOSED_RULE = /position (has been )?filled|applications? (are )?closed|no longer accepting|posting is closed|job has expired/i;
const DEADLINE_RULE = /(?:deadline|apply by|full consideration|received no later than)[^\w]{0,12}([A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+20\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})/i;

const clean = (text = '') => text.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const absoluteUrl = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };
const idFor = (institution, title, url) => `${slug(institution)}-${createHash('sha1').update(`${title}|${url}`).digest('hex').slice(0, 10)}`;
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const inferFields = text => Object.entries(FIELD_RULES).filter(([, rule]) => rule.test(text)).map(([field]) => field);
const inferRoles = text => {
  const roles = [];
  if (/post[- ]?doc|fellow/i.test(text)) roles.push('Postdoctoral');
  if (/assistant professor/i.test(text)) roles.push('Assistant Professor');
  if (/\blecturer\b|junior professor/i.test(text)) roles.push('Assistant Professor');
  if (/associate professor/i.test(text)) roles.push('Associate Professor');
  if (/senior lecturer/i.test(text)) roles.push('Associate Professor');
  if (/open rank|all ranks|assistant, associate, or full/i.test(text)) roles.push('Open Rank');
  return roles.length ? roles : ['Open Rank'];
};
const parseDate = value => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
};

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'FacultyMarketRadar/1.0 (+weekly academic job monitor)', accept: 'text/html,application/xhtml+xml' }
    });
    return { ok: response.ok, status: response.status, url: response.url, text: response.ok ? await response.text() : '' };
  } catch (error) {
    return { ok: false, status: 0, url, text: '', error: error.message };
  } finally { clearTimeout(timeout); }
}

function jsonLdJobs(html) {
  const results = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1].trim());
      const queue = Array.isArray(data) ? [...data] : [data];
      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== 'object') continue;
        if (Array.isArray(item['@graph'])) queue.push(...item['@graph']);
        if (item['@type'] === 'JobPosting' || (Array.isArray(item['@type']) && item['@type'].includes('JobPosting'))) results.push(item);
      }
    } catch { /* malformed metadata on source page; link discovery still runs */ }
  }
  return results;
}

function anchorCandidates(html, baseUrl) {
  const found = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = clean(match[2]);
    const url = absoluteUrl(match[1], baseUrl);
    if (url && title.length >= 12 && title.length <= 180 && ROLE_RULE.test(title) && inferFields(title).length) found.push({ title, url });
  }
  return [...new Map(found.map(item => [item.url, item])).values()].slice(0, 20);
}

function jobFromJsonLd(item, source, pageUrl) {
  const title = clean(item.title || item.name || '');
  const description = clean(item.description || '');
  const combined = `${title} ${description}`;
  const fields = inferFields(combined);
  if (!ROLE_RULE.test(combined) || !fields.length) return null;
  const location = item.jobLocation?.address || item.jobLocation?.[0]?.address || {};
  const locality = typeof location === 'string' ? location : [location.addressLocality, location.addressRegion].filter(Boolean).join(', ');
  const url = item.url || pageUrl;
  return {
    id: idFor(source.institution, title, url), title, institution: source.institution,
    school: source.institution, location: locality || source.region, region: mapRegion(source.region), fields,
    roleTypes: inferRoles(combined), track: /tenure/i.test(combined) ? 'Tenure-track' : /post[- ]?doc|fellow/i.test(combined) ? 'Fellowship' : 'Faculty',
    postedDate: parseDate(item.datePosted), addedDate: today, deadline: parseDate(item.validThrough), startDate: null,
    status: 'open', url, summary: description.slice(0, 230) || 'See the official posting for full position details.',
    source: 'Structured data from official source', automated: true
  };
}

function mapRegion(region) {
  if (region.startsWith('US ')) return 'United States';
  if (region === 'Canada') return 'Canada';
  return region.includes('Europe') ? 'Europe' : region;
}

async function enrichCandidate(candidate, source) {
  const page = await fetchText(candidate.url);
  if (!page.ok) return null;
  const text = clean(page.text).slice(0, 120000);
  if (CLOSED_RULE.test(text)) return null;
  const fields = inferFields(`${candidate.title} ${text.slice(0, 12000)}`);
  if (!fields.length || !ROLE_RULE.test(`${candidate.title} ${text.slice(0, 12000)}`)) return null;
  const deadlineMatch = text.match(DEADLINE_RULE);
  return {
    id: idFor(source.institution, candidate.title, page.url), title: candidate.title, institution: source.institution,
    school: source.institution, location: source.region, region: mapRegion(source.region), fields,
    roleTypes: inferRoles(`${candidate.title} ${text.slice(0, 8000)}`), track: /tenure/i.test(text.slice(0, 12000)) ? 'Tenure-track' : /post[- ]?doc|fellow/i.test(candidate.title) ? 'Fellowship' : 'Faculty',
    postedDate: null, addedDate: today, deadline: parseDate(deadlineMatch?.[1]), startDate: null, status: 'open',
    url: page.url, summary: 'Newly discovered by the weekly source scan. Confirm full details on the official posting.',
    source: 'Official recruiting source', automated: true
  };
}

async function main() {
  const jobsData = JSON.parse(await readFile(JOBS_PATH, 'utf8'));
  const sourceData = JSON.parse(await readFile(SOURCES_PATH, 'utf8'));
  const existingByUrl = new Map(jobsData.jobs.map(job => [normalize(job.url), job]));
  const discoveries = [];
  const audit = [];

  for (const source of sourceData.sources) {
    const page = await fetchText(source.url);
    audit.push({ institution: source.institution, url: source.url, ok: page.ok, status: page.status, checkedAt: now.toISOString() });
    if (!page.ok) continue;
    for (const item of jsonLdJobs(page.text)) {
      const job = jobFromJsonLd(item, source, page.url);
      if (job && !existingByUrl.has(normalize(job.url))) discoveries.push(job);
    }
    if (source.discoverLinks) {
      for (const candidate of anchorCandidates(page.text, page.url)) {
        if (existingByUrl.has(normalize(candidate.url)) || discoveries.some(job => normalize(job.url) === normalize(candidate.url))) continue;
        const job = await enrichCandidate(candidate, source);
        if (job) discoveries.push(job);
      }
    }
  }

  const checkedJobs = [];
  for (const job of jobsData.jobs) {
    const deadlinePassed = job.deadline && job.deadline < today;
    const check = await fetchText(job.url);
    const explicitlyClosed = check.ok && CLOSED_RULE.test(clean(check.text).slice(0, 80000));
    checkedJobs.push({ ...job, status: (deadlinePassed || explicitlyClosed) && job.status !== 'watchlist' ? 'closed' : job.status, lastVerifiedAt: now.toISOString(), sourceReachable: check.ok });
  }

  const merged = [...checkedJobs, ...dedupe(discoveries)].sort((a, b) => (b.postedDate || b.addedDate || '').localeCompare(a.postedDate || a.addedDate || ''));
  await writeFile(JOBS_PATH, `${JSON.stringify({ ...jobsData, lastCheckedAt: now.toISOString(), jobs: merged }, null, 2)}\n`);
  await writeFile(new URL('data/source-health.json', ROOT), `${JSON.stringify({ checkedAt: now.toISOString(), sources: audit }, null, 2)}\n`);
  console.log(`Checked ${audit.length} sources; retained ${checkedJobs.length} jobs; discovered ${discoveries.length} candidates.`);
}

function normalize(url) { try { const value = new URL(url); value.hash = ''; value.searchParams.delete('utm_source'); return value.href.replace(/\/$/, ''); } catch { return url; } }
function dedupe(jobs) { return [...new Map(jobs.map(job => [normalize(job.url), job])).values()]; }

await main();
