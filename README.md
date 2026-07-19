# Role-Based Permission Sets for Pi

This extension allows you to switch between permission sets (roles) that define which tools and bash commands are available to the agent. The agent is informed of what tools are whitelisted, and is also told the *intention* of the role to encourage it to conform.

The whitelist is enforced, but the pre-provided *read* role whitelist is too broad to actually prevent write operations; the agent can easily perform destructive write operations using the available commands. Do not use it as a true security layer.

If you want a more strict read-only layer, create a new role that only allows the *read*, *grep* and *ls* tools and has no bash commands whitelisted.

## Usage

Switch to a role using the `/role` command:

```
/role free      # No restrictions, normal Pi functionality
/role read      # Read-only tools and commands
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

## Bash Command Enforcement

The extension enforces bash command permissions by intercepting bash tool calls:

1. If a role has no bash whitelist (like `free`), all bash commands are allowed.
2. If a role has a bash whitelist (like `read`), only commands whose base name appears in the whitelist are allowed.
3. Commands are matched by their base name (e.g., `/usr/bin/grep` matches `grep`; `./script.sh` matches `script.sh`).
4. When a command is blocked, the agent receives a message listing all allowed commands.

> **Security Note:** Bash enforcement for the read role is not strict enough for reliable access control. An agent can easily bypass the whitelist by constructing commands that produce output through a whitelisted command, such as piping an unlisted command's output through `grep`. For example, `unlisted_cmd 2>&1 | grep ''` runs `unlisted_cmd` even though only `grep` is whitelisted. This role is only intended to work as mild accident prevention.

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
3. **Context Injection**: The current role is injected into the system prompt via `before_agent_start` so the agent knows its permissions and the intended behaviour.