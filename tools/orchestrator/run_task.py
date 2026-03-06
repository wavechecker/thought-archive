#!/usr/bin/env python3
"""
Orchestrator: coordinates GPT (planner), Claude Code (implementer), Git, and Netlify.
"""

import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
STATE_DIR = SCRIPT_DIR / "state"
BRIEF_PATH = STATE_DIR / "latest_brief.md"
RESULT_PATH = STATE_DIR / "latest_result.md"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def run(cmd: list[str], cwd: str | None = None, capture: bool = False) -> subprocess.CompletedProcess:
    # On Windows, npm/git/etc ship as .cmd wrappers; shell=True lets cmd.exe resolve them.
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=capture,
        text=True,
        shell=(sys.platform == "win32"),
    )
    return result


def section(title: str) -> None:
    bar = "=" * 60
    print(f"\n{bar}\n  {title}\n{bar}")


def ask_decision() -> str:
    options = ["REVISE", "APPROVE_COMMIT", "APPROVE_DEPLOY"]
    print("\nAvailable decisions:")
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    while True:
        raw = input("\nEnter decision (or number): ").strip().upper()
        if raw in options:
            return raw
        if raw in {"1", "2", "3"}:
            return options[int(raw) - 1]
        print(f"  Invalid choice. Choose from: {', '.join(options)}")


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------

def step_read_brief() -> str:
    section("1 / 7  Read task brief")
    if not BRIEF_PATH.exists():
        sys.exit(
            f"ERROR: Brief not found at {BRIEF_PATH}\n"
            "Create tools/orchestrator/state/latest_brief.md and try again."
        )
    brief = BRIEF_PATH.read_text(encoding="utf-8")
    print(f"Brief loaded ({len(brief)} chars).")
    return brief


def step_ensure_branch(config: dict) -> None:
    section("2 / 7  Ensure correct git branch")
    repo = config["repo_path"]
    target = config["branch"]

    result = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo, capture=True)
    current = result.stdout.strip()
    print(f"Current branch: {current}")

    if current != target:
        print(f"Switching to branch '{target}' ...")
        run(["git", "checkout", target], cwd=repo)
    else:
        print(f"Already on '{target}'.")


_GIT_BASH_CANDIDATES = [
    "C:/Program Files/Git/bin/bash.exe",
    "C:/Program Files (x86)/Git/bin/bash.exe",
]


def _find_git_bash() -> str:
    """Return the path to bash.exe from a Git for Windows installation, or raise."""
    for candidate in _GIT_BASH_CANDIDATES:
        if Path(candidate).is_file():
            return candidate
    raise FileNotFoundError(
        "Git Bash not found. Searched:\n"
        + "\n".join(f"  {c}" for c in _GIT_BASH_CANDIDATES)
        + "\nInstall Git for Windows or update _GIT_BASH_CANDIDATES in run_task.py."
    )


def _win_path_to_bash(path: str) -> str:
    """Convert 'C:/foo/bar' to '/c/foo/bar' for use inside bash commands."""
    path = path.replace("\\", "/")
    if len(path) >= 2 and path[1] == ":":
        drive = path[0].lower()
        path = f"/{drive}{path[2:]}"
    return path


def step_invoke_claude(config: dict, brief: str) -> None:
    section("3 / 7  Invoke Claude Code with brief")
    repo = config["repo_path"]
    claude_cmd = config["claude_command"]
    timeout = 60

    use_git_bash = sys.platform == "win32" and claude_cmd.endswith(".cmd")

    if use_git_bash:
        # cmd.exe cannot reliably pipe into claude.cmd — the child process
        # inherits the pipe handle and never receives EOF, so the call hangs.
        # Git Bash pipes work correctly (confirmed in direct terminal testing).
        # Strategy: write brief to a temp file, then run via Git Bash:
        #   cat "/tmp/brief.md" | /c/.../claude.cmd --print
        bash_exe = _find_git_bash()

        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", delete=False, encoding="utf-8"
        )
        try:
            tmp.write(brief)
            tmp.flush()
            tmp.close()

            bash_tmp = _win_path_to_bash(tmp.name)
            bash_claude = _win_path_to_bash(claude_cmd)
            bash_cmd = f'cat "{bash_tmp}" | "{bash_claude}" --print'

            print(f"Git Bash exe : {bash_exe}", flush=True)
            print(f"Bash command : {bash_cmd}", flush=True)
            print(f"Temp brief   : {tmp.name}", flush=True)
            print("Invoking Claude...", flush=True)

            try:
                result = subprocess.run(
                    [bash_exe, "-c", bash_cmd],
                    cwd=repo,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
            except subprocess.TimeoutExpired:
                print(f"ERROR: Claude timed out after {timeout}s.", flush=True)
                return
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
    else:
        print(f"Running: {claude_cmd} --print <brief>", flush=True)
        print("Invoking Claude...", flush=True)
        try:
            result = subprocess.run(
                [claude_cmd, "--print"],
                input=brief,
                cwd=repo,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            print(f"ERROR: Claude timed out after {timeout}s.", flush=True)
            return

    print("Claude stdout:", flush=True)
    print(result.stdout or "(no output)", flush=True)
    if result.stderr:
        print("Claude stderr:", flush=True)
        print(result.stderr, flush=True)
    if result.returncode != 0:
        print(f"WARNING: Claude Code exited with code {result.returncode}", flush=True)
    else:
        print("Claude invocation completed successfully.", flush=True)


def step_build(config: dict) -> tuple[bool, int, str, str]:
    section("4 / 7  Run build command")
    repo = config["repo_path"]
    build_cmd = config["build_command"]

    print(f"Running: {build_cmd}", flush=True)
    # Split simple shell commands; for complex ones a shell may be needed.
    cmd_parts = build_cmd.split()
    result = run(cmd_parts, cwd=repo, capture=True)
    success = result.returncode == 0

    print(result.stdout, flush=True)
    if result.stderr:
        print("--- stderr ---", flush=True)
        print(result.stderr, flush=True)
    print(f"Build {'SUCCEEDED' if success else 'FAILED'} (exit code {result.returncode}).", flush=True)
    return success, result.returncode, result.stdout, result.stderr


def step_git_status(config: dict) -> tuple[str, str]:
    section("5 / 7  Capture git status and diff")
    repo = config["repo_path"]

    status = run(["git", "status"], cwd=repo, capture=True).stdout
    diff = run(["git", "diff"], cwd=repo, capture=True).stdout

    print(status)
    if diff:
        print(diff[:2000], "..." if len(diff) > 2000 else "")
    else:
        print("(no unstaged diff)")

    return status, diff


def _tail_lines(text: str, n: int = 200) -> str:
    """Return the last n lines of text."""
    lines = text.splitlines()
    if len(lines) <= n:
        return text
    return "\n".join(lines[-n:])


def step_save_result(brief: str, build_ok: bool, build_exit: int, build_stdout: str, build_stderr: str, status: str, diff: str) -> None:
    section("6 / 7  Save results")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    combined = build_stdout + ("\n--- stderr ---\n" + build_stderr if build_stderr else "")
    combined_lines = combined.splitlines()
    tail_needed = len(combined_lines) > 200

    build_section = f"""\
## Build

Status: {"SUCCESS" if build_ok else "FAILURE"}
Exit code: {build_exit}

### stdout

```
{build_stdout}
```

### stderr

```
{build_stderr or "(empty)"}
```"""

    if tail_needed:
        build_section += f"""

### Build tail (last 200 lines of combined output)

```
{_tail_lines(combined, 200)}
```"""

    content = f"""# Orchestrator Result

Generated: {timestamp}

---

## Brief (summary)

{brief[:500]}{"..." if len(brief) > 500 else ""}

---

{build_section}

---

## Git Status

```
{status}
```

---

## Git Diff (truncated to 3000 chars)

```diff
{diff[:3000]}
```
"""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    RESULT_PATH.write_text(content, encoding="utf-8")
    print(f"Result saved to {RESULT_PATH}")


def step_decide_and_act(config: dict) -> None:
    section("7 / 7  User decision")
    repo = config["repo_path"]
    hook_url = config.get("netlify_build_hook_url", "")
    require_approval = config.get("require_user_approval_for_deploy", True)

    decision = ask_decision()
    print(f"\nDecision: {decision}")

    if decision == "REVISE":
        print("Task marked for revision. Edit the brief and re-run the orchestrator.")
        return

    if decision in ("APPROVE_COMMIT", "APPROVE_DEPLOY"):
        print("\nCommitting changes ...")
        run(["git", "add", "-A"], cwd=repo)
        run(
            ["git", "commit", "-m", f"chore: orchestrated task commit [{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}]"],
            cwd=repo,
        )
        run(["git", "push"], cwd=repo)
        print("Committed and pushed.")

    if decision == "APPROVE_DEPLOY":
        if not hook_url:
            print(
                "\nERROR: netlify_build_hook_url is not set in config.json.\n"
                "Set the URL and try again."
            )
            return

        if require_approval:
            confirm = input("\nConfirm Netlify deploy? [y/N]: ").strip().lower()
            if confirm != "y":
                print("Deploy cancelled.")
                return

        print("Triggering Netlify deploy ...")
        import urllib.request
        req = urllib.request.Request(hook_url, data=b"{}", method="POST")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"Netlify responded: {resp.status} {resp.reason}")
        except Exception as exc:
            print(f"ERROR triggering deploy: {exc}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if os.environ.get("CLAUDECODE"):
        sys.exit(
            "\n"
            "ERROR: Nested Claude session detected.\n"
            "Close Claude Code and run this script from a plain terminal:\n"
            "\n"
            "  cd C:/Users/kxcon/thought-archive\n"
            "  python tools/orchestrator/run_task.py\n"
        )

    print("\nThought-Archive Orchestrator")
    print(f"Config: {CONFIG_PATH}")

    config = load_config()

    brief = step_read_brief()
    step_ensure_branch(config)
    step_invoke_claude(config, brief)
    build_ok, build_exit, build_stdout, build_stderr = step_build(config)
    status, diff = step_git_status(config)
    step_save_result(brief, build_ok, build_exit, build_stdout, build_stderr, status, diff)
    step_decide_and_act(config)

    print("\nOrchestrator finished.")


if __name__ == "__main__":
    main()
