# 0004: All published questions are open until monetisation

Date: 2026-10-12. Decided by: owner. Changes D3 in 0001 for now.

- Until accounts and payments (roadmap phase 8), the site shows **every published
  question** to everyone, with no "10 free questions" limit.
- Set in one place: `PUBLIC_ACCESS = "open"` in `tools/src/build.ts`. The
  `free-sample` mode stays built and tested, and is switched on in phase 8.
- Drafts, in-review and retired questions are still never shipped.
- Consequence: anything published while open is downloadable by anyone, so treat
  it as public for good. The paid bank at launch should be mostly questions
  published after the switch, or the open ones become the free tier.
