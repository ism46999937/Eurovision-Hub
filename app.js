"use strict";

const byId = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const safeURL = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "#";
  } catch {
    return "#";
  }
};

// ---- Idioma -------------------------------------------------------------
const LOCALES = { es: "es-ES", en: "en-GB", de: "de-DE", it: "it-IT" };
let lang = "es";
const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
const PHRASE_MAP = Object.fromEntries(PHRASES.map((phrase) => [phrase.es, phrase]));
const PHRASE_REGEX = new RegExp([...PHRASES].sort((a, b) => b.es.length - a.es.length)
  .map((phrase) => phrase.es.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
const tr = (text) => lang === "es" ? String(text ?? "") : String(text ?? "").replace(PHRASE_REGEX, (match) => PHRASE_MAP[match][lang] || match);
const region = (code) => {
  try {
    return new Intl.DisplayNames([LOCALES[lang]], { type: "region" }).of(String(code).toUpperCase()) || code;
  } catch {
    return code;
  }
};

const dateAtNoon = (value) => new Date(`${value}T12:00:00`);
const formatDate = (value, options = { day: "numeric", month: "long" }) =>
  new Intl.DateTimeFormat(LOCALES[lang], options).format(dateAtNoon(value));
const today = new Date();
today.setHours(0, 0, 0, 0);

const loadJSON = (path) => fetch(path).then((response) => {
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
  return response.json();
});
const flagHTML = (code) => `<img src="https://flagcdn.com/w40/${escapeHTML(code)}.png" alt="" loading="lazy" width="24" height="18">`;

let events = [];
let allNews = [];
let participants = { countries: [], pending: [], absent: [] };
let odds = {};
let oddsEdition = "2027";
let selectedFilter = "all";

const localized = (item) => (item.i18n && item.i18n[lang]) || item;

function renderNews(items) {
  const query = byId("news-search").value.trim().toLocaleLowerCase(LOCALES[lang]);
  const matches = items.filter((item) => {
    const loc = localized(item);
    return `${loc.title} ${loc.summary} ${item.source} ${loc.category}`.toLocaleLowerCase(LOCALES[lang]).includes(query);
  });
  byId("news-count").textContent = t(matches.length === 1 ? "news.one" : "news.other").replace("{n}", matches.length);
  byId("news-empty").hidden = matches.length > 0;
  byId("news-grid").innerHTML = matches.map((item, index) => {
    const loc = localized(item);
    return `
    <article class="news-card${index === 0 ? " news-card-featured" : ""}">
      <div class="news-card-top"><span class="category-label">${escapeHTML(loc.category)}</span><time datetime="${escapeHTML(item.date)}">${formatDate(item.date, { day: "numeric", month: "short", year: "numeric" })}</time></div>
      <h3>${escapeHTML(loc.title)}</h3><p>${escapeHTML(loc.summary)}</p>
      <a class="news-source" href="${escapeHTML(safeURL(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(tr(item.source))} <span aria-hidden="true">↗</span><span class="visually-hidden"> ${escapeHTML(t("news.newtab"))}</span></a>
    </article>`;
  }).join("");
}

const eventCountry = (event) => event.kind === "eurovision" ? tr(event.country) : region(event.code);

function eventMatches(event) {
  const query = byId("event-search").value.trim().toLocaleLowerCase(LOCALES[lang]);
  const matchesQuery = `${eventCountry(event)} ${tr(event.name)} ${event.source}`.toLocaleLowerCase(LOCALES[lang]).includes(query);
  const eventDate = dateAtNoon(event.date);
  const isUpcoming = event.tbc || eventDate >= today;
  const matchesFilter = selectedFilter === "all" || (selectedFilter === "upcoming" && isUpcoming) || (selectedFilter === "eurovision" && event.kind === "eurovision");
  return matchesQuery && matchesFilter;
}

function renderCalendar() {
  const filtered = events.filter(eventMatches);
  byId("calendar-empty").hidden = filtered.length > 0;
  let month = "";
  byId("calendar-list").innerHTML = filtered.map((event) => {
    const eventMonth = new Intl.DateTimeFormat(LOCALES[lang], { month: "long", year: "numeric" }).format(dateAtNoon(event.date));
    const heading = eventMonth !== month ? `<h3 class="month-heading">${escapeHTML(eventMonth)}</h3>` : "";
    month = eventMonth;
    const name = tr(event.name);
    const dateLabel = event.tbc ? tr(event.period) : formatDate(event.date, { weekday: "short", day: "numeric", month: "short" });
    const dateDetails = event.tbc ? tr("DÍA POR CONFIRMAR") : formatDate(event.date, { year: "numeric" });
    const flag = event.code === "bg" ? "✦" : flagHTML(event.code);
    const type = t(event.kind === "eurovision" ? "cal.typeEsc" : "cal.typeSel");
    return `${heading}<article class="event-card${event.kind === "eurovision" ? " event-card-esc" : ""}${event.tbc ? " event-card-tbc" : ""}">
      <div class="event-date"><span>${escapeHTML(dateLabel)}</span><small>${escapeHTML(dateDetails)}</small></div>
      <span class="event-flag" aria-hidden="true">${flag}</span>
      <div class="event-info"><span class="event-type">${escapeHTML(type)}</span><h4>${escapeHTML(name)}</h4><p>${escapeHTML(eventCountry(event))} <span>·</span> ${escapeHTML(tr(event.source))}</p></div>
      <a class="event-link" href="${escapeHTML(safeURL(event.link))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(t("cal.more").replace("{name}", name))}">↗</a>
    </article>`;
  }).join("");
}

function renderFinals() {
  const finals = events.filter((event) => event.kind === "eurovision");
  byId("finals-grid").innerHTML = finals.map((event, index) => `
    <a class="final-card final-card-${index + 1}" href="${escapeHTML(safeURL(event.link))}" target="_blank" rel="noopener noreferrer">
      <span class="final-number">0${index + 1} / 03</span><span class="final-symbol">${index === 2 ? "✦" : "♫"}</span>
      <span class="final-name">${escapeHTML(tr(event.name))}</span><span class="final-date">${formatDate(event.date, { weekday: "long", day: "numeric", month: "long" })} <b>↗</b></span>
    </a>`).join("");
}

function renderParticipants() {
  const query = byId("participant-search").value.trim().toLocaleLowerCase(LOCALES[lang]);
  const rows = participants.countries.filter((item) => `${region(item.code)} ${item.broadcaster} ${tr(item.selection)}`.toLocaleLowerCase(LOCALES[lang]).includes(query));
  byId("participants-empty").hidden = rows.length > 0;
  byId("participants-body").innerHTML = rows.map((item, index) => {
    const tags = [item.tag === "direct" ? `<span class="tag tag-direct">${escapeHTML(t("tag.direct"))}</span>` : "", item.tag === "debut" ? `<span class="tag tag-new">${escapeHTML(t("tag.debut"))}</span>` : "", item.tag === "vuelve" ? `<span class="tag tag-new">${escapeHTML(t("tag.returns"))}</span>` : ""].join("");
    const selection = item.selection ? `${escapeHTML(tr(item.selection))}${item.date ? `<span class="cell-sub">${escapeHTML(tr(item.date))}</span>` : ""}` : `<span class="muted-cell">${escapeHTML(tr("Por confirmar"))}</span>`;
    return `<tr><td class="num">${index + 1}</td><td><span class="cell-country">${flagHTML(item.code)} ${escapeHTML(region(item.code))}</span></td><td>${escapeHTML(item.broadcaster)}</td><td>${selection}</td><td class="muted-cell">${escapeHTML(tr("Por anunciar"))}</td><td>${tags || `<span class="tag">${escapeHTML(t("tag.confirmed"))}</span>`}</td></tr>`;
  }).join("");
  byId("participants-summary").textContent = t("part.summary").replace("{n}", participants.countries.length);
  const pending = participants.pending.map((item) => `${region(item.code)} (${item.broadcaster})`).join(t("and"));
  const absent = participants.absent.map(region).join(", ");
  const source = `<a href="${escapeHTML(safeURL(participants.source))}" target="_blank" rel="noopener noreferrer">${escapeHTML(t("org"))} ↗</a>`;
  byId("participants-note").innerHTML = escapeHTML(t("part.note")).replace("{pending}", escapeHTML(pending)).replace("{absent}", escapeHTML(absent)).replace("{source}", source);
}

function renderOdds() {
  const data = odds[oddsEdition];
  if (!data) return;
  document.querySelectorAll(".odds-tab").forEach((tab) => {
    const selected = tab.dataset.edition === oddsEdition;
    tab.classList.toggle("is-selected", selected);
    tab.setAttribute("aria-pressed", String(selected));
  });
  byId("odds-note").textContent = t(`odds.note${oddsEdition}`);
  if (!data.rows.length) {
    byId("odds-body").innerHTML = `<div class="pending-box"><strong>${escapeHTML(t("odds.pendingTitle"))}</strong><br>${escapeHTML(t("odds.pendingBody"))}<br><button class="filter-button odds-tab" data-edition="2026">${escapeHTML(t("odds.pendingBtn"))}</button></div>`;
    return;
  }
  const head = data.bookmakers.map((name) => `<th class="num">${escapeHTML(name)}</th>`).join("");
  const body = data.rows.map((row, index) => {
    const best = Math.max(...row.odds);
    const cells = row.odds.map((value) => `<td class="num${value === best ? " best" : ""}">${value}</td>`).join("");
    return `<tr><td class="sticky-col"><span class="cell-country">${flagHTML(row.code)} ${escapeHTML(region(row.code))}</span><span class="cell-sub">${index + 1}. ${escapeHTML(row.artist)} · ${escapeHTML(row.song)}</span></td><td class="num">${row.chance}%</td>${cells}</tr>`;
  }).join("");
  byId("odds-body").innerHTML = `<div class="table-wrap"><table class="data-table odds-table"><thead><tr><th class="sticky-col">${escapeHTML(t("odds.thCountry"))}</th><th class="num">${escapeHTML(t("odds.thProb"))}</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function updateCountdown() {
  const finalDate = dateAtNoon("2027-05-15");
  const remaining = Math.max(0, Math.ceil((finalDate - today) / 86400000));
  byId("countdown").textContent = remaining.toLocaleString(LOCALES[lang]);
}

function renderAll() {
  if (!allNews.length && !events.length) return;
  renderNews(allNews);
  renderCalendar();
  renderFinals();
  renderParticipants();
  renderOdds();
}

function setLanguage(next, persist = true) {
  lang = LOCALES[next] ? next : "es";
  document.documentElement.lang = lang;
  document.title = t("title");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t("desc"));
  const updated = formatDate("2026-10-28", { day: "numeric", month: "long", year: "numeric" });
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.innerHTML = t(element.dataset.i18n).replace("{date}", updated);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attribute, key] = pair.split(":");
      element.setAttribute(attribute, t(key));
    });
  });
  byId("lang-select").value = lang;
  if (persist) {
    try { localStorage.setItem("eurovision-hub-lang", lang); } catch { /* sin almacenamiento */ }
  }
  updateCountdown();
  renderAll();
}

async function loadData() {
  try {
    const [news, calendar, people, oddsData] = await Promise.all([loadJSON("data/news.json"), loadJSON("data/calendar.json"), loadJSON("data/participants.json"), loadJSON("data/odds.json")]);
    participants = people;
    odds = oddsData;
    allNews = news.sort((a, b) => b.date.localeCompare(a.date));
    events = calendar.sort((a, b) => a.date.localeCompare(b.date));
    renderAll();
  } catch (error) {
    byId("news-grid").innerHTML = `<p class="empty-state">${escapeHTML(t("err.news"))}</p>`;
    byId("calendar-list").innerHTML = `<p class="empty-state">${escapeHTML(t("err.cal"))}</p>`;
  }
}

byId("news-search").addEventListener("input", () => renderNews(allNews));
byId("event-search").addEventListener("input", renderCalendar);
byId("participant-search").addEventListener("input", renderParticipants);
byId("lang-select").addEventListener("change", (event) => setLanguage(event.target.value));
document.addEventListener("click", (event) => {
  const tab = event.target.closest(".odds-tab");
  if (!tab) return;
  oddsEdition = tab.dataset.edition;
  renderOdds();
});
document.querySelectorAll(".filter-button[data-filter]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".filter-button[data-filter]").forEach((item) => item.classList.remove("is-selected"));
  button.classList.add("is-selected");
  selectedFilter = button.dataset.filter;
  renderCalendar();
}));
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("is-active"));
  link.classList.add("is-active");
}));

let savedLang = "es";
try { savedLang = localStorage.getItem("eurovision-hub-lang") || "es"; } catch { /* sin almacenamiento */ }
setLanguage(savedLang, false);
loadData();
