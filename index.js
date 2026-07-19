/**
 * Role-based permission sets extension for Pi.
 * 
 * Allows switching between permission sets that define which tools and bash commands
 * are available to the agent. Uses Pi's active tools system and bash interception
 * to enforce permissions.
 * 
 * Permission sets are whitelists of tools and bash commands:
 * - Tools are enforced via Pi's built-in active tools system
 * - Bash commands are enforced by intercepting bash tool calls
 * 
 * Current role information is injected into the system prompt so the agent
 * is aware of its current permissions.
 */

// ============================================================================
// Permission Set Definitions
// ============================================================================

const PERMISSION_SETS = {
  free: {
    name: 'free',
    description: 'Default tool calls are enabled.',
    tools: ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls'],
    bashWhitelist: null, // null means no restriction
  },
  read: {
    name: 'read',
    description: 'Your current permissions are intended for read-only activity. If the user requests any non-read actions, inform them that your current permission set is only intended to allow read actions. Incidental creation of new files (such as by unzipping an archive for read purposes) is acceptable. Destructive uses of commands (i.e. overwriting or deleting existing data) are absolutely prohibited.',
    tools: ['read', 'grep', 'ls', 'bash'],
    bashWhitelist: [
      // File reading and searching
      'grep',
      'cat',
      'head',
      'tail',
      'find',

      // File metadata
      'stat',
      'du',
      'file',
      'wc',

      // Directory and path inspection
      'ls',
      'pwd',
      'dirname',
      'basename',
      'readlink',
      'realpath',
      'which',

      // Text processing
      'sort',
      'uniq',
      'cut',
      'tr',
      'awk',
      'sed',
      'paste',
      'join',
      'comm',
      'diff',
      'nl',

      // Shell/data utilities
      'echo',
      'printf',
      'env',
      'test',

      // System inspection
      'date',
      'uname',
      'whoami',
      'id',
      'ps',

      // Archive inspection and permitted extraction
      'zcat',
      'bzcat',
      'xzcat',
      'tar',
      'unzip',
      '7z',
    ],
  },
};

// ============================================================================
// State
// ============================================================================

let currentRole = 'read';

// ============================================================================
// Extension Factory
// ============================================================================

function extensionFactory(pi) {
  // Register the /role command
  pi.registerCommand('role', {
    description: 'Switch to a different permission set',
    handler: async (args, ctx) => {
      const roleName = args.trim().toLowerCase();
      
      if (!roleName) {
        ctx.ui.notify(`Current role: ${currentRole}`, 'info');
        return;
      }
      
      const permissionSet = PERMISSION_SETS[roleName];
      
      if (!permissionSet) {
        const available = Object.keys(PERMISSION_SETS).join(', ');
        ctx.ui.notify(`Unknown role: ${roleName}. Available roles: ${available}`, 'error');
        return;
      }
      
      // Apply the new role
      applyRole(pi, roleName);
      
      ctx.ui.notify(`Switched to role: ${roleName}`, 'info');
    },
  });

  // Listen to tool_call events to intercept and block non-whitelisted bash commands
  pi.on('tool_call', (event, ctx) => {
    if (event.toolName !== 'bash') {
      return;
    }
    
    const role = PERMISSION_SETS[currentRole];
    const bashWhitelist = role.bashWhitelist;
    
    // If no bash whitelist or empty whitelist, allow all bash commands
    if (!bashWhitelist || bashWhitelist.length === 0) {
      return;
    }
    
    const command = event.input.command;
    
    // Extract the base command (first word, ignoring path)
    let commandName = command.split(' ')[0];
    // Remove any leading path separator (e.g., /usr/bin/grep -> grep)
    commandName = commandName.split('/').pop();
    // Remove any leading ./ prefix
    commandName = commandName.replace(/^\.\//, '');
    
    // Check if the command is in the whitelist
    const isWhitelisted = bashWhitelist.includes(commandName);
    
    if (!isWhitelisted) {
      return {
        block: true,
        reason: `Bash command '${commandName}' is not in the current permission set's whitelist.\n\nAllowed bash commands: ${bashWhitelist.join(', ')}\n\nCurrent role: ${currentRole}`,
      };
    }
  });

  // Update context with current role info before each agent start
  pi.on('before_agent_start', (event, ctx) => {
    const role = PERMISSION_SETS[currentRole];
    
    if (!role) {
      return;
    }
    
    // Build the role context string to inject into system prompt
    let roleContext = `\n---\n\n[Current Role: ${role.name}]\nDescription: ${role.description}`;
    
    // Add bash whitelist if it exists
    if (role.bashWhitelist && role.bashWhitelist.length > 0) {
      roleContext += `\nWhitelisted Bash Commands: ${role.bashWhitelist.join(', ')}`;
    }
    
    roleContext += '\n---\n';
    
    // Append to system prompt and return the modified prompt
    event.systemPrompt += roleContext;
    return { systemPrompt: event.systemPrompt };
  });

  // Update active tools when session starts (initial load or reload)
  pi.on('session_start', (event, ctx) => {
    if (event.reason === 'reload' || event.reason === 'startup') {
      // Re-apply current role
      applyRole(pi, currentRole);
      
      // Inform the user of the current role (notification only, not sent to agent)
      const role = PERMISSION_SETS[currentRole];
      ctx.ui.notify(`Current role: ${role.name}`, 'info');
    }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Apply a role by updating active tools
 */
function applyRole(pi, roleName) {
  const permissionSet = PERMISSION_SETS[roleName];
  
  if (!permissionSet) {
    return;
  }
  
  // Update current role
  currentRole = roleName;
  
  // Update active tools based on the role's whitelist
  const activeTools = permissionSet.tools || [];
  pi.setActiveTools(activeTools);
}

// ============================================================================
// Export
// ============================================================================

module.exports = extensionFactory;