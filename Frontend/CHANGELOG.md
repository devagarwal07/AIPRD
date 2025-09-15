# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project will adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches `1.0.0`.

## [Unreleased]
### Added
- (placeholder) Draft vs Final mode toggle affecting export & UI badge
- (placeholder) Undo snapshot restore (single-level)
- (placeholder) Requirements pagination (25/page)
- (placeholder) Command palette & keyboard shortcuts
- (placeholder) Offline gating banner & PWA scaffold
- (placeholder) Clipboard fallback + storage quota handling wrapper

### Changed
- (placeholder) Share link encoding now includes `mode`

### Fixed
- (placeholder) Type issue in share schema when introducing mode

### Removed
- (placeholder) N/A

### Security
- (placeholder) Clarified telemetry & data scope in docs/security-privacy.md

## Template
Use this structure when releasing a new version:
```
## [x.y.z] - YYYY-MM-DD
### Added
- 
### Changed
- 
### Deprecated
- 
### Removed
- 
### Fixed
- 
### Security
- 
```

## Versioning Policy
- Prior to `1.0.0`, minor bump (`0.MINOR.PATCH`) can include breaking changes with documentation.
- After `1.0.0`: follow semver strictly (MAJOR for breaking, MINOR for backward-compatible feature, PATCH for fixes).

## Release Process (Planned)
1. Update `CHANGELOG.md` Unreleased section -> move entries under new version heading.
2. Bump `version` in `package.json` (and `/server/package.json` if needed).
3. Create a git tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.
4. Push tags: `git push --tags`.
5. (Future) CI pipeline to build, run tests, and attach artifacts.

---
