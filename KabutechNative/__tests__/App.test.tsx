import React from 'react';
import renderer, { act } from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = renderer.create(<App />);
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(testRenderer).toBeDefined();
    await act(async () => {
      testRenderer.unmount();
    });
  });

});



