const reviewList = document.querySelector("#review-list");
const registryDate = document.querySelector("#registry-date");

const statusLabels = {
  planned: "Planned",
  "in-progress": "In progress",
  "ready-for-review": "Ready for review",
  "changes-requested": "Changes requested",
  accepted: "Accepted"
};

function appendText(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderEntry(entry) {
  const article = document.createElement("article");
  article.className = "review-card";

  const meta = document.createElement("div");
  meta.className = "review-meta";
  appendText(meta, "span", "task-id", entry.task);
  appendText(meta, "span", `status status-${entry.status}`, statusLabels[entry.status] || entry.status);
  article.append(meta);

  appendText(article, "h3", "", entry.title);
  appendText(article, "p", "review-summary", entry.summary);

  if (Array.isArray(entry.review) && entry.review.length) {
    appendText(article, "p", "review-label", "Review focus");
    const list = document.createElement("ul");
    for (const item of entry.review) appendText(list, "li", "", item);
    article.append(list);
  }

  const footer = document.createElement("div");
  footer.className = "review-footer";
  const link = document.createElement("a");
  link.href = entry.href;
  link.textContent = entry.status === "planned" ? "View plan" : "Open artifact";
  footer.append(link);
  if (entry.commit) appendText(footer, "code", "", entry.commit);
  article.append(footer);

  return article;
}

async function loadRegistry() {
  try {
    const response = await fetch("validation/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    const registry = await response.json();
    reviewList.replaceChildren(...registry.entries.map(renderEntry));
    registryDate.textContent = `Updated ${registry.updated}`;
  } catch (error) {
    reviewList.replaceChildren();
    appendText(reviewList, "p", "registry-error", "The review registry could not be loaded. Please try again shortly.");
    console.error(error);
  }
}

loadRegistry();
