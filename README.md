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
2. If a role has a bash whitelist (like `read`), only commands whose base name appears in the whitelist are allowed.
3. Commands are matched by their base name (e.g., `/usr/bin/grep` matches `grep`; `./script.sh` matches `script.sh`).
4. When a command is blocked, the agent receives a message listing all allowed commands.

> **Note:** Bash enforcement is not strict enough for reliable access control. An agent can easily bypass the whitelist by constructing commands that produce output through a whitelisted command, such as piping an unlisted command's output through `grep`. For example, `unlisted_cmd 2>&1 | grep ''` runs `unlisted_cmd` even though only `grep` is whitelisted.

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

## Bash Commands Available in the `read` Role

The following commands are whitelisted for the `read` role:

### File Content Readers
- `cat`, `head`, `tail`

### File Search
- `find`, `grep`

### File Metadata
- `stat`, `du`, `file`, `wc`

### Directory and Path Inspection
- `ls`, `pwd`, `dirname`, `basename`, `readlink`, `realpath`, `which`

### Text Processing
- `sort`, `uniq`, `cut`, `tr`, `awk`, `sed`, `paste`, `join`, `comm`, `diff`, `nl`

### Shell/Data Utilities
- `echo`, `printf`, `env`, `test`

### System Inspection
- `date`, `uname`, `whoami`, `id`, `ps`

### Archive Inspection and Extraction
- `zcat`, `bzcat`, `xzcat`, `tar`, `unzip`, `7z`

## How It Works

1. **Active Tools**: The extension uses Pi's built-in active tools system to control which tools the LLM can call.
2. **Bash Interception**: The extension listens to `tool_call` events and blocks bash commands that don't match the whitelist.
3. **Context Injection**: The current role is injected into the system prompt via `before_agent_start`, so the agent knows its permissions.