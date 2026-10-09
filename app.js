// G Launcher website: shows the live store, read from the same GitHub repo the launcher uses.
// Every folder with a DESCRIPTION.md is one app (see UPLOAD-PROMPT.md in the launcher project).
(function () {
  "use strict";

  const REPO = "guyka2212/games-launcher-g-apps";
  const API = "https://api.github.com/repos/" + REPO;
  const IMAGE_EXT = /\.(png|gif|jpe?g|webp)$/i;

  const statusEl = document.getElementById("store-status");
  const gridEl = document.getElementById("store-grid");

  function setStatus(text, warn) {
    statusEl.textContent = text;
    statusEl.classList.toggle("warn", !!warn);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Same rules as the launcher: simple "key: value" lines between two "---" lines.
  function parseDescription(text) {
    const lines = text.replace(/^﻿/, "").split(/\r?\n/);
    if (lines[0] === undefined || lines[0].trim() !== "---") return { meta: {}, body: text };
    const meta = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "---") return { meta, body: lines.slice(i + 1).join("\n").trim() };
      const at = line.indexOf(":");
      if (at > 0 && !line.trim().startsWith("#")) {
        const value = line.slice(at + 1).split(/\s+#/)[0].trim().replace(/^["']|["']$/g, "");
        meta[line.slice(0, at).trim().toLowerCase()] = value;
      }
    }
    return { meta: {}, body: text };
  }

  // First real paragraph of the Markdown body, as plain text.
  function excerpt(body) {
    const para = body.split(/\n\s*\n/).map((p) => p.trim())
      .find((p) => p && !/^(#|```|[-*+]\s|\d+[.)]\s|>|!\[)/.test(p)) || "";
    const plain = para.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").replace(/\s+/g, " ");
    return plain.length > 180 ? plain.slice(0, 177).trimEnd() + "..." : plain;
  }

  async function getJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (res.status === 409) return null; // empty repository
    if (res.status === 403 || res.status === 429) throw new Error("rate");
    if (!res.ok) throw new Error("http " + res.status);
    return res.json();
  }

  async function loadStore() {
    const commit = await getJson(API + "/commits/HEAD");
    if (!commit) return [];
    const sha = commit.sha;
    const tree = await getJson(API + "/git/trees/" + commit.commit.tree.sha + "?recursive=1");
    const raw = (path) => "https://raw.githubusercontent.com/" + REPO + "/" + sha + "/" + path.split("/").map(encodeURIComponent).join("/");

    const folders = new Map();
    for (const e of tree.tree || []) {
      if (e.type !== "blob" || !e.path.includes("/")) continue;
      const cut = e.path.lastIndexOf("/");
      const folder = e.path.slice(0, cut);
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder).push({ path: e.path, name: e.path.slice(cut + 1) });
    }

    const apps = await Promise.all([...folders].map(async ([folder, files]) => {
      const desc = files.find((f) => f.name.toLowerCase() === "description.md");
      if (!desc) return null;
      const text = await fetch(raw(desc.path)).then((r) => (r.ok ? r.text() : ""));
      const { meta, body } = parseDescription(text);
      const byName = (n) => n && files.find((f) => f.name.toLowerCase() === n.trim().toLowerCase());
      const stem = (f) => f.name.replace(/\.[^.]+$/, "").toLowerCase();
      const images = files.filter((f) => IMAGE_EXT.test(f.name)).sort((a, b) => a.name.localeCompare(b.name));
      const cover = byName(meta.cover) || images.find((f) => stem(f) === "cover") || images.find((f) => stem(f) !== "icon");
      const icon = byName(meta.icon) || images.find((f) => stem(f) === "icon");
      const heading = body.match(/^\s*#\s+(.+)/);
      return {
        name: meta.name || (heading ? heading[1].trim() : folder.split("/").pop()),
        type: (meta.type || "game").toLowerCase(),
        platform: meta.platform || "",
        version: meta.version || "",
        developer: meta.developer || "",
        text: meta.summary || excerpt(body),
        cover: cover ? raw(cover.path) : "",
        icon: icon ? raw(icon.path) : "",
      };
    }));
    return apps.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  }

  function render(apps) {
    gridEl.innerHTML = apps.map((a) => {
      const meta = [a.platform, a.version && "v" + a.version, a.developer && "by " + a.developer].filter(Boolean).join(" · ");
      return '<article class="card">' +
        '<div class="card-cover">' + (a.cover ? '<img loading="lazy" src="' + escapeHtml(a.cover) + '" alt="' + escapeHtml(a.name) + ' preview">' : "No preview") + "</div>" +
        '<div class="card-body">' +
        '<div class="card-title">' + (a.icon ? '<img loading="lazy" src="' + escapeHtml(a.icon) + '" alt="">' : "") + escapeHtml(a.name) + "</div>" +
        '<div class="card-meta"><span class="badge">' + escapeHtml(a.type === "game" ? "Game" : "Software") + "</span>" + escapeHtml(meta) + "</div>" +
        (a.text ? '<p class="card-text">' + escapeHtml(a.text) + "</p>" : "") +
        "</div></article>";
    }).join("");
  }

  // Version + size next to the Download button, from the newest GitHub Release of this site's repo.
  fetch("https://api.github.com/repos/guyka2212/games-launcher-g-website/releases/latest")
    .then((r) => (r.ok ? r.json() : null))
    .then((release) => {
      if (!release) return;
      const asset = (release.assets || []).find((a) => a.name === "GLauncherSetup.exe");
      document.getElementById("setup-version").textContent = release.tag_name.replace(/^v/, "");
      if (asset) document.getElementById("setup-size").textContent = Math.round(asset.size / 1048576) + " MB";
    })
    .catch(() => {}); // keep the text that's already in the page

  loadStore().then((apps) => {
    if (!apps.length) {
      setStatus("The store is empty right now. New games and software are on the way, so check back soon.");
      return;
    }
    setStatus("");
    render(apps);
  }).catch((err) => {
    setStatus(err.message === "rate"
      ? "GitHub is busy for your network right now. Reload the page in a few minutes to see the store."
      : "Couldn't load the store right now. The launcher download still works.", true);
  });
})();
