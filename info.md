# Forex Automation Project Overview

## What This Project Does
- Drives the MT4 Strategy Tester UI end-to-end using PyAutoGUI, allowing dozens of Expert Advisors (EAs) to be benchmarked without manual clicking.
- Scans an Experts directory for compiled `.ex4` files, loads them sequentially, and captures Strategy Tester reports for each bot.
- Automates file naming, report exports, and UI resets so overnight regression test suites are reproducible.
- Ships with the image templates (`expert_advisor.png`, `start.png`, `settings.png`, etc.) that make the vision-based automation reliable across machines.
- Reads the legacy `cyberfx/db.sqlite3` dataset so portfolio viewers can browse the same curated research notes that informed two years of live forex and equity automation work.

## Tech Stack and Tooling
- **Python 3 + PyAutoGUI** for desktop automation, image recognition, and keyboard/mouse control.
- **Windows-only MT4 stack** (`XM Global MT4` distribution) with the terminal launched via `os.startfile`.
- **Filesystem orchestration** using `os` and `time` for scanning EA artifacts and throttling UI interactions.
- **Image assets** produced at 1x scale to keep PyAutoGUI detection fast while maintaining ~0.8 confidence tolerance.
- **SQLite + Django ORM** legacy data (647 EAs, 31 qualitative reviews) exported via `scripts/export_cyberfx_data.py` to power the Netlify demo.
- **Netlify-ready demo** (static HTML/CSS/JS) recreates the workflow visually for portfolio viewers without requiring MT4.

## Flow and Components
1. `open_mt4`: launches MT4 and waits for the terminal to finish booting plug-ins.
2. `scan_folder_for_ex4`: enumerates every EA candidate from the user-specific MetaQuotes roaming profile.
3. `run_tester_on_bot`: focuses the Strategy Tester pane, scrolls to the correct EA, and kicks off the test run.
4. `wait_for_report`: polls for completion, exports the generated report under a deterministic name, and resets Strategy Tester inputs before the next bot runs.
5. Top-level loop orchestrates the first EA (with a full scroll reset) followed by the remaining bots.
6. `scripts/export_cyberfx_data.py` hydrates `demo/data/cyberfx_export.json`, which the Netlify demo reads to replay authenticated research history.

## Legacy Research Data
- `cyberfx/db.sqlite3` contains the CyberFX web app’s production snapshot, including ExpertAdvisor metadata, qualitative reviews, and admin annotations gathered while I was operating live forex and equities automation for ~2 years.
- The export process surfaces 647 bots across stocks/indices/forex/commodities, with category bucketing (`Trash`, `Testing`, `Goodfornow`) that mirrors the original Django admin tooling.
- Review snippets and approval history demonstrate due diligence on prop firm challenges, USDCAD grid portfolios, and martingale risk caps—evidence that I can build, assess, and productionize both forex and broader market automation stacks.
- The data is read-only in this repository; I am no longer distributing, servicing, or extending trading automations, but the archive proves domain fluency for prospective roles.

## Engineering Challenges & Solutions
- **Fragile UI state**: MT4 controls move depending on the last user interaction. The script compensates with image-based anchors and deterministic scroll resets.
- **Report timing variance**: Strategy Tester duration can swing from seconds to minutes. A configurable timeout plus periodic polling keeps the automation resilient without busy-waiting.
- **Per-user file paths**: MetaQuotes stores EA binaries inside GUID-based folders. The project isolates the folder path in a single constant so contributors can adjust it without rewriting logic.
- **Human-in-the-loop debugging**: When PyAutoGUI cannot find an image, explicit console guidance tells the operator to keep MT4 on the foreground monitor.
- **Demoability**: Because MT4 automation cannot run on Netlify, a lightweight web simulation (see `demo/`) mirrors the orchestration steps for recruiters.

## Deployment & Operations
- Designed for a dedicated Windows workstation with MT4 installed under `c:\Program Files (x86)\XM Global MT4`.
- Requires screen resolution that matches the included image assets; users typically pin MT4 to a fixed layout and disable system scaling for consistency.
- Reports are exported to `results/`, which can be synced to cloud storage or ingested by a downstream analytics job.
- Netlify deployment hosts the interactive demo, while the real automation script remains an on-prem Windows job.
- `scripts/export_cyberfx_data.py` should be rerun whenever the SQLite snapshot changes so the static site reflects the most recent analyses.

## Estimated Build Timeline
- **Week 1**: Environment setup, image template capture, and basic MT4 launch automation.
- **Week 2**: Robust EA enumeration, Strategy Tester navigation, and report export pipeline.
- **Week 3**: Error handling, timeout logic, and making the workflow repeatable for large EA batches.
- **+3 days**: Creating the Netlify-friendly demo, documentation, and polishing the portfolio narrative.

Given the limited surface area (single automation script plus assets) but the depth of MT4-specific tuning plus the CyberFX data bridge, a realistic solo timeline comes in around 4 weeks of part-time effort.

## Portfolio Takeaways
- Demonstrates proficiency with desktop UI automation, especially in trading ecosystems that lack modern APIs.
- Shows understanding of MT4 internals, EA lifecycle, and Strategy Tester operations.
- Highlights ability to translate a Windows-only bot into a recruiter-friendly demo experience via Netlify using real data.
- Underscores hands-on experience across stocks, indices, forex pairs, and prop-trading automation while clarifying that I’m not pursuing further commercial development in this niche.
