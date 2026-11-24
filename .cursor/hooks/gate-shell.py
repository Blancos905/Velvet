#!/usr/bin/env python3
"""Blocca build APK remote, push forzato e comandi distruttivi sul database."""

import json
import os
import re
import sys

PAMELA = "/home/pamela"
USERS = "/Users"
APK_SCRIPT = re.compile(r"build_(?:driver|parents|admin|beacon)_apk\.sh$")
SQL_DROP_DB = re.compile(r"\bdrop\s+database\b", re.IGNORECASE)
SQL_DROP_TABLE = re.compile(r"\bdrop\s+table\b", re.IGNORECASE)
SQL_TRUNCATE = re.compile(r"\btruncate\b", re.IGNORECASE)
DB_CLIENTS = {
    "psql",
    "mysql",
    "mariadb",
    "sqlite3",
    "cockroach",
    "clickhouse-client",
}
REDIRECT = re.compile(r"(?:^|[\s;])(?:\d*>>?)\s*(\"[^\"]+\"|'[^']+'|\S+)")


def emit(payload):
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


def allow():
    emit({"permission": "allow"})


def deny(user_message, agent_message):
    emit(
        {
            "permission": "deny",
            "user_message": user_message,
            "agent_message": agent_message,
        }
    )


def is_under(path, root):
    if not path:
        return False
    norm = os.path.normpath(path)
    root_norm = os.path.normpath(root)
    return norm == root_norm or norm.startswith(root_norm + os.sep)


def split_shell(command):
    parts = []
    buf = []
    in_single = False
    in_double = False
    i = 0
    while i < len(command):
        char = command[i]
        if in_single:
            buf.append(char)
            if char == "'":
                in_single = False
            i += 1
            continue
        if in_double:
            buf.append(char)
            if char == '"' and command[i - 1] != "\\":
                in_double = False
            i += 1
            continue
        if char == "'":
            in_single = True
            buf.append(char)
            i += 1
            continue
        if char == '"':
            in_double = True
            buf.append(char)
            i += 1
            continue
        if command.startswith("&&", i) or command.startswith("||", i):
            parts.append("".join(buf))
            buf = []
            i += 2
            continue
        if char in ";\n" or (char == "|" and not command.startswith("||", i)):
            parts.append("".join(buf))
            buf = []
            i += 1
            continue
        buf.append(char)
        i += 1
    parts.append("".join(buf))
    return [part.strip() for part in parts if part.strip()]


def tokenize(segment):
    tokens = []
    buf = []
    in_single = False
    in_double = False
    i = 0
    while i < len(segment):
        char = segment[i]
        if in_single:
            if char == "'":
                in_single = False
            else:
                buf.append(char)
            i += 1
            continue
        if in_double:
            if char == '"' and segment[i - 1] != "\\":
                in_double = False
            else:
                buf.append(char)
            i += 1
            continue
        if char == "'":
            in_single = True
            i += 1
            continue
        if char == '"':
            in_double = True
            i += 1
            continue
        if char.isspace():
            if buf:
                tokens.append("".join(buf))
                buf = []
            i += 1
            continue
        buf.append(char)
        i += 1
    if buf:
        tokens.append("".join(buf))
    return tokens


def basename(token):
    return token.replace("\\", "/").rsplit("/", 1)[-1]


def apk_destination(path):
    norm = path.strip().strip("'\"").replace("\\", "/")
    return re.search(r"(?:^|/)backend/static/apps/[^/]+\.apk$", norm) is not None


def apps_dir(path):
    norm = path.strip().strip("'\"").replace("\\", "/").rstrip("/")
    return norm.endswith("backend/static/apps")


def redirects_to_apk(segment):
    for match in REDIRECT.finditer(segment):
        if apk_destination(match.group(1)):
            return True
    return False


def writes_apk(tokens):
    if not tokens:
        return False
    exe = basename(tokens[0])
    if exe not in {"cp", "mv", "tee", "install", "rsync"}:
        return False
    positionals = []
    target_dir = None
    i = 0
    args = tokens[1:]
    while i < len(args):
        arg = args[i]
        if arg == "--":
            positionals.extend(args[i + 1 :])
            break
        if arg in {"-t", "--target-directory"} and i + 1 < len(args):
            target_dir = args[i + 1]
            i += 2
            continue
        if arg.startswith("--target-directory="):
            target_dir = arg.split("=", 1)[1]
            i += 1
            continue
        if arg.startswith("-") and arg != "-":
            i += 1
            continue
        positionals.append(arg)
        i += 1
    if target_dir and (apk_destination(target_dir) or apps_dir(target_dir)):
        return True
    if exe == "tee":
        return any(apk_destination(item) for item in positionals)
    if not positionals:
        return False
    dest = positionals[-1]
    if apk_destination(dest):
        return True
    sources = positionals[:-1]
    return apps_dir(dest) and any(item.endswith(".apk") for item in sources)


def is_apk_command(command):
    for segment in split_shell(command):
        tokens = tokenize(segment)
        if not tokens:
            continue
        joined = " ".join(tokens)
        if re.search(r"(?:^|\s)flutter\s+build\s+apk\b", joined):
            return True
        if any(APK_SCRIPT.search(basename(token)) for token in tokens):
            return True
        exe = basename(tokens[0])
        if exe in {"gradle", "gradlew"} and any(
            token == "assembleRelease" or token.endswith(":assembleRelease")
            for token in tokens[1:]
        ):
            return True
        if redirects_to_apk(segment) or writes_apk(tokens):
            return True
    return False


def mentions_pamela(command):
    if PAMELA + "/" in command or command.rstrip().endswith(PAMELA):
        return True
    for segment in split_shell(command):
        for token in tokenize(segment):
            candidate = token.split("=", 1)[1] if "=" in token else token
            if is_under(candidate, PAMELA):
                return True
    return False


def git_push_args(tokens):
    if not tokens or basename(tokens[0]) != "git":
        return None
    index = 1
    value_options = {
        "-C",
        "-c",
        "--git-dir",
        "--work-tree",
        "--namespace",
        "--exec-path",
        "--super-prefix",
    }
    while index < len(tokens):
        token = tokens[index]
        if token in value_options:
            index += 2
            continue
        if any(
            token.startswith(prefix)
            for prefix in (
                "--git-dir=",
                "--work-tree=",
                "--namespace=",
                "--exec-path=",
                "--super-prefix=",
            )
        ):
            index += 1
            continue
        if token == "-c" or token.startswith("-c"):
            index += 1 if token != "-c" else 2
            continue
        if token.startswith("-"):
            index += 1
            continue
        break
    if index >= len(tokens) or tokens[index] != "push":
        return None
    return tokens[index + 1 :]


def is_force_push(command):
    for segment in split_shell(command):
        args = git_push_args(tokenize(segment))
        if args is None:
            continue
        for arg in args:
            if arg == "--":
                break
            if arg == "--force" or arg.startswith("--force="):
                return True
            if arg == "--force-with-lease" or arg.startswith("--force-with-lease"):
                continue
            if arg.startswith("-") and not arg.startswith("--") and "f" in arg[1:]:
                return True
    return False


def is_destructive_db(command):
    for segment in split_shell(command):
        tokens = tokenize(segment)
        if not tokens:
            continue
        exe = basename(tokens[0])
        if exe == "docker" and len(tokens) > 1 and tokens[1] == "compose":
            rest = tokens[2:]
        elif exe == "docker-compose":
            rest = tokens[1:]
        else:
            rest = None
        if rest is not None and "down" in rest:
            for token in rest:
                if token in {"-v", "--volumes"}:
                    return True
                if token.startswith("-") and not token.startswith("--") and "v" in token[1:]:
                    return True
        if exe.lower() == "truncate":
            continue
        if not (
            SQL_DROP_DB.search(segment)
            or SQL_DROP_TABLE.search(segment)
            or SQL_TRUNCATE.search(segment)
        ):
            continue
        names = {basename(token).lower() for token in tokens}
        if names & DB_CLIENTS:
            return True
    return False


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        deny(
            "Comando non leggibile.",
            "Lo hook non ha potuto leggere il JSON del comando e lo ha bloccato.",
        )
        return
    command = data.get("command") or ""
    cwd = data.get("cwd") or ""
    if not isinstance(command, str):
        command = str(command)
    if not isinstance(cwd, str):
        cwd = str(cwd)

    if is_force_push(command):
        deny(
            "Push forzato bloccato.",
            "git push --force e git push -f non sono consentiti. Un push normale e --force-with-lease restano consentiti.",
        )
        return
    if is_destructive_db(command):
        deny(
            "Comando distruttivo sul database bloccato.",
            "DROP DATABASE, DROP TABLE, TRUNCATE e docker compose down -v non sono consentiti.",
        )
        return
    if is_apk_command(command) and not is_under(cwd, USERS):
        if is_under(cwd, PAMELA) or mentions_pamela(command):
            deny(
                "Build APK sul server remoto bloccata.",
                "Il comando è una build APK o una scrittura di backend/static/apps/*.apk sotto /home/pamela. Con la cartella di lavoro sotto /Users/ la build APK locale resta consentita.",
            )
            return
    allow()


if __name__ == "__main__":
    main()
