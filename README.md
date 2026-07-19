# Role-Based Permission Sets for Pi

This extension allows you to switch between permission sets (roles) that define which tools and bash commands are available to the agent.

## Usage

Switch to a role using the `/role` command:

```
/role free      # Default role, no restrictions
/role read      # Read-only tools and commands
```

Without an argument, `/role` shows the current role.

## Available Roles

### `free` (default)
- **Tools**: read, bash, edit, write, grep, find, ls
- **Bash**: No restrictions
- **Description**: Default tool calls are enabled.

### `read`
- **Tools**: read, grep, ls
- **Bash**: Whitelisted read-only commands only
- **Description**: Read-only tools are enabled, write tools are disabled. If the user requests any non-read actions, inform them that your current permission set only allows read actions.

## Bash Command Enforcement

The extension enforces bash command permissions by intercepting bash tool calls:

1. If a role has no bash whitelist (like `free`), all bash commands are allowed.
2. If a role has a bash whitelist (like `read`), only commands starting with a whitelisted command name are allowed.
3. Commands are matched by their base name (e.g., `/usr/bin/grep` matches `grep`).
4. When a command is blocked, the agent receives a message explaining which commands are allowed.

## Adding New Roles

To add a new role, add an entry to the `PERMISSION_SETS` object in `index.js`:

```javascript
{
  name: 'custom',
  description: 'Custom description for this role.',
  tools: ['read', 'grep'],  // Tools from Pi's built-in tool set
  bashWhitelist: ['grep', 'cat', 'ls'],  // Array of allowed bash command names
}
```

## Read Role - Suggested Bash Commands

The `read` role includes the following bash commands (approved for review):

### File Content Readers
- grep, cat, head, tail, less, more, view

### File Info/Stats
- stat, du, file, wc

### Directory Listing
- ls, dir

### File Search
- find, locate, which

### Text Processing
- sort, uniq, cut, tr, awk, sed, paste, join, comm, diff, patch

### Shell Utilities
- echo, printf, env, export, test, true, false, xargs, tee, pipe

### Path Utilities
- dirname, basename, readlink, realpath

### System Info
- pwd, date, cal, uptime, uname, whoami, id, ps

### Numeric/Sequence
- seq, yes, od, hexdump, xxd, strings

### Compression (read-only)
- zcat, bzcat, xzcat, gunzip, bunzip2, unxz, tar, zip, unzip, 7z, rar

### Other Useful Read Commands
- nl, fmt, fold, rev, tac, expand, unexpand, column, pr, split

### File Operations (read/create)
- rsync, cp, mv, ln, mkdir, rmdir, rm, touch

## How It Works

1. **Active Tools**: The extension uses Pi's built-in active tools system to control which tools the LLM can call.
2. **Bash Interception**: The extension listens to `tool_call` events and blocks bash commands that don't match the whitelist.
3. **Context Injection**: The current role is injected into the system prompt via `before_agent_start`, so the agent knows its permissions.