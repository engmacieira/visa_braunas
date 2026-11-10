import '@testing-library/jest-dom/vitest';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Garante limpeza do DOM após cada teste
afterEach(() => {
  cleanup();
});

// Limpeza de mocks e storage entre testes para total hermeticidade
beforeEach(() => {
  vi.clearAllMocks();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Caso storage não esteja disponível
  }
});
