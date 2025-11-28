import React from 'react';

const AreaHeader = ({ areaConfig }) => {
  return (
    <div style={{ borderBottom: '1px solid #ccc', padding: '10px' }}>
      <strong>{areaConfig?.name || 'Área'}</strong>
    </div>
  );
};

export default AreaHeader;
