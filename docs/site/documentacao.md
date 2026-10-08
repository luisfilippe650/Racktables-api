# Editar e gerar a documentação

**Português (Brasil)** | [English](en/documentation.md)

O Zensical transforma os arquivos Markdown de `docs/site/` em um site estático. A ferramenta fica no ambiente `.venv-docs`, separado da API Node.js.

## Instalação

Na raiz do repositório, com Python 3.11 ou superior instalado:

```bash
python3 -m venv .venv-docs
.venv-docs/bin/python -m pip install -r requirements-docs.txt
```

Os comandos npm abaixo usam os executáveis do ambiente no Linux/macOS e dispensam sua ativação. No Windows, use `.venv-docs\Scripts\zensical.exe serve` ou `.venv-docs\Scripts\zensical.exe build --strict`.

## Prévia local

```bash
npm run docs:dev
```

Abra <http://localhost:8001>. A porta 8001 permite executar a documentação junto com a API, que usa 8000. As páginas são reconstruídas quando você salva alterações.

## Organização

| Arquivo | Conteúdo |
| --- | --- |
| `docs/site/index.md` | Apresentação e links iniciais |
| `docs/site/instalacao.md` | Instalação e execução da API |
| `docs/site/autenticacao.md` | Login e uso de tokens |
| `docs/site/endpoints.md` | Rotas e contratos de entrada |
| `docs/site/exemplos.md` | Requisições com curl |
| `docs/site/erros.md` | Códigos HTTP e diagnóstico |
| `docs/site/architecture/racktables-racks.md` | Arquitetura dos racks |
| `zensical.toml` | Nome, idioma, navegação e porta da prévia |

Os planos e especificações em `docs/superpowers/` permanecem no repositório e são excluídos do site.

A versão em inglês fica em `docs/site/en/`, com as mesmas páginas da versão em português. Atualize os dois idiomas ao alterar o conteúdo. O menu em `zensical.toml` organiza as páginas por idioma.

## Escrever Markdown

Use um título `#` por página e subtítulos `##` e `###` em ordem. Deixe uma linha em branco ao redor de listas, tabelas e blocos de código. Indique a linguagem dos blocos, como `bash`, `json`, `env` ou `text`.

Use links relativos para outras páginas, por exemplo `[Autenticação](autenticacao.md)`. Ao criar uma página, inclua-a em `nav` no `zensical.toml`. Não envolva o Markdown em elementos HTML como `<div>`; mantenha títulos e parágrafos em Markdown.

Atualize os exemplos quando mudar uma rota. Requisições protegidas precisam do cabeçalho `Authorization: Bearer SEU_TOKEN`. Use credenciais fictícias nos textos.

## Validar e gerar

```bash
npm run docs:build
```

O build usa `--strict` e gera a pasta `site/`. A pasta gerada, o cache e o ambiente Python são ignorados pelo Git e pelo build Docker da API. O workflow de documentação executa esse mesmo build em pushes e pull requests.

## Publicação

Você pode hospedar o conteúdo de `site/` em GitHub Pages ou em um servidor de arquivos estáticos. Configure `site_url` em `zensical.toml` quando tiver o endereço público definitivo. O workflow incluído valida e armazena o site como artefato; a publicação deve ser configurada conforme a hospedagem escolhida.

Para testar endpoints no Swagger, a API precisa estar em execução. Para gerar estas páginas, não é necessário conectar ao banco.
