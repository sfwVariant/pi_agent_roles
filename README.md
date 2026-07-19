# Role-Based Permission Sets for Pi

This extension allows you to switch between permission sets (roles) that define which tools and bash commands are available to the agent. The agent is informed of what tools are whitelisted, and is also told the *intention* of the role to encourage it to conform.

The whitelist is enforced, but the pre-provided *read* role whitelist is too broad to actually prevent write operations; the agent can still easily perform destructive write operations using the available commands. Do not use it as a security layer.

The force_read role is significantly more restrictive, but agents can still perform write actions if another extension is installed that provides additional tools - and there are likely other ways to bypass it too. It can be used as a **low-strength** security layer.

## Usage

Switch to a role using the `/role` command:

```
/role free       # No restrictions, normal Pi functionality
/role read       # Non-restrictive read-only, allows general read tools and bash commands (default)
/role force_read # Restrictive read-only, does not allow any bash tool calls
```

Without an argument, `/role` shows the current role.

## Available Roles

### `free`
- **Tools**: read, bash, edit, write, grep, find, ls
- **Bash**: No restrictions
- **Agent Description**: Default tool calls are enabled.

### `read` (default)
- **Tools**: read, bash, grep, ls
- **Bash**: Whitelisted read-only commands (low strictness)
- **Agent Description**: Your current permissions are intended for read-only activity. If the user requests any non-read actions, inform them that your current permission set is only intended to allow read actions. Incidental creation of new files (such as by unzipping an archive for read purposes) is acceptable. Destructive uses of commands (i.e. overwriting or deleting existing data) are absolutely prohibited.

### `force_read`
- **Tools**: read, grep, ls
- **Bash**: No whitelisted commands
- **Agent Description**: Your current permissions are heavily restricted to read-only. Write operations of any kind are prohibited. If a user requests any non-read actions, inform them that your current permission set only allows read actions.

## Bash Command Enforcement

The extension enforces bash command permissions by intercepting bash tool calls:

1. If a role has no bash whitelist (like `free`), all bash commands are allowed.
2. If a role has a bash whitelist (like `read`), only commands whose base name appears in the whitelist are allowed.
3. Commands are matched by their base name (e.g., `/usr/bin/grep` matches `grep`; `./script.sh` matches `script.sh`).
4. When a command is blocked, the agent receives a message explaining why and listing all allowed commands.

> **Security Reminder:** Bash enforcement for the `read` role is not strict enough for reliable access control. An agent can bypass the whitelist by constructing commands that produce output through a whitelisted command, such as piping an unlisted command's output through `grep`. For example, `unlisted_cmd 2>&1 | grep ''` runs `unlisted_cmd` even though only `grep` is whitelisted. The `read` role is only intended to work as mild accident prevention and guidance, not a strict security layer.

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

## Bash Commands Available in the `force_read` Role

No bash commands are whitelisted for the `force_read` role.

## Bash Commands Available in the `read` Role

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
3. **Context Injection**: The current role is injected into the system prompt via `before_agent_start` so the agent knows its permissions and the intended behaviour.