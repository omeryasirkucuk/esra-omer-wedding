// Runtime injection of the social/link-preview meta tags into the built
// index.html. The values come from the admin-edited site content (meta.title,
// meta.description, meta.siteUrl), so a fork changes its domain and titles
// from the admin without rebuilding. When nothing is stored, the template's
// literal values pass through untouched.
import fs from 'node:fs'
import path from 'node:path'

// Short cache so the admin sees a save within seconds while normal traffic
// never re-reads storage per request.
const CACHE_TTL_MS = 30_000

function escAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
function escText(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

// Replace the content attribute of one <meta …="name" content="…"> tag.
function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta ${attr}="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content=")[^"]*(")`)
  return html.replace(re, `$1${escAttr(value)}$2`)
}

function renderHtml(template, stored) {
  const meta = stored?.meta || {}
  const couple = stored?.bride && stored?.groom ? `${stored.bride} & ${stored.groom} Wedding` : ''
  const title = meta.title || couple
  const description = meta.description || title
  const siteUrl = String(meta.siteUrl || '').replace(/\/+$/, '')

  let html = template
  if (title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escText(title)}</title>`)
    html = setMeta(html, 'property', 'og:site_name', title)
    html = setMeta(html, 'property', 'og:title', title)
    html = setMeta(html, 'name', 'twitter:title', title)
  }
  if (description) {
    html = setMeta(html, 'name', 'description', description)
    html = setMeta(html, 'property', 'og:description', description)
    html = setMeta(html, 'name', 'twitter:description', description)
  }
  if (siteUrl) {
    html = setMeta(html, 'property', 'og:url', siteUrl)
    html = setMeta(html, 'property', 'og:image', `${siteUrl}/og.png`)
    html = setMeta(html, 'name', 'twitter:image', `${siteUrl}/og.png`)
  }
  return html
}

// Returns an Express handler that serves the injected index.html.
// `loadSiteContent` is an async () => stored-site-content (or {}).
export function createIndexHandler(distDir, loadSiteContent) {
  const templatePath = path.join(distDir, 'index.html')
  let cachedHtml = null
  let cachedAt = 0

  return async function serveIndex(_req, res) {
    const now = Date.now()
    if (!cachedHtml || now - cachedAt > CACHE_TTL_MS) {
      try {
        const template = fs.readFileSync(templatePath, 'utf-8')
        let stored = {}
        try {
          stored = (await loadSiteContent()) || {}
        } catch {
          /* template literals pass through */
        }
        cachedHtml = renderHtml(template, stored)
        cachedAt = now
      } catch {
        // Template unreadable — fall back to plain static serving.
        return res.sendFile(templatePath)
      }
    }
    res.type('html').send(cachedHtml)
  }
}
