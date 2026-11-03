"""Creates the GitHub issues listed in .github/issues/*.json, once each.
An issue whose title already exists (open or closed) is skipped, so this is safe to run again.
Also makes sure the labels exist. Run by the "Load issues" workflow with the repo's own token.
Only the repo's own files are read; nothing here is passed to a shell."""
import glob, json, subprocess, sys

LABELS = {
    "feature": ("1f6feb", "Something new"), "bug": ("d73a4a", "Something broken"),
    "front end": ("0e8a16", "Screens and wording"), "back end": ("5319e7", "Data, rules and automation"),
    "phase 1": ("c2e0c6", "Plan phase 1"), "phase 2": ("bfdadc", "Plan phase 2"),
    "phase 3": ("d4c5f9", "Plan phase 3"), "phase 4": ("f9d0c4", "Plan phase 4"),
    "size S": ("ededed", "Small"), "size M": ("cfd3d7", "Medium"), "size L": ("a2a9b1", "Large"),
    "high risk": ("b60205", "Rules, security, money, deleting or live-event screens"),
    "needs Roy": ("fbca04", "Roy decides or does something first"),
    "claude": ("e8590c", "Start the builder agent on this issue"),
    "queue": ("0e8a16", "Line this issue up: the builder starts it when the one before is done"),
    "next": ("006b75", "With queue: goes to the front of the line"),
    "low risk": ("c5def5", "Small, safe change: may merge on its own when all checks pass and the reviewer rates it sure"),
    "weekly report": ("bfd4f2", "The Monday report"),
}

def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout

def main():
    have_labels = {l["name"] for l in json.loads(gh("label", "list", "--limit", "200", "--json", "name"))}
    for name, (color, desc) in LABELS.items():
        if name not in have_labels:
            gh("label", "create", name, "--color", color, "--description", desc)
            print("Made label:", name)
    have = {i["title"] for i in json.loads(gh("issue", "list", "--state", "all", "--limit", "1000", "--json", "title"))}
    made = 0
    for f in sorted(glob.glob(".github/issues/*.json")):
        for it in json.load(open(f, encoding="utf-8")):
            if it["title"] in have:
                continue
            args = ["issue", "create", "--title", it["title"], "--body", it["body"]]
            for l in it.get("labels", []):
                if l == "claude":
                    continue  # never start a builder automatically from this list
                args += ["--label", l]
            print(gh(*args).strip())
            have.add(it["title"]); made += 1
    print(f"Made {made} new issues.")

if __name__ == "__main__":
    sys.exit(main())
