# Live Demonstration & Judges' Pitch

## Our one-line pitch

**EventSphere AI is a hyperlocal opportunity engine that turns an isolated event poster into an immediately discoverable, personalized and measurable community experience.**

## Real problem

Events appear on disconnected WhatsApp groups, Instagram stories, LinkedIn posts, standalone websites and flyers. Students who might enjoy them never hear about them, and organizers struggle to reach nearby interested communities. The VECNAVERSE brief on page 2 requests personalized location-aware discovery, easy organizer posting and meaningful community engagement.

## Innovation story: Poster-to-Participation

1. **Ingest:** organizer uploads flyer, OCR suggests structured information.
2. **Clean:** duplicate similarity warns about repeated listings.
3. **Match:** interest + location + upcoming-date preferences produce explainable rankings.
4. **Act:** attendee registers and receives a unique QR code.
5. **Measure:** organizer checks in and sees registrations vs actual attendance.

**Defensible novelty:** not an invented new OCR or map algorithm. The contribution is joining scattered discovery, organizer publishing, explainable matching, attendance verification and insights into one accessible community workflow. Be prepared to explain why the entire loop is useful, rather than claiming a first-of-its-kind platform.

## 2-minute recorded demo — 120-second timeline

| Video time | Screen action | Voiceover |
|---|---|---|
| 0:00–0:15 | Show PDF problem and discover UI | “Students miss events because information lives in isolated feeds and posters.” |
| 0:15–0:30 | Show organizer poster upload (`demo-poster.png`) | “We convert posters into editable event details instead of making organizers type everything.” |
| 0:30–0:43 | Click duplicate check | “Our similarity engine highlights likely repeated listings before publishing.” |
| 0:43–1:00 | Show location/category filters and event matching | “The attendee sees nearby opportunities ranked by transparent interest, proximity and date rules.” |
| 1:00–1:19 | Open event; register as student; show QR ticket | “A student registers in one click and gets a unique attendance ticket.” |
| 1:19–1:40 | Switch organizer; verify QR via paste/camera; repeat scan | “Only the event owner can verify attendance; duplicate check-ins are blocked.” |
| 1:40–1:55 | Show organizer overview totals | “Organizers see not just views, but participation and verified attendance.” |
| 1:55–2:00 | Branding + final outcome | “EventSphere: Discover nearby. Connect smarter.” |

**Production note:** First-time OCR may take longer than the recording allows; warm up OCR before recording. Keep the manually editable poster fields and backend functioning if OCR requires network access.

## Exactly five PPT slides required by the PDF

**Slide 1 — Problem statement & understanding**
- Local events are scattered across five or more fragmented channels.
- Students miss personally relevant, nearby opportunities.
- Organizers struggle to reach and retain their community.
- Target audiences: students, organizers and local communities.

**Slide 2 — Technical approach**
- Browser: React/Tailwind, responsive event feed, map, organizer studio.
- API: Python FastAPI, JWT role controls.
- Data: MongoDB users/events/registrations.
- Intelligence: Tesseract OCR, Jaccard-like title similarity, weighted interest/distance/date ranking.
- Loop: Poster → Check → Publish → Recommend → Register → Verify → Insights.

**Slide 3 — Feasibility & viability**
- Commodity web stack, no expensive model training.
- Working first-push MVP and real-time persistent demo data.
- Low operational costs for small campus pilots.
- Risks: bad OCR, permission handling, moderation, scalability. Mitigations: manual correction, organizer ownership checks, future moderation, database indexes.

**Slide 4 — Impact & benefits**
- Fewer missed local opportunities.
- Faster poster-to-listing workflows for organizers.
- QR check-in for measurable event participation.
- Inclusive local communities and repeat engagement potential.
- **Do not claim statistics without real measurement.**

**Slide 5 — Comparison with existing platforms / uniqueness**

| Capability | Social feeds & shared posters | Typical event registration page | EventSphere prototype |
|---|---|---|---|
| Centralized local feed | Scattered | Not always | Yes |
| Automatic poster extraction | No native structured extraction | Varies | OCR draft |
| Explainable interest/location ranking | Usually feed-dependent | Platform-dependent | Yes, rule-based |
| Duplicate warnings | Not reliable | Platform-dependent | Basic similarity |
| QR attendance + organizer dashboard | Not native in a static poster | Often supported | Yes |

Competitors differ in features; **do not claim established platforms lack QR or smart recommendations in general**. The advantage is how these capabilities are combined for *hyperlocal community events*.

## Anticipated judge questions

**Q. Where exactly is AI?**
A. Tesseract extracts poster text, while our current recommendation and deduplication systems use explainable deterministic methods. We don't falsely present these as trained neural networks. A future enhancement could add embedding-based semantic recommendations and multilingual NLP.

**Q. Why not just use an existing events platform?**
A. The prototype prioritizes fragmented campus/community posters, locality-sensitive discovery, fast publishing and verifiable attendance. It is a targeted workflow, not a claim that existing platforms offer none of these features.

**Q. Can you verify all event listings?**
A. No. This prototype authenticates organizer accounts but does not independently verify real-world identities or event legitimacy. Production needs moderation and verified organizer onboarding.

**Q. Is the platform production secure?**
A. Not yet. Role enforcement, unique ticket tokens and atomic check-in are demonstrated. Production requires better token storage, anti-abuse controls, auditing, scalability work and security review.

**Q. Why do you call scores AI?**
A. We use AI-assisted OCR for extraction and a transparent scoring heuristic for matching. Score means *preference fit*, not AI probability or truth.
