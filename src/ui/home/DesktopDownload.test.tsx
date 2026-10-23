import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DesktopDownload, INSTALLER_URL, INSTALL_COMMANDS } from './DesktopDownload';

describe('DesktopDownload', () => {
  it('should_link_the_installer_from_the_latest_release', () => {
    render(<DesktopDownload />);
    expect(screen.getByRole('link', { name: /Scarica l.installer/ })).toHaveAttribute('href', INSTALLER_URL);
    expect(INSTALLER_URL).toMatch(/^https:\/\/github\.com\/.+\/releases\/latest\/download\/Sintropia-Setup-x64\.msi$/);
  });

  it('should_show_the_terminal_commands_over_https_only', () => {
    render(<DesktopDownload />);
    for (const { command } of INSTALL_COMMANDS) {
      expect(screen.getByText(command)).toBeInTheDocument();
      expect(command).not.toMatch(/http:\/\//);
    }
  });
});
