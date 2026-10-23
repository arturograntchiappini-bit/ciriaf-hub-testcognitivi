import { Brand } from './Brand';

/** Barra superiore delle schermate interne: marchio della piattaforma. */
export function Header(): JSX.Element {
  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-content px-6 py-4">
        <Brand />
      </div>
    </header>
  );
}
