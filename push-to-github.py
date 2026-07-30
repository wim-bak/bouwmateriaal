#!/usr/bin/env python3
import base64
import json
import subprocess
import urllib.request
import urllib.error
import concurrent.futures
import sys

OWNER = "wim-bak"
REPO = "bouwmateriaal"
BRANCH = "main"
API = "https://api.github.com"


def api(path, method="GET", data=None):
    url = f"{API}{path}"
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} → {e.code}: {detail}")


files = subprocess.check_output(["git", "ls-files"], text=True).strip().split("\n")
files = [f for f in files if f]
print(f"Uploading {len(files)} files to {OWNER}/{REPO}#{BRANCH}...", flush=True)


def create_blob(path):
    with open(path, "rb") as f:
        content = f.read()
    b64 = base64.b64encode(content).decode("ascii")
    blob = api(
        f"/repos/{OWNER}/{REPO}/git/blobs",
        method="POST",
        data={"content": b64, "encoding": "base64"},
    )
    return {"path": path, "sha": blob["sha"], "mode": "100644", "type": "blob"}


tree_entries = []
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
    for i, entry in enumerate(ex.map(create_blob, files), 1):
        tree_entries.append(entry)
        sys.stdout.write(f"  {i}/{len(files)}\r")
        sys.stdout.flush()
print(f"\n  ✓ {len(tree_entries)} blobs geüpload")

tree = api(
    f"/repos/{OWNER}/{REPO}/git/trees",
    method="POST",
    data={"tree": tree_entries},
)
print(f"  ✓ Tree {tree['sha'][:8]}")

commit = api(
    f"/repos/{OWNER}/{REPO}/git/commits",
    method="POST",
    data={
        "message": "Initiële commit: Vercel-ready AI-Kansenkaart",
        "tree": tree["sha"],
        "parents": [],
        "author": {"name": "Wim Bak", "email": "wim@merkvast.com"},
    },
)
print(f"  ✓ Commit {commit['sha'][:8]}")

try:
    api(
        f"/repos/{OWNER}/{REPO}/git/refs",
        method="POST",
        data={"ref": f"refs/heads/{BRANCH}", "sha": commit["sha"]},
    )
    print(f"  ✓ Branch {BRANCH} aangemaakt")
except RuntimeError as e:
    if "already exists" in str(e):
        api(
            f"/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}",
            method="PATCH",
            data={"sha": commit["sha"], "force": True},
        )
        print(f"  ✓ Branch {BRANCH} bijgewerkt")
    else:
        raise

print(f"\nKlaar. Bekijk: https://github.com/{OWNER}/{REPO}")
