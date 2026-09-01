#!/usr/bin/env python3
"""Notify IndexNow about changed public URLs after Cloudflare Pages deploys."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

HOST = "doctorolano.pe"
BASE = f"https://{HOST}"
SITEMAP_URL = f"{BASE}/sitemap.xml"
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
KEY = os.environ["INDEXNOW_KEY"].strip()
KEY_LOCATION = f"{BASE}/{KEY}.txt"
EVENT_NAME = os.environ.get("GITHUB_EVENT_NAME", "push")
BEFORE = os.environ.get("GITHUB_EVENT_BEFORE", "").strip()
AFTER = os.environ.get("GITHUB_SHA", "HEAD").strip() or "HEAD"
DEPLOY_WAIT = int(os.environ.get("INDEXNOW_DEPLOY_WAIT", "180"))

NOINDEX_FILES = {"reserva.html", "reserva-s.html", "v2.html"}
SETUP_FILES = {
    "scripts/indexnow.py",
    ".github/workflows/indexnow.yml",
    f"{KEY}.txt",
}


def http_get(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DrOlano-IndexNow/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def wait_for_key() -> None:
    for attempt in range(1, 17):
        try:
            body = http_get(KEY_LOCATION).decode("utf-8").strip()
            if body == KEY:
                print(f"IndexNow key is live at {KEY_LOCATION}")
                return
            print(f"Key file reachable but content does not match (attempt {attempt}/16).")
        except Exception as exc:  # network/deploy propagation
            print(f"Waiting for key file in production (attempt {attempt}/16): {exc}")
        time.sleep(15)
    raise RuntimeError("IndexNow key file did not become available in production.")


def fetch_sitemap_urls() -> list[str]:
    data = http_get(SITEMAP_URL)
    root = ET.fromstring(data)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls: list[str] = []
    for loc in root.findall("sm:url/sm:loc", ns):
        if not loc.text:
            continue
        url = loc.text.strip()
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme == "https" and parsed.netloc == HOST:
            urls.append(url)
    return sorted(set(urls))


def git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.STDOUT)


def valid_before(value: str) -> bool:
    return bool(value) and not re.fullmatch(r"0+", value)


def diff_args() -> list[str]:
    if valid_before(BEFORE):
        return [BEFORE, AFTER]
    try:
        git(["rev-parse", "HEAD^"])
        return ["HEAD^", "HEAD"]
    except Exception:
        return []


def changed_files() -> list[tuple[str, str]]:
    refs = diff_args()
    if not refs:
        return []
    output = git(["diff", "--name-status", *refs])
    items: list[tuple[str, str]] = []
    for raw in output.splitlines():
        parts = raw.split("\t")
        if len(parts) < 2:
            continue
        status = parts[0]
        path = parts[-1]  # destination path for renames
        items.append((status, path))
    return items


def sitemap_diff_urls() -> set[str]:
    refs = diff_args()
    if not refs:
        return set()
    try:
        output = git(["diff", "--unified=0", *refs, "--", "sitemap.xml"])
    except Exception:
        return set()
    urls: set[str] = set()
    for raw in output.splitlines():
        if not raw.startswith(("+", "-")) or raw.startswith(("+++", "---")):
            continue
        match = re.search(r"<loc>(https://doctorolano\.pe/[^<]*)</loc>", raw)
        if match:
            urls.add(match.group(1))
    return urls


def route_for_file(path: str) -> str | None:
    if path in NOINDEX_FILES:
        return None
    if path == "index.html" or path.startswith("_includes/v28/"):
        return f"{BASE}/"
    if path == "privacidad.html":
        return f"{BASE}/privacidad"
    if path.endswith(".md") and "/" not in path:
        return f"{BASE}/{path[:-3]}"
    return None


def urls_to_submit() -> list[str]:
    sitemap_urls = fetch_sitemap_urls()
    changes = changed_files()

    if EVENT_NAME == "workflow_dispatch" or not changes:
        return sitemap_urls

    paths = {path for _, path in changes}
    if paths & SETUP_FILES or "_layouts/seo-service.html" in paths:
        return sitemap_urls

    urls: set[str] = set(sitemap_diff_urls())
    for _, path in changes:
        route = route_for_file(path)
        if route:
            urls.add(route)

    # Keep changed/deleted URLs on this canonical host. IndexNow accepts deleted URLs too.
    clean = []
    for url in sorted(urls):
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme == "https" and parsed.netloc == HOST:
            clean.append(url)
    return clean


def submit(urls: list[str]) -> None:
    if not urls:
        print("No indexable public URLs changed; nothing to submit to IndexNow.")
        return
    if len(urls) > 10000:
        raise RuntimeError("IndexNow batch exceeds 10,000 URLs.")

    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        INDEXNOW_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "DrOlano-IndexNow/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            code = response.getcode()
            response_body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        code = exc.code
        response_body = exc.read().decode("utf-8", errors="replace")

    print(f"IndexNow response: HTTP {code} {response_body}".strip())
    print("Submitted URLs:")
    for url in urls:
        print(f"- {url}")

    if code not in (200, 202):
        raise RuntimeError(f"IndexNow rejected the submission with HTTP {code}.")


def main() -> int:
    if DEPLOY_WAIT > 0:
        print(f"Waiting {DEPLOY_WAIT}s for Cloudflare Pages production deploy...")
        time.sleep(DEPLOY_WAIT)
    wait_for_key()
    submit(urls_to_submit())
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"IndexNow integration failed: {exc}", file=sys.stderr)
        raise
