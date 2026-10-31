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
const dateAtNoon = (value) => new Date(`${value}T12:00:00`);
const formatDate = (value, options = { day: "numeric", month: "long" }) =>
  new Intl.DateTimeFormat("es-ES", options).format(dateAtNoon(value));
const today = new Date();
today.setHours(0, 0, 0, 0);

let events = [];
let allNews = [];
let selectedFilter = "all";

function renderNews(items) {
  const query = byId("news-search").value.trim().toLocaleLowerCase("es");
  const matches = items.filter((item) => `${item.title} ${item.summary} ${item.source} ${item.category}`
    .toLocaleLowerCase("es").includes(query));
  byId("news-count").textContent = `${matches.length} ${matches.length === 1 ? "noticia" : "noticias"} · fuentes verificables`;
  byId("news-empty").hidden = matches.length > 0;
  byId("news-grid").innerHTML = matches.map((item, index) => `
    <article class="news-card${index === 0 ? " news-card-featured" : ""}">
      <div class="news-card-top"><span class="category-label">${escapeHTML(item.category)}</span><time datetime="${escapeHTML(item.date)}">${formatDate(item.date, { day: "numeric", month: "short", year: "numeric" })}</time></div>
      <h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.summary)}</p>
      <a class="news-source" href="${escapeHTML(safeURL(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.source)} <span aria-hidden="true">↗</span><span class="visually-hidden"> (abre en una pestaña nueva)</span></a>
    </article>`).join("");
}

function eventMatches(event) {
  const query = byId("event-search").value.trim().toLocaleLowerCase("es");
  const matchesQuery = `${event.country} ${event.name} ${event.source}`.toLocaleLowerCase("es").includes(query);
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
    const eventMonth = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(dateAtNoon(event.date));
    const heading = eventMonth !== month ? `<h3 class="month-heading">${escapeHTML(eventMonth)}</h3>` : "";
    month = eventMonth;
    const dateLabel = event.tbc ? event.period : formatDate(event.date, { weekday: "short", day: "numeric", month: "short" });
    const dateDetails = event.tbc ? "DÍA POR CONFIRMAR" : formatDate(event.date, { year: "numeric" });
    const flag = event.code === "bg" ? "✦" : `<img src="https://flagcdn.com/w80/${escapeHTML(event.code)}.png" alt="" loading="lazy">`;
    const type = event.kind === "eurovision" ? "EUROVISIÓN" : "PRESELECCIÓN";
    return `${heading}<article class="event-card${event.kind === "eurovision" ? " event-card-esc" : ""}${event.tbc ? " event-card-tbc" : ""}">
      <div class="event-date"><span>${escapeHTML(dateLabel)}</span><small>${escapeHTML(dateDetails)}</small></div>
      <span class="event-flag" aria-hidden="true">${flag}</span>
      <div class="event-info"><span class="event-type">${type}</span><h4>${escapeHTML(event.name)}</h4><p>${escapeHTML(event.country)} <span>·</span> ${escapeHTML(event.source)}</p></div>
      <a class="event-link" href="${escapeHTML(safeURL(event.link))}" target="_blank" rel="noopener noreferrer" aria-label="Más información: ${escapeHTML(event.name)}">↗</a>
    </article>`;
  }).join("");
}

function renderFinals() {
  const finals = events.filter((event) => event.kind === "eurovision");
  byId("finals-grid").innerHTML = finals.map((event, index) => `
    <a class="final-card final-card-${index + 1}" href="${escapeHTML(safeURL(event.link))}" target="_blank" rel="noopener noreferrer">
      <span class="final-number">0${index + 1} / 03</span><span class="final-symbol">${index === 2 ? "✦" : "♫"}</span>
      <span class="final-name">${escapeHTML(event.name)}</span><span class="final-date">${formatDate(event.date, { weekday: "long", day: "numeric", month: "long" })} <b>↗</b></span>
    </a>`).join("");
}

function updateCountdown() {
  const finalDate = dateAtNoon("2027-05-15");
  const remaining = Math.max(0, Math.ceil((finalDate - today) / 86400000));
  byId("countdown").textContent = remaining.toLocaleString("es-ES");
}

async function loadData() {
  try {
    const [newsResponse, calendarResponse] = await Promise.all([fetch("data/news.json"), fetch("data/calendar.json")]);
    if (!newsResponse.ok || !calendarResponse.ok) throw new Error("No se pudieron cargar los datos.");
    const [news, calendar] = await Promise.all([newsResponse.json(), calendarResponse.json()]);
    allNews = news.sort((a, b) => b.date.localeCompare(a.date));
    events = calendar.sort((a, b) => a.date.localeCompare(b.date));
    renderNews(allNews);
    renderCalendar();
    renderFinals();
  } catch (error) {
    byId("news-grid").innerHTML = '<p class="empty-state">No se han podido cargar las noticias. Abre la web desde un servidor local.</p>';
    byId("calendar-list").innerHTML = '<p class="empty-state">No se ha podido cargar el calendario.</p>';
  }
}

byId("news-search").addEventListener("input", () => renderNews(allNews));
byId("event-search").addEventListener("input", renderCalendar);
document.querySelectorAll(".filter-button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("is-selected"));
  button.classList.add("is-selected");
  selectedFilter = button.dataset.filter;
  renderCalendar();
}));
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("is-active"));
  link.classList.add("is-active");
}));
updateCountdown();
loadData();
