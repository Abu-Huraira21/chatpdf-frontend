/**
 * Simple test App to verify React is working
 */

import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ChatPDF Frontend Test</h1>
      <p>If you can see this, React is working correctly!</p>
      <button onClick={() => alert('Button works!')}>
        Test Button
      </button>
    </div>
  );
}

export default TestApp;