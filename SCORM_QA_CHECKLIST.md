# SCORM QA Checklist (Orion)

Last updated: March 1, 2026

## Release Gate Policy

- **Required to ship SCORM hardening v1:** SCORM Cloud passes (T1-T10).
- **Deferred if access blocked:** Moodle parity (T11-T13) can be deferred with explicit note.

## Test Cases

- [ ] **T1** Create one test course from `/templates`.
- [ ] **T2** Add blocks in order: `heading`, `text`, `image`, `tabs`, `flipcard`, `timeline`, `quiz`.
- [ ] **T3** For every image with a real `src`, ensure non-empty `alt`.
- [ ] **T4** Export SCORM ZIP from Orion editor.

### SCORM Cloud (Required)

- [ ] **T5** Upload ZIP to SCORM Cloud and launch successfully.
- [ ] **T6** Verify section navigation (Previous/Next + pill nav).
- [ ] **T7** Verify interactions:
  - Tabs switch via click + arrow keys.
  - Flip card toggles via click + Enter/Space.
  - Quiz feedback works for single and multi-select.
- [ ] **T8** Resume check: exit mid-course and relaunch; lands on last section.
- [ ] **T9** Progress restore check: visited count/state restored after relaunch.
- [ ] **T10** Completion check: visit all sections + Mark Complete; registration status shows completed.

### Moodle (Parity, Optional if access blocked)

- [ ] **T11** Upload same ZIP to Moodle SCORM activity and launch.
- [ ] **T12** Verify same behavior as SCORM Cloud (navigation/interactions/resume).
- [ ] **T13** Verify completion status/gradebook reflects completion.

## Failure Log Template

Use this exact structure for each failure:

- LMS: `SCORM Cloud` or `Moodle`
- Step: `T#`
- Failure type: `launch | resume | completion | interaction`
- Symptom: concise description
- Evidence: screenshot/video + console/log snippet
- ZIP version tested: `v1`, `v2`, etc.

## Patch Loop

1. Patch `src/utils/scormExport.ts`.
2. Re-export ZIP (increment version).
3. Re-run affected tests first, then full T5-T13 sweep.

## Current Status Snapshot

As of March 1, 2026:

- SCORM Cloud: **T1-T10 passed**.
- Moodle parity: **Deferred (access blocked)**.
- Overall SCORM hardening v1 status: **Pass (with documented Moodle defer)**.
