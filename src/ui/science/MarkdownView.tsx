import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { isSafeHref, type Block, type Inline } from './markdown';

interface MarkdownViewProps {
  blocks: Block[];
  /** Risolve un link relativo a un altro paper (es. «validazione-rt.md») in una navigazione interna. */
  onOpenPaper?: (slug: string) => void;
}

interface MathProps {
  tex: string;
  display: boolean;
}

/** Formula LaTeX resa in MathML con KaTeX (caricato solo se il paper ne contiene). Costruisce nodi DOM, non HTML. */
function MathFormula({ tex, display }: MathProps): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import('katex').then(({ default: katex }) => {
      if (cancelled || !ref.current) return;
      katex.render(tex, ref.current, { displayMode: display, output: 'mathml', throwOnError: false, trust: false });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [tex, display]);

  const content = (
    <>
      <span ref={ref} />
      {!ready && <code className="math-fallback">{tex}</code>}
    </>
  );
  // Le formule display possono essere più larghe dello schermo: devono scorrere ed essere raggiungibili da tastiera.
  return display ? (
    <div className="math-display" role="group" aria-label="Formula" tabIndex={0}>
      {content}
    </div>
  ) : (
    <span className="math-inline">{content}</span>
  );
}

function renderInline(nodes: Inline[], onOpenPaper?: (slug: string) => void): ReactNode {
  return nodes.map((node, index) => {
    switch (node.kind) {
      case 'text':
        return <Fragment key={index}>{node.value}</Fragment>;
      case 'strong':
        return <strong key={index}>{renderInline(node.children, onOpenPaper)}</strong>;
      case 'em':
        return <em key={index}>{renderInline(node.children, onOpenPaper)}</em>;
      case 'code':
        return <code key={index}>{node.value}</code>;
      case 'math':
        return <MathFormula key={index} tex={node.value} display={false} />;
      case 'link':
        return renderLink(node, index, onOpenPaper);
    }
  });
}

function renderLink(node: Extract<Inline, { kind: 'link' }>, key: number, onOpenPaper?: (slug: string) => void): ReactNode {
  const children = renderInline(node.children, onOpenPaper);
  if (isSafeHref(node.href)) {
    return (
      <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  const slug = /([^/]+)\.md$/.exec(node.href)?.[1];
  if (slug && onOpenPaper) {
    return (
      <button key={key} type="button" className="prose-link" onClick={() => onOpenPaper(slug)}>
        {children}
      </button>
    );
  }
  return <Fragment key={key}>{children}</Fragment>;
}

function renderBlock(block: Block, index: number, onOpenPaper?: (slug: string) => void): ReactNode {
  switch (block.kind) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4';
      return (
        <Tag key={index} id={block.id}>
          {renderInline(block.children, onOpenPaper)}
        </Tag>
      );
    }
    case 'paragraph':
      return <p key={index}>{renderInline(block.children, onOpenPaper)}</p>;
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag key={index}>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item, onOpenPaper)}</li>
          ))}
        </Tag>
      );
    }
    case 'quote':
      return (
        <blockquote key={index}>
          {block.paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p, onOpenPaper)}</p>
          ))}
        </blockquote>
      );
    case 'table':
      return (
        <div key={index} className="prose-table" role="group" aria-label="Tabella scorrevole" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} scope="col">
                    {renderInline(cell, onOpenPaper)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{renderInline(cell, onOpenPaper)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'code':
      return (
        <pre key={index} tabIndex={0}>
          <code>{block.value}</code>
        </pre>
      );
    case 'math':
      return <MathFormula key={index} tex={block.value} display />;
    case 'rule':
      return <hr key={index} />;
  }
}

/** Rende l'albero prodotto da parseMarkdown solo con elementi React: nessun HTML grezzo, nessuna iniezione possibile. */
export function MarkdownView({ blocks, onOpenPaper }: MarkdownViewProps): JSX.Element {
  return <div className="prose-paper">{blocks.map((block, index) => renderBlock(block, index, onOpenPaper))}</div>;
}
