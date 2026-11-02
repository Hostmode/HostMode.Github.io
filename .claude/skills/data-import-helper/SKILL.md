---
name: data-import-helper
description: Use when a planner's spreadsheet won't import cleanly into Host Mode: explain the problem rows, fix columns, dates and money formats, and get everything where it belongs.
---

# Data import helper

Planners are promised "upload once and it goes where it belongs." This skill keeps that true when a file is messy.

## What the importer handles

Clients, vendors, guests, inventory, venue spaces, bookings, blocked days, packages (including per-guest prices), payments, and teammate shifts.
Each tab of a workbook is read separately, matched to a kind of data by its name and headers, and shown as a preview before anything saves.
Duplicates can be skipped, updated or added. Any import can be undone for 24 hours. "Download the problem rows" gives a file of rows that need fixing.

## Steps

1. Ask for the file (or the problem-rows download) and which app it came from.
2. For each tab, name the kind of data it holds and check the column matches in the preview. Fix wrong matches with the dropdowns.
3. Common fixes:
   - **Dates:** one format per column (2027-05-22 is safest). Remove words like "TBD".
   - **Money:** numbers only ("3500", not "$3,500 + tax"). Put notes in a notes column.
   - **Times:** "2:00 PM" or "14:00".
   - **Names split** across first and last columns: the importer can join them.
   - **Merged cells or title rows** above the headers: delete them so row 1 is the headers.
   - **Per-guest packages:** a "Per guest" column with Yes, and "Minimum guests".
   - **Shifts:** Teammate, Date, Starts, Ends, Role, Hourly pay. New names become new teammates.
4. Templates: each kind has "Download a template" in Import & export; matching its headers always works.
5. Re-import only the fixed problem rows, with duplicates set to "Skip", so nothing doubles.
6. If the importer gets something wrong that a clean file should handle, file it as a bug (see bug-report-cleanup) so it's fixed for everyone.

## Rules

- The planner's file is their customers' data: work on it only in the session, never save it to the repo, and delete working copies after.

## Host Mode rules that always apply

- Plain, friendly words written for planners and hosts. No technical jargon.
- Never name a competitor or another app in anything public. Say "other apps". Unfinished features are "coming soon".
- Host Mode only tracks money. It never takes or sends payments.
- Never put customer data in the repo (it is public). Use the demos for examples.
