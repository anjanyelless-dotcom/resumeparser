/**
 * Boolean Search Query Parser Service
 *
 * Parses recruiter-typed boolean search strings into an AST,
 * then converts the AST into safe, parameterized SQL conditions.
 *
 * Supported operators:
 * - AND (case-insensitive)
 * - OR (case-insensitive)
 * - NOT (case-insensitive)
 * - Parentheses for grouping
 * - Double-quoted exact phrases
 *
 * Example:
 *   ("Frontend Developer" OR "React Developer") AND (React OR Redux OR TypeScript) AND NOT Angular
 *
 * Output SQL:
 *   (combined_search_text ILIKE $1 OR combined_search_text ILIKE $2)
 *   AND (combined_search_text ILIKE $3 OR combined_search_text ILIKE $4 OR combined_search_text ILIKE $5)
 *   AND combined_search_text NOT ILIKE $6
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type BooleanNodeType = 'AND' | 'OR' | 'NOT' | 'TERM';

export interface BooleanNode {
  type: BooleanNodeType;
  value?: string; // For TERM nodes
  left?: BooleanNode; // For AND, OR, NOT
  right?: BooleanNode; // For AND, OR
}

export interface ValidationError {
  message: string;
  position?: number;
}

export interface SqlResult {
  sql: string;
  params: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Types
// ─────────────────────────────────────────────────────────────────────────────
type TokenType = 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN' | 'TERM' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────
export class ParseError extends Error {
  constructor(message: string, public position?: number) {
    super(message);
    this.name = 'ParseError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lexer
// ─────────────────────────────────────────────────────────────────────────────
class Lexer {
  private position: number = 0;
  private query: string;
  private length: number;

  constructor(query: string) {
    this.query = query.trim();
    this.length = this.query.length;
  }

  private peek(offset: number = 0): string {
    const pos = this.position + offset;
    return pos < this.length ? this.query[pos] : '';
  }

  private advance(): string {
    return this.position < this.length ? this.query[this.position++] : '';
  }

  private skipWhitespace(): void {
    while (this.position < this.length && /\s/.test(this.query[this.position])) {
      this.position++;
    }
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    this.position = 0;

    while (this.position < this.length) {
      this.skipWhitespace();

      if (this.position >= this.length) break;

      const char = this.peek();

      // Handle quoted phrases
      if (char === '"') {
        tokens.push(this.readString());
        continue;
      }

      // Handle parentheses
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(', position: this.position });
        this.advance();
        continue;
      }

      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')', position: this.position });
        this.advance();
        continue;
      }

      // Handle operators
      const remaining = this.query.substring(this.position).toUpperCase();
      
      if (remaining.startsWith('AND')) {
        tokens.push({ type: 'AND', value: 'AND', position: this.position });
        this.position += 3;
        continue;
      }

      if (remaining.startsWith('OR')) {
        tokens.push({ type: 'OR', value: 'OR', position: this.position });
        this.position += 2;
        continue;
      }

      if (remaining.startsWith('NOT')) {
        tokens.push({ type: 'NOT', value: 'NOT', position: this.position });
        this.position += 3;
        continue;
      }

      // Handle term
      tokens.push(this.readTerm());
    }

    tokens.push({ type: 'EOF', value: '', position: this.position });
    return tokens;
  }

  private readString(): Token {
    const start = this.position;
    this.advance(); // Skip opening quote
    
    let value = '';
    while (this.position < this.length) {
      const char = this.peek();
      if (char === '"') {
        this.advance(); // Skip closing quote
        return { type: 'TERM', value, position: start };
      }
      value += this.advance();
    }

    throw new ParseError('Unterminated quoted string', start);
  }

  private readTerm(): Token {
    const start = this.position;
    let value = '';
    
    while (this.position < this.length) {
      const char = this.peek();
      
      // Stop at delimiters
      if (/[\s()"]/.test(char)) break;
      
      // Check for operators
      const remaining = this.query.substring(this.position).toUpperCase();
      if (remaining.startsWith('AND') || remaining.startsWith('OR') || remaining.startsWith('NOT')) {
        break;
      }

      value += this.advance();
    }

    if (value === '') {
      throw new ParseError('Unexpected character', this.position);
    }

    return { type: 'TERM', value, position: start };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────
class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private advance(): Token {
    return this.tokens[this.current++];
  }

  private expect(type: TokenType): Token {
    const token = this.advance();
    if (token.type !== type) {
      throw new ParseError(`Expected ${type}, got ${token.type}`, token.position);
    }
    return token;
  }

  parse(): BooleanNode {
    const node = this.parseOr();
    
    if (this.peek().type !== 'EOF') {
      throw new ParseError(`Unexpected token: ${this.peek().type}`, this.peek().position);
    }

    return node;
  }

  private parseOr(): BooleanNode {
    let left = this.parseAnd();

    while (this.peek().type === 'OR') {
      this.advance(); // Consume OR
      const right = this.parseAnd();
      left = { type: 'OR', left, right };
    }

    return left;
  }

  private parseAnd(): BooleanNode {
    let left = this.parseNot();

    while (
      this.peek().type === 'AND' ||
      this.peek().type === 'NOT' ||
      this.peek().type === 'TERM' ||
      this.peek().type === 'LPAREN'
    ) {
      if (this.peek().type === 'AND') {
        this.advance(); // Consume explicit AND
      }
      // If it's not an explicit AND, it's an implicit AND
      const right = this.parseNot();
      left = { type: 'AND', left, right };
    }

    return left;
  }

  private parseNot(): BooleanNode {
    if (this.peek().type === 'NOT') {
      this.advance(); // Consume NOT
      const operand = this.parsePrimary();
      return { type: 'NOT', left: operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): BooleanNode {
    const token = this.peek();

    if (token.type === 'TERM') {
      this.advance();
      return { type: 'TERM', value: token.value };
    }

    if (token.type === 'LPAREN') {
      this.advance(); // Consume '('
      const node = this.parseOr();
      this.expect('RPAREN'); // Consume ')'
      return node;
    }

    throw new ParseError(`Unexpected token: ${token.type}`, token.position);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a boolean search query string into an AST
 *
 * @param query - The boolean search query string
 * @returns The root node of the AST
 * @throws ParseError if the query is malformed
 */
export function parseBooleanQuery(query: string): BooleanNode {
  if (!query || query.trim() === '') {
    throw new ParseError('Query cannot be empty');
  }

  const lexer = new Lexer(query);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Convert a boolean AST into parameterized SQL
 *
 * @param ast - The boolean AST root node
 * @param searchColumn - The database column to search in (e.g., 'combined_search_text')
 * @returns Object with SQL string and parameters array
 */
export function buildSqlFromBooleanAst(ast: BooleanNode, searchColumn: string): SqlResult {
  const params: string[] = [];
  let paramIndex = 1;

  function buildNode(node: BooleanNode): string {
    switch (node.type) {
      case 'TERM':
        params.push(node.value!);
        return `${searchColumn} ILIKE $${paramIndex++}`;

      case 'NOT':
        const notSql = buildNode(node.left!);
        return `NOT ${notSql}`;

      case 'AND':
        const leftAnd = buildNode(node.left!);
        const rightAnd = buildNode(node.right!);
        return `(${leftAnd} AND ${rightAnd})`;

      case 'OR':
        const leftOr = buildNode(node.left!);
        const rightOr = buildNode(node.right!);
        return `(${leftOr} OR ${rightOr})`;

      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  const sql = buildNode(ast);
  return { sql, params };
}

/**
 * Validate and parse a boolean query with error handling
 *
 * @param query - The boolean search query string
 * @returns Object with success flag and either the AST or error
 */
export function validateAndParseBooleanQuery(query: string): {
  success: boolean;
  ast?: BooleanNode;
  error?: string;
} {
  try {
    const ast = parseBooleanQuery(query);
    return { success: true, ast };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Invalid query syntax',
    };
  }
}