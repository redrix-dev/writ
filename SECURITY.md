# Security policy

## Architectural boundary, not isolation

writ separates writer and reader capabilities through TypeScript types and
runtime object surfaces. This is an architectural API boundary. It is not a
security sandbox and does not protect against malicious code, leaked writers,
`as any`, unsafe casts, reflection, prototype manipulation, or mutation of
mutable values returned by readers.

Do not use writ as an authorization boundary. Enforce permissions and validate
untrusted input at the appropriate server or trusted-process boundary.

## Reporting vulnerabilities

Do not include secrets, credentials, or private user data in a public issue. Use
GitHub's private vulnerability reporting feature for the repository when
available. Otherwise contact the maintainer privately through the repository
owner profile before publishing details.

The supported security-relevant surface is listed in [SUPPORT.md](./SUPPORT.md).
