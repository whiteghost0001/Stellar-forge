# Requirements Document

## Introduction

StellarForge currently has no changelog, making it difficult for users and contributors to understand what changed between versions. This feature introduces a CHANGELOG.md at the repo root following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format, and integrates changelog updates into the contribution workflow via a PR template checklist.

## Glossary

- **CHANGELOG**: A curated, human-readable file that records notable changes for each version of the project.
- **Keep_a_Changelog**: A widely adopted changelog format convention (https://keepachangelog.com/en/1.0.0/) that organizes entries under version headings with subsections: Added, Changed, Fixed, Removed.
- **Unreleased_Section**: The `[Unreleased]` heading in the CHANGELOG that accumulates changes not yet tied to a version tag.
- **PR_Template**: A `.github/pull_request_template.md` file that GitHub surfaces automatically when a contributor opens a pull request.
- **Contributor**: Any developer submitting a pull request to the StellarForge repository.
- **Maintainer**: A project owner responsible for cutting releases and managing version tags.

## Requirements

### Requirement 1: CHANGELOG File Exists at Repo Root

**User Story:** As a user or contributor, I want a CHANGELOG.md at the root of the repository, so that I can quickly find the history of changes without searching through commit logs.

#### Acceptance Criteria

1. THE CHANGELOG SHALL exist as a file named `CHANGELOG.md` at the repository root.
2. THE CHANGELOG SHALL begin with a top-level heading `# Changelog`.
3. THE CHANGELOG SHALL include a reference link to the Keep a Changelog convention and to Semantic Versioning.

---

### Requirement 2: Keep a Changelog Format Compliance

**User Story:** As a contributor, I want the CHANGELOG to follow the Keep a Changelog format, so that entries are predictable and easy to read.

#### Acceptance Criteria

1. THE CHANGELOG SHALL organize entries under version headings of the form `## [version] - YYYY-MM-DD` or `## [Unreleased]`.
2. WHEN a version section contains changes, THE CHANGELOG SHALL group those changes under one or more of the following subsections: `### Added`, `### Changed`, `### Fixed`, `### Removed`.
3. THE CHANGELOG SHALL list versions in reverse chronological order, with the most recent version appearing first below `[Unreleased]`.
4. IF a subsection contains no entries for a given version, THEN THE CHANGELOG SHALL omit that subsection for that version.

---

### Requirement 3: Unreleased Section for In-Progress Features

**User Story:** As a contributor, I want an `[Unreleased]` section that lists current in-progress features, so that reviewers can see what is being actively developed before a release is cut.

#### Acceptance Criteria

1. THE CHANGELOG SHALL contain an `## [Unreleased]` section positioned above all versioned sections.
2. THE Unreleased_Section SHALL list in-progress features under the appropriate subsections (Added, Changed, Fixed, Removed).
3. WHEN a new release is cut, THE Maintainer SHALL move all entries from `[Unreleased]` into the new versioned section and reset `[Unreleased]` to empty.

---

### Requirement 4: Initial Version Section for Project Scaffold

**User Story:** As a user, I want a `[0.1.0]` section documenting the initial scaffold, so that I understand what was included in the first baseline of the project.

#### Acceptance Criteria

1. THE CHANGELOG SHALL contain a `## [0.1.0] - YYYY-MM-DD` section documenting the initial project scaffold.
2. THE `[0.1.0]` section SHALL include an `### Added` subsection listing the foundational components delivered in the scaffold (e.g., Token Factory Soroban contract, React/TypeScript frontend, Freighter wallet integration, IPFS/Pinata metadata support, Tailwind CSS UI components, Vitest test setup).
3. THE `[0.1.0]` section SHALL appear below the `[Unreleased]` section and above any older versions.

---

### Requirement 5: PR Template Changelog Checklist Item

**User Story:** As a maintainer, I want the PR template to include a changelog checklist item, so that contributors are reminded to update the CHANGELOG as part of every pull request.

#### Acceptance Criteria

1. THE PR_Template SHALL exist as `.github/pull_request_template.md`.
2. THE PR_Template SHALL include a checklist item requiring the contributor to confirm that `CHANGELOG.md` has been updated under `[Unreleased]`.
3. WHEN a contributor opens a pull request, THE PR_Template SHALL be automatically surfaced by GitHub as the default PR description.
4. IF the PR introduces no user-facing changes, THEN THE PR_Template checklist item SHALL allow the contributor to mark the changelog update as not applicable (N/A).
