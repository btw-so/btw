import React from 'react';

jest.mock('redux-persist/lib/integration/react', () => ({
  PersistGate({ children }) {
    return <div>{children}</div>;
  },
}));

jest.mock('react-helmet-async', () => ({
  HelmetProvider({ children }) {
    return children;
  },
  Helmet() {
    return null;
  },
}));

jest.mock('../src/Root', () => () => <div>root</div>);

describe('src/index', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    const root = document.createElement('div');

    root.id = 'root';
    root.style.height = '100vh';
    document.body.appendChild(root);

    require('../src/index');
  });

  afterAll(() => {
    process.env.NODE_ENV = 'test';
    document.getElementById('root')?.remove();
  });

  it('should have mounted the app', () => {
    expect(document.getElementById('root')?.innerHTML).toMatchSnapshot();
  });
});
