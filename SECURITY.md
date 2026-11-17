# Security policy

## Supported versions

Security fixes are released for the latest minor version.

| Version | Supported |
| --- | --- |
| 0.2.x | Yes |
| Older | No |

## Reporting a vulnerability

Please don't report security issues in public issues or pull requests. Report them privately on GitHub instead: open the [Security tab](https://github.com/hayrullah-zafer-yilmaz/build-reveal/security) and choose **Report a vulnerability**, or use [this form](https://github.com/hayrullah-zafer-yilmaz/build-reveal/security/advisories/new) directly.

Please include:

- the affected version,
- the steps or a small page that reproduces the issue,
- what an attacker could do with it.

You can expect a first reply within a week. Once a fix is released, the advisory is published with credit to you, unless you prefer otherwise.

## Scope

build-reveal runs in the browser, has no runtime dependencies and makes no network requests. Reports are especially welcome for:

- content passed to the library, such as tour captions, cursor labels or page text, that ends up running script,
- anything that makes a page's Content Security Policy weaker.

Advisories in development tools such as Vite, Vitest or tsup don't reach the published package. They're handled through regular dependency updates.
