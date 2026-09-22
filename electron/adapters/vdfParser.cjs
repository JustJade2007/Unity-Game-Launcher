/**
 * Simple, robust Valve KeyValues (VDF) text parser.
 */
function parseVDF(text) {
  if (!text || typeof text !== 'string') return {};

  const lines = text.split(/\r?\n/);
  const root = {};
  const stack = [root];

  const lineRegex = /^\s*"(.*?)"(?:\s+"(.*?)")?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('//')) continue;

    if (rawLine === '{') {
      // Opening block: top of stack was set in previous key line
      continue;
    }

    if (rawLine === '}') {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }

    const match = rawLine.match(lineRegex);
    if (match) {
      const key = match[1];
      const val = match[2];

      const currentObj = stack[stack.length - 1];

      if (val !== undefined) {
        // Simple key-value
        currentObj[key] = val;
      } else {
        // Next is a block
        const newObj = {};
        currentObj[key] = newObj;
        stack.push(newObj);
      }
    }
  }

  return root;
}

module.exports = { parseVDF };
