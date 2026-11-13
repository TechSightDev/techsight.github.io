# techsight.github.io — agent instructions

Marketing site for TechSight (https://techsight.dev, see `CNAME`), built with
Jekyll (`Gemfile`: `jekyll ~> 4.3.3`, plugins `jekyll-feed`, `jekyll-seo-tag`).

## Layout

- Pages: `index.html`, `about.html`, `services.html`, `blog.html`,
  `contact.html`, `scorecard.html`, …; one page per offering in `services/`.
- Blog posts: `_posts/YYYY-MM-DD-slug.md` with front matter `layout: post`,
  `title`, `date`, `description`, `keywords`, `image`, `permalink`
  (copy an existing post).
- Templates: `_layouts/` (`default`, `post`) and `_includes/` (header,
  footer, head, analytics, scripts).
- Styles: Sass sources in `scss/` compiled to `css/` (Prepros,
  `prepros-6.config`, e.g. `scss/bootstrap/bootstrap.scss` →
  `css/bootstrap.min.css`). Edit the `.scss` source and recompile; don't
  hand-edit the minified CSS.
- `content/` holds marketing drafts (LinkedIn posts, outbound emails) and
  `archived/` old pages; both are excluded from the build in `_config.yml`,
  as are `README.md` and these agent files.

## Commands

- Install: `bundle install`. Local preview: `bundle exec jekyll serve`
  (TODO: confirm; there is no README or CI workflow for it).
- Deployment: GitHub Pages from this repo (TODO: confirm how it builds; there
  is no workflow in `.github/`).

## Conventions

- Prefer small, reviewable changes; match patterns in nearby files.
- Do not commit secrets or credentials.
- Do not push or merge unless explicitly asked.
