# Dependency verification

Verified 7 November 2026 using official registry endpoints. “LTS” applies to the Node runtime and the framework support channel; packages without LTS channels use their latest stable npm `latest` release at verification time.

| Package | Version | Primary source |
| --- | --- | --- |
| Node.js | 26.13.0, LTS Lithium | https://nodejs.org/dist/index.json |
| npm | 11.20.0, bundled with this Node release | https://nodejs.org/dist/index.json |
| next | 16.4.5 | https://registry.npmjs.org/next/latest |
| react | 19.3.1 | https://registry.npmjs.org/react/latest |
| react-dom | 19.3.1 | https://registry.npmjs.org/react-dom/latest |
| motion | 14.10.1 | https://registry.npmjs.org/motion/latest |
| sharp | 0.35.5 | https://registry.npmjs.org/sharp/latest |
| @libsql/client | 0.18.0 | https://registry.npmjs.org/%40libsql%2Fclient/latest |
| typescript | 7.0.2 | https://registry.npmjs.org/typescript/latest |
| @types/node | 26.6.6 | https://registry.npmjs.org/%40types%2Fnode/latest |
| @types/react | 19.3.0 | https://registry.npmjs.org/%40types%2Freact/latest |
| @types/react-dom | 19.3.0 | https://registry.npmjs.org/%40types%2Freact-dom/latest |

Docker Hub's authenticated registry manifest endpoint verified the multi-platform `node:26.13.0-bookworm-slim` image index:

```text
sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68
```

Both Dockerfiles pin this digest. This verifies the registry manifest exists; it is not evidence of a local Docker build or an OS vulnerability scan.

The official standalone Docker Compose 5.7.0 Windows executable was verified against its published SHA-256 and used to parse/check both Compose configurations without a daemon:

```text
f5dc759702aec5c0602e247aa861d14853216e3f481c4eaaf83621a035ecf92f
```

The official Windows x64 Node 26.13.0 executable used for final host testing was checked against Node's published SHASUMS256 file:

```text
14319838b3f355e0398c13569a90270bce4fc68f25189f58c59b03dadae0e6d5
```

GitHub Actions latest stable release tags were resolved to immutable commit objects through GitHub's API:

| Action | Release | Commit |
| --- | --- | --- |
| actions/checkout | v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 |
| actions/setup-node | v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 |
| actions/upload-artifact | v7.0.2 | cf430e030ddbb5b0abf93d22962f4752f3646cd9 |

Use dependency-update tooling to propose reviewed changes to exact versions, lockfile entries, action commits and image digests. The pinned base image cannot automatically pick up later security patches.
