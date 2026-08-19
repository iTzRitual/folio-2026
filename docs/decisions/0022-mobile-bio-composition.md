# ADR 0022: Mobile Bio composition

- Status: Accepted
- Date: 2026-08-10

## Context

The wide Bio places the portrait and copy beside one another. That relationship leaves insufficient reading width on the minimum mobile design surface. The Bio remains a distinct final scroll stage, so its opening composition needs a clear visual anchor.

## Decision

The mobile Bio sequence is:

1. About me heading.
2. Portrait at approximately 68–72% of the available width, aligned to the right safe margin.
3. Biography copy in one readable column below the portrait.

The exact width remains tunable within that range, while image-first ordering and right alignment are fixed composition rules.

## Consequences

- The mobile Bio layout height is image height plus wrapped copy height rather than the maximum of two columns.
- Page overflow and stage boundaries continue to come from the shared details-layout calculation.
- The portrait and DOM text twin follow the same reading order as the visual composition.
- Bio variants may change total stage length without changing its structure.
