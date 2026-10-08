# Editing and building the documentation

**English** | [Português (Brasil)](../documentacao.md)

Zensical turns the Markdown files in `docs/site/` into a static website. The tool runs in `.venv-docs`, separate from the Node.js API.

## Installation

From the repository root, with Python 3.11 or later installed:

```bash
python3 -m venv .venv-docs
.venv-docs/bin/python -m pip install -r requirements-docs.txt
```

The npm commands below use the environment executables on Linux/macOS without requiring activation. On Windows, use `.venv-docs\Scripts\zensical.exe serve` or `.venv-docs\Scripts\zensical.exe build --strict`.

## Local preview

```bash
npm run docs:dev
```

Open <http://localhost:8001/en/>. Port 8001 lets you run the documentation alongside the API on port 8000. Pages rebuild when you save changes.

## Organization

| Portuguese page | English page | Content |
| --- | --- | --- |
| `index.md` | `en/index.md` | Introduction and starting links |
| `sobre.md` | `en/about.md` | Authorship, purpose, and credits |
| `instalacao.md` | `en/installation.md` | API installation and execution |
| `autenticacao.md` | `en/authentication.md` | Login and tokens |
| `endpoints.md` | `en/endpoints.md` | Routes and input contracts |
| `exemplos.md` | `en/examples.md` | curl requests |
| `erros.md` | `en/errors.md` | HTTP codes and troubleshooting |
| `architecture/racktables-racks.md` | `en/architecture/racktables-racks.md` | Rack architecture |
| `documentacao.md` | `en/documentation.md` | Documentation workflow |

Page paths are relative to `docs/site/`. `zensical.toml` defines the site name, language, navigation, and preview port. Plans and specifications in `docs/superpowers/` remain in the repository and are excluded from the site.

## Writing Markdown

Use one `#` title per page and ordered `##` and `###` subheadings. Leave blank lines around lists, tables, and code blocks. Specify the block language, such as `bash`, `json`, `env`, or `text`.

Use relative links to other pages, such as `[Authentication](authentication.md)`. Add new pages to `nav` in `zensical.toml`. Keep headings and paragraphs in Markdown rather than wrapping them in HTML elements such as `<div>`.

Update both languages when changing a route or documentation content. Protected requests require `Authorization: Bearer YOUR_TOKEN`. Use fictional credentials in examples.

## Validation and build

```bash
npm run docs:build
```

The build uses `--strict` and generates `site/`. Git and the API Docker build ignore the generated directory, cache, and Python environment. The documentation workflow runs the same build on pushes and pull requests.

## Publishing

You can host `site/` on GitHub Pages or a static file server. Set `site_url` in `zensical.toml` when the final public address is known. The included workflow validates and stores the site as an artifact; publishing must be configured for your chosen hosting service.

The API must be running to test endpoints in Swagger. Building these pages does not require a database connection.
